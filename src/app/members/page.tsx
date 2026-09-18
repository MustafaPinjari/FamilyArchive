import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { getDb } from "@/lib/db";
import { FamilyMember } from "@/types";
import { MembersClient } from "./MembersClient";

export default async function MembersPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const db = getDb();
  const members = db
    .prepare("SELECT * FROM family_members ORDER BY generation ASC, display_order ASC")
    .all() as FamilyMember[];

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

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <Navbar initialUser={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Family Members Directory
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Browse all {members.length} relatives across every branch of our family heritage.
          </p>
        </div>

        <MembersClient members={members} docCounts={docCounts} photoCounts={photoCounts} />
      </main>
    </div>
  );
}
