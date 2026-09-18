import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { AuditLog } from "@/types";

export async function GET() {
  try {
    await requireAdminUser();
    const db = getDb();
    const logs = db
      .prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200")
      .all() as AuditLog[];

    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Unauthorized" }, { status: 403 });
  }
}
