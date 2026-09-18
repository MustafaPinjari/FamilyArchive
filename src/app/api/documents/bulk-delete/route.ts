import { NextResponse } from "next/server";
import { getDb, VAULT_DIR } from "@/lib/db";
import { logAuditAction } from "@/lib/audit";
import path from "path";
import fs from "fs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentIds } = body as { documentIds?: string[] };

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: "No document IDs provided." }, { status: 400 });
    }

    const db = getDb();
    const placeholders = documentIds.map(() => "?").join(",");

    const docs = db
      .prepare(`SELECT id, file_path, name FROM documents WHERE id IN (${placeholders})`)
      .all(...documentIds) as { id: string; file_path: string; name: string }[];

    // Unlink physical files or delete from Google Drive
    for (const doc of docs) {
      if (doc.file_path && doc.file_path.startsWith("gdrive:")) {
        const gdriveFileId = doc.file_path.replace("gdrive:", "");
        try {
          const { deleteFileFromDrive } = await import("@/lib/gdrive");
          await deleteFileFromDrive(gdriveFileId);
        } catch (e) {
          console.error("Failed to delete drive file:", gdriveFileId, e);
        }
      } else {
        const filePath = path.join(VAULT_DIR, doc.file_path);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.error("Failed to delete file:", filePath, e);
          }
        }
      }
    }

    // Delete DB rows
    db.prepare(`DELETE FROM documents WHERE id IN (${placeholders})`).run(...documentIds);

    // Audit log
    logAuditAction({
      userId: "admin",
      userName: "Family Admin",
      action: "BULK_DELETE_DOCUMENTS",
      targetType: "DOCUMENT",
      targetId: "bulk",
      targetName: `${docs.length} Documents`,
      details: `Bulk deleted ${docs.length} documents: ${docs.map((d) => d.name).join(", ")}.`,
    });

    return NextResponse.json({
      success: true,
      deletedCount: docs.length,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json({ error: "Failed to delete documents." }, { status: 500 });
  }
}
