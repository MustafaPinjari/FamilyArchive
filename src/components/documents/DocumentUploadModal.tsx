"use client";

import React, { useState } from "react";
import { X, Camera, Upload, AlertCircle, CheckCircle2, Loader2, FileText } from "lucide-react";
import { DocumentCategory, FamilyMember } from "@/types";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  defaultMemberId?: string;
  onSuccess?: () => void;
}

const PRESETS = [
  { name: "Aadhaar Card", category: "Identity", icon: "🆔" },
  { name: "PAN Card", category: "Identity", icon: "💳" },
  { name: "Passport", category: "Identity", icon: "🛂" },
  { name: "Property Document", category: "Property", icon: "🏠" },
  { name: "Medical Record", category: "Medical", icon: "🏥" },
  { name: "Birth Certificate", category: "Marriage & Family", icon: "📜" },
  { name: "Other Document", category: "Other", icon: "📄" },
];

export function DocumentUploadModal({
  isOpen,
  onClose,
  members,
  defaultMemberId,
  onSuccess,
}: DocumentUploadModalProps) {
  const [memberId, setMemberId] = useState(defaultMemberId || (members[0]?.id ?? ""));
  const [name, setName] = useState("Aadhaar Card");
  const [category, setCategory] = useState<DocumentCategory>("Identity");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please choose at least one file or take a photo first.");
      return;
    }
    if (!memberId) {
      setError("Please select a family member.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append("person_id", memberId);
      formData.append("name", name.trim() || "Document");
      formData.append("category", category);
      formData.append("admin_password", "Family@Archive2026");

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      setUploadedCount(data.count || files.length);
      setSuccess(true);
      setFiles([]);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccess(false);
      }, 1300);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "Unable to upload documents.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Add Document(s)</h3>
              <p className="text-xs text-stone-500">Fast 1-tap single or bulk upload</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Simple Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{uploadedCount} document(s) uploaded successfully!</span>
            </div>
          )}

          {/* 1. Who is this for? */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              1. Who is this document for?
            </label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.nickname ? `(${m.nickname})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Choose / Photograph files (Bulk allowed) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                2. Document Files or Photos
              </label>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                Bulk Add Supported
              </span>
            </div>

            <input
              type="file"
              id="doc-modal-file"
              multiple
              accept="image/*,application/pdf,.docx,.doc"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="doc-modal-file"
              className="w-full py-4 px-4 rounded-2xl bg-stone-50 hover:bg-amber-50/50 border-2 border-dashed border-amber-400 hover:border-amber-600 text-amber-900 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all shadow-xs text-center"
            >
              <Camera className="w-7 h-7 text-amber-700 mb-1" />
              <span className="text-sm font-bold text-stone-900">
                Choose Files or Take Photos
              </span>
              <span className="text-[11px] text-stone-500">
                You can select multiple photos/files at once
              </span>
            </label>

            {/* List of selected files */}
            {files.length > 0 && (
              <div className="mt-2.5 space-y-1.5 max-h-36 overflow-y-auto">
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wide flex items-center justify-between">
                  <span>Selected ({files.length}):</span>
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="text-rose-600 hover:underline text-[11px] font-medium"
                  >
                    Clear All
                  </button>
                </div>
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <FileText className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                      <span className="truncate font-medium">{f.name}</span>
                      <span className="text-[10px] text-stone-400 flex-shrink-0">
                        ({(f.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded-md"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. 1-Tap Preset Document Types */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              3. What document type is this? (1-Tap)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => {
                const isSelected = name === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setName(p.name);
                      setCategory(p.category as DocumentCategory);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-amber-800 text-white shadow-xs scale-102"
                        : "bg-stone-100 text-stone-700 border border-stone-200 hover:border-amber-300"
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom name if desired */}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Or type custom name prefix..."
              required
              className="mt-2.5 w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={uploading || files.length === 0}
              className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading {files.length} Document(s)...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>
                    Upload {files.length > 1 ? `${files.length} Documents` : "Document"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
