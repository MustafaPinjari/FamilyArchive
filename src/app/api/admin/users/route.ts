import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { logAuditAction } from "@/lib/audit";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function GET() {
  try {
    await requireAdminUser();
    const db = getDb();
    const users = db
      .prepare(`
        SELECT u.id, u.username, u.email, u.role, u.family_member_id, u.created_at,
               fm.first_name, fm.last_name
        FROM users u
        LEFT JOIN family_members fm ON u.family_member_id = fm.id
        ORDER BY u.created_at DESC
      `)
      .all();

    return NextResponse.json({ success: true, users });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Unauthorized" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const body = await request.json();
    const { username, email, password, role = "FAMILY_MEMBER", family_member_id } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)").get(username.trim());
    if (existing) {
      return NextResponse.json({ error: "A user with this username already exists." }, { status: 400 });
    }

    const userId = `user-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, family_member_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      username.trim(),
      email?.trim() || null,
      passwordHash,
      role,
      family_member_id || null,
      now,
      now
    );

    logAuditAction({
      userId: admin.id,
      userName: admin.username,
      action: "CREATE_USER",
      targetType: "USER",
      targetId: userId,
      targetName: username,
      details: `Created new user account "${username}" with role ${role}.`,
    });

    return NextResponse.json({ success: true, userId }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Create user error:", err);
    return NextResponse.json({ error: err.message || "Failed to create user account." }, { status: 500 });
  }
}
