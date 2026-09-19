"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  FileText,
  Eye,
  Download,
  X,
  ChevronDown,
  ChevronRight,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  ArrowLeft,
  Users,
  Home as HomeIcon,
  Shield,
  Layers,
} from "lucide-react";
import { FamilyDocument, FamilyMember, Marriage, Relationship } from "@/types";
import { useLanguage } from "@/lib/i18n";
import { Navbar } from "@/components/layout/Navbar";
import { buildFamilyHierarchy } from "@/lib/family-tree-structure";

interface BranchData {
  id: string;
  name: string;
  nickname?: string;
  role: string;
  isLead?: boolean;
  spouse?: { id: string; name: string };
  children: {
    id: string;
    name: string;
    spouse?: { id: string; name: string };
    children?: { id: string; name: string }[];
  }[];
}

export default function FamilyHomePage() {
  const { language, t, tName } = useLanguage();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [marriages, setMarriages] = useState<Marriage[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [memberDocs, setMemberDocs] = useState<FamilyDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<FamilyDocument | null>(null);

  // Profile Photo Upload State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);

  // Upload Form inside person view
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadName, setUploadName] = useState("Aadhaar Card");
  const [uploadCategory, setUploadCategory] = useState("Identity");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Natural Language Search
  const [search, setSearch] = useState("");

  // Which branch is open (Progressive Disclosure)
  const [openBranch, setOpenBranch] = useState<string | null>(null);

  // Load family members, marriages, relationships from authoritative database
  useEffect(() => {
    fetch("/api/family-tree")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members && Array.isArray(data.members)) {
          setMembers(data.members);
        }
        if (data?.marriages && Array.isArray(data.marriages)) {
          setMarriages(data.marriages);
        }
        if (data?.relationships && Array.isArray(data.relationships)) {
          setRelationships(data.relationships);
        }
      })
      .catch((err) => console.error("Error loading family tree:", err));
  }, []);

  // Compute branches dynamically from SQLite database
  const dynamicBranches: BranchData[] = useMemo(() => {
    const rawBranches = buildFamilyHierarchy(members, marriages, relationships);
    return rawBranches.map((b) => ({
      id: b.lead.id,
      name: b.lead.first_name,
      nickname: b.lead.nickname || undefined,
      role: b.lead.family_role || (b.lead.is_family_lead ? "Family Lead" : "Branch Head"),
      isLead: Boolean(b.lead.is_family_lead),
      spouse: b.spouse ? { id: b.spouse.id, name: b.spouse.first_name } : undefined,
      children: b.households.map((hh) => ({
        id: hh.primary.id,
        name: hh.primary.first_name,
        spouse: hh.spouse ? { id: hh.spouse.id, name: hh.spouse.first_name } : undefined,
        children: hh.children.map((c) => ({ id: c.id, name: c.first_name })),
      })),
    }));
  }, [members, marriages, relationships]);

  // Generation 1 root members
  const gen1Members = useMemo(() => {
    return members
      .filter((m) => m.generation === 1)
      .sort((a, b) => a.display_order - b.display_order);
  }, [members]);

  // Set default open branch once dynamic branches are resolved
  useEffect(() => {
    if (!openBranch && dynamicBranches.length > 0) {
      setOpenBranch(dynamicBranches[0].id);
    }
  }, [dynamicBranches, openBranch]);

  // Open person profile & fetch documents strictly from the SQLite database
  const handleOpenPerson = async (memberId: string) => {
    const targetId = memberId.toLowerCase().trim();
    let person = members.find((m) => m.id.toLowerCase() === targetId);

    if (!person) {
      try {
        const res = await fetch(`/api/members/${encodeURIComponent(targetId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.person) {
            person = json.person;
            setMembers((prev) => {
              const exists = prev.some((m) => m.id === json.person.id);
              return exists ? prev.map((m) => (m.id === json.person.id ? json.person : m)) : [...prev, json.person];
            });
          }
        }
      } catch (err) {
        console.error("Error fetching member:", err);
      }
    }

    if (!person) {
      console.warn(`Family member with id "${targetId}" not found in database.`);
      return;
    }

    setSelectedMember(person);
    setShowUploadForm(false);
    setUploadFiles([]);
    setUploadSuccess(false);
    setUploadError(null);
    setPhotoFeedback(null);
    setLoadingDocs(true);

    try {
      const res = await fetch(`/api/members/${encodeURIComponent(targetId)}`);
      if (res.ok) {
        const json = await res.json();
        setMemberDocs(json.documents || []);
        if (json.person) {
          setSelectedMember(json.person);
        }
      } else {
        setMemberDocs([]);
      }
    } catch (err) {
      console.error("Error loading member documents:", err);
      setMemberDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Helper to compress camera/phone photo to lightweight JPEG before upload (<35KB)
  const compressPhotoForUpload = (file: File, maxSize = 360, quality = 0.85): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/") || file.size < 40 * 1024) {
        return resolve(file);
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(file);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // Profile Photo Upload Handler
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !selectedMember) return;
    setUploadingPhoto(true);
    setPhotoFeedback(null);

    try {
      const file = await compressPhotoForUpload(rawFile);
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(`/api/members/${selectedMember.id}/photo`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      const newPhotoUrl = data.photo_url || data.photoUrl;
      if (res.ok && newPhotoUrl) {
        setSelectedMember((prev) => (prev ? { ...prev, photo_url: newPhotoUrl } : null));
        setMembers((prev) =>
          prev.map((m) => (m.id === selectedMember.id ? { ...m, photo_url: newPhotoUrl } : m))
        );
        setPhotoFeedback(language === "hi" ? "फोटो अपडेट हो गई!" : "Photo updated!");
        setTimeout(() => setPhotoFeedback(null), 3000);
      } else {
        setPhotoFeedback(
          data.error || (language === "hi" ? "फोटो अपडेट नहीं हो सकी" : "Could not update photo")
        );
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      setPhotoFeedback(language === "hi" ? "अपलोड में त्रुटि हुई" : "Upload error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Delete Document
  const handleDeleteMemberDoc = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to remove "${docName}"?`)) return;
    try {
      await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete doc error:", err);
    }
    setMemberDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  // Upload Document for Selected Member
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0 || !selectedMember) {
      setUploadError("Please choose a file or take a photo.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      uploadFiles.forEach((f) => formData.append("files", f));
      formData.append("person_id", selectedMember.id);
      formData.append("name", uploadName);
      formData.append("category", uploadCategory);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload could not be completed.");
      }

      setUploadSuccess(true);
      setUploadFiles([]);

      // Update documents strictly from server response
      if (data.documents && data.documents.length > 0) {
        setMemberDocs((prev) => {
          const newDocs = data.documents.filter(
            (nd: FamilyDocument) => !prev.some((d) => d.id === nd.id)
          );
          return [...newDocs, ...prev];
        });
      } else if (selectedMember) {
        const docsRes = await fetch(`/api/members/${selectedMember.id}`);
        if (docsRes.ok) {
          const json = await docsRes.json();
          setMemberDocs(json.documents || []);
        }
      }

      setTimeout(() => {
        setShowUploadForm(false);
        setUploadSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setUploadError(errorObj.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  // Real-world document icon helper
  const getDocumentEmoji = (doc: FamilyDocument) => {
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

  // Search matches
  const filteredMembers = search.trim()
    ? members.filter((m) => {
        const q = search.toLowerCase();
        return (
          m.first_name.toLowerCase().includes(q) ||
          (m.nickname && m.nickname.toLowerCase().includes(q)) ||
          tName(m.first_name).toLowerCase().includes(q) ||
          (m.nickname && tName(m.nickname).toLowerCase().includes(q))
        );
      })
    : [];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] pb-24 md:pb-12">
      {/* Universal Quiet Header */}
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-8">
        {/* Editorial Greeting & Natural Search (Front Door) */}
        <section className="space-y-4 text-center sm:text-left">
          <div className="max-w-xl">
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight leading-tight">
              {language === "hi" ? "हमारा परिवार" : "Our Family Archive"}
            </h1>
            <p className="text-stone-600 text-sm sm:text-base mt-1.5 leading-relaxed">
              {language === "hi"
                ? "हमारे वंशवृक्ष, महत्वपूर्ण पारिवारिक दस्तावेज़ों और यादों का निजी डिजिटल संग्रहण।"
                : "A private digital cupboard for our family tree, essential documents, and memories."}
            </p>
          </div>

          {/* Search: Human Recognition */}
          <div className="relative max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                language === "hi"
                  ? "व्यक्ति या दस्तावेज़ खोजें (मुस्तफा, अख़्तर, आधार, 7/12)..."
                  : "Find a person or document (Mustafa, Akhtar, Aadhaar, 7/12)..."
              }
              className="w-full pl-11 pr-10 py-3 bg-white border border-stone-300/90 rounded-2xl text-sm sm:text-base placeholder-stone-400 focus:outline-none focus:border-amber-900 shadow-2xs transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </section>

        {/* Search Results (if active) */}
        {search.trim() ? (
          <section className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {language === "hi" ? "मिलते-जुलते सदस्य" : "Matching Relatives"} ({filteredMembers.length})
            </h2>
            {filteredMembers.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSearch("");
                      handleOpenPerson(m.id);
                    }}
                    className="w-full py-3 px-2 flex items-center justify-between text-left hover:bg-stone-50 rounded-xl transition-colors cursor-pointer min-h-[52px]"
                  >
                    <div className="flex items-center gap-3">
                      {m.photo_url ? (
                        <div className="relative w-11 h-11 rounded-full overflow-hidden border border-amber-300 flex-shrink-0">
                          <img
                            src={m.photo_url}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fb = e.currentTarget.parentElement?.querySelector(".avatar-fb");
                              if (fb) (fb as HTMLElement).style.display = "flex";
                            }}
                            className="w-11 h-11 rounded-full object-cover"
                          />
                          <div className="avatar-fb hidden absolute inset-0 w-11 h-11 bg-stone-200 text-stone-800 font-bold items-center justify-center">
                            {m.first_name[0]}
                          </div>
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-stone-200 text-stone-800 font-bold flex items-center justify-center flex-shrink-0">
                          {m.first_name[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-stone-900 text-sm sm:text-base">
                          {tName(m.first_name)}{" "}
                          {m.nickname && (
                            <span className="text-amber-900 font-normal">({tName(m.nickname)})</span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500">
                          {m.is_family_lead
                            ? (language === "hi" ? "परिवार मुखिया" : "Family Lead")
                            : m.is_deceased
                            ? (language === "hi" ? "स्मृति में" : "In Memory")
                            : tName(m.family_role) || (language === "hi" ? `पीढ़ी ${m.generation}` : `Generation ${m.generation}`)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-amber-950 bg-amber-100/70 px-3 py-1.5 rounded-lg border border-amber-200/60 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{language === "hi" ? "दस्तावेज़" : "Documents"}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500 py-4 text-center">
                {language === "hi" ? "कोई सदस्य नहीं मिला।" : "No relative found with that name."}
              </p>
            )}
          </section>
        ) : (
          <>
            {/* 3-4 Meaningful Natural Cupboard Pathways */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <a
                href="/family-tree"
                className="p-4 rounded-2xl bg-stone-100/80 hover:bg-stone-200/60 border border-stone-200 text-left transition-colors min-h-[84px] flex flex-col justify-between"
              >
                <span className="text-2xl">🌳</span>
                <div>
                  <div className="font-bold text-sm text-stone-900">
                    {language === "hi" ? "वंशवृक्ष" : "Family Tree"}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {language === "hi" ? "पीढ़ियां देखें" : "Explore lineage"}
                  </div>
                </div>
              </a>

              <a
                href="/documents"
                className="p-4 rounded-2xl bg-amber-100/50 hover:bg-amber-100/80 border border-amber-200/80 text-left transition-colors min-h-[84px] flex flex-col justify-between"
              >
                <span className="text-2xl">🪪</span>
                <div>
                  <div className="font-bold text-sm text-stone-900">
                    {language === "hi" ? "पहचान पत्र" : "Identity Papers"}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {language === "hi" ? "आधार, पैन, पासपोर्ट" : "Aadhaar, PAN & ID"}
                  </div>
                </div>
              </a>

              <a
                href="/documents?category=Property"
                className="p-4 rounded-2xl bg-stone-100/80 hover:bg-stone-200/60 border border-stone-200 text-left transition-colors min-h-[84px] flex flex-col justify-between"
              >
                <span className="text-2xl">🏠</span>
                <div>
                  <div className="font-bold text-sm text-stone-900">
                    {language === "hi" ? "पारिवारिक संपत्ति" : "Family Property"}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {language === "hi" ? "7/12 व ज़मीन कागज़" : "Deeds & land papers"}
                  </div>
                </div>
              </a>

              <a
                href="/photos"
                className="p-4 rounded-2xl bg-stone-100/80 hover:bg-stone-200/60 border border-stone-200 text-left transition-colors min-h-[84px] flex flex-col justify-between"
              >
                <span className="text-2xl">📷</span>
                <div>
                  <div className="font-bold text-sm text-stone-900">
                    {language === "hi" ? "तस्वीरें" : "Family Photos"}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {language === "hi" ? "पारिवारिक एल्बम" : "Photo album"}
                  </div>
                </div>
              </a>
            </section>

            {/* The Connected Family Lineage (Progressive Disclosure) */}
            <section className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
                    {language === "hi" ? "हमारा परिवार" : "The Family"}
                  </h2>
                  <p className="text-xs text-stone-500">
                    {language === "hi"
                      ? "दस्तावेज़ देखने के लिए किसी भी सदस्य पर टैप करें"
                      : "Tap any relative to open their documents cupboard"}
                  </p>
                </div>
                <span className="text-xs font-semibold text-stone-400">
                  {language === "hi" ? "पीढ़ी 1 और 2" : "Generation 1 & 2"}
                </span>
              </div>

              {/* Generation 1: Grandparents (Dignified Memorial Design) */}
              {gen1Members.length > 0 && (
                <div className="p-4 sm:p-5 rounded-3xl bg-stone-900 text-white shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-amber-300/90 mb-3">
                    {language === "hi" ? "दादा-दादी (पीढ़ी 1)" : "Grandparents (Generation 1)"}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {gen1Members.map((m) => {
                      const isMemorial = Boolean(m.is_deceased);
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleOpenPerson(m.id)}
                          className="p-3.5 rounded-2xl bg-stone-800/80 hover:bg-stone-800 text-left transition-all border border-stone-700/60 flex items-center justify-between cursor-pointer min-h-[64px]"
                        >
                          <div className="flex items-center gap-3">
                            {m.photo_url ? (
                              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-amber-300 flex-shrink-0">
                                <img
                                  src={m.photo_url}
                                  alt=""
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    const fb = e.currentTarget.parentElement?.querySelector(".avatar-fb");
                                    if (fb) (fb as HTMLElement).style.display = "flex";
                                  }}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                                <div className="avatar-fb hidden absolute inset-0 w-12 h-12 bg-stone-700 text-amber-200 font-serif font-bold text-lg items-center justify-center">
                                  {m.first_name[0]}
                                </div>
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-stone-700 text-amber-200 font-serif font-bold text-lg flex items-center justify-center flex-shrink-0">
                                {m.first_name[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-base text-white">{tName(m.first_name)}</div>
                              <div className={`text-xs ${isMemorial ? "text-amber-200/90" : "text-stone-300"}`}>
                                {m.family_role
                                  ? tName(m.family_role)
                                  : m.gender === "female"
                                  ? (language === "hi" ? "दादीजी" : "Grandmother")
                                  : (language === "hi" ? "दादाजी" : "Grandfather")}
                                {isMemorial && (language === "hi" ? " • 🕊️ स्मृति में" : " • 🕊️ In Memory")}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-stone-400">
                            {language === "hi" ? "दस्तावेज़ →" : "Docs →"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Generation 2: Family Branches */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  {language === "hi" ? "पारिवारिक शाखाएं और उनके परिवार" : "Family Branches & Families"}
                </div>

                {dynamicBranches.map((b, idx) => {
                  const isOpen = openBranch === b.id;
                  const bMember = members.find((m) => m.id === b.id);

                  return (
                    <div
                      key={b.id}
                      className={`border rounded-3xl transition-all overflow-hidden ${
                        b.isLead
                          ? "bg-white border-amber-400/80 shadow-xs"
                          : "bg-white border-stone-200/90 shadow-2xs"
                      }`}
                    >
                      {/* Brother Lineage Header */}
                      <div
                        onClick={() => setOpenBranch(isOpen ? null : b.id)}
                        className={`p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none ${
                          b.isLead ? "bg-amber-50/40" : "hover:bg-stone-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          {bMember?.photo_url ? (
                            <div className="relative w-13 h-13 rounded-2xl overflow-hidden border border-amber-300/80 shadow-2xs flex-shrink-0">
                              <img
                                src={bMember.photo_url}
                                alt=""
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const fb = e.currentTarget.parentElement?.querySelector(".avatar-fb");
                                  if (fb) (fb as HTMLElement).style.display = "flex";
                                }}
                                className="w-13 h-13 rounded-2xl object-cover"
                              />
                              <div
                                className={`avatar-fb hidden absolute inset-0 w-13 h-13 rounded-2xl items-center justify-center text-xl font-serif font-bold ${
                                  b.isLead ? "bg-amber-900 text-white" : "bg-stone-200 text-stone-800"
                                }`}
                              >
                                {b.name[0]}
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`w-13 h-13 rounded-2xl flex items-center justify-center text-xl font-serif font-bold flex-shrink-0 ${
                                b.isLead ? "bg-amber-900 text-white" : "bg-stone-200 text-stone-800"
                              }`}
                            >
                              {b.name[0]}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base sm:text-lg text-stone-900">
                                {idx + 1}. {tName(b.name)}
                              </h3>
                              {b.nickname && (
                                <span className="text-xs font-medium text-amber-950 bg-amber-100 px-2 py-0.5 rounded-md">
                                  {tName(b.nickname)}
                                </span>
                              )}
                              {b.isLead && (
                                <span className="text-[11px] font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-md">
                                  {language === "hi" ? "परिवार मुखिया" : "Family Lead"}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">
                              {language === "hi" ? "पत्नी" : "Spouse"}: <strong>{tName(b.spouse?.name)}</strong> • {b.children.length} {language === "hi" ? "बच्चे" : "Children"}
                            </p>
                          </div>
                        </div>

                        <div className="p-2 text-stone-500">
                          {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                      </div>

                      {/* Progressive Disclosure: Family Unit Details */}
                      {isOpen && (
                        <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/50 space-y-4 animate-in slide-in-from-top-1 duration-200">
                          {/* Primary Actions: Brother & Spouse Documents (48px+ Touch) */}
                          <div className="flex flex-col sm:flex-row gap-2.5">
                            <button
                              onClick={() => handleOpenPerson(b.id)}
                              className="flex-1 min-h-[48px] py-2.5 px-4 rounded-xl bg-amber-900 hover:bg-amber-950 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                              <span>
                                {language === "hi"
                                  ? `${tName(b.name)} के दस्तावेज़`
                                  : `${b.name}'s Documents`}
                              </span>
                            </button>

                            {b.spouse && (
                              <button
                                onClick={() => handleOpenPerson(b.spouse!.id)}
                                className="flex-1 min-h-[48px] py-2.5 px-4 rounded-xl bg-white border border-stone-300 hover:border-amber-400 text-stone-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
                              >
                                <FileText className="w-4 h-4 text-amber-900" />
                                <span>
                                  {tName(b.spouse.name)} ({language === "hi" ? "पत्नी" : "Wife"})
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Children List */}
                          <div className="space-y-2 pt-1">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                              {language === "hi" ? "बच्चे व पोते-पोतियां" : "Children & Grandchildren:"}
                            </div>

                            <div className="space-y-2">
                              {b.children.map((child) => (
                                <div
                                  key={child.id}
                                  className="bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <div className="font-bold text-sm text-stone-900">
                                        {tName(child.name)}
                                      </div>
                                      {child.spouse && (
                                        <div className="text-xs text-stone-500 mt-0.5">
                                          {language === "hi" ? "विवाहित" : "Married to"}: <strong>{tName(child.spouse.name)}</strong>
                                        </div>
                                      )}
                                    </div>

                                    <button
                                      onClick={() => handleOpenPerson(child.id)}
                                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-100/70 hover:bg-amber-200/70 text-amber-950 text-xs font-semibold border border-amber-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-amber-800" />
                                      <span>{language === "hi" ? "दस्तावेज़" : "Documents"}</span>
                                    </button>
                                  </div>

                                  {/* Grandchildren Pills */}
                                  {child.children && child.children.length > 0 && (
                                    <div className="mt-2.5 pt-2 border-t border-stone-100">
                                      <div className="text-[10px] font-bold uppercase text-stone-400 mb-1">
                                        {language === "hi" ? "बच्चे" : "Children"}:
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {child.children.map((gc) => (
                                          <button
                                            key={gc.id}
                                            onClick={() => handleOpenPerson(gc.id)}
                                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-800 text-xs font-medium border border-stone-200 cursor-pointer transition-colors"
                                          >
                                            {tName(gc.name)}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Person Profile & Document Cupboard Sheet */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Person Header (Portrait-Focused) */}
            <div className="p-5 border-b border-stone-200 bg-[#FAF7F2] flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Portrait Avatar */}
                <div className="relative flex-shrink-0">
                  {selectedMember.photo_url ? (
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-2xs border border-amber-300">
                      <img
                        src={selectedMember.photo_url}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fb = e.currentTarget.parentElement?.querySelector(".avatar-fb");
                          if (fb) (fb as HTMLElement).style.display = "flex";
                        }}
                        className="w-14 h-14 rounded-2xl object-cover"
                      />
                      <div className="avatar-fb hidden absolute inset-0 w-14 h-14 bg-amber-900 text-white font-serif font-bold text-xl items-center justify-center">
                        {selectedMember.first_name[0]}
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-amber-900 text-white font-serif font-bold text-xl flex items-center justify-center">
                      {selectedMember.first_name[0]}
                    </div>
                  )}

                  {/* Camera Icon to change/add photo */}
                  <label
                    htmlFor="member-photo-file"
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-900 hover:bg-amber-950 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                    title="Add or change photo"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </label>
                  <input
                    id="member-photo-file"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>

                <div>
                  <h3 className="font-bold text-lg text-stone-900 leading-snug">
                    {tName(selectedMember.first_name)}{" "}
                    {selectedMember.nickname && (
                      <span className="font-normal text-amber-900 text-sm">({tName(selectedMember.nickname)})</span>
                    )}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {selectedMember.is_family_lead
                      ? (language === "hi" ? "परिवार मुखिया" : "Family Lead")
                      : selectedMember.is_deceased
                      ? (language === "hi" ? "स्मृति में" : "In Memory")
                      : tName(selectedMember.family_role) || (language === "hi" ? `पीढ़ी ${selectedMember.generation}` : `Generation ${selectedMember.generation}`)}
                  </p>
                  {photoFeedback && (
                    <p className="text-[11px] text-emerald-800 font-medium mt-0.5">{photoFeedback}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-700 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Cupboard Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-900" />
                  <span>
                    {language === "hi"
                      ? `${tName(selectedMember.first_name)} के दस्तावेज़`
                      : `${selectedMember.first_name}'s Documents`} ({memberDocs.length})
                  </span>
                </h4>

                <button
                  onClick={() => setShowUploadForm(!showUploadForm)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    showUploadForm
                      ? "bg-stone-200 text-stone-800"
                      : "bg-amber-900 hover:bg-amber-950 text-white shadow-2xs"
                  }`}
                >
                  {showUploadForm ? (
                    <span>{language === "hi" ? "रद्द करें" : "Cancel"}</span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{language === "hi" ? "+ दस्तावेज़ जोड़ें" : "+ Add Document"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Simple Document Uploader */}
              {showUploadForm && (
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-300/80 space-y-3 animate-in slide-in-from-top-1">
                  <div className="text-xs font-bold text-amber-950">
                    {language === "hi"
                      ? `${selectedMember.first_name} के लिए दस्तावेज़ जोड़ें`
                      : `Add document for ${selectedMember.first_name}`}
                  </div>

                  {uploadError && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{language === "hi" ? "दस्तावेज़ सफलतापूर्वक सहेजा गया!" : "Document saved successfully!"}</span>
                    </div>
                  )}

                  <form onSubmit={handleUploadSubmit} className="space-y-3">
                    <div>
                      <input
                        type="file"
                        id="member-doc-file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          if (e.target.files) {
                            setUploadFiles(Array.from(e.target.files));
                          }
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="member-doc-file"
                        className="w-full min-h-[48px] py-2.5 px-4 bg-white border border-stone-300 hover:border-amber-500 rounded-xl text-xs font-semibold text-stone-800 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                      >
                        <Camera className="w-4 h-4 text-amber-900" />
                        <span>
                          {uploadFiles.length > 0
                            ? `${uploadFiles.length} file(s) selected`
                            : language === "hi"
                            ? "फोटो खींचें या फाइल चुनें"
                            : "Take Photo or Select File"}
                        </span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Document Type
                        </label>
                        <select
                          value={uploadName}
                          onChange={(e) => setUploadName(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-800"
                        >
                          <option value="Aadhaar Card">Aadhaar Card</option>
                          <option value="PAN Card">PAN Card</option>
                          <option value="Passport">Passport</option>
                          <option value="Property Paper">Property Paper / 7-12</option>
                          <option value="Marriage Certificate">Marriage Certificate</option>
                          <option value="Medical Record">Medical Record</option>
                          <option value="School Certificate">School Certificate</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Category
                        </label>
                        <select
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-800"
                        >
                          <option value="Identity">Identity</option>
                          <option value="Property">Property</option>
                          <option value="Marriage & Family">Marriage & Family</option>
                          <option value="Medical">Medical</option>
                          <option value="Education">Education</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={uploading || uploadFiles.length === 0}
                      className="w-full min-h-[48px] py-2.5 rounded-xl bg-amber-900 hover:bg-amber-950 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>{language === "hi" ? "दस्तावेज़ सुरक्षित करें" : "Save Document"}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Real-World Document List (Human Mental Model) */}
              {loadingDocs ? (
                <div className="py-8 text-center text-sm text-stone-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-800" />
                  <span>Loading cupboard...</span>
                </div>
              ) : memberDocs.length > 0 ? (
                <div className="space-y-2">
                  {memberDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-2xl border border-stone-200 bg-white hover:border-amber-300 flex items-center justify-between gap-3 shadow-2xs transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Thumbnail / Real-world Icon */}
                        <div
                          onClick={() => setPreviewDoc(doc)}
                          className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-2xl flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-amber-500 overflow-hidden"
                          title="Click to view"
                        >
                          {doc.file_type?.startsWith("image/") ? (
                            <img
                              src={`/api/documents/${doc.id}/preview`}
                              alt={doc.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{getDocumentEmoji(doc)}</span>
                          )}
                        </div>

                        <div className="truncate">
                          <h5
                            onClick={() => setPreviewDoc(doc)}
                            className="font-semibold text-stone-900 text-sm truncate cursor-pointer hover:text-amber-900"
                          >
                            {doc.name}
                          </h5>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {doc.category} • {(doc.file_size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>

                      {/* Obvious Actions (Fitts's Law: 48px+ Targets) */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="min-h-[44px] px-3 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-950 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>{language === "hi" ? "देखें" : "Open"}</span>
                        </button>

                        <a
                          href={`/api/documents/${doc.id}/download`}
                          className="min-h-[44px] min-w-[44px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center border border-stone-200 cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-[#FAF7F2] rounded-2xl border border-dashed border-stone-300">
                  <p className="text-sm font-semibold text-stone-700">
                    {language === "hi"
                      ? `${selectedMember.first_name} के लिए अभी कोई दस्तावेज़ नहीं है`
                      : `No documents for ${selectedMember.first_name} yet`}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    {language === "hi"
                      ? "कागज़ात जोड़ने के लिए ऊपर '+ दस्तावेज़ जोड़ें' पर टैप करें।"
                      : "Tap '+ Add Document' above to take a photo or upload."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Dominates Screen Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-in fade-in">
          {/* Simple Minimal Chrome Toolbar */}
          <div className="flex items-center justify-between p-3 text-white max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-2 truncate">
              <span className="text-lg">{getDocumentEmoji(previewDoc)}</span>
              <h4 className="font-bold text-sm sm:text-base truncate">{previewDoc.name}</h4>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <a
                href={`/api/documents/${previewDoc.id}/download`}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{language === "hi" ? "डाउनलोड" : "Download"}</span>
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
    </div>
  );
}
