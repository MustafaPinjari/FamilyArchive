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

    // Search candidates in priority order: PHOTOS_DIR, public/photos, public, data/photos
    let fileName = decodedId.replace(/^\/?(photos\/)?/, "");
    const candidates = [
      path.join(PHOTOS_DIR, fileName),
      path.join(process.cwd(), "public", "photos", fileName),
      path.join(process.cwd(), "public", fileName),
      path.join(process.cwd(), "data", "photos", fileName),
    ];

    let targetPath: string | null = null;
    for (const candidate of candidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
        targetPath = candidate;
        break;
      }
    }

    if (!targetPath) {
      // Lookup in photos table by ID or file_path
      const db = getDb();
      const photo = db.prepare("SELECT * FROM photos WHERE id = ? OR file_path = ?").get(decodedId, fileName) as
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
        for (const candidate of [
          path.join(PHOTOS_DIR, fileName),
          path.join(process.cwd(), "public", "photos", fileName),
          path.join(process.cwd(), "public", fileName),
          path.join(process.cwd(), "data", "photos", fileName),
        ]) {
          if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
            targetPath = candidate;
            break;
          }
        }
      }
    }

    // If still not found, check family_members table for matching profile_photo
    if (!targetPath) {
      try {
        const db = getDb();
        const member = db.prepare("SELECT first_name, profile_photo FROM family_members WHERE profile_photo LIKE ? OR id = ?").get(`%${fileName}%`, decodedId) as
          | { first_name: string; profile_photo: string | null }
          | undefined;

        if (member?.profile_photo?.startsWith("gdrive:")) {
          const gdriveFileId = member.profile_photo.replace("gdrive:", "");
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

        if (member?.profile_photo?.startsWith("data:")) {
          const parts = member.profile_photo.split(",");
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
      } catch {
        // continue to fallback
      }
    }

    if (!targetPath || !fs.existsSync(/*turbopackIgnore: true*/ targetPath)) {
      // Graceful fallback: return a handsome SVG avatar instead of a broken 404 image icon
      const initial = (decodedId.replace(/[^a-zA-Z]/g, "")[0] || "P").toUpperCase();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#78350f" />
            <stop offset="100%" stop-color="#451a03" />
          </linearGradient>
        </defs>
        <rect width="128" height="128" rx="32" fill="url(#g)" />
        <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="52" fill="#fef3c7">${initial}</text>
      </svg>`;
      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const fileBuffer = fs.readFileSync(/*turbopackIgnore: true*/ targetPath);
    const ext = targetPath.split(".").pop()?.toLowerCase();
    let contentType = "image/jpeg";
    if (ext === "png") contentType = "image/png";
    if (ext === "webp") contentType = "image/webp";
    if (ext === "gif") contentType = "image/gif";
    if (ext === "svg") contentType = "image/svg+xml";

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("View photo error:", error);
    // Even on server error, return SVG fallback so browser never displays broken icon
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="32" fill="#78350f" /><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="52" fill="#fef3c7">P</text></svg>`;
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    });
  }
}
