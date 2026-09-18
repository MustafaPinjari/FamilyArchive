"use client";

import React, { useState } from "react";
import { X, Upload, Camera, AlertCircle, Loader2 } from "lucide-react";
import { FamilyMember, PhotoAlbum } from "@/types";

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  albums: PhotoAlbum[];
  members: FamilyMember[];
  onSuccess?: () => void;
}

export function PhotoUploadModal({
  isOpen,
  onClose,
  albums,
  members,
  onSuccess,
}: PhotoUploadModalProps) {
  const [albumId, setAlbumId] = useState(albums[0]?.id || "album-memories");
  const [caption, setCaption] = useState("");
  const [dateTaken, setDateTaken] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleMemberTag = (mId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a photo to upload.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("album_id", albumId);
      formData.append("caption", caption.trim());
      formData.append("date_taken", dateTaken);
      formData.append("tagged_members", JSON.stringify(selectedMembers));

      const res = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      setCaption("");
      setDateTaken("");
      setSelectedMembers([]);
      setFile(null);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 text-base">Add Family Photo</h3>
              <p className="text-xs text-stone-500">Preserve memories in albums</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* File Picker */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Select Photo *
            </label>
            <div className="border-2 border-dashed border-stone-300 rounded-xl p-4 text-center hover:border-amber-500 transition-colors bg-stone-50/50">
              <input
                type="file"
                id="photo-file-upload"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
                className="hidden"
                accept="image/*"
                required
              />
              <label
                htmlFor="photo-file-upload"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <Camera className="w-8 h-8 text-amber-700/80 mb-2" />
                {file ? (
                  <span className="text-sm font-medium text-stone-900">{file.name}</span>
                ) : (
                  <>
                    <span className="text-sm font-medium text-amber-800">
                      Click to choose or drag photo
                    </span>
                    <span className="text-xs text-stone-400 mt-1">
                      JPG, PNG, WEBP supported
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Album & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Album
              </label>
              <select
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:border-amber-600"
              >
                {albums.map((alb) => (
                  <option key={alb.id} value={alb.id}>
                    {alb.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Date Taken (Optional)
              </label>
              <input
                type="date"
                value={dateTaken}
                onChange={(e) => setDateTaken(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Caption / Description
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Eid dinner at Bade Pappa's house"
              className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* Tagged Relatives */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Tag Relatives in Photo
            </label>
            <div className="max-h-36 overflow-y-auto p-2 border border-stone-200 rounded-xl bg-stone-50/50 flex flex-wrap gap-1.5">
              {members.map((m) => {
                const isTagged = selectedMembers.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMemberTag(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      isTagged
                        ? "bg-amber-800 text-white shadow-xs"
                        : "bg-white text-stone-700 border border-stone-200 hover:border-amber-300"
                    }`}
                  >
                    {m.first_name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2 text-sm font-medium text-white bg-amber-800 hover:bg-amber-900 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Save Photo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
