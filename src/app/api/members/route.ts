import { NextResponse } from "next/server";
import { getSessionUser, requireAdminUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { logAuditAction } from "@/lib/audit";
import { FamilyMember } from "@/types";
import crypto from "crypto";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const members = db
      .prepare("SELECT * FROM family_members ORDER BY generation ASC, display_order ASC")
      .all() as FamilyMember[];

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error("Fetch members error:", error);
    return NextResponse.json({ error: "Unable to load family members." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const body = await request.json();

    const {
      first_name,
      middle_name,
      last_name,
      nickname,
      gender,
      date_of_birth,
      date_of_death,
      is_deceased,
      bio,
      family_role,
      is_family_lead,
      generation = 3,
      display_order = 99,
      father_id,
      mother_id,
      spouse_id,
    } = body;

    if (!first_name || !first_name.trim()) {
      return NextResponse.json({ error: "First name is required." }, { status: 400 });
    }

    const db = getDb();
    const id = `member-${first_name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString();

    const runTransaction = db.transaction(() => {
      // If marked as family lead, unset any existing family lead
      if (is_family_lead) {
        db.prepare("UPDATE family_members SET is_family_lead = 0").run();
        db.prepare("UPDATE family_settings SET value = ? WHERE key = 'family_lead_id'").run(id);
      }

      // Insert member
      db.prepare(`
        INSERT INTO family_members (
          id, first_name, middle_name, last_name, nickname, gender,
          date_of_birth, date_of_death, is_deceased, profile_photo,
          bio, family_role, is_family_lead, generation, display_order,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        first_name.trim(),
        middle_name?.trim() || null,
        last_name?.trim() || null,
        nickname?.trim() || null,
        gender || null,
        date_of_birth || null,
        date_of_death || null,
        is_deceased ? 1 : 0,
        null,
        bio?.trim() || null,
        family_role?.trim() || null,
        is_family_lead ? 1 : 0,
        Number(generation) || 3,
        Number(display_order) || 99,
        now,
        now
      );

      // Add parent-child relationships
      if (father_id && father_id !== id) {
        db.prepare("INSERT INTO relationships (id, person_id, related_person_id, relationship_type, created_at) VALUES (?, ?, ?, ?, ?)")
          .run(`rel-p-${father_id}-${id}`, father_id, id, "child", now);
        db.prepare("INSERT INTO relationships (id, person_id, related_person_id, relationship_type, created_at) VALUES (?, ?, ?, ?, ?)")
          .run(`rel-c-${id}-${father_id}`, id, father_id, "parent", now);
      }

      if (mother_id && mother_id !== id) {
        db.prepare("INSERT INTO relationships (id, person_id, related_person_id, relationship_type, created_at) VALUES (?, ?, ?, ?, ?)")
          .run(`rel-p-${mother_id}-${id}`, mother_id, id, "child", now);
        db.prepare("INSERT INTO relationships (id, person_id, related_person_id, relationship_type, created_at) VALUES (?, ?, ?, ?, ?)")
          .run(`rel-c-${id}-${mother_id}`, id, mother_id, "parent", now);
      }

      // Add spouse & marriage
      if (spouse_id && spouse_id !== id) {
        const marriageId = `m-${id}-${spouse_id}`;
        db.prepare("INSERT INTO marriages (id, person1_id, person2_id, status, created_at) VALUES (?, ?, ?, ?, ?)")
          .run(marriageId, id, spouse_id, "active", now);

        db.prepare("INSERT INTO relationships (id, person_id, related_person_id, relationship_type, created_at) VALUES (?, ?, ?, ?, ?)")
          .run(`rel-sp-${id}-${spouse_id}`, id, spouse_id, "spouse", now);
        db.prepare("INSERT INTO relationships (id, person_id, related_person_id, relationship_type, created_at) VALUES (?, ?, ?, ?, ?)")
          .run(`rel-sp-${spouse_id}-${id}`, spouse_id, id, "spouse", now);
      }
    });

    runTransaction();

    logAuditAction({
      userId: admin.id,
      userName: admin.username,
      action: "ADD_FAMILY_MEMBER",
      targetType: "FAMILY_MEMBER",
      targetId: id,
      targetName: first_name,
      details: `Added new family member ${first_name} into generation ${generation}.`,
    });

    const created = db.prepare("SELECT * FROM family_members WHERE id = ?").get(id);
    return NextResponse.json({ success: true, member: created }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Create member error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to add family member." },
      { status: 500 }
    );
  }
}
