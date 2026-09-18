import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/session";
import { getDb, VAULT_DIR, PHOTOS_DIR } from "@/lib/db";
import { isGoogleDriveConfigured, uploadFileToDrive } from "@/lib/gdrive";
import { logAuditAction } from "@/lib/audit";
import path from "path";
import fs from "fs";

export async function POST() {
  try {
    const admin = await requireAdminUser();

    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        { error: "Google Drive is not configured. Please set credentials in environment or settings first." },
        { status: 400 }
      );
    }

    const db = getDb();
    let syncedDocuments = 0;
    let syncedPhotos = 0;
    let errors: string[] = [];

    // 1. Sync local documents in vault to Google Drive
    const localDocs = db
      .prepare("SELECT id, name, file_path, file_type FROM documents WHERE file_path NOT LIKE 'gdrive:%'")
      .all() as { id: string; name: string; file_path: string; file_type: string }[];

    for (const doc of localDocs) {
      try {
        const localPath = path.join(VAULT_DIR, doc.file_path);
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath);
          const driveResult = await uploadFileToDrive({
            filename: `${doc.id}-${doc.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
            mimeType: doc.file_type || "application/octet-stream",
            buffer,
          });

          db.prepare("UPDATE documents SET file_path = ?, updated_at = ? WHERE id = ?").run(
            `gdrive:${driveResult.id}`,
            new Date().toISOString(),
            doc.id
          );
          syncedDocuments++;
        }
      } catch (err: unknown) {
        const error = err as Error;
        errors.push(`Document ${doc.name}: ${error.message}`);
      }
    }

    // 2. Sync local photos to Google Drive
    const localPhotos = db
      .prepare("SELECT id, file_path, caption FROM photos WHERE file_path NOT LIKE 'gdrive:%'")
      .all() as { id: string; file_path: string; caption: string | null }[];

    for (const photo of localPhotos) {
      try {
        const localPath = path.join(PHOTOS_DIR, photo.file_path);
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath);
          const driveResult = await uploadFileToDrive({
            filename: photo.file_path,
            mimeType: "image/jpeg",
            buffer,
          });

          db.prepare("UPDATE photos SET file_path = ? WHERE id = ?").run(
            `gdrive:${driveResult.id}`,
            photo.id
          );
          syncedPhotos++;
        }
      } catch (err: unknown) {
        const error = err as Error;
        errors.push(`Photo ${photo.id}: ${error.message}`);
      }
    }

    logAuditAction({
      userId: admin.id,
      userName: admin.username,
      action: "GDRIVE_SYNC",
      targetType: "STORAGE",
      targetId: "gdrive",
      targetName: "Google Drive Migration",
      details: `Migrated ${syncedDocuments} document(s) and ${syncedPhotos} photo(s) to Google Drive.`,
    });

    return NextResponse.json({
      success: true,
      syncedDocuments,
      syncedPhotos,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Failed to sync files to Google Drive." },
      { status: 500 }
    );
  }
}
