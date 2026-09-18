import { NextResponse } from "next/server";
import { createSession, verifyUserCredentials } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Please enter both username and password." },
        { status: 400 }
      );
    }

    const user = await verifyUserCredentials(username, password);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    await createSession(user);

    // Audit log
    logAuditAction({
      userId: user.id,
      userName: user.username,
      action: "USER_LOGIN",
      targetType: "USER",
      targetId: user.id,
      targetName: user.username,
      details: `User ${user.username} logged into the Family Archive.`,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        family_member_id: user.family_member_id,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login. Please try again." },
      { status: 500 }
    );
  }
}
