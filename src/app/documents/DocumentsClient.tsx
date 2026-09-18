"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  Upload,
  Eye,
  Download,
  Trash2,
  X,
  User as UserIcon,
  Plus,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { DocumentCategory, FamilyDocument, FamilyMember, User } from "@/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DocumentUploadModal } from "@/components/documents/DocumentUploadModal";
import { useLanguage } from "@/lib/i18n";

interface DocumentsClientProps {
  initialDocuments: (FamilyDocument & { first_name: string; last_name: string | null })[];
  members: FamilyMember[];
  currentUser?: User | null;
}

const HUMAN_CATEGORIES = [
  { id: "All", label: "All Papers", labelHi: "सभी दस्तावेज़", icon: "📁" },
  { id: "Identity", label: "Identity (Aadhaar/PAN)", labelHi: "पहचान पत्र (आधार/पैन)", icon: "🪪" },
  { id: "Property", label: "Property & Land (7/12)", labelHi: "संपत्ति व भूमि (7/12)", icon: "🏠" },
  { id: "Marriage & Family", label: "Marriage & Family", labelHi: "विवाह व परिवार", icon: "💍" },
  { id: "Medical", label: "Health & Medical", labelHi: "चिकित्सा व स्वास्थ्य", icon: "🏥" },
  { id: "Education", label: "Education & Certificates", labelHi: "शिक्षा प्रमाण पत्र", icon: "🎓" },
  { id: "Financial", label: "Financial & Tax", labelHi: "वित्तीय व बैंक", icon: "🏦" },
];

export function DocumentsClient({
  initialDocuments,
  members,
  currentUser,
}: DocumentsClientProps) {
  const { language, tName } = useLanguage();
  const [documents, setDocuments] = useState(initialDocuments);
  const [search, setSearch] = useState("");
  const [discoveryMode, setDiscoveryMode] = useState<"by_person" | "by_type">("by_person");
  const [selectedPersonId, setSelectedPersonId] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [previewDoc, setPreviewDoc] = useState<FamilyDocument | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<FamilyDocument | null>(null);

  const isAdmin = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "FAMILY_ADMIN";

  const getDocEmoji = (doc: FamilyDocument) => {
    const n = doc.name.toLowerCase();
    const c = doc.category.toLowerCase();
    if (n.includes("aadhaar") || c.includes("identity")) return "🪪";
    if (n.includes("pan")) return "💳";
    if (n.includes("property") || n.includes("7/12") || c.includes("property")) return "🏠";
    if (n.includes("marriage") || c.includes("marriage")) return "💍";
    if (n.includes("medical") || n.includes("health") || c.includes("medical")) return "🏥";
    if (n.includes("passport")) return "🛂";
    if (n.includes("school") || n.includes("degree") || c.includes("education")) return "🎓";
    return "📄";
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return;
    try {
      const res = await fetch(`/api/documents/${docToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
        setDocToDelete(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Filtered documents
  const filtered = documents.filter((doc) => {
    if (selectedPersonId !== "All" && doc.person_id !== selectedPersonId) return false;
    if (selectedCategory !== "All" && doc.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchCat = doc.category.toLowerCase().includes(q);
      const matchPerson = doc.first_name.toLowerCase().includes(q);
      return matchName || matchCat || matchPerson;
    }
    return true;
  });

  // Calculate document counts per member
  const memberCounts: Record<string, number> = {};
  for (const d of documents) {
    memberCounts[d.person_id] = (memberCounts[d.person_id] || 0) + 1;
  }

  // Members who have documents or are prominent
  const activeMembers = members.filter((m) => (memberCounts[m.id] || 0) > 0 || m.generation <= 2);

  return (
    <div className="space-y-6">
      {/* Search & Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Natural Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search papers (Aadhaar, Mukhtar, Property)..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-sm placeholder-stone-400 focus:outline-none focus:border-amber-900 shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Add Document Action (if authenticated) */}
        {currentUser && (
          <button
            onClick={() => setUploadModalOpen(true)}
            className="min-h-[44px] px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Document</span>
          </button>
        )}
      </div>

      {/* Two Natural Pathways: By Person OR By Document Type */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
          <button
            onClick={() => {
              setDiscoveryMode("by_person");
              setSelectedCategory("All");
            }}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              discoveryMode === "by_person"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            }`}
          >
            👤 By Relative
          </button>
          <button
            onClick={() => {
              setDiscoveryMode("by_type");
              setSelectedPersonId("All");
            }}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              discoveryMode === "by_type"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            }`}
          >
            🗂️ By Document Type
          </button>
        </div>

        {/* Path A: Relative Selector Pills */}
        {discoveryMode === "by_person" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            <button
              onClick={() => setSelectedPersonId("All")}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                selectedPersonId === "All"
                  ? "bg-amber-900 text-white"
                  : "bg-white border border-stone-300 text-stone-700 hover:bg-stone-50"
              }`}
            >
              {language === "hi" ? "सभी सदस्य" : "All Relatives"} ({documents.length})
            </button>
            {activeMembers.map((m) => {
              const count = memberCounts[m.id] || 0;
              const isSel = selectedPersonId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedPersonId(m.id)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                    isSel
                      ? "bg-amber-900 text-white"
                      : "bg-white border border-stone-300 text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <span>{tName(m.first_name)}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSel ? "bg-white/20" : "bg-stone-100 text-stone-600"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Path B: Document Type Pills */}
        {discoveryMode === "by_type" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {HUMAN_CATEGORIES.map((cat) => {
              const isSel = selectedCategory === cat.id;
              const count =
                cat.id === "All"
                  ? documents.length
                  : documents.filter((d) => d.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                    isSel
                      ? "bg-amber-900 text-white"
                      : "bg-white border border-stone-300 text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{language === "hi" ? cat.labelHi : cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSel ? "bg-white/20" : "bg-stone-100 text-stone-600"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Human-Readable Document List (Not a generic card grid) */}
      {filtered.length > 0 ? (
        <div className="divide-y divide-stone-200/90 bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
          {filtered.map((doc) => {
            const canDelete =
              isAdmin || (currentUser && currentUser.family_member_id === doc.person_id);

            return (
              <div
                key={doc.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/70 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Thumbnail / Real-World Emblem */}
                  <div
                    onClick={() => setPreviewDoc(doc)}
                    className="w-13 h-13 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-2xl flex-shrink-0 cursor-pointer overflow-hidden hover:ring-2 hover:ring-amber-500 shadow-2xs"
                    title="Click to view"
                  >
                    {doc.file_type?.startsWith("image/") ? (
                      <img
                        src={`/api/documents/${doc.id}/preview`}
                        alt={doc.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{getDocEmoji(doc)}</span>
                    )}
                  </div>

                  <div className="truncate">
                    <h4
                      onClick={() => setPreviewDoc(doc)}
                      className="font-bold text-stone-900 text-sm sm:text-base truncate cursor-pointer hover:text-amber-900"
                    >
                      {doc.name}
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                      <span className="font-semibold text-amber-950 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                        {tName(doc.first_name)}
                      </span>
                      <span>•</span>
                      <span>{doc.category}</span>
                      <span>•</span>
                      <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                    </p>
                  </div>
                </div>

                {/* Obvious Touch Controls (Fitts's Law: 48px+ Touch) */}
                <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="min-h-[48px] px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>OPEN</span>
                  </button>

                  <a
                    href={`/api/documents/${doc.id}/download`}
                    className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center border border-stone-200 cursor-pointer transition-colors"
                    title="Download document"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  {canDelete && (
                    <button
                      onClick={() => setDocToDelete(doc)}
                      className="min-h-[48px] min-w-[48px] p-2 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-stone-300">
          <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-base font-semibold text-stone-800">No documents found</p>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            {search
              ? "Try searching for a different relative name or paper type."
              : "No documents stored under this category yet."}
          </p>
        </div>
      )}

      {/* Full-Screen Document Dominates Screen Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-in fade-in">
          {/* Simple Minimal Chrome Toolbar */}
          <div className="flex items-center justify-between p-3 text-white max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-2 truncate">
              <span className="text-lg">{getDocEmoji(previewDoc)}</span>
              <h4 className="font-bold text-sm sm:text-base truncate">{previewDoc.name}</h4>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <a
                href={`/api/documents/${previewDoc.id}/download`}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </a>
              <button
                onClick={() => setPreviewDoc(null)}
                className="min-h-[44px] min-w-[44px] p-2 text-stone-300 hover:text-white rounded-xl hover:bg-white/10 flex items-center justify-center cursor-pointer"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Document Content Dominates */}
          <div className="flex-1 bg-white rounded-2xl overflow-hidden relative flex items-center justify-center p-2 max-w-5xl mx-auto w-full shadow-2xl">
            {previewDoc.file_type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/documents/${previewDoc.id}/preview`}
                alt={previewDoc.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <iframe
                src={`/api/documents/${previewDoc.id}/preview`}
                className="w-full h-full border-0"
                title={previewDoc.name}
              />
            )}
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <DocumentUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={() => window.location.reload()}
          members={members}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(docToDelete)}
        title="Remove Document"
        message={`Are you sure you want to delete "${docToDelete?.name}"?`}
        confirmText="Delete Document"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDocToDelete(null)}
      />
    </div>
  );
}
