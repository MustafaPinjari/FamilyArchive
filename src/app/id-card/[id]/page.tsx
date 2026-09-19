import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { FamilyMember, Marriage, Relationship } from "@/types";
import { resolvePhotoUrl } from "@/lib/photo-helper";
import { MemberIdCard } from "@/components/id-card/MemberIdCard";
import Link from "next/link";
import { ArrowLeft, Users, FileText } from "lucide-react";

export default async function IdCardPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const db = getDb();
  const user = await getSessionUser();

  const rawMember = db
    .prepare("SELECT * FROM family_members WHERE id = ?")
    .get(id) as FamilyMember | undefined;

  if (!rawMember) {
    notFound();
  }

  const member: FamilyMember = {
    ...rawMember,
    photo_url: resolvePhotoUrl(rawMember.profile_photo),
  };

  const allMembers = (
    db.prepare("SELECT * FROM family_members ORDER BY generation ASC, display_order ASC").all() as FamilyMember[]
  ).map((m) => ({
    ...m,
    photo_url: resolvePhotoUrl(m.profile_photo),
  }));

  const marriages = db.prepare("SELECT * FROM marriages").all() as Marriage[];
  const relationships = db.prepare("SELECT * FROM relationships").all() as Relationship[];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1C1917] pb-20">
      <Navbar initialUser={user} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 print:hidden">
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Documents</span>
          </Link>

          <Link
            href={`/documents?person=${member.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View {member.first_name}&apos;s Papers</span>
          </Link>
        </div>

        {/* Page Title */}
        <div className="text-center print:hidden">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            Official Family Identity Card
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-md mx-auto">
            Permanent, verifiable genealogical identification card with encrypted QR access to personal documents.
          </p>
        </div>

        {/* ID Card Display */}
        <div className="bg-white rounded-3xl p-4 sm:p-8 border border-stone-200 shadow-sm">
          <MemberIdCard
            member={member}
            allMembers={allMembers}
            marriages={marriages}
            relationships={relationships}
          />
        </div>

        {/* Relative Switcher Pills */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 print:hidden space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-900" />
            <span>Browse Other Family ID Cards</span>
          </h4>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {allMembers.map((m) => {
              const isCurrent = m.id === member.id;
              return (
                <Link
                  key={m.id}
                  href={`/id-card/${m.id}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    isCurrent
                      ? "bg-amber-900 text-white"
                      : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                  }`}
                >
                  {m.first_name} {m.nickname ? `(${m.nickname})` : ""}
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
