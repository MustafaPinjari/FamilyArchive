import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getDriveClient, getGoogleDriveConfig } from "@/lib/gdrive";
import { logAuditAction } from "@/lib/audit";

interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
}

// Known spelling / nickname aliases between folder names and database IDs
const NAME_ALIASES: Record<string, string> = {
  juned: "junaid",
  atika: "atiqa",
  sharukh: "sharukh",
  channi: "chinni",
  mohammed: "mohammad",
};

export async function POST() {
  try {
    const admin = await requireAdminUser();
    const config = getGoogleDriveConfig();

    if (!config.folderId) {
      return NextResponse.json(
        { error: "Google Drive folder ID is not configured." },
        { status: 400 }
      );
    }

    const drive = getDriveClient();
    const db = getDb();

    // Fetch members from database
    const members = db
      .prepare("SELECT id, first_name, last_name, nickname, profile_photo FROM family_members")
      .all() as {
      id: string;
      first_name: string;
      last_name: string | null;
      nickname: string | null;
      profile_photo: string | null;
    }[];

    // Build fast lookup map: normalized name -> member
    const memberLookup = new Map<string, typeof members[0]>();
    for (const m of members) {
      memberLookup.set(m.id.toLowerCase(), m);
      memberLookup.set(m.first_name.toLowerCase(), m);
      if (m.nickname) {
        memberLookup.set(m.nickname.toLowerCase(), m);
      }
    }

    // Function to resolve member from a list of path segments (closest folder first)
    function resolveMember(pathSegments: string[], filename: string): typeof members[0] | null {
      // 1. Check path segments from deepest folder upwards
      for (let i = pathSegments.length - 1; i >= 0; i--) {
        const seg = pathSegments[i].trim().toLowerCase();
        if (NAME_ALIASES[seg] && memberLookup.has(NAME_ALIASES[seg])) {
          return memberLookup.get(NAME_ALIASES[seg])!;
        }
        if (memberLookup.has(seg)) {
          return memberLookup.get(seg)!;
        }
      }

      // 2. Check filename
      const lowerFile = filename.toLowerCase();
      for (const [key, m] of memberLookup.entries()) {
        if (lowerFile.includes(key)) {
          return m;
        }
      }
      for (const [alias, targetId] of Object.entries(NAME_ALIASES)) {
        if (lowerFile.includes(alias) && memberLookup.has(targetId)) {
          return memberLookup.get(targetId)!;
        }
      }

      return null;
    }

    // Determine clean title & category
    function categorizeFile(filename: string, memberName: string): { title: string; category: string; isPassportPhoto: boolean } {
      const lower = filename.toLowerCase();
      let isPassportPhoto = false;

      if (/passportphoto|passport.*photo/i.test(lower)) {
        isPassportPhoto = true;
        return {
          title: `${memberName} Passport Photo`,
          category: "Identity",
          isPassportPhoto,
        };
      }

      if (/adhar|aadhaar/i.test(lower)) {
        return {
          title: `Aadhaar Card (${memberName})`,
          category: "Identity",
          isPassportPhoto,
        };
      }

      if (/pancard|pan.*card/i.test(lower)) {
        return {
          title: `PAN Card (${memberName})`,
          category: "Identity",
          isPassportPhoto,
        };
      }

      if (/election|voter/i.test(lower)) {
        return {
          title: `Voter ID / Election Card (${memberName})`,
          category: "Identity",
          isPassportPhoto,
        };
      }

      if (/abha/i.test(lower)) {
        return {
          title: `ABHA Health Card (${memberName})`,
          category: "Medical",
          isPassportPhoto,
        };
      }

      if (/muc[a-z0-9]+/i.test(lower) || /health|medical|prescription/i.test(lower)) {
        return {
          title: `Health Card / Medical Record (${memberName})`,
          category: "Medical",
          isPassportPhoto,
        };
      }

      if (/property|registry|land|deed|estate/i.test(lower)) {
        return {
          title: `Property Document (${memberName})`,
          category: "Property",
          isPassportPhoto,
        };
      }

      if (/marksheet|degree|school|certificate|diploma/i.test(lower)) {
        return {
          title: `Educational Document (${memberName})`,
          category: "Education",
          isPassportPhoto,
        };
      }

      // Default: clean stem
      const cleanStem = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      return {
        title: `${cleanStem} (${memberName})`,
        category: "General",
        isPassportPhoto,
      };
    }

    // Recursive folder crawler
    const allFoundFiles: { file: DriveFileItem; pathSegments: string[] }[] = [];

    async function crawlFolder(folderId: string, currentPath: string[]) {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "files(id, name, mimeType, size, createdTime)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1000,
      });

      const items = res.data.files || [];
      for (const item of items) {
        if (!item.id || !item.name) continue;
        if (item.mimeType === "application/vnd.google-apps.folder") {
          await crawlFolder(item.id, [...currentPath, item.name]);
        } else {
          allFoundFiles.push({
            file: {
              id: item.id,
              name: item.name,
              mimeType: item.mimeType || "application/octet-stream",
              size: item.size ?? undefined,
              createdTime: item.createdTime ?? undefined,
            },
            pathSegments: currentPath,
          });
        }
      }
    }

    // Start crawl from configured root folder
    await crawlFolder(config.folderId, []);

    let importedCount = 0;
    let updatedCount = 0;
    let avatarUpdatedCount = 0;
    const importedDocs: { title: string; member: string; folder: string }[] = [];
    const now = new Date().toISOString();

    const insertDocStmt = db.prepare(`
      INSERT INTO documents (
        id, person_id, name, category, description, file_path, file_type,
        file_size, document_number, issue_date, expiry_date, notes,
        visibility, uploaded_by, uploaded_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateDocStmt = db.prepare(`
      UPDATE documents 
      SET person_id = ?, name = ?, category = ?, description = ?, file_type = ?, file_size = ?, updated_at = ?
      WHERE id = ?
    `);

    const setProfilePhotoStmt = db.prepare(`
      UPDATE family_members
      SET profile_photo = ?, updated_at = ?
      WHERE id = ?
    `);

    const runTx = db.transaction(() => {
      for (const { file, pathSegments } of allFoundFiles) {
        if (!file.id || !file.name) continue;

        const resolved = resolveMember(pathSegments, file.name);
        const memberId = resolved?.id || "mukhtar";
        const memberName = resolved?.first_name || "Family Member";

        const { title, category, isPassportPhoto } = categorizeFile(file.name, memberName);
        const folderPathDisplay = pathSegments.join(" > ");
        const driveFilePath = `gdrive:${file.id}`;
        const fileSize = file.size ? parseInt(file.size, 10) : 0;

        // Automatically link passport photo to family member avatar if not set
        if (isPassportPhoto && resolved && (!resolved.profile_photo || !resolved.profile_photo.startsWith("gdrive:"))) {
          setProfilePhotoStmt.run(driveFilePath, now, resolved.id);
          resolved.profile_photo = driveFilePath;
          avatarUpdatedCount++;
        }

        // Check if document already exists
        const existing = db
          .prepare("SELECT id FROM documents WHERE file_path = ?")
          .get(driveFilePath) as { id: string } | undefined;

        if (existing) {
          updateDocStmt.run(
            memberId,
            title,
            category,
            `Folder: ${folderPathDisplay}`,
            file.mimeType || "application/octet-stream",
            fileSize,
            now,
            existing.id
          );
          updatedCount++;
        } else {
          const docId = `gdoc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          insertDocStmt.run(
            docId,
            memberId,
            title,
            category,
            `Folder: ${folderPathDisplay}`,
            driveFilePath,
            file.mimeType || "application/octet-stream",
            fileSize,
            null,
            null,
            null,
            null,
            "FAMILY_ONLY",
            "Google Drive Sync",
            file.createdTime || now,
            now
          );
          importedCount++;
          importedDocs.push({
            title,
            member: memberName,
            folder: folderPathDisplay,
          });
        }
      }
    });

    runTx();

    logAuditAction({
      userId: admin.id,
      userName: admin.username,
      action: "GDRIVE_TREE_IMPORT",
      targetType: "DOCUMENT",
      targetId: "gdrive",
      targetName: `${allFoundFiles.length} Google Drive Files`,
      details: `Imported ${importedCount} new, updated ${updatedCount}, assigned ${avatarUpdatedCount} profile photo(s) across family tree hierarchy.`,
    });

    return NextResponse.json({
      success: true,
      totalFilesInDrive: allFoundFiles.length,
      importedCount,
      updatedCount,
      avatarUpdatedCount,
      importedDocs,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Tree import error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to import from Google Drive tree." },
      { status: 500 }
    );
  }
}
