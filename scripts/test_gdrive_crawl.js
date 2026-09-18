const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

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

async function crawl(folderId, depth = 0) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size)',
    pageSize: 1000,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const files = res.data.files || [];
  for (const f of files) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}- ${f.name} (${f.mimeType}) [id: ${f.id}]`);
    if (f.mimeType === 'application/vnd.google-apps.folder') {
      await crawl(f.id, depth + 1);
    }
  }
}

async function main() {
  console.log('Testing crawl on root folder:', process.env.GOOGLE_DRIVE_FOLDER_ID);
  await crawl(process.env.GOOGLE_DRIVE_FOLDER_ID);
  console.log('Done crawling!');
}

main().catch(err => {
  console.error('Crawl failed:', err);
});
