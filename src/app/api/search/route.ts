import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { FamilyDocument, FamilyMember } from "@/types";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, members: [], documents: [] });
    }

    const db = getDb();
    const pattern = `%${query}%`;

    // 1. Search Members
    const members = db
      .prepare(`
        SELECT * FROM family_members
        WHERE first_name LIKE ?
           OR last_name LIKE ?
           OR nickname LIKE ?
           OR family_role LIKE ?
           OR bio LIKE ?
        ORDER BY generation ASC, display_order ASC
        LIMIT 20
      `)
      .all(pattern, pattern, pattern, pattern, pattern) as FamilyMember[];

    // 2. Search Documents with permission filter
    const docs = db
      .prepare(`
        SELECT d.*, fm.first_name, fm.last_name, fm.nickname
        FROM documents d
        JOIN family_members fm ON d.person_id = fm.id
        WHERE d.name LIKE ?
           OR d.category LIKE ?
           OR d.description LIKE ?
           OR d.document_number LIKE ?
        ORDER BY d.uploaded_at DESC
        LIMIT 30
      `)
      .all(pattern, pattern, pattern, pattern) as (FamilyDocument & {
        first_name: string;
        last_name: string | null;
        nickname: string | null;
      })[];

    const isPrivileged = user.role === "SUPER_ADMIN" || user.role === "FAMILY_ADMIN";
    const allowedDocs = docs.filter((doc) => {
      if (isPrivileged) return true;
      if (user.family_member_id === doc.person_id) return true;
      if (doc.category === "Medical") return false;
      if (doc.visibility === "PRIVATE") return false;
      return true;
    });

    return NextResponse.json({
      success: true,
      query,
      members,
      documents: allowedDocs,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Failed to perform search." }, { status: 500 });
  }
}
