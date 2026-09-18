import { google } from "googleapis";
import { Readable } from "stream";
import fs from "fs";
import path from "path";
import { getDb } from "./db";

export interface GoogleDriveConfig {
  serviceAccountEmail?: string;
  privateKey?: string;
  keyFilePath?: string;
  folderId?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

export function getGoogleDriveConfig(): GoogleDriveConfig {
  let config: GoogleDriveConfig = {
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined,
    keyFilePath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  };

  // Check if a local service-account.json exists in project root or data directory
  if (!config.serviceAccountEmail && !config.privateKey && !config.clientId) {
    const candidateFiles = [
      path.join(process.cwd(), "service-account.json"),
      path.join(process.cwd(), "data", "service-account.json"),
    ];
    for (const filePath of candidateFiles) {
      if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
        try {
          const fileData = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf-8"));
          if (fileData.client_email && fileData.private_key) {
            config.serviceAccountEmail = fileData.client_email;
            config.privateKey = fileData.private_key;
            config.keyFilePath = filePath;
            break;
          }
        } catch {
          // ignore file parse errors
        }
      }
    }
  }

  // Fallback: check SQLite family_settings table
  try {
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT key, value FROM family_settings WHERE key LIKE 'gdrive_%'"
      )
      .all() as { key: string; value: string }[];

    const dbSettings: Record<string, string> = {};
    for (const r of rows) {
      dbSettings[r.key] = r.value;
    }

    if (!config.serviceAccountEmail && dbSettings.gdrive_service_account_email) {
      config.serviceAccountEmail = dbSettings.gdrive_service_account_email;
    }
    if (!config.privateKey && dbSettings.gdrive_private_key) {
      config.privateKey = dbSettings.gdrive_private_key.replace(/\\n/g, "\n");
    }
    if (!config.folderId && dbSettings.gdrive_folder_id) {
      config.folderId = dbSettings.gdrive_folder_id;
    }
    if (!config.clientId && dbSettings.gdrive_client_id) {
      config.clientId = dbSettings.gdrive_client_id;
    }
    if (!config.clientSecret && dbSettings.gdrive_client_secret) {
      config.clientSecret = dbSettings.gdrive_client_secret;
    }
    if (!config.refreshToken && dbSettings.gdrive_refresh_token) {
      config.refreshToken = dbSettings.gdrive_refresh_token;
    }
  } catch {
    // If DB is initializing or inaccessible, ignore
  }

  return config;
}

export function isGoogleDriveConfigured(): boolean {
  const config = getGoogleDriveConfig();
  const hasServiceAccount = Boolean(
    config.serviceAccountEmail && config.privateKey
  );
  const hasOAuth = Boolean(
    config.clientId && config.clientSecret && config.refreshToken
  );
  return (hasServiceAccount || hasOAuth) && Boolean(config.folderId);
}

export function getDriveClient() {
  const config = getGoogleDriveConfig();

  if (config.serviceAccountEmail && config.privateKey) {
    const auth = new google.auth.JWT({
      email: config.serviceAccountEmail,
      key: config.privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    return google.drive({ version: "v3", auth });
  }

  if (config.clientId && config.clientSecret && config.refreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    );
    oauth2Client.setCredentials({
      refresh_token: config.refreshToken,
    });
    return google.drive({ version: "v3", auth: oauth2Client });
  }

  throw new Error(
    "Google Drive is not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY."
  );
}

export async function uploadFileToDrive({
  filename,
  mimeType,
  buffer,
  folderId,
}: {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  folderId?: string;
}): Promise<{
  id: string;
  name: string;
  mimeType: string;
  size: number;
}> {
  const drive = getDriveClient();
  const config = getGoogleDriveConfig();
  const targetFolderId = folderId || config.folderId;

  const stream = Readable.from(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: targetFolderId ? [targetFolderId] : undefined,
    },
    media: {
      mimeType: mimeType || "application/octet-stream",
      body: stream,
    },
    fields: "id, name, mimeType, size",
  });

  const file = response.data;
  if (!file.id) {
    throw new Error("Failed to get file ID from Google Drive upload");
  }

  return {
    id: file.id,
    name: file.name || filename,
    mimeType: file.mimeType || mimeType,
    size: file.size ? parseInt(file.size, 10) : buffer.length,
  };
}

export async function getDriveFileStream(fileId: string): Promise<{
  stream: Readable;
  name: string;
  mimeType: string;
  size?: number;
}> {
  const drive = getDriveClient();

  // Get file metadata first
  const metaRes = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size",
  });

  const name = metaRes.data.name || "downloaded-file";
  const mimeType = metaRes.data.mimeType || "application/octet-stream";
  const size = metaRes.data.size ? parseInt(metaRes.data.size, 10) : undefined;

  // Stream media content
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  return {
    stream: response.data as unknown as Readable,
    name,
    mimeType,
    size,
  };
}

export async function deleteFileFromDrive(fileId: string): Promise<boolean> {
  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId });
    return true;
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 404) {
      // File already removed from drive
      return true;
    }
    console.error("Failed to delete file from Google Drive:", error);
    return false;
  }
}

export async function testGoogleDriveConnection(): Promise<{
  success: boolean;
  message: string;
  email?: string;
  folderName?: string;
  folderId?: string;
}> {
  try {
    const config = getGoogleDriveConfig();
    const drive = getDriveClient();

    let email = config.serviceAccountEmail || "OAuth User";
    let folderName: string | undefined = undefined;

    if (config.folderId) {
      const folderRes = await drive.files.get({
        fileId: config.folderId,
        fields: "id, name, mimeType",
      });

      folderName = folderRes.data.name || "Google Drive Folder";
    }

    return {
      success: true,
      message: "Successfully connected to Google Drive!",
      email,
      folderName,
      folderId: config.folderId,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      message: err.message || "Failed to connect to Google Drive",
    };
  }
}
