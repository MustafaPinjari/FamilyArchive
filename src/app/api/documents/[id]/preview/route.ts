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

    // Google Drive direct streaming (inline preview without visiting Google Drive)
    if (doc.file_path && doc.file_path.startsWith("gdrive:")) {
      const gdriveFileId = doc.file_path.replace("gdrive:", "");
      try {
        const { stream, mimeType, size } = await getDriveFileStream(gdriveFileId);
        const webStream = Readable.toWeb(stream);

        const headers: Record<string, string> = {
          "Content-Type": mimeType || doc.file_type || "application/octet-stream",
          "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, max-age=3600",
        };
        if (size) headers["Content-Length"] = size.toString();

        return new Response(webStream as unknown as BodyInit, { headers });
      } catch (driveErr) {
        console.error("Failed to stream preview from Google Drive:", driveErr);
        // Fallback: check if local backup exists
        const fallbackPath = path.join(VAULT_DIR, doc.id);
        if (fs.existsSync(fallbackPath)) {
          const fileBuffer = fs.readFileSync(fallbackPath);
          return new Response(fileBuffer, {
            headers: {
              "Content-Type": doc.file_type || "application/octet-stream",
              "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
              "Content-Length": doc.file_size.toString(),
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
        return NextResponse.json({ error: "Unable to retrieve document from cloud storage." }, { status: 502 });
      }
    }

    // Local vault storage fallback
    const filePath = path.join(VAULT_DIR, doc.file_path);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Document file is missing from vault storage." }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": doc.file_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
        "Content-Length": doc.file_size.toString(),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Document preview error:", error);
    return NextResponse.json({ error: "Failed to preview document." }, { status: 500 });
  }
}
