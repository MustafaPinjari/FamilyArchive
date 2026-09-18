import { NextResponse } from "next/server";
import { destroySession, getSessionUser } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (user) {
      logAuditAction({
        userId: user.id,
        userName: user.username,
        action: "USER_LOGOUT",
        targetType: "USER",
        targetId: user.id,
        targetName: user.username,
      });
    }

    await destroySession();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Unable to log out." }, { status: 500 });
  }
}
