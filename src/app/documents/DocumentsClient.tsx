"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  Upload,
  Eye,
  Download,
  Trash2,
  Calendar,
  Shield,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User as UserIcon,
} from "lucide-react";
import { DocumentCategory, FamilyDocument, FamilyMember, User } from "@/types";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { DocumentUploadModal } from "@/components/documents/DocumentUploadModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useRouter } from "next/navigation";

interface DocumentsClientProps {
  initialDocuments: (FamilyDocument & { first_name: string; last_name: string | null })[];
  members: FamilyMember[];
  currentUser: User;
}

const CATEGORIES: ("All" | DocumentCategory)[] = [
  "All",
  "Identity",
  "Financial",
  "Property",
  "Education",
  "Marriage & Family",
  "Medical",
  "Insurance",
  "Legal",
  "Vehicle",
  "Other",
];

export function DocumentsClient({
  initialDocuments,
  members,
  currentUser,
}: DocumentsClientProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | DocumentCategory>("All");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("All");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<FamilyDocument | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<FamilyDocument | null>(null);

  const isAdmin = currentUser.role === "SUPER_ADMIN" || currentUser.role === "FAMILY_ADMIN";

  const refreshDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error("Refresh error:", err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((d) => d.id));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return;
    try {
      const res = await fetch(`/api/documents/${docToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
        setSelectedIds((prev) => prev.filter((id) => id !== docToDelete.id));
        setDocToDelete(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/documents/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: selectedIds }),
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => !selectedIds.includes(d.id)));
        setSelectedIds([]);
        setShowBulkConfirm(false);
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const filtered = documents.filter((doc) => {
    if (selectedCategory !== "All" && doc.category !== selectedCategory) return false;
    if (selectedMemberId !== "All" && doc.person_id !== selectedMemberId) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchCat = doc.category.toLowerCase().includes(q);
      const matchPerson = doc.first_name.toLowerCase().includes(q);
      const matchNumber = doc.document_number && doc.document_number.toLowerCase().includes(q);
      return matchName || matchCat || matchPerson || matchNumber;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top action & filter bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vault documents by title, number, or relative..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:bg-white"
            />
          </div>

          {/* Member Filter & Upload CTA */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-800 focus:outline-none focus:border-amber-600"
            >
              <option value="All">All Relatives</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.nickname ? `(${m.nickname})` : ""}
                </option>
              ))}
            </select>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-sm transition-colors whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>+ Bulk / Single Upload</span>
            </button>
          </div>
        </div>

        {/* Category Pills & Select All Button */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-amber-800 text-white shadow-xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filtered.length > 0 && (
            <button
              onClick={selectAll}
              className="text-xs font-bold text-amber-900 bg-amber-100/70 hover:bg-amber-200/80 px-3 py-1 rounded-xl transition-colors whitespace-nowrap cursor-pointer flex-shrink-0"
            >
              {selectedIds.length === filtered.length ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>
      </div>

      {/* Sticky Bulk Action Floating Banner */}
      {selectedIds.length > 0 && (
        <div className="sticky top-16 z-30 bg-stone-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between gap-2 animate-in slide-in-from-top duration-200 border border-stone-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm font-bold bg-amber-600 text-white px-2.5 py-0.5 rounded-full">
              {selectedIds.length} Selected
            </span>
            <span className="hidden sm:inline text-xs text-stone-300">
              of {filtered.length} documents
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowBulkConfirm(true)}
              disabled={bulkDeleting}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Document Cards Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => {
            // Expiry status
            let expiryStatus: "valid" | "expiring_soon" | "expired" | null = null;
            if (doc.expiry_date) {
              const expTime = new Date(doc.expiry_date).getTime();
              const daysLeft = (expTime - Date.now()) / (1000 * 60 * 60 * 24);
              if (daysLeft < 0) expiryStatus = "expired";
              else if (daysLeft <= 60) expiryStatus = "expiring_soon";
              else expiryStatus = "valid";
            }

            const canDelete =
              isAdmin || currentUser.family_member_id === doc.person_id;
            const isSelected = selectedIds.includes(doc.id);

            return (
              <div
                key={doc.id}
                className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-amber-600 ring-2 ring-amber-600/30 bg-amber-50/20 shadow-md"
                    : "border-stone-200 hover:border-amber-400 shadow-xs hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(doc.id)}
                        className="w-4 h-4 rounded text-amber-800 focus:ring-amber-600 border-stone-300 cursor-pointer flex-shrink-0"
                        title="Select document"
                      />

                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-amber-700" />
                      </div>
                      <div className="truncate">
                        <h4 className="font-semibold text-stone-900 text-sm truncate">
                          {doc.name}
                        </h4>
                        <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-amber-900">{doc.first_name}</span>
                          <span>•</span>
                          <span>{doc.category}</span>
                        </p>
                      </div>
                    </div>

                    {/* Expiry Pill */}
                    {expiryStatus && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          expiryStatus === "expired"
                            ? "bg-rose-100 text-rose-800"
                            : expiryStatus === "expiring_soon"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {expiryStatus === "expired"
                          ? "Expired"
                          : expiryStatus === "expiring_soon"
                          ? "Expiring Soon"
                          : "Valid"}
                      </span>
                    )}
                  </div>

                  {/* Metadata preview */}
                  <div className="mt-4 pt-3 border-t border-stone-100 text-xs text-stone-500 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Size: {(doc.file_size / 1024).toFixed(0)} KB</span>
                      <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                    </div>
                    {doc.document_number && (
                      <div className="truncate text-stone-600">
                        <strong>No:</strong> {doc.document_number}
                      </div>
                    )}
                    {doc.expiry_date && (
                      <div className="flex items-center gap-1 text-stone-600">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>Expires: {new Date(doc.expiry_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    <a
                      href={`/api/documents/${doc.id}/download`}
                      className="p-1.5 rounded-xl text-stone-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => setDocToDelete(doc)}
                      className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Document"
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
        /* Empty State */
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-serif font-bold text-stone-900">No documents found</h3>
          <p className="text-xs text-stone-500 mt-2 leading-relaxed">
            Nothing here yet. Let&apos;s preserve this part of our family story by uploading important records.
          </p>
          {currentUser.role !== "VIEWER" && (
            <button
              onClick={() => setUploadModalOpen(true)}
              className="mt-5 px-5 py-2.5 rounded-xl bg-amber-800 text-white text-xs font-semibold shadow-sm hover:bg-amber-900 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Bulk / Single Upload</span>
            </button>
          )}
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        members={members}
        onSuccess={refreshDocuments}
      />

      {/* Single Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(docToDelete)}
        title="Delete this document?"
        message={`Are you sure you want to permanently delete "${docToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Document"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDocToDelete(null)}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBulkConfirm}
        title={`Delete ${selectedIds.length} documents?`}
        message={`Are you sure you want to permanently delete these ${selectedIds.length} selected document(s)? This action cannot be undone.`}
        confirmText={`Delete ${selectedIds.length} Documents`}
        isDestructive={true}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setShowBulkConfirm(false)}
      />
    </div>
  );
}
