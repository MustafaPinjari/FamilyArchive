"use client";

import React, { useState } from "react";
import { FamilyMember } from "@/types";
import { Search, Crown, FileText, Camera, User as UserIcon, ChevronRight } from "lucide-react";
import { MemberProfileDrawer } from "@/components/members/MemberProfileDrawer";

interface MembersClientProps {
  members: FamilyMember[];
  docCounts: Record<string, number>;
  photoCounts: Record<string, number>;
}

export function MembersClient({ members, docCounts, photoCounts }: MembersClientProps) {
  const [search, setSearch] = useState("");
  const [genFilter, setGenFilter] = useState<number | "all">("all");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const filtered = members.filter((m) => {
    if (genFilter !== "all" && m.generation !== genFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = m.first_name.toLowerCase().includes(q);
      const matchNick = m.nickname && m.nickname.toLowerCase().includes(q);
      const matchRole = m.family_role && m.family_role.toLowerCase().includes(q);
      return matchName || matchNick || matchRole;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, nickname, or role..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:bg-white"
          />
        </div>

        {/* Generation Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["all", 1, 2, 3, 4] as const).map((gen) => (
            <button
              key={String(gen)}
              onClick={() => setGenFilter(gen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                genFilter === gen
                  ? "bg-amber-800 text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {gen === "all" ? "All Generations" : `Gen ${gen}`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Member Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((m) => {
          const isDeceased = Boolean(m.is_deceased);
          const isLead = Boolean(m.is_family_lead);
          const docs = docCounts[m.id] || 0;
          const photos = photoCounts[m.id] || 0;

          return (
            <div
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between ${
                isDeceased
                  ? "bg-stone-100/80 border-stone-300"
                  : isLead
                  ? "bg-gradient-to-br from-amber-50 to-white border-2 border-amber-400 shadow-xs"
                  : "bg-white border-stone-200 hover:border-amber-400 shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-serif text-lg font-bold flex-shrink-0 ${
                        isDeceased
                          ? "bg-stone-300 text-stone-700"
                          : isLead
                          ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white"
                          : "bg-stone-900 text-amber-200"
                      }`}
                    >
                      {m.first_name[0]}
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-base text-stone-900 leading-tight">
                        {m.first_name}
                      </h4>
                      {m.nickname && (
                        <p className="text-xs font-semibold text-amber-800 mt-0.5">
                          &ldquo;{m.nickname}&rdquo;
                        </p>
                      )}
                      <p className="text-xs text-stone-500 mt-0.5">
                        {m.family_role || `Generation ${m.generation}`}
                      </p>
                    </div>
                  </div>

                  {isLead ? (
                    <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-300 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" /> Lead
                    </span>
                  ) : isDeceased ? (
                    <span className="text-stone-600 bg-stone-200 px-2 py-0.5 rounded-full text-[10px] font-medium border border-stone-300">
                      🕊️ Deceased
                    </span>
                  ) : null}
                </div>

                {m.bio && (
                  <p className="mt-3 text-xs text-stone-600 italic line-clamp-2">
                    &ldquo;{m.bio}&rdquo;
                  </p>
                )}
              </div>

              {/* Badges footer */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <div className="flex items-center gap-3">
                  {docs > 0 ? (
                    <span className="flex items-center gap-1 text-amber-900 font-medium">
                      <FileText className="w-3.5 h-3.5" /> {docs} docs
                    </span>
                  ) : null}
                  {photos > 0 ? (
                    <span className="flex items-center gap-1 text-amber-900 font-medium">
                      <Camera className="w-3.5 h-3.5" /> {photos} photos
                    </span>
                  ) : null}
                </div>
                <span className="text-amber-800 font-medium flex items-center gap-0.5 group-hover:underline">
                  <span>View</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Member Profile Drawer */}
      <MemberProfileDrawer
        memberId={selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
        onSelectMember={(id) => setSelectedMemberId(id)}
        allMembers={members}
      />
    </div>
  );
}
