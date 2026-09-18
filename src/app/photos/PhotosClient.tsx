"use client";

import React, { useState } from "react";
import { Photo, PhotoAlbum, FamilyMember, User } from "@/types";
import { Camera, Upload, Calendar, Tag, X, ChevronLeft, ChevronRight } from "lucide-react";
import { PhotoUploadModal } from "@/components/photos/PhotoUploadModal";

interface PhotosClientProps {
  initialPhotos: (Photo & {
    album_name: string;
    tagged_members?: { id: string; first_name: string; last_name: string | null }[];
  })[];
  albums: PhotoAlbum[];
  members: FamilyMember[];
  currentUser: User;
}

export function PhotosClient({
  initialPhotos,
  albums,
  members,
  currentUser,
}: PhotosClientProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [selectedAlbum, setSelectedAlbum] = useState<string>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const refreshPhotos = async () => {
    try {
      const res = await fetch("/api/photos");
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos || []);
      }
    } catch (err) {
      console.error("Photos refresh error:", err);
    }
  };

  const filtered = photos.filter((p) => {
    if (selectedAlbum !== "all" && p.album_id !== selectedAlbum) return false;
    return true;
  });

  const activePhoto = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <div className="space-y-6">
      {/* Top Header & Album Selector */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Album tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedAlbum("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedAlbum === "all"
                ? "bg-amber-800 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            All Photos ({photos.length})
          </button>
          {albums.map((alb) => (
            <button
              key={alb.id}
              onClick={() => setSelectedAlbum(alb.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedAlbum === alb.id
                  ? "bg-amber-800 text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {alb.name}
            </button>
          ))}
        </div>

        {/* Upload Action */}
        {currentUser.role !== "VIEWER" && (
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photo</span>
          </button>
        )}
      </div>

      {/* Photos Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((ph, idx) => (
            <div
              key={ph.id}
              onClick={() => setLightboxIndex(idx)}
              className="group relative rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 aspect-square shadow-xs hover:shadow-lg transition-all cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${ph.id}/view`}
                alt={ph.caption || "Family Photo"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white text-xs">
                <span className="font-semibold truncate">{ph.caption || ph.album_name}</span>
                <span className="text-[10px] text-stone-300 mt-0.5">{ph.album_name}</span>
                {ph.tagged_members && ph.tagged_members.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-300 mt-1 truncate">
                    <Tag className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {ph.tagged_members.map((m) => m.first_name).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Camera className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-serif font-bold text-stone-900">No family photos yet</h3>
          <p className="text-xs text-stone-500 mt-2 leading-relaxed">
            Start building our family memories in the archive.
          </p>
          {currentUser.role !== "VIEWER" && (
            <button
              onClick={() => setUploadModalOpen(true)}
              className="mt-5 px-5 py-2.5 rounded-xl bg-amber-800 text-white text-xs font-semibold shadow-sm hover:bg-amber-900 transition-colors inline-flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Upload First Photo</span>
            </button>
          )}
        </div>
      )}

      {/* Lightbox Viewer */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Prev/Next controls */}
          {lightboxIndex !== null && lightboxIndex > 0 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {lightboxIndex !== null && lightboxIndex < filtered.length - 1 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${activePhoto.id}/view`}
              alt={activePhoto.caption || "Photo"}
              className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />

            <div className="mt-4 text-center text-white">
              <h4 className="text-base font-semibold">
                {activePhoto.caption || activePhoto.album_name}
              </h4>
              <div className="flex items-center justify-center gap-4 text-xs text-stone-300 mt-1">
                <span>{activePhoto.album_name}</span>
                {activePhoto.date_taken && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    {new Date(activePhoto.date_taken).toLocaleDateString()}
                  </span>
                )}
              </div>
              {activePhoto.tagged_members && activePhoto.tagged_members.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-amber-300">
                  <Tag className="w-3.5 h-3.5" />
                  <span>
                    Tagged: {activePhoto.tagged_members.map((m) => m.first_name).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Photo Modal */}
      <PhotoUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        albums={albums}
        members={members}
        onSuccess={refreshPhotos}
      />
    </div>
  );
}
