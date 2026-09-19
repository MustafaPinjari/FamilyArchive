import { NextResponse } from "next/server";
import { getDb, VAULT_DIR } from "@/lib/db";
import { FamilyDocument } from "@/types";
import { getDriveFileStream } from "@/lib/gdrive";
import JSZip from "jszip";
import path from "path";
import fs from "fs";

interface DocumentWithMember extends FamilyDocument {
  first_name: string;
  last_name: string | null;
}

// Helper to convert readable stream to Buffer
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// Helper to retrieve document buffer
async function getDocumentBuffer(doc: DocumentWithMember): Promise<{ buffer: Buffer; ext: string } | null> {
  // 1. Base64 Data URI
  if (doc.file_path && doc.file_path.startsWith("data:")) {
    const match = doc.file_path.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      const ext = mimeType.includes("pdf")
        ? "pdf"
        : mimeType.includes("svg")
        ? "svg"
        : mimeType.includes("jpeg") || mimeType.includes("jpg")
        ? "jpg"
        : mimeType.includes("png")
        ? "png"
        : "bin";
      return { buffer, ext };
    }
  }

  // 2. Google Drive stream
  if (doc.file_path && doc.file_path.startsWith("gdrive:")) {
    const gdriveFileId = doc.file_path.replace("gdrive:", "");
    try {
      const { stream, name: driveName, mimeType } = await getDriveFileStream(gdriveFileId);
      const buffer = await streamToBuffer(stream);
      const extMatch = driveName.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch
        ? extMatch[1]
        : doc.file_type?.includes("pdf")
        ? "pdf"
        : "bin";
      return { buffer, ext };
    } catch (err) {
      console.warn(`Drive stream failed for ${doc.id}, attempting vault fallback:`, err);
      const fallbackPath = path.join(VAULT_DIR, doc.id);
      if (fs.existsSync(fallbackPath)) {
        const buffer = fs.readFileSync(fallbackPath);
        return { buffer, ext: doc.file_type?.includes("pdf") ? "pdf" : "jpg" };
      }
    }
  }

  // 3. Local Vault File
  const localPath = path.join(VAULT_DIR, doc.file_path);
  if (fs.existsSync(localPath)) {
    const buffer = fs.readFileSync(localPath);
    const ext = doc.file_path.split(".").pop() || "bin";
    return { buffer, ext };
  }

  return null;
}

export async function POST(request: Request) {
  return handleBulkDownload(request);
}

export async function GET(request: Request) {
  return handleBulkDownload(request);
}

async function handleBulkDownload(request: Request) {
  try {
    const db = getDb();
    let selectedIds: string[] = [];
    let personId: string | null = null;
    let category: string | null = null;
    let isAll = false;
    let includeFamily = false;

    // Parse params from URL query or JSON body
    if (request.method === "POST") {
      try {
        const body = await request.json();
        if (Array.isArray(body.ids)) selectedIds = body.ids;
        if (body.person_id) personId = body.person_id;
        if (body.category) category = body.category;
        if (body.all) isAll = Boolean(body.all);
        if (body.include_family) includeFamily = Boolean(body.include_family);
      } catch {
        // Fallback to URL params
      }
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get("all") === "true") isAll = true;
    if (searchParams.get("person_id")) personId = searchParams.get("person_id");
    if (searchParams.get("category")) category = searchParams.get("category");
    if (searchParams.get("include_family") === "true") includeFamily = true;
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      selectedIds = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    }

    // Build SQL Query
    let query = `
      SELECT d.*, fm.first_name, fm.last_name
      FROM documents d
      JOIN family_members fm ON d.person_id = fm.id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (selectedIds.length > 0) {
      const placeholders = selectedIds.map(() => "?").join(",");
      query += ` AND d.id IN (${placeholders})`;
      params.push(...selectedIds);
    } else if (personId && personId !== "All") {
      if (includeFamily) {
        // Find immediate household (spouse + children)
        const relIds = new Set<string>([personId]);
        const marriages = db
          .prepare(
            `SELECT * FROM marriages WHERE (person1_id = ? OR person2_id = ?) AND status != 'separated'`
          )
          .all(personId, personId) as { person1_id: string; person2_id: string }[];
        for (const m of marriages) {
          relIds.add(m.person1_id === personId ? m.person2_id : m.person1_id);
        }
        for (const pid of Array.from(relIds)) {
          const childRels = db
            .prepare(`SELECT related_person_id FROM relationships WHERE person_id = ? AND relationship_type = 'child'`)
            .all(pid) as { related_person_id: string }[];
          childRels.forEach((c) => relIds.add(c.related_person_id));
        }

        const placeholders = Array.from(relIds).map(() => "?").join(",");
        query += ` AND d.person_id IN (${placeholders})`;
        params.push(...Array.from(relIds));
      } else {
        query += ` AND d.person_id = ?`;
        params.push(personId);
      }
    }

    if (category && category !== "All") {
      query += ` AND d.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY fm.first_name ASC, d.uploaded_at DESC`;

    const docs = db.prepare(query).all(...params) as DocumentWithMember[];

    if (docs.length === 0) {
      return NextResponse.json(
        { error: "No documents found matching the requested selection." },
        { status: 404 }
      );
    }

    // Initialize ZIP Archive
    const zip = new JSZip();
    const manifestLines: string[] = [
      "=================================================================",
      "               PINJARI FAMILY ARCHIVE - BULK EXPORT              ",
      "=================================================================",
      `Export Generated : ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
      `Total Documents  : ${docs.length}`,
      "-----------------------------------------------------------------",
      "DOCUMENTS LIST:",
    ];

    let packedCount = 0;

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const memberName = `${doc.first_name} ${doc.last_name || "Pinjari"}`.trim();
      const folderName = memberName.replace(/[/\\?%*:|"<>]/g, "_");

      try {
        const result = await getDocumentBuffer(doc);
        if (result && result.buffer.length > 0) {
          const cleanDocName = doc.name.replace(/[/\\?%*:|"<>]/g, "_");
          const ext = result.ext;
          const fileName = cleanDocName.endsWith(`.${ext}`) ? cleanDocName : `${cleanDocName}.${ext}`;
          const zipPath = `${folderName}/${fileName}`;

          zip.file(zipPath, result.buffer);
          manifestLines.push(
            `[✓] ${zipPath.padEnd(50)} | ${doc.category.padEnd(16)} | ${(result.buffer.length / 1024).toFixed(0)} KB`
          );
          packedCount++;
        } else {
          manifestLines.push(`[!] Failed to bundle: ${memberName} - ${doc.name}`);
        }
      } catch (err) {
        console.error(`Error packing document ${doc.id}:`, err);
        manifestLines.push(`[!] Error packaging: ${memberName} - ${doc.name}`);
      }
    }

    manifestLines.push("=================================================================");
    manifestLines.push(`Successfully packaged ${packedCount} of ${docs.length} documents.`);
    manifestLines.push("Pinjari Family Digital Archive • Protected Family Record");

    // Add Manifest file to zip root
    zip.file("ARCHIVE_MANIFEST.txt", manifestLines.join("\r\n"));

    // Generate Zip Buffer
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    let downloadName = `Pinjari_Family_Documents_${timestamp}.zip`;
    if (personId && personId !== "All") {
      const targetMember = docs[0]?.first_name || personId;
      downloadName = `${targetMember}_Family_Documents_${timestamp}.zip`;
    }

    return new Response(zipBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadName)}"`,
        "Content-Length": zipBuffer.length.toString(),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Bulk download error:", error);
    return NextResponse.json(
      { error: "Failed to generate bulk documents ZIP archive." },
      { status: 500 }
    );
  }
}
