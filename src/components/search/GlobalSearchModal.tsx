"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, User as UserIcon, FileText, ArrowRight, Loader2 } from "lucide-react";
import { FamilyDocument, FamilyMember } from "@/types";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMember?: (memberId: string) => void;
  onSelectDocument?: (doc: FamilyDocument) => void;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  onSelectMember,
  onSelectDocument,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [documents, setDocuments] = useState<FamilyDocument[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setMembers([]);
      setDocuments([]);
    }
  }, [isOpen]);

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

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-20 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input */}
        <div className="relative border-b border-stone-200 px-4 py-3.5 flex items-center gap-3">
          <Search className="w-5 h-5 text-stone-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search family members, nicknames, documents, categories..."
            className="w-full text-base bg-transparent text-stone-900 placeholder-stone-400 outline-none"
          />
          {loading ? (
            <Loader2 className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />
          ) : query ? (
            <button
              onClick={() => setQuery("")}
              className="text-stone-400 hover:text-stone-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-xs font-medium text-stone-400 px-2 py-0.5 border border-stone-200 rounded-md">
              ESC
            </span>
          )}
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto p-4 space-y-6">
          {query.trim().length >= 2 && !loading && members.length === 0 && documents.length === 0 && (
            <div className="text-center py-10 text-stone-500">
              <p className="text-base font-medium">Nothing here yet.</p>
              <p className="text-sm mt-1">Let&apos;s preserve this part of our family story.</p>
            </div>
          )}

          {/* Members Results */}
          {members.length > 0 && (
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Family Members ({members.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onClose();
                      onSelectMember?.(m.id);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl border border-stone-200/80 hover:border-amber-400 hover:bg-amber-50/40 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-serif font-bold text-sm flex-shrink-0">
                        {m.first_name[0]}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-stone-900 text-sm">{m.first_name}</span>
                          {m.nickname && (
                            <span className="text-xs text-amber-700 font-medium">({m.nickname})</span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 truncate">
                          {m.is_family_lead ? "👑 Family Lead" : m.is_deceased ? "🕊️ In Memory" : m.family_role || `Gen ${m.generation}`}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Documents Results */}
          {documents.length > 0 && (
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Vault Documents ({documents.length})
                </h4>
              </div>
              <div className="space-y-2">
                {documents.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      onClose();
                      onSelectDocument?.(d);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl border border-stone-200/80 hover:border-amber-400 hover:bg-amber-50/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-amber-700" />
                      </div>
                      <div className="truncate">
                        <div className="font-medium text-stone-900 text-sm truncate">{d.name}</div>
                        <div className="text-xs text-stone-500 flex items-center gap-2">
                          <span className="font-medium text-amber-800">{d.category}</span>
                          <span>•</span>
                          <span>{(d.file_size / 1024).toFixed(0)} KB</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-amber-800 bg-amber-100/60 px-2.5 py-1 rounded-full flex-shrink-0">
                      View
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
