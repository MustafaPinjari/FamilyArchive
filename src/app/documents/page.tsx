import { getSessionUser } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { getDb } from "@/lib/db";
import { seedDocuments } from "@/lib/db/seed";
import { FamilyDocument, FamilyMember, Marriage, Relationship } from "@/types";
import { resolvePhotoUrl } from "@/lib/photo-helper";
import { DocumentsClient } from "./DocumentsClient";

export default async function DocumentsPage(props: {
  searchParams?: Promise<{ person?: string; id?: string; category?: string; view?: string }>;
}) {
  const user = await getSessionUser();
  const db = getDb();
  const searchParams = props.searchParams ? await props.searchParams : {};
  const initialPersonId = searchParams.person || searchParams.id || "All";
  const initialCategory = searchParams.category || "All";

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

  let documents = db.prepare(query).all() as (FamilyDocument & {
    first_name: string;
    last_name: string | null;
  })[];

  // Resilience: If empty on a fresh serverless cold-start, auto-seed and reload immediately
  if (documents.length === 0) {
    seedDocuments(db);
    documents = db.prepare(query).all() as (FamilyDocument & {
      first_name: string;
      last_name: string | null;
    })[];
  }

  const rawMembers = db
    .prepare("SELECT * FROM family_members ORDER BY generation ASC, display_order ASC")
    .all() as FamilyMember[];

  const members: FamilyMember[] = rawMembers.map((m) => ({
    ...m,
    photo_url: resolvePhotoUrl(m.profile_photo),
  }));

  const marriages = db.prepare("SELECT * FROM marriages").all() as Marriage[];
  const relationships = db.prepare("SELECT * FROM relationships").all() as Relationship[];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1C1917] pb-24 md:pb-12">
      <Navbar initialUser={user} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Family Document Cupboard
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Browse family records by relative, nested family branch, or by document type (Aadhaar, PAN, Property Papers, Certificates).
          </p>
        </div>

        <DocumentsClient
          initialDocuments={documents}
          members={members}
          marriages={marriages}
          relationships={relationships}
          currentUser={user}
          initialPersonId={initialPersonId}
          initialCategory={initialCategory}
        />
      </main>
    </div>
  );
}
