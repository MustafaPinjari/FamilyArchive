import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { logAuditAction } from "@/lib/audit";

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT key, value FROM family_settings").all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Settings error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const body = await request.json();
    const db = getDb();

    const stmt = db.prepare("INSERT OR REPLACE INTO family_settings (key, value) VALUES (?, ?)");

    const runTx = db.transaction(() => {
      for (const [key, val] of Object.entries(body)) {
        if (typeof val === "string" || typeof val === "number") {
          stmt.run(key, String(val));
        }
      }

      // If family_lead_id changed, update family_members table too
      if (body.family_lead_id) {
        db.prepare("UPDATE family_members SET is_family_lead = 0").run();
        db.prepare("UPDATE family_members SET is_family_lead = 1 WHERE id = ?").run(body.family_lead_id);
      }
    });

    runTx();

    logAuditAction({
      userId: admin.id,
      userName: admin.username,
      action: "UPDATE_SETTINGS",
      targetType: "SETTINGS",
      targetId: "family_settings",
      targetName: "Family Archive Settings",
      details: "Updated family archive global configuration.",
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Failed to update settings" }, { status: 500 });
  }
}
