import { getSessionUser } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { getDb } from "@/lib/db";
import { FamilyDocument, FamilyMember } from "@/types";
import { DocumentsClient } from "./DocumentsClient";

export default async function DocumentsPage() {
  const user = await getSessionUser();
  const db = getDb();

  const isPrivileged = user?.role === "SUPER_ADMIN" || user?.role === "FAMILY_ADMIN";

  let query = `
    SELECT d.*, fm.first_name, fm.last_name
    FROM documents d
    JOIN family_members fm ON d.person_id = fm.id
    WHERE 1=1
  `;
  if (!isPrivileged) {
    if (user?.family_member_id) {
      query += ` AND (d.visibility = 'FAMILY_ONLY' OR d.person_id = '${user.family_member_id}')`;
    } else {
      query += ` AND d.visibility = 'FAMILY_ONLY'`;
    }
  }
  query += " ORDER BY d.uploaded_at DESC";

  const documents = db.prepare(query).all() as (FamilyDocument & {
    first_name: string;
    last_name: string | null;
  })[];

  const members = db
    .prepare("SELECT * FROM family_members ORDER BY generation ASC, display_order ASC")
    .all() as FamilyMember[];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1C1917] pb-24 md:pb-12">
      <Navbar initialUser={user} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Family Document Cupboard
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Browse family records by relative or by document type (Aadhaar, PAN, Property Papers, Certificates).
          </p>
        </div>

        <DocumentsClient
          initialDocuments={documents}
          members={members}
          currentUser={user}
        />
      </main>
    </div>
  );
}
