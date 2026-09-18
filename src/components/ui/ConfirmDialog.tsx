"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-full flex-shrink-0 ${
                isDestructive ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-800"
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="text-stone-400 hover:text-stone-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm transition-colors ${
                isDestructive
                  ? "bg-rose-700 hover:bg-rose-800"
                  : "bg-amber-800 hover:bg-amber-900"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
