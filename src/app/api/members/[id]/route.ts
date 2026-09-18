import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { FamilyDocument, FamilyMember } from "@/types";

import { resolvePhotoUrl } from "@/lib/photo-helper";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const db = getDb();

    const rawPerson = db
      .prepare("SELECT * FROM family_members WHERE id = ?")
      .get(id) as FamilyMember | undefined;

    if (!rawPerson) {
      return NextResponse.json({ error: "Family member not found." }, { status: 404 });
    }

    const person: FamilyMember = {
      ...rawPerson,
      photo_url: resolvePhotoUrl(rawPerson.profile_photo),
    };

    // Kinship lookup
    // Parents
    const parentRels = db
      .prepare(
        `SELECT fm.* FROM family_members fm
         JOIN relationships r ON fm.id = r.person_id
         WHERE r.related_person_id = ? AND r.relationship_type = 'child'`
      )
      .all(id) as FamilyMember[];

    const father = parentRels.find((p) => p.gender === "male") || null;
    const mother = parentRels.find((p) => p.gender === "female") || null;

    // Spouse
    const spouse = db
      .prepare(
        `SELECT fm.* FROM family_members fm
         JOIN marriages m ON (fm.id = m.person2_id AND m.person1_id = ?) OR (fm.id = m.person1_id AND m.person2_id = ?)
         WHERE m.status != 'separated'`
      )
      .get(id, id) as FamilyMember | null;

    // Children
    const children = db
      .prepare(
        `SELECT fm.* FROM family_members fm
         JOIN relationships r ON fm.id = r.related_person_id
         WHERE r.person_id = ? AND r.relationship_type = 'child'
         ORDER BY fm.display_order ASC`
      )
      .all(id) as FamilyMember[];

    // Siblings
    let siblings: FamilyMember[] = [];
    if (father || mother) {
      const parentIds = [father?.id, mother?.id].filter(Boolean);
      const placeholders = parentIds.map(() => "?").join(",");
      siblings = db
        .prepare(
          `SELECT DISTINCT fm.* FROM family_members fm
           JOIN relationships r ON fm.id = r.related_person_id
           WHERE r.person_id IN (${placeholders}) AND r.relationship_type = 'child' AND fm.id != ?
           ORDER BY fm.display_order ASC`
        )
        .all(...parentIds, id) as FamilyMember[];
    }

    // Documents (open for family viewing)
    const documents = db
      .prepare("SELECT * FROM documents WHERE person_id = ? ORDER BY uploaded_at DESC")
      .all(id) as FamilyDocument[];

    // Tagged photos
    const photos = db
      .prepare(
        `SELECT p.*, pa.name as album_name FROM photos p
         JOIN photo_members pm ON p.id = pm.photo_id
         JOIN photo_albums pa ON p.album_id = pa.id
         WHERE pm.member_id = ?
         ORDER BY p.uploaded_at DESC`
      )
      .all(id);

    return NextResponse.json({
      success: true,
      person,
      kinship: {
        father,
        mother,
        spouse,
        children,
        siblings,
      },
      documents,
      photos,
    });
  } catch (error) {
    console.error("Member detail fetch error:", error);
    return NextResponse.json({ error: "Failed to load family member profile." }, { status: 500 });
  }
}
