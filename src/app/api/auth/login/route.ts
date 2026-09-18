import { NextResponse } from "next/server";
import { createSession, verifyUserCredentials } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { User } from "@/types";

const ADMIN_PIN = process.env.ADMIN_PIN || "200418";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pin, username, password } = body;

    let user: User | null = null;

    // PIN Authentication (Primary user requirement: PIN 200418)
    if (pin !== undefined && pin !== null) {
      const cleanPin = String(pin).trim();
      if (cleanPin === ADMIN_PIN) {
        const db = getDb();
        user = (db
          .prepare(
            "SELECT id, username, email, role, family_member_id, created_at, updated_at FROM users WHERE role = 'SUPER_ADMIN' OR username = 'mustafa'"
          )
          .get() as User | undefined) || null;

        if (!user) {
          user = {
            id: "user-mustafa",
            username: "mustafa",
            email: "mustafa@family.local",
            role: "SUPER_ADMIN",
            family_member_id: "mustafa",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      } else {
        return NextResponse.json(
          { error: "Incorrect Admin PIN. Please check and try again." },
          { status: 401 }
        );
      }
    } else if (username && password) {
      user = await verifyUserCredentials(username, password);
      if (!user) {
        return NextResponse.json(
          { error: "Invalid username or password." },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Please enter the 6-digit Admin PIN." },
        { status: 400 }
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
