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
    const rawId = decodeURIComponent(id).trim();

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No photo file provided." }, { status: 400 });
    }

    const db = getDb();
    const member = db
      .prepare(
        "SELECT id, first_name, profile_photo FROM family_members WHERE LOWER(id) = LOWER(?) OR LOWER(first_name) = LOWER(?)"
      )
      .get(rawId, rawId) as
      | { id: string; first_name: string; profile_photo: string | null }
      | undefined;

    if (!member) {
      return NextResponse.json({ error: `Family member '${rawId}' not found.` }, { status: 404 });
    }

    const memberRealId = member.id;

    // Ensure PHOTOS_DIR exists
    if (!fs.existsSync(PHOTOS_DIR)) {
      try {
        fs.mkdirSync(PHOTOS_DIR, { recursive: true });
      } catch (err) {
        console.warn("Could not create PHOTOS_DIR:", err);
      }
    }

    // Save photo file
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `profile-${memberRealId}-${Date.now()}.${ext}`;
    const targetPath = path.join(PHOTOS_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    let storedValue = filename;
    let uploadedToDrive = false;

    try {
      const { isGoogleDriveConfigured, uploadFileToDrive } = await import("@/lib/gdrive");
      if (isGoogleDriveConfigured()) {
        const driveResult = await uploadFileToDrive({
          filename,
          mimeType: file.type || "image/jpeg",
          buffer,
        });
        if (driveResult && driveResult.id) {
          storedValue = `gdrive:${driveResult.id}`;
          uploadedToDrive = true;
        }
      }
    } catch (driveErr) {
      console.error("Google Drive profile photo upload failed, attempting local save:", driveErr);
    }

    if (!uploadedToDrive) {
      try {
        fs.writeFileSync(targetPath, buffer);
      } catch (fsErr) {
        console.error("Local disk save failed (read-only filesystem):", fsErr);
        // Fallback for read-only serverless environments without Google Drive: store as inline data URI
        const base64 = buffer.toString("base64");
        storedValue = `data:${file.type || "image/jpeg"};base64,${base64}`;
      }
    }

    // Delete old profile photo if exists
    if (member.profile_photo) {
      if (member.profile_photo.startsWith("gdrive:")) {
        const oldDriveId = member.profile_photo.replace("gdrive:", "");
        try {
          const { deleteFileFromDrive } = await import("@/lib/gdrive");
          await deleteFileFromDrive(oldDriveId);
        } catch {
          // ignore
        }
      } else if (!member.profile_photo.startsWith("data:")) {
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

    let photoUrl = `/api/photos/${encodeURIComponent(storedValue)}/view`;
    if (storedValue.startsWith("data:")) {
      photoUrl = storedValue;
    }

    // Update member record in DB
    db.prepare("UPDATE family_members SET profile_photo = ?, updated_at = ? WHERE id = ?").run(
      storedValue,
      new Date().toISOString(),
      memberRealId
    );

    logAuditAction({
      userId: "admin",
      userName: "Family Admin",
      action: "UPDATE_PROFILE_PHOTO",
      targetType: "FAMILY_MEMBER",
      targetId: memberRealId,
      targetName: member.first_name,
      details: `Updated profile photo for ${member.first_name}.`,
    });

    const updated = db.prepare("SELECT * FROM family_members WHERE id = ?").get(memberRealId);

    // Return BOTH photo_url and photoUrl for complete caller compatibility
    return NextResponse.json({
      success: true,
      member: updated,
      photo_url: photoUrl,
      photoUrl: photoUrl,
    });
  } catch (error) {
    console.error("Profile photo upload error:", error);
    return NextResponse.json({ error: "Failed to update profile photo." }, { status: 500 });
  }
}
