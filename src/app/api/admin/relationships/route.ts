import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { logAuditAction } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const body = await request.json();
    const { person_id, father_id, mother_id, spouse_id } = body;

    if (!person_id) {
      return NextResponse.json({ error: "Person ID is required." }, { status: 400 });
    }

    // Self checks
    if (person_id === father_id || person_id === mother_id) {
      return NextResponse.json({ error: "A person cannot be their own parent." }, { status: 400 });
    }
    if (person_id === spouse_id) {
      return NextResponse.json({ error: "A person cannot be their own spouse." }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    // Check circular ancestry: father or mother cannot have person_id as an ancestor
    const isAncestorOf = (potentialAncestorId: string, targetId: string, visited = new Set<string>()): boolean => {
      if (potentialAncestorId === targetId) return true;
      if (visited.has(potentialAncestorId)) return false;
      visited.add(potentialAncestorId);

      const parents = db
        .prepare("SELECT person_id FROM relationships WHERE related_person_id = ? AND relationship_type = 'child'")
        .all(potentialAncestorId) as { person_id: string }[];

      for (const p of parents) {
        if (isAncestorOf(p.person_id, targetId, visited)) return true;
      }
      return false;
    };

    if (father_id && isAncestorOf(person_id, father_id)) {
      return NextResponse.json({ error: "Invalid relationship: This creates a circular parent-child loop." }, { status: 400 });
    }
    if (mother_id && isAncestorOf(person_id, mother_id)) {
      return NextResponse.json({ error: "Invalid relationship: This creates a circular parent-child loop." }, { status: 400 });
    }

    const runTx = db.transaction(() => {
      // 1. Remove existing parents for person_id
      db.prepare(
        "DELETE FROM relationships WHERE related_person_id = ? AND relationship_type = 'child'"
      ).run(person_id);
      db.prepare(
        "DELETE FROM relationships WHERE person_id = ? AND relationship_type = 'parent'"
      ).run(person_id);

      // 2. Add father if specified
      if (father_id) {
        db.prepare(
          "INSERT INTO relationships (id, person_id, related_person_id, relationship_type, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(`rel-p-${father_id}-${person_id}`, father_id, person_id, "child", now);
        db.prepare(
          "INSERT INTO relationships (id, person_id, related_person_id, relationship_type, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(`rel-c-${person_id}-${father_id}`, person_id, father_id, "parent", now);
      }

      // 3. Add mother if specified
      if (mother_id) {
        db.prepare(
          "INSERT INTO relationships (id, person_id, related_person_id, relationship_type, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(`rel-p-${mother_id}-${person_id}`, mother_id, person_id, "child", now);
        db.prepare(
          "INSERT INTO relationships (id, person_id, related_person_id, relationship_type, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(`rel-c-${person_id}-${mother_id}`, person_id, mother_id, "parent", now);
      }

      // 4. Update spouse if specified
      if (spouse_id) {
        // Remove old spouse relationships for this person
        db.prepare(
          "DELETE FROM relationships WHERE (person_id = ? OR related_person_id = ?) AND relationship_type = 'spouse'"
        ).run(person_id, person_id);
        db.prepare(
          "DELETE FROM marriages WHERE person1_id = ? OR person2_id = ?"
        ).run(person_id, person_id);

        const marriageId = `m-${person_id}-${spouse_id}`;
        db.prepare(
          "INSERT INTO marriages (id, person1_id, person2_id, status, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(marriageId, person_id, spouse_id, "active", now);

        db.prepare(
          "INSERT INTO relationships (id, person_id, related_person_id, relationship_type, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(`rel-sp-${person_id}-${spouse_id}`, person_id, spouse_id, "spouse", now);
        db.prepare(
          "INSERT INTO relationships (id, person_id, related_person_id, relationship_type, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(`rel-sp-${spouse_id}-${person_id}`, spouse_id, person_id, "spouse", now);
      }
    });

    runTx();

    logAuditAction({
      userId: admin.id,
      userName: admin.username,
      action: "UPDATE_RELATIONSHIPS",
      targetType: "FAMILY_MEMBER",
      targetId: person_id,
      targetName: person_id,
      details: "Updated family kinship relationships.",
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Relationships update error:", err);
    return NextResponse.json({ error: err.message || "Failed to update relationships" }, { status: 500 });
  }
}
