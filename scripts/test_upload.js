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

async function testUpload() {
  const akhtarFolderId = '1XuGev_Qb8EPgs13Bm6_qoeWa-2dt0WPY';
  try {
    const res = await drive.files.create({
      requestBody: {
        name: 'test-write-perm.txt',
        parents: [akhtarFolderId]
      },
      media: {
        mimeType: 'text/plain',
        body: 'Hello Family Archive'
      },
      fields: 'id, name',
      supportsAllDrives: true
    });
    console.log('UPLOAD SUCCESS! File ID:', res.data.id);
    await drive.files.delete({ fileId: res.data.id, supportsAllDrives: true });
    console.log('Cleaned up test file successfully!');
  } catch (err) {
    console.error('Upload test failed:', err.message);
    if (err.response && err.response.data) {
      console.error('Details:', JSON.stringify(err.response.data));
    }
  }
}

testUpload();
