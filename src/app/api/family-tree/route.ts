import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { computeFamilyTreeLayout } from "@/lib/tree-layout";
import { FamilyMember, Marriage, Relationship } from "@/types";

export async function GET() {
  try {
    const db = getDb();

    // Fetch members sorted by generation and display order
    const rawMembers = db
      .prepare("SELECT * FROM family_members ORDER BY generation ASC, display_order ASC")
      .all() as FamilyMember[];

    const members = rawMembers.map((m) => ({
      ...m,
      photo_url: m.profile_photo ? `/api/photos/${encodeURIComponent(m.profile_photo)}/view` : null,
    }));

    const marriages = db.prepare("SELECT * FROM marriages").all() as Marriage[];
    const relationships = db.prepare("SELECT * FROM relationships").all() as Relationship[];

    // Document counts per member
    const docCountRows = db
      .prepare("SELECT person_id, count(*) as count FROM documents GROUP BY person_id")
      .all() as { person_id: string; count: number }[];
    const docCounts: Record<string, number> = {};
    for (const r of docCountRows) {
      docCounts[r.person_id] = r.count;
    }

    // Photo counts per member
    const photoCountRows = db
      .prepare("SELECT member_id, count(*) as count FROM photo_members GROUP BY member_id")
      .all() as { member_id: string; count: number }[];
    const photoCounts: Record<string, number> = {};
    for (const r of photoCountRows) {
      photoCounts[r.member_id] = r.count;
    }

    // Compute dynamic layout
    const layout = computeFamilyTreeLayout(members, marriages, relationships, docCounts, photoCounts);

    // Settings
    const leadSetting = db.prepare("SELECT value FROM family_settings WHERE key = 'family_lead_id'").get() as
      | { value: string }
      | undefined;
    const nameSetting = db.prepare("SELECT value FROM family_settings WHERE key = 'family_name'").get() as
      | { value: string }
      | undefined;

    return NextResponse.json({
      success: true,
      familyName: nameSetting?.value || "Our Family Archive",
      familyLeadId: leadSetting?.value || "akhtar",
      members,
      marriages,
      relationships,
      layout,
    });
  } catch (error) {
    console.error("Family tree fetch error:", error);
    return NextResponse.json({ error: "Failed to load family tree." }, { status: 500 });
  }
}
