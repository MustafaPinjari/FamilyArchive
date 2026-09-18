import { getSessionUser } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { getDb } from "@/lib/db";
import { computeFamilyTreeLayout } from "@/lib/tree-layout";
import { FamilyMember, Marriage, Relationship } from "@/types";
import { TreePageClient } from "./TreePageClient";

export default async function FamilyTreePage() {
  const user = await getSessionUser();
  const db = getDb();

  const members = db
    .prepare("SELECT * FROM family_members ORDER BY generation ASC, display_order ASC")
    .all() as FamilyMember[];

  const marriages = db.prepare("SELECT * FROM marriages").all() as Marriage[];
  const relationships = db.prepare("SELECT * FROM relationships").all() as Relationship[];

  // Document counts
  const docCountRows = db
    .prepare("SELECT person_id, count(*) as count FROM documents GROUP BY person_id")
    .all() as { person_id: string; count: number }[];
  const docCounts: Record<string, number> = {};
  for (const r of docCountRows) {
    docCounts[r.person_id] = r.count;
  }

  // Photo counts
  const photoCountRows = db
    .prepare("SELECT member_id, count(*) as count FROM photo_members GROUP BY member_id")
    .all() as { member_id: string; count: number }[];
  const photoCounts: Record<string, number> = {};
  for (const r of photoCountRows) {
    photoCounts[r.member_id] = r.count;
  }

  const layout = computeFamilyTreeLayout(members, marriages, relationships, docCounts, photoCounts);

  return (
    <div className="h-screen flex flex-col bg-[#FAF7F2] text-[#1C1917] overflow-hidden">
      <Navbar initialUser={user} />
      <TreePageClient layout={layout} members={members} />
    </div>
  );
}
