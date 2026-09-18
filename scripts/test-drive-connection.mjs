import { google } from "googleapis";
import fs from "fs";
import path from "path";

async function main() {
  try {
    const keyFile = path.join(process.cwd(), "service-account.json");
    if (!fs.existsSync(keyFile)) {
      console.error("service-account.json not found!");
      return;
    }

    const keyData = JSON.parse(fs.readFileSync(keyFile, "utf-8"));
    const auth = new google.auth.JWT({
      email: keyData.client_email,
      key: keyData.private_key,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    const folderId = "1nYtuGB68RxFFNurV4bq8bEtMq89DosdE";
    console.log("Checking folder:", folderId);

    const folderRes = await drive.files.get({
      fileId: folderId,
      fields: "id, name, mimeType",
    });

    console.log("Folder found:", folderRes.data);

    const listRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, size)",
    });

    console.log("Files inside folder:");
    console.log(JSON.stringify(listRes.data.files, null, 2));
  } catch (err) {
    console.error("Error during test:", err.message);
    if (err.errors) console.error("Details:", err.errors);
  }
}

main();
