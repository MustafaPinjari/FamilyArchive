import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { getDb } from "@/lib/db";
import { AuditLog, FamilyDocument, FamilyMember, User } from "@/types";
import { AdminClient } from "./AdminClient";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "SUPER_ADMIN" && user.role !== "FAMILY_ADMIN") {
    redirect("/dashboard");
  }

  const db = getDb();

  const members = db
    .prepare("SELECT * FROM family_members ORDER BY generation ASC, display_order ASC")
    .all() as FamilyMember[];

  const users = db
    .prepare(`
      SELECT u.id, u.username, u.email, u.role, u.family_member_id, u.created_at, u.updated_at,
             fm.first_name, fm.last_name
      FROM users u
      LEFT JOIN family_members fm ON u.family_member_id = fm.id
      ORDER BY u.created_at DESC
    `)
    .all() as (User & { first_name: string | null; last_name: string | null })[];

  const documents = db
    .prepare(`
      SELECT d.*, fm.first_name, fm.last_name
      FROM documents d
      JOIN family_members fm ON d.person_id = fm.id
      ORDER BY d.uploaded_at DESC
    `)
    .all() as (FamilyDocument & { first_name: string; last_name: string | null })[];

  const auditLogs = db
    .prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100")
    .all() as AuditLog[];

  const settingRows = db.prepare("SELECT key, value FROM family_settings").all() as {
    key: string;
    value: string;
  }[];
  const settings: Record<string, string> = {};
  for (const r of settingRows) {
    settings[r.key] = r.value;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <Navbar initialUser={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Family Archive Administration
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage family member records, kinship connections, user privileges, and audit history.
          </p>
        </div>

        <AdminClient
          initialMembers={members}
          initialUsers={users}
          initialDocuments={documents}
          initialAuditLogs={auditLogs}
          initialSettings={settings}
        />
      </main>
    </div>
  );
}
