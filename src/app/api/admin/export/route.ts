import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { logAuditAction } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await requireAdminUser();
    const db = getDb();

    const familyMembers = db.prepare("SELECT * FROM family_members").all();
    const relationships = db.prepare("SELECT * FROM relationships").all();
    const marriages = db.prepare("SELECT * FROM marriages").all();
    const documents = db.prepare("SELECT id, person_id, name, category, description, file_type, file_size, document_number, issue_date, expiry_date, visibility, uploaded_by, uploaded_at FROM documents").all();
    const albums = db.prepare("SELECT * FROM photo_albums").all();
    const photos = db.prepare("SELECT id, album_id, caption, date_taken, uploaded_by, uploaded_at FROM photos").all();
    const photoMembers = db.prepare("SELECT * FROM photo_members").all();
    const settings = db.prepare("SELECT * FROM family_settings").all();

    logAuditAction({
      userId: admin.id,
      userName: admin.username,
      action: "EXPORT_ARCHIVE_DATA",
      targetType: "SYSTEM",
      targetId: "archive-backup",
      targetName: "Full Family Archive Backup",
      details: "Exported structured JSON backup of family tree, relationships, and vault metadata.",
    });

    const exportData = {
      archive_name: "Our Family Archive",
      exported_at: new Date().toISOString(),
      exported_by: admin.username,
      schema_version: "1.0",
      stats: {
        total_members: familyMembers.length,
        total_relationships: relationships.length,
        total_marriages: marriages.length,
        total_documents: documents.length,
        total_photos: photos.length,
      },
      data: {
        family_members: familyMembers,
        relationships,
        marriages,
        documents,
        photo_albums: albums,
        photos,
        photo_members: photoMembers,
        settings,
      },
    };

    const filename = `family-archive-backup-${new Date().toISOString().split("T")[0]}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Unauthorized" }, { status: 403 });
  }
}
