import { NextResponse } from "next/server";
import { getDb, PHOTOS_DIR } from "@/lib/db";
import { logAuditAction } from "@/lib/audit";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No photo file provided." }, { status: 400 });
    }

    const db = getDb();
    const member = db.prepare("SELECT * FROM family_members WHERE id = ?").get(id) as
      | { first_name: string; profile_photo: string | null }
      | undefined;

    if (!member) {
      return NextResponse.json({ error: "Family member not found." }, { status: 404 });
    }

    // Save photo file
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `profile-${id}-${Date.now()}.${ext}`;
    const targetPath = path.join(PHOTOS_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    let storedValue = filename;

    const { isGoogleDriveConfigured, uploadFileToDrive, deleteFileFromDrive } = await import("@/lib/gdrive");
    if (isGoogleDriveConfigured()) {
      try {
        const driveResult = await uploadFileToDrive({
          filename,
          mimeType: file.type || "image/jpeg",
          buffer,
        });
        storedValue = `gdrive:${driveResult.id}`;
      } catch (driveErr) {
        console.error("Google Drive profile photo upload failed, falling back to local:", driveErr);
        fs.writeFileSync(targetPath, buffer);
      }
    } else {
      fs.writeFileSync(targetPath, buffer);
    }

    // Delete old profile photo if exists
    if (member.profile_photo) {
      if (member.profile_photo.startsWith("gdrive:")) {
        const oldDriveId = member.profile_photo.replace("gdrive:", "");
        try {
          await deleteFileFromDrive(oldDriveId);
        } catch {
          // ignore
        }
      } else {
        const oldPath = path.join(PHOTOS_DIR, member.profile_photo);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch {
            // ignore
          }
        }
      }
    }

    const photoUrl = `/api/photos/${encodeURIComponent(storedValue)}/view`;

    // Update member record in DB
    db.prepare("UPDATE family_members SET profile_photo = ?, updated_at = ? WHERE id = ?").run(
      storedValue,
      new Date().toISOString(),
      id
    );

    logAuditAction({
      userId: "admin",
      userName: "Family Admin",
      action: "UPDATE_PROFILE_PHOTO",
      targetType: "FAMILY_MEMBER",
      targetId: id,
      targetName: member.first_name,
      details: `Updated profile photo for ${member.first_name}.`,
    });

    const updated = db.prepare("SELECT * FROM family_members WHERE id = ?").get(id);

    return NextResponse.json({ success: true, member: updated, photoUrl });
  } catch (error) {
    console.error("Profile photo upload error:", error);
    return NextResponse.json({ error: "Failed to update profile photo." }, { status: 500 });
  }
}
