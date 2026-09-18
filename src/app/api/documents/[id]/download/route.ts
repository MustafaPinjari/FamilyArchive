import { NextResponse } from "next/server";
import { getDb, VAULT_DIR } from "@/lib/db";
import { FamilyDocument } from "@/types";
import { getDriveFileStream } from "@/lib/gdrive";
import { Readable } from "stream";
import path from "path";
import fs from "fs";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const db = getDb();

    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as FamilyDocument | undefined;
    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    // Direct Data URI download (100% resilient across stateless serverless Netlify containers)
    if (doc.file_path && doc.file_path.startsWith("data:")) {
      const match = doc.file_path.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const fileBuffer = Buffer.from(match[2], "base64");
        const ext = mimeType.includes("pdf") ? "pdf" : mimeType.includes("jpeg") ? "jpg" : mimeType.includes("png") ? "png" : "bin";
        const downloadFilename = doc.name.endsWith(`.${ext}`) ? doc.name : `${doc.name}.${ext}`;
        return new Response(fileBuffer, {
          headers: {
            "Content-Type": mimeType || doc.file_type || "application/octet-stream",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadFilename)}"`,
            "Content-Length": fileBuffer.length.toString(),
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    // Google Drive direct download streaming
    if (doc.file_path && doc.file_path.startsWith("gdrive:")) {
      const gdriveFileId = doc.file_path.replace("gdrive:", "");
      try {
        const { stream, name: driveName, mimeType, size } = await getDriveFileStream(gdriveFileId);
        const webStream = Readable.toWeb(stream);

        // Derive clean extension
        const extMatch = driveName.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1] : (doc.file_type?.includes("pdf") ? "pdf" : "bin");
        const downloadFilename = doc.name.endsWith(`.${ext}`) ? doc.name : `${doc.name}.${ext}`;

        const headers: Record<string, string> = {
          "Content-Type": mimeType || doc.file_type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadFilename)}"`,
          "X-Content-Type-Options": "nosniff",
        };
        if (size) headers["Content-Length"] = size.toString();

        return new Response(webStream as unknown as BodyInit, { headers });
      } catch (driveErr) {
        console.error("Failed to stream download from Google Drive:", driveErr);
        // Fallback: check if local backup exists
        const fallbackPath = path.join(VAULT_DIR, doc.id);
        if (fs.existsSync(fallbackPath)) {
          const fileBuffer = fs.readFileSync(fallbackPath);
          return new Response(fileBuffer, {
            headers: {
              "Content-Type": doc.file_type || "application/octet-stream",
              "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.name)}"`,
              "Content-Length": doc.file_size.toString(),
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
        return NextResponse.json({ error: "Unable to download document from cloud storage." }, { status: 502 });
      }
    }

    // Local vault storage fallback
    const filePath = path.join(VAULT_DIR, doc.file_path);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Document file is missing from vault storage." }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const filename = `${doc.name}.${doc.file_path.split(".").pop() || "bin"}`;

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": doc.file_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": doc.file_size.toString(),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Document download error:", error);
    return NextResponse.json({ error: "Failed to download document." }, { status: 500 });
  }
}
