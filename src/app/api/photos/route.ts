import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, PHOTOS_DIR } from "@/lib/db";
import { logAuditAction } from "@/lib/audit";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const albumId = searchParams.get("albumId");
    const memberId = searchParams.get("memberId");

    const db = getDb();

    // Albums
    const albums = db.prepare("SELECT * FROM photo_albums ORDER BY name ASC").all();

    // Photos query
    let query = `
      SELECT p.*, pa.name as album_name
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (albumId) {
      query += " AND p.album_id = ?";
      params.push(albumId);
    }

    if (memberId) {
      query += ` AND p.id IN (SELECT photo_id FROM photo_members WHERE member_id = ?)`;
      params.push(memberId);
    }

    query += " ORDER BY p.uploaded_at DESC";

    const photos = db.prepare(query).all(...params) as {
      id: string;
      album_id: string;
      file_path: string;
      caption: string | null;
      date_taken: string | null;
      uploaded_by: string;
      uploaded_at: string;
      album_name: string;
      tagged_members?: { id: string; first_name: string; last_name: string | null }[];
    }[];

    // Attach tagged members for each photo
    const memberTagStmt = db.prepare(`
      SELECT fm.id, fm.first_name, fm.last_name
      FROM family_members fm
      JOIN photo_members pm ON fm.id = pm.member_id
      WHERE pm.photo_id = ?
    `);

    for (const p of photos) {
      p.tagged_members = memberTagStmt.all(p.id) as { id: string; first_name: string; last_name: string | null }[];
    }

    return NextResponse.json({ success: true, albums, photos });
  } catch (error) {
    console.error("Photos list error:", error);
    return NextResponse.json({ error: "Unable to retrieve family photos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === "VIEWER") {
      return NextResponse.json({ error: "Viewers cannot upload photos." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const albumId = (formData.get("album_id") as string) || "album-memories";
    const caption = (formData.get("caption") as string) || null;
    const dateTaken = (formData.get("date_taken") as string) || null;
    const taggedMembersRaw = formData.get("tagged_members") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No photo file provided." }, { status: 400 });
    }

    const db = getDb();
    const photoId = `photo-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedFileName = `${photoId}-${sanitizedFilename}`;
    const targetFilePath = path.join(PHOTOS_DIR, storedFileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    let storedPath = storedFileName;

    const { isGoogleDriveConfigured, uploadFileToDrive } = await import("@/lib/gdrive");
    if (isGoogleDriveConfigured()) {
      try {
        const driveResult = await uploadFileToDrive({
          filename: `${photoId}-${sanitizedFilename}`,
          mimeType: file.type || "image/jpeg",
          buffer,
        });
        storedPath = `gdrive:${driveResult.id}`;
      } catch (driveErr) {
        console.error("Google Drive photo upload failed, falling back to local storage:", driveErr);
        fs.writeFileSync(targetFilePath, buffer);
        storedPath = storedFileName;
      }
    } else {
      fs.writeFileSync(targetFilePath, buffer);
      storedPath = storedFileName;
    }

    const now = new Date().toISOString();

    const runTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO photos (id, album_id, file_path, caption, date_taken, uploaded_by, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(photoId, albumId, storedPath, caption?.trim() || null, dateTaken || null, user.username, now);

      if (taggedMembersRaw) {
        try {
          const memberIds: string[] = JSON.parse(taggedMembersRaw);
          const insertTag = db.prepare("INSERT INTO photo_members (id, photo_id, member_id) VALUES (?, ?, ?)");
          for (const mId of memberIds) {
            insertTag.run(`pm-${photoId}-${mId}`, photoId, mId);
          }
        } catch {
          // ignore parse errors for tags
        }
      }
    });

    runTransaction();

    logAuditAction({
      userId: user.id,
      userName: user.username,
      action: "UPLOAD_PHOTO",
      targetType: "PHOTO",
      targetId: photoId,
      targetName: caption || sanitizedFilename,
      details: `Uploaded new family photo into album ${albumId}.`,
    });

    return NextResponse.json({ success: true, photoId }, { status: 201 });
  } catch (error) {
    console.error("Upload photo error:", error);
    return NextResponse.json({ error: "Failed to upload photo." }, { status: 500 });
  }
}
