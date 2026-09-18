import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { FamilyMember } from "@/types";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const db = getDb();
    let linkedMember: FamilyMember | null = null;
    if (user.family_member_id) {
      linkedMember = db
        .prepare("SELECT * FROM family_members WHERE id = ?")
        .get(user.family_member_id) as FamilyMember | null;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        family_member_id: user.family_member_id,
        member: linkedMember,
      },
    });
  } catch (err) {
    console.error("Auth me check error:", err);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
