"use client";

import React, { useState, useEffect } from "react";
import { Search, FileText, User as UserIcon, ArrowRight, Loader2 } from "lucide-react";
import { FamilyDocument, FamilyMember } from "@/types";
import { MemberProfileDrawer } from "@/components/members/MemberProfileDrawer";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [documents, setDocuments] = useState<FamilyDocument[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<FamilyDocument | null>(null);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setMembers([]);
      setDocuments([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members || []);
          setDocuments(data.documents || []);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-stone-400 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by person name, nickname, or document category (e.g. Mustafa, Aadhaar, Passport)..."
          className="w-full text-base bg-transparent text-stone-900 placeholder-stone-400 outline-none"
          autoFocus
        />
        {loading && <Loader2 className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />}
      </div>

      {/* Results */}
      {query.trim().length >= 2 && !loading && members.length === 0 && documents.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center max-w-md mx-auto">
          <p className="text-base font-semibold text-stone-900">Nothing here yet.</p>
          <p className="text-xs text-stone-500 mt-1">Let&apos;s preserve this part of our family story.</p>
        </div>
      )}

      {/* Members Section */}
      {members.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Family Members ({members.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/40 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-serif font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {m.first_name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">{m.first_name}</div>
                    <div className="text-xs text-stone-500">
                      {m.nickname ? `"${m.nickname}"` : m.family_role || `Gen ${m.generation}`}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-amber-800 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Documents Section */}
      {documents.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Vault Documents ({documents.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.map((d) => (
              <div
                key={d.id}
                onClick={() => setPreviewDoc(d)}
                className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">{d.name}</div>
                    <div className="text-xs text-stone-500">
                      {d.category} • {(d.file_size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-full">
                  Preview
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <MemberProfileDrawer
        memberId={selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
        onSelectMember={(id) => setSelectedMemberId(id)}
      />

      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
