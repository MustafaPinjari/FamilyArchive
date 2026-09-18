const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const Database = require('better-sqlite3');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    val = val.replace(/\\n/g, '\n');
    process.env[key] = val;
  }
});

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/drive']
});
const drive = google.drive({ version: 'v3', auth });

const dbPath = path.join(__dirname, '..', 'data', 'archive.db');
const db = new Database(dbPath);

const NAME_ALIASES = {
  juned: "junaid",
  atika: "atiqa",
  sharukh: "sharukh",
  channi: "chinni",
  mohammed: "mohammad",
};

const members = db.prepare("SELECT id, first_name, last_name, nickname, profile_photo FROM family_members").all();
const memberLookup = new Map();
for (const m of members) {
  memberLookup.set(m.id.toLowerCase(), m);
  memberLookup.set(m.first_name.toLowerCase(), m);
  if (m.nickname) memberLookup.set(m.nickname.toLowerCase(), m);
}

function resolveMember(pathSegments, filename) {
  for (let i = pathSegments.length - 1; i >= 0; i--) {
    const seg = pathSegments[i].trim().toLowerCase();
    if (NAME_ALIASES[seg] && memberLookup.has(NAME_ALIASES[seg])) {
      return memberLookup.get(NAME_ALIASES[seg]);
    }
    if (memberLookup.has(seg)) {
      return memberLookup.get(seg);
    }
  }
  const lowerFile = filename.toLowerCase();
  for (const [key, m] of memberLookup.entries()) {
    if (lowerFile.includes(key)) return m;
  }
  for (const [alias, targetId] of Object.entries(NAME_ALIASES)) {
    if (lowerFile.includes(alias) && memberLookup.has(targetId)) {
      return memberLookup.get(targetId);
    }
  }
  return null;
}

function categorizeFile(filename, memberName) {
  const lower = filename.toLowerCase();
  let isPassportPhoto = false;

  if (/passportphoto|passport.*photo/i.test(lower)) {
    isPassportPhoto = true;
    return { title: `${memberName} Passport Photo`, category: "Identity", isPassportPhoto };
  }
  if (/adhar|aadhaar/i.test(lower)) {
    return { title: `Aadhaar Card (${memberName})`, category: "Identity", isPassportPhoto };
  }
  if (/pancard|pan.*card/i.test(lower)) {
    return { title: `PAN Card (${memberName})`, category: "Identity", isPassportPhoto };
  }
  if (/election|voter/i.test(lower)) {
    return { title: `Voter ID (${memberName})`, category: "Identity", isPassportPhoto };
  }
  if (/abha/i.test(lower)) {
    return { title: `ABHA Health Card (${memberName})`, category: "Medical", isPassportPhoto };
  }
  if (/muc[a-z0-9]+/i.test(lower) || /health|medical|prescription/i.test(lower)) {
    return { title: `Health Card / Medical Record (${memberName})`, category: "Medical", isPassportPhoto };
  }
  if (/property|registry|land|deed|estate/i.test(lower)) {
    return { title: `Property Document (${memberName})`, category: "Property", isPassportPhoto };
  }
  if (/marksheet|degree|school|certificate|diploma/i.test(lower)) {
    return { title: `Educational Document (${memberName})`, category: "Education", isPassportPhoto };
  }
  const cleanStem = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  return { title: `${cleanStem} (${memberName})`, category: "General", isPassportPhoto };
}

const allFoundFiles = [];
async function crawlFolder(folderId, currentPath = []) {
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
      allFoundFiles.push({ file: item, pathSegments: currentPath });
    }
  }
}

async function run() {
  console.log('Crawling Google Drive root:', process.env.GOOGLE_DRIVE_FOLDER_ID);
  await crawlFolder(process.env.GOOGLE_DRIVE_FOLDER_ID);
  console.log(`Found ${allFoundFiles.length} files in Google Drive.`);

  const now = new Date().toISOString();
  let imported = 0;
  let updated = 0;

  const insertStmt = db.prepare(`
    INSERT INTO documents (
      id, person_id, name, category, description, file_path, file_type,
      file_size, document_number, issue_date, expiry_date, notes,
      visibility, uploaded_by, uploaded_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE documents 
    SET person_id = ?, name = ?, category = ?, description = ?, file_type = ?, file_size = ?, updated_at = ?
    WHERE id = ?
  `);

  const tx = db.transaction(() => {
    for (const { file, pathSegments } of allFoundFiles) {
      const resolved = resolveMember(pathSegments, file.name);
      const memberId = resolved?.id || "mukhtar";
      const memberName = resolved?.first_name || "Family Member";

      const { title, category } = categorizeFile(file.name, memberName);
      const folderPathDisplay = pathSegments.join(" > ");
      const driveFilePath = `gdrive:${file.id}`;
      const fileSize = file.size ? parseInt(file.size, 10) : 0;

      const existing = db.prepare("SELECT id FROM documents WHERE file_path = ?").get(driveFilePath);
      if (existing) {
        updateStmt.run(memberId, title, category, `Folder: ${folderPathDisplay}`, file.mimeType || "application/octet-stream", fileSize, now, existing.id);
        updated++;
      } else {
        const docId = `gdoc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        insertStmt.run(
          docId, memberId, title, category, `Folder: ${folderPathDisplay}`, driveFilePath,
          file.mimeType || "application/octet-stream", fileSize, null, null, null, null,
          "FAMILY_ONLY", "Google Drive Sync", file.createdTime || now, now
        );
        imported++;
      }
    }
  });

  tx();
  console.log(`Import complete: ${imported} imported, ${updated} updated.`);

  // Export all documents to initial-documents.json so they are bundled with repository
  const allDocs = db.prepare("SELECT * FROM documents ORDER BY uploaded_at DESC").all();
  const jsonPath = path.join(__dirname, '..', 'src', 'data', 'initial-documents.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allDocs, null, 2), 'utf8');
  console.log(`Exported ${allDocs.length} documents to ${jsonPath}`);

  // Checkpoint SQLite WAL
  db.pragma('wal_checkpoint(TRUNCATE)');
  console.log('WAL checkpoint complete!');
}

run().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
