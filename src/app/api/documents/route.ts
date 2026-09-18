import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { seedDocuments } from "@/lib/db/seed";
import { FamilyDocument } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const personId = searchParams.get("personId");

    const db = getDb();

    let query = `
      SELECT d.*, fm.first_name, fm.last_name, fm.nickname
      FROM documents d
      JOIN family_members fm ON d.person_id = fm.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (category) {
      query += " AND d.category = ?";
      params.push(category);
    }

    if (personId) {
      query += " AND d.person_id = ?";
      params.push(personId);
    }

    query += " ORDER BY d.uploaded_at DESC";

    let rows = db.prepare(query).all(...params) as (FamilyDocument & {
      first_name: string;
      last_name: string | null;
      nickname: string | null;
    })[];

    // Resilience: If empty on a fresh serverless cold-start, auto-seed and reload
    if (rows.length === 0) {
      seedDocuments(db);
      rows = db.prepare(query).all(...params) as (FamilyDocument & {
        first_name: string;
        last_name: string | null;
        nickname: string | null;
      })[];
    }

    return NextResponse.json({ success: true, documents: rows });
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json({ error: "Unable to retrieve documents." }, { status: 500 });
  }
}
