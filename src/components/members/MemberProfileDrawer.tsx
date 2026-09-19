"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Camera,
  Heart,
  Calendar,
  Eye,
  Download,
  Upload,
  User as UserIcon,
  ShieldAlert,
  Crown,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";
import { FamilyDocument, FamilyMember } from "@/types";
import { DocumentPreviewModal } from "../documents/DocumentPreviewModal";
import { DocumentUploadModal } from "../documents/DocumentUploadModal";
import { IdCardModal } from "../id-card/IdCardModal";

interface MemberProfileDrawerProps {
  memberId: string | null;
  onClose: () => void;
  onSelectMember: (id: string) => void;
  allMembers?: FamilyMember[];
}

export function MemberProfileDrawer({
  memberId,
  onClose,
  onSelectMember,
  allMembers = [],
}: MemberProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "photos">("overview");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    person: FamilyMember;
    kinship: {
      father: FamilyMember | null;
      mother: FamilyMember | null;
      spouse: FamilyMember | null;
      children: FamilyMember[];
      siblings: FamilyMember[];
    };
    documents: FamilyDocument[];
    photos: { id: string; file_path: string; caption: string | null; album_name: string }[];
  } | null>(null);

  const [previewDoc, setPreviewDoc] = useState<FamilyDocument | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);

  const fetchProfile = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/members/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !memberId) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/members/${memberId}/photo`, {
        method: "POST",
        body: formData,
      });
      const resJson = await res.json();
      const newPhotoUrl = resJson.photo_url || resJson.photoUrl;
      if (res.ok && newPhotoUrl) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                person: { ...prev.person, photo_url: newPhotoUrl },
              }
            : null
        );
      }
    } catch (err) {
      console.error("Error uploading photo:", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    if (memberId) {
      fetchProfile(memberId);
      setActiveTab("overview");
    } else {
      setData(null);
    }
  }, [memberId]);

  if (!memberId) return null;

  const person = data?.person;
  const isDeceased = Boolean(person?.is_deceased);
  const isLead = Boolean(person?.is_family_lead);

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/60 backdrop-blur-sm animate-in fade-in print:hidden">
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-12">
          <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-stone-200 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Top Bar with actions */}
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                <span>Family Profile</span>
                {isLead && (
                  <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-700" />
                    Family Lead
                  </span>
                )}
              </span>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Header Card */}
            <div
              className={`p-6 border-b ${
                isDeceased
                  ? "bg-gradient-to-b from-stone-100 to-stone-50 border-stone-300"
                  : isLead
                  ? "bg-gradient-to-b from-amber-50/70 to-white border-amber-200"
                  : "bg-gradient-to-b from-stone-50 to-white border-stone-200"
              }`}
            >
              <div className="flex items-start gap-5">
                {/* Avatar with photo and camera upload */}
                <div className="relative flex-shrink-0">
                  {person?.photo_url ? (
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-md border-2 border-amber-300">
                      <img
                        src={person.photo_url}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fb = e.currentTarget.parentElement?.querySelector(".avatar-fb");
                          if (fb) (fb as HTMLElement).style.display = "flex";
                        }}
                        className="w-20 h-20 rounded-2xl object-cover"
                      />
                      <div
                        className={`avatar-fb hidden absolute inset-0 w-20 h-20 items-center justify-center font-serif text-2xl font-bold ${
                          isDeceased
                            ? "bg-stone-200 text-stone-700"
                            : isLead
                            ? "bg-gradient-to-br from-amber-600 to-amber-800 text-amber-50"
                            : "bg-gradient-to-br from-stone-800 to-stone-950 text-amber-200"
                        }`}
                      >
                        {person?.first_name ? person.first_name[0] : "?"}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`w-20 h-20 rounded-2xl flex items-center justify-center font-serif text-2xl font-bold shadow-md ${
                        isDeceased
                          ? "bg-stone-200 text-stone-700 border-2 border-stone-300"
                          : isLead
                          ? "bg-gradient-to-br from-amber-600 to-amber-800 text-amber-50 border-2 border-amber-300"
                          : "bg-gradient-to-br from-stone-800 to-stone-950 text-amber-200 border-2 border-amber-400/40"
                      }`}
                    >
                      {person?.first_name ? person.first_name[0] : "?"}
                    </div>
                  )}

                  {/* Camera overlay button */}
                  <label
                    htmlFor={`drawer-photo-upload-${person?.id}`}
                    className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-full shadow-md cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
                    title="Change profile photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </label>
                  <input
                    id={`drawer-photo-upload-${person?.id}`}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
                      {person?.first_name}
                    </h2>
                    {person?.nickname && (
                      <span className="text-sm font-semibold text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-lg">
                        &ldquo;{person.nickname}&rdquo;
                      </span>
                    )}
                  </div>

                  <label
                    htmlFor={`drawer-photo-upload-${person?.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-950 cursor-pointer mt-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{person?.photo_url ? "Change Photo" : "+ Add Profile Photo"}</span>
                  </label>

                  {/* Role / Subtitle */}
                  <div className="mt-1 text-sm text-stone-600 font-medium">
                    {person?.family_role || `Generation ${person?.generation}`}
                  </div>

                  {/* Memorial badge */}
                  {isDeceased && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-stone-700 bg-stone-200/80 px-2.5 py-1 rounded-full font-medium border border-stone-300">
                      <span>🕊️</span>
                      <span>In Loving Memory</span>
                    </div>
                  )}

                  {/* Bio */}
                  {person?.bio && (
                    <p className="mt-2 text-xs text-stone-600 leading-relaxed italic line-clamp-2">
                      &ldquo;{person.bio}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-stone-200/80">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "overview"
                      ? "bg-amber-800 text-white shadow-sm"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>Kinship & Bio</span>
                </button>

                <button
                  onClick={() => setActiveTab("documents")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "documents"
                      ? "bg-amber-800 text-white shadow-sm"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Vault Documents</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900">
                    {data?.documents?.length || 0}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("photos")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "photos"
                      ? "bg-amber-800 text-white shadow-sm"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Memories</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900">
                    {data?.photos?.length || 0}
                  </span>
                </button>

                <button
                  onClick={() => setIdCardOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100/80 hover:bg-amber-200/80 text-amber-950 border border-amber-300/80 text-xs font-bold transition-all shadow-2xs cursor-pointer ml-auto"
                  title="View official permanent ID card"
                >
                  <span>🪪 ID Card</span>
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading ? (
                <div className="py-12 text-center text-stone-400 text-sm">
                  Loading family records...
                </div>
              ) : activeTab === "overview" ? (
                <div className="space-y-6">
                  {/* Kinship Relations Section */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-amber-700" />
                      Immediate Family & Kinship
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Parents */}
                      <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                        <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                          Parents
                        </div>
                        {data?.kinship.father || data?.kinship.mother ? (
                          <div className="space-y-1.5">
                            {data.kinship.father && (
                              <button
                                onClick={() => onSelectMember(data.kinship.father!.id)}
                                className="w-full flex items-center justify-between text-left p-1.5 rounded-lg hover:bg-white text-xs text-stone-800 font-medium group transition-colors"
                              >
                                <span>
                                  <strong>Father:</strong> {data.kinship.father.first_name}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700" />
                              </button>
                            )}
                            {data.kinship.mother && (
                              <button
                                onClick={() => onSelectMember(data.kinship.mother!.id)}
                                className="w-full flex items-center justify-between text-left p-1.5 rounded-lg hover:bg-white text-xs text-stone-800 font-medium group transition-colors"
                              >
                                <span>
                                  <strong>Mother:</strong> {data.kinship.mother.first_name}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-stone-500 italic">Root Generation</div>
                        )}
                      </div>

                      {/* Spouse */}
                      <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                        <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                          Spouse
                        </div>
                        {data?.kinship.spouse ? (
                          <button
                            onClick={() => onSelectMember(data.kinship.spouse!.id)}
                            className="w-full flex items-center justify-between text-left p-1.5 rounded-lg hover:bg-white text-xs text-stone-800 font-medium group transition-colors"
                          >
                            <span>
                              <strong>Spouse:</strong> {data.kinship.spouse.first_name}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700" />
                          </button>
                        ) : (
                          <div className="text-xs text-stone-500 italic">Not specified</div>
                        )}
                      </div>
                    </div>

                    {/* Children */}
                    <div className="mt-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                      <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                        Children ({data?.kinship.children.length || 0})
                      </div>
                      {data?.kinship.children && data.kinship.children.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {data.kinship.children.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => onSelectMember(child.id)}
                              className="flex items-center justify-between p-2 rounded-lg bg-white border border-stone-200/80 hover:border-amber-400 text-left text-xs font-medium text-stone-800 group transition-all"
                            >
                              <div className="truncate">
                                <div>{child.first_name}</div>
                                {child.nickname && (
                                  <div className="text-[10px] text-amber-800">
                                    {child.nickname}
                                  </div>
                                )}
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-stone-500 italic">
                          No children recorded in archive.
                        </div>
                      )}
                    </div>

                    {/* Siblings */}
                    {data?.kinship.siblings && data.kinship.siblings.length > 0 && (
                      <div className="mt-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                        <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                          Siblings ({data.kinship.siblings.length})
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {data.kinship.siblings.map((sib) => (
                            <button
                              key={sib.id}
                              onClick={() => onSelectMember(sib.id)}
                              className="flex items-center justify-between p-2 rounded-lg bg-white border border-stone-200/80 hover:border-amber-400 text-left text-xs font-medium text-stone-800 group transition-all"
                            >
                              <span className="truncate">{sib.first_name}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Biography & Information */}
                  {person?.bio && (
                    <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/70">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-700" />
                        Family Notes
                      </h4>
                      <p className="text-xs text-stone-700 leading-relaxed">{person.bio}</p>
                    </div>
                  )}
                </div>
              ) : activeTab === "documents" ? (
                /* Documents Tab */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Official Records & Documents
                    </h3>
                    <button
                      onClick={() => setUploadModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium shadow-sm transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Document</span>
                    </button>
                  </div>

                  {data?.documents && data.documents.length > 0 ? (
                    <div className="space-y-2.5">
                      {data.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3.5 rounded-xl border border-stone-200 hover:border-amber-400 bg-white transition-all shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4 text-amber-700" />
                              </div>
                              <div className="truncate">
                                <div className="font-semibold text-stone-900 text-sm truncate">
                                  {doc.name}
                                </div>
                                <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                                  <span className="font-medium text-amber-800">{doc.category}</span>
                                  <span>•</span>
                                  <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => setPreviewDoc(doc)}
                                className="px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5 text-stone-500" />
                                <span>Preview</span>
                              </button>
                              <a
                                href={`/api/documents/${doc.id}/download`}
                                className="p-1 text-stone-600 hover:text-amber-800 rounded-lg hover:bg-amber-50"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50">
                      <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-stone-700">No documents yet.</p>
                      <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                        Upload the first document (Aadhaar, Passport, Records) for {person?.first_name}.
                      </p>
                      <button
                        onClick={() => setUploadModalOpen(true)}
                        className="mt-4 px-4 py-2 rounded-xl bg-amber-800 text-white text-xs font-medium shadow-sm hover:bg-amber-900 transition-colors inline-flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Document</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Photos Tab */
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Tagged Memories
                  </h3>
                  {data?.photos && data.photos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {data.photos.map((ph) => (
                        <div
                          key={ph.id}
                          className="group relative rounded-xl overflow-hidden border border-stone-200 bg-stone-100 aspect-square shadow-sm"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/photos/${ph.id}/view`}
                            alt={ph.caption || "Family memory"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end text-white text-xs">
                            <span className="font-medium truncate">{ph.caption || "Memory"}</span>
                            <span className="text-[10px] text-stone-300">{ph.album_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50">
                      <Camera className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-stone-700">No family photos yet.</p>
                      <p className="text-xs text-stone-400 mt-1">
                        Start building our family memories in the Photo Archive.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        members={allMembers.length > 0 ? allMembers : (person ? [person] : [])}
        defaultMemberId={memberId}
        onSuccess={() => {
          if (memberId) fetchProfile(memberId);
        }}
      />

      {/* ID Card Modal */}
      {data?.person && (
        <IdCardModal
          isOpen={idCardOpen}
          onClose={() => setIdCardOpen(false)}
          member={data.person}
          allMembers={allMembers}
          kinship={data.kinship}
        />
      )}
    </>
  );
}
