import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import { User, UserRole } from "@/types";

const SESSION_COOKIE_NAME = "family_archive_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "family-archive-super-secure-secret-key-2026-heritage";

interface SessionPayload {
  userId: string;
  role: UserRole;
  username: string;
  expiresAt: number;
}

// Token generation: base64(payload) + '.' + hmac(base64(payload))
function signToken(payload: SessionPayload): string {
  const dataStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(dataStr).digest("base64url");
  return `${dataStr}.${signature}`;
}

function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [dataStr, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(dataStr).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(dataStr, "base64url").toString("utf8")) as SessionPayload;
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(user: User): Promise<void> {
  const cookieStore = await cookies();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const payload: SessionPayload = {
    userId: user.id,
    role: user.role,
    username: user.username,
    expiresAt: Date.now() + sevenDays,
  };

  const token = signToken(payload);
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    const payload = verifyToken(sessionCookie.value);
    if (!payload) return null;

    const db = getDb();
    const user = db
      .prepare(
        "SELECT id, username, email, role, family_member_id, created_at, updated_at FROM users WHERE id = ?"
      )
      .get(payload.userId) as User | undefined;

    return user || null;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function verifyUserCredentials(username: string, password: string): Promise<User | null> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)")
    .get(username.trim(), username.trim()) as
    | (User & { password_hash: string })
    | undefined;

  if (!row) return null;

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    family_member_id: row.family_member_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function requireAuthUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdminUser(): Promise<User> {
  const user = await requireAuthUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "FAMILY_ADMIN") {
    throw new Error("Forbidden: Admin privileges required");
  }
  return user;
}
