import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/session";
import { testGoogleDriveConnection, getGoogleDriveConfig } from "@/lib/gdrive";

export async function GET() {
  try {
    await requireAdminUser();
    const config = getGoogleDriveConfig();
    const result = await testGoogleDriveConnection();

    return NextResponse.json({
      ...result,
      isConfigured: Boolean(
        (config.serviceAccountEmail || config.clientId) && config.folderId
      ),
      configDetails: {
        hasEmail: Boolean(config.serviceAccountEmail),
        hasKey: Boolean(config.privateKey),
        hasFolderId: Boolean(config.folderId),
        hasOAuth: Boolean(config.clientId && config.refreshToken),
        email: config.serviceAccountEmail,
        folderId: config.folderId,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to test Google Drive connection." },
      { status: 400 }
    );
  }
}
