import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { getDb } from "@/lib/db";
import { FamilyDocument, FamilyMember } from "@/types";
import { DocumentsClient } from "./DocumentsClient";

export default async function DocumentsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const db = getDb();

  const isPrivileged = user.role === "SUPER_ADMIN" || user.role === "FAMILY_ADMIN";

  let query = `
    SELECT d.*, fm.first_name, fm.last_name
    FROM documents d
    JOIN family_members fm ON d.person_id = fm.id
    WHERE 1=1
  `;
  if (!isPrivileged) {
    query += ` AND (d.visibility = 'FAMILY_ONLY' AND d.category != 'Medical' OR d.person_id = '${user.family_member_id || ""}')`;
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
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <Navbar initialUser={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Secure Document Vault
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Private, encrypted repository for family identity proofs, property deeds, and certificates.
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
