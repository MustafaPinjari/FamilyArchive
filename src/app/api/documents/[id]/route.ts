import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, VAULT_DIR } from "@/lib/db";
import { logAuditAction } from "@/lib/audit";
import { FamilyDocument } from "@/types";
import path from "path";
import fs from "fs";

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const db = getDb();

    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as FamilyDocument | undefined;
    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const isPrivileged = user.role === "SUPER_ADMIN" || user.role === "FAMILY_ADMIN";
    const isOwner = user.family_member_id === doc.person_id;

    if (!isPrivileged && !isOwner) {
      return NextResponse.json(
        { error: "You do not have permission to delete this document." },
        { status: 403 }
      );
    }

    // Delete from Google Drive or local vault
    if (doc.file_path && doc.file_path.startsWith("gdrive:")) {
      const gdriveFileId = doc.file_path.replace("gdrive:", "");
      try {
        const { deleteFileFromDrive } = await import("@/lib/gdrive");
        await deleteFileFromDrive(gdriveFileId);
      } catch (driveErr) {
        console.error("Failed to delete file from Google Drive:", driveErr);
      }
    } else {
      const filePath = path.join(VAULT_DIR, doc.file_path);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error("Failed to delete physical file:", err);
        }
      }
    }

    // Delete DB record
    db.prepare("DELETE FROM documents WHERE id = ?").run(id);

    // Audit log
    logAuditAction({
      userId: user.id,
      userName: user.username,
      action: "DELETE_DOCUMENT",
      targetType: "DOCUMENT",
      targetId: id,
      targetName: doc.name,
      details: `Permanently deleted document "${doc.name}" from vault.`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json({ error: "Unable to delete document." }, { status: 500 });
  }
}
