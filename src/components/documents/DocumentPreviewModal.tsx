"use client";

import React, { useState } from "react";
import { X, Download, FileText, ExternalLink, Calendar, Shield, Clock } from "lucide-react";
import { FamilyDocument } from "@/types";

interface DocumentPreviewModalProps {
  document: FamilyDocument | null;
  onClose: () => void;
}

export function DocumentPreviewModal({ document, onClose }: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true);

  if (!document) return null;

  const isPdf = document.file_type === "application/pdf" || document.file_path.toLowerCase().endsWith(".pdf");
  const isImage =
    document.file_type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(document.file_path);

  const previewUrl = `/api/documents/${document.id}/preview`;
  const downloadUrl = `/api/documents/${document.id}/download`;

  // Expiry check
  let expiryStatus: "valid" | "expiring_soon" | "expired" | null = null;
  if (document.expiry_date) {
    const expTime = new Date(document.expiry_date).getTime();
    const now = Date.now();
    const daysLeft = (expTime - now) / (1000 * 60 * 60 * 24);
    if (daysLeft < 0) {
      expiryStatus = "expired";
    } else if (daysLeft <= 60) {
      expiryStatus = "expiring_soon";
    } else {
      expiryStatus = "valid";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-amber-700" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-stone-900 text-base truncate">{document.name}</h3>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex-shrink-0">
                  {document.category}
                </span>
                {expiryStatus && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      expiryStatus === "expired"
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : expiryStatus === "expiring_soon"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
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
              <p className="text-xs text-stone-500 mt-0.5">
                {(document.file_size / 1024).toFixed(1)} KB • Uploaded by {document.uploaded_by} on{" "}
                {new Date(document.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium shadow-sm transition-colors"
              title="Download File"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-stone-100 overflow-auto flex items-center justify-center p-4 relative">
          {isPdf ? (
            <iframe
              src={previewUrl}
              className="w-full h-full rounded-xl border border-stone-300 bg-white shadow-inner"
              title={document.name}
            />
          ) : isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={document.name}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md border border-stone-200"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-stone-200 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-semibold text-stone-900">{document.name}</h4>
              <p className="text-sm text-stone-500 mt-2">
                This file format does not support inline browser preview. You can securely download and view it on your device.
              </p>
              <a
                href={downloadUrl}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </a>
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="px-5 py-3 border-t border-stone-200 bg-white text-xs text-stone-600 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            {document.document_number && (
              <span>
                <strong className="text-stone-700">Doc No:</strong> {document.document_number}
              </span>
            )}
            {document.expiry_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>
                  Expires: <strong>{new Date(document.expiry_date).toLocaleDateString()}</strong>
                </span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Encrypted Storage</span>
            </span>
          </div>
          {document.description && (
            <p className="text-stone-500 italic max-w-md truncate">{document.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
