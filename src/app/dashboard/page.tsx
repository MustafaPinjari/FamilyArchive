import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import {
  Users,
  FileText,
  Camera,
  Crown,
  ArrowRight,
  GitFork,
  Upload,
  Calendar,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { FamilyMember } from "@/types";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const db = getDb();

  // Dynamic counts
  const memberCountRow = db.prepare("SELECT count(*) as count FROM family_members").get() as { count: number };
  const memberCount = memberCountRow.count;

  const isPrivileged = user.role === "SUPER_ADMIN" || user.role === "FAMILY_ADMIN";
  let docCountQuery = "SELECT count(*) as count FROM documents WHERE 1=1";
  if (!isPrivileged) {
    docCountQuery += ` AND (visibility = 'FAMILY_ONLY' AND category != 'Medical' OR person_id = '${user.family_member_id || ""}')`;
  }
  const docCountRow = db.prepare(docCountQuery).get() as { count: number };
  const documentCount = docCountRow.count;

  const photoCountRow = db.prepare("SELECT count(*) as count FROM photos").get() as { count: number };
  const photoCount = photoCountRow.count;

  // Family Lead
  const leadSetting = db.prepare("SELECT value FROM family_settings WHERE key = 'family_lead_id'").get() as
    | { value: string }
    | undefined;
  const leadId = leadSetting?.value || "akhtar";
  const familyLead = db.prepare("SELECT * FROM family_members WHERE id = ?").get(leadId) as FamilyMember | undefined;

  // Generations
  const genCounts = db
    .prepare("SELECT generation, count(*) as count FROM family_members GROUP BY generation ORDER BY generation ASC")
    .all() as { generation: number; count: number }[];

  // Recent Documents
  let recentDocsQuery = `
    SELECT d.*, fm.first_name, fm.last_name
    FROM documents d
    JOIN family_members fm ON d.person_id = fm.id
    WHERE 1=1
  `;
  if (!isPrivileged) {
    recentDocsQuery += ` AND (d.visibility = 'FAMILY_ONLY' AND d.category != 'Medical' OR d.person_id = '${user.family_member_id || ""}')`;
  }
  recentDocsQuery += " ORDER BY d.uploaded_at DESC LIMIT 4";
  const recentDocuments = db.prepare(recentDocsQuery).all() as {
    id: string;
    name: string;
    category: string;
    file_size: number;
    uploaded_at: string;
    first_name: string;
  }[];

  // Recent Photos
  const recentPhotos = db
    .prepare(`
      SELECT p.*, pa.name as album_name
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      ORDER BY p.uploaded_at DESC
      LIMIT 4
    `)
    .all() as { id: string; caption: string | null; album_name: string }[];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <Navbar initialUser={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-amber-900 via-stone-900 to-stone-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-500/10 to-transparent pointer-events-none" />
          <div className="max-w-2xl relative z-10">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-widest mb-2">
              <span>🌳</span>
              <span>Our Family Archive</span>
            </div>
            <h1 className="font-serif font-bold text-3xl sm:text-4xl tracking-tight">
              Welcome, <span className="capitalize">{user.username}</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-stone-300 leading-relaxed font-sans">
              Preserving our family history, relationships, and secure records across every generation.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="/family-tree"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5"
              >
                <GitFork className="w-4 h-4" />
                <span>Explore Family Tree</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>

              <a
                href="/documents"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-200 text-sm font-medium border border-stone-700 transition-colors"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Access Document Vault</span>
              </a>
            </div>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Members */}
          <a
            href="/members"
            className="group p-6 rounded-2xl bg-white border border-stone-200 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Family Members
              </p>
              <h3 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-2">
                {memberCount}
              </h3>
              <p className="text-xs text-stone-500 mt-1">Across 4 generations</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-100/70 text-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-7 h-7 text-amber-700" />
            </div>
          </a>

          {/* Documents */}
          <a
            href="/documents"
            className="group p-6 rounded-2xl bg-white border border-stone-200 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Vault Documents
              </p>
              <h3 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-2">
                {documentCount}
              </h3>
              <p className="text-xs text-stone-500 mt-1">Identity & Property records</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-100/70 text-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-7 h-7 text-amber-700" />
            </div>
          </a>

          {/* Photos */}
          <a
            href="/photos"
            className="group p-6 rounded-2xl bg-white border border-stone-200 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Family Photos
              </p>
              <h3 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-2">
                {photoCount}
              </h3>
              <p className="text-xs text-stone-500 mt-1">In 7 themed albums</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-100/70 text-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-7 h-7 text-amber-700" />
            </div>
          </a>
        </div>

        {/* Family Lead Spotlight & Generations Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Family Lead Card */}
          {familyLead && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-white border-2 border-amber-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                  <Crown className="w-4 h-4 text-amber-700" />
                  <span>Current Family Lead</span>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 flex items-center justify-center text-2xl font-serif font-bold shadow-md">
                    {familyLead.first_name[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-bold text-stone-900">
                      {familyLead.first_name}
                    </h3>
                    {familyLead.nickname && (
                      <p className="text-xs font-semibold text-amber-800">
                        &ldquo;{familyLead.nickname}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-stone-500 mt-0.5">{familyLead.family_role}</p>
                  </div>
                </div>

                {familyLead.bio && (
                  <p className="mt-4 text-xs text-stone-600 leading-relaxed italic border-t border-amber-200/60 pt-3">
                    &ldquo;{familyLead.bio}&rdquo;
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-amber-200/60 flex items-center justify-between">
                <a
                  href={`/members/${familyLead.id}`}
                  className="text-xs font-semibold text-amber-900 hover:text-amber-700 flex items-center gap-1"
                >
                  <span>View Full Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Generational Structure */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                <span>Generational Overview</span>
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Hierarchy ordered from roots to latest descendants.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {genCounts.map((g) => (
                  <div
                    key={g.generation}
                    className="p-3.5 rounded-xl bg-stone-50 border border-stone-200"
                  >
                    <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                      Gen {g.generation}
                    </div>
                    <div className="text-xl font-bold font-serif text-stone-900 mt-1">
                      {g.count} <span className="text-xs font-normal text-stone-500">members</span>
                    </div>
                    <div className="text-[10px] text-amber-800 mt-0.5">
                      {g.generation === 1
                        ? "Grandparents"
                        : g.generation === 2
                        ? "Brothers & Spouses"
                        : g.generation === 3
                        ? "Cousins"
                        : "Grandchildren"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span>Sibling seniority strictly maintained: Akhtar → Shakur → Sattar → Mukhtar</span>
              <a href="/family-tree" className="text-amber-800 font-semibold hover:underline">
                View in Tree →
              </a>
            </div>
          </div>
        </div>

        {/* Recently Added Documents & Photos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Docs */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-600 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-700" />
                <span>Recently Added Documents</span>
              </h3>
              <a href="/documents" className="text-xs font-semibold text-amber-800 hover:underline">
                All Documents
              </a>
            </div>

            {recentDocuments.length > 0 ? (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-stone-100 hover:border-amber-300 hover:bg-stone-50/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-stone-900">{doc.name}</div>
                        <div className="text-[11px] text-stone-500">
                          {doc.first_name} • {doc.category}
                        </div>
                      </div>
                    </div>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      className="text-xs font-medium text-amber-800 hover:underline"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 text-xs text-stone-500">
                <p>No documents uploaded yet.</p>
                <p className="mt-1">Add important identity, property, or family papers to the vault.</p>
                <a
                  href="/documents"
                  className="mt-3 inline-flex items-center gap-1 text-amber-800 font-semibold hover:underline"
                >
                  <span>Open Vault</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Recent Photos */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-600 flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-700" />
                <span>Recent Family Memories</span>
              </h3>
              <a href="/photos" className="text-xs font-semibold text-amber-800 hover:underline">
                All Albums
              </a>
            </div>

            {recentPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recentPhotos.map((ph) => (
                  <div
                    key={ph.id}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-xs"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/photos/${ph.id}/view`}
                      alt={ph.caption || "Photo"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end text-white text-[11px] truncate">
                      {ph.caption || ph.album_name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 text-xs text-stone-500">
                <p>No family photos yet.</p>
                <p className="mt-1">Preserve weddings, childhood, and Eid memories.</p>
                <a
                  href="/photos"
                  className="mt-3 inline-flex items-center gap-1 text-amber-800 font-semibold hover:underline"
                >
                  <span>Open Photo Archive</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
