import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { FamilyMember } from "@/types";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // 1. Dynamic member count
    const memberCountRow = db.prepare("SELECT count(*) as count FROM family_members").get() as { count: number };
    const memberCount = memberCountRow.count;

    // 2. Dynamic document count (filtered by permissions)
    const isPrivileged = user.role === "SUPER_ADMIN" || user.role === "FAMILY_ADMIN";
    let docCountQuery = "SELECT count(*) as count FROM documents WHERE 1=1";
    if (!isPrivileged) {
      docCountQuery += ` AND (visibility = 'FAMILY_ONLY' AND category != 'Medical' OR person_id = '${user.family_member_id || ""}')`;
    }
    const docCountRow = db.prepare(docCountQuery).get() as { count: number };
    const documentCount = docCountRow.count;

    // 3. Dynamic photo count
    const photoCountRow = db.prepare("SELECT count(*) as count FROM photos").get() as { count: number };
    const photoCount = photoCountRow.count;

    // 4. Family Lead
    const leadSetting = db.prepare("SELECT value FROM family_settings WHERE key = 'family_lead_id'").get() as
      | { value: string }
      | undefined;
    const leadId = leadSetting?.value || "akhtar";
    const familyLead = db.prepare("SELECT * FROM family_members WHERE id = ?").get(leadId) as FamilyMember | undefined;

    // 5. Generations count
    const genCounts = db
      .prepare("SELECT generation, count(*) as count FROM family_members GROUP BY generation ORDER BY generation ASC")
      .all() as { generation: number; count: number }[];

    // 6. Recently added documents
    let recentDocsQuery = `
      SELECT d.*, fm.first_name, fm.last_name
      FROM documents d
      JOIN family_members fm ON d.person_id = fm.id
      WHERE 1=1
    `;
    if (!isPrivileged) {
      recentDocsQuery += ` AND (d.visibility = 'FAMILY_ONLY' AND d.category != 'Medical' OR d.person_id = '${user.family_member_id || ""}')`;
    }
    recentDocsQuery += " ORDER BY d.uploaded_at DESC LIMIT 5";
    const recentDocuments = db.prepare(recentDocsQuery).all();

    // 7. Recent photos
    const recentPhotos = db
      .prepare(`
        SELECT p.*, pa.name as album_name
        FROM photos p
        JOIN photo_albums pa ON p.album_id = pa.id
        ORDER BY p.uploaded_at DESC
        LIMIT 6
      `)
      .all();

    const familyNameSetting = db.prepare("SELECT value FROM family_settings WHERE key = 'family_name'").get() as
      | { value: string }
      | undefined;

    return NextResponse.json({
      success: true,
      familyName: familyNameSetting?.value || "Our Family Archive",
      metrics: {
        members: memberCount,
        documents: documentCount,
        photos: photoCount,
      },
      familyLead,
      generations: genCounts,
      recentDocuments,
      recentPhotos,
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data." }, { status: 500 });
  }
}
