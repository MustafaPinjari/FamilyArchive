import { getDb, PHOTOS_DIR } from "@/lib/db";
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
    const decodedId = decodeURIComponent(id);

    // If ID directly starts with data:
    if (decodedId.startsWith("data:")) {
      const parts = decodedId.split(",");
      const mime = parts[0]?.match(/:(.*?);/)?.[1] || "image/jpeg";
      const buffer = Buffer.from(parts[1] || "", "base64");
      return new Response(buffer, {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // If ID directly starts with gdrive:
    if (decodedId.startsWith("gdrive:")) {
      const gdriveFileId = decodedId.replace("gdrive:", "");
      const { stream, mimeType } = await getDriveFileStream(gdriveFileId);
      const webStream = Readable.toWeb(stream);
      return new Response(webStream as unknown as BodyInit, {
        headers: {
          "Content-Type": mimeType || "image/jpeg",
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // Check if filename is directly in PHOTOS_DIR (e.g. profile-xxx.jpg)
    let fileName = decodedId;
    let targetPath = path.join(PHOTOS_DIR, fileName);

    if (!fs.existsSync(targetPath)) {
      // Lookup in photos table by ID
      const db = getDb();
      const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(decodedId) as
        | { file_path: string }
        | undefined;

      if (photo) {
        fileName = photo.file_path;
        if (fileName.startsWith("gdrive:")) {
          const gdriveFileId = fileName.replace("gdrive:", "");
          const { stream, mimeType } = await getDriveFileStream(gdriveFileId);
          const webStream = Readable.toWeb(stream);
          return new Response(webStream as unknown as BodyInit, {
            headers: {
              "Content-Type": mimeType || "image/jpeg",
              "Cache-Control": "public, max-age=86400",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
        targetPath = path.join(PHOTOS_DIR, fileName);
      }
    }

    if (!fs.existsSync(targetPath)) {
      return new Response("Photo not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(targetPath);
    const ext = fileName.split(".").pop()?.toLowerCase();
    let contentType = "image/jpeg";
    if (ext === "png") contentType = "image/png";
    if (ext === "webp") contentType = "image/webp";
    if (ext === "gif") contentType = "image/gif";

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("View photo error:", error);
    return new Response("Failed to render photo.", { status: 500 });
  }
}
