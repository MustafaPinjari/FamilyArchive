"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  FileText,
  Eye,
  Download,
  X,
  ChevronDown,
  ChevronRight,
  Lock,
  Crown,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Globe,
} from "lucide-react";
import { FamilyDocument, FamilyMember } from "@/types";
import { useLanguage } from "@/lib/i18n";

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

const QUICK_DOCUMENT_PRESETS = [
  { name: "Aadhaar Card", category: "Identity", icon: "🆔" },
  { name: "PAN Card", category: "Identity", icon: "💳" },
  { name: "Passport", category: "Identity", icon: "🛂" },
  { name: "Property Deed", category: "Property", icon: "🏠" },
  { name: "Medical Record", category: "Medical", icon: "🏥" },
  { name: "Birth / Marriage Certificate", category: "Marriage & Family", icon: "📜" },
  { name: "Bank / Tax Record", category: "Financial", icon: "🏦" },
];

// Sibling & descendants canonical tree structure
const BRANCHES_DATA: BranchData[] = [
  {
    id: "akhtar",
    name: "Akhtar",
    nickname: "Bade Pappa",
    role: "Eldest Brother • Family Lead",
    isLead: true,
    spouse: { id: "afroz", name: "Afroz" },
    children: [
      {
        id: "naziya",
        name: "Naziya",
        spouse: { id: "azhar", name: "Azhar" },
        children: [
          { id: "atiqa", name: "Atiqa" },
          { id: "maira", name: "Maira" },
        ],
      },
      {
        id: "mussavir",
        name: "Mussavir",
        spouse: { id: "saniya", name: "Saniya" },
        children: [{ id: "yazdan", name: "Yazdan (Baby boy)" }],
      },
      {
        id: "arshiya",
        name: "Arshiya",
        spouse: { id: "sharukh", name: "Sharukh" },
        children: [
          { id: "kabir", name: "Kabir" },
          { id: "umar", name: "Umar" },
        ],
      },
    ],
  },
  {
    id: "shakur",
    name: "Shakur",
    nickname: "Elder Uncle",
    role: "Second Brother",
    spouse: { id: "chinni", name: "Chinni" },
    children: [
      { id: "eram", name: "Eram (Unmarried)" },
      {
        id: "saba",
        name: "Saba",
        spouse: { id: "farukh", name: "Farukh" },
        children: [
          { id: "zikra", name: "Zikra" },
          { id: "aarish", name: "Aarish" },
        ],
      },
      {
        id: "sana",
        name: "Sana",
        spouse: { id: "altaf", name: "Altaf" },
        children: [
          { id: "alvina", name: "Alvina" },
          { id: "alian", name: "Alian" },
        ],
      },
      {
        id: "tasmiya",
        name: "Tasmiya",
        spouse: { id: "tayyab", name: "Tayyab" },
        children: [{ id: "azlan", name: "Azlan" }],
      },
    ],
  },
  {
    id: "sattar",
    name: "Sattar",
    nickname: "Uncle",
    role: "Third Brother",
    spouse: { id: "guddi", name: "Guddi" },
    children: [
      {
        id: "junaid",
        name: "Junaid",
        spouse: { id: "sufiya", name: "Sufiya" },
        children: [{ id: "hamdan", name: "Hamdan" }],
      },
      {
        id: "misbah",
        name: "Misbah",
        spouse: { id: "tanveer", name: "Tanveer" },
        children: [{ id: "zoya", name: "Zoya" }],
      },
    ],
  },
  {
    id: "mukhtar",
    name: "Mukhtar",
    nickname: "Youngest Brother",
    role: "Youngest Brother",
    spouse: { id: "shabana", name: "Shabana" },
    children: [
      { id: "mustafa", name: "Mustafa" },
      {
        id: "sharmin",
        name: "Sharmin",
        spouse: { id: "sameer", name: "Sameer" },
      },
    ],
  },
];

export default function SimpleFamilyTree() {
  const { language, toggleLanguage, t } = useLanguage();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [memberDocs, setMemberDocs] = useState<FamilyDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<FamilyDocument | null>(null);

  // Profile Photo Upload State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);

  // Quick Bulk & Single Upload Form in Drawer
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadName, setUploadName] = useState("Aadhaar Card");
  const [uploadCategory, setUploadCategory] = useState("Identity");
  const [adminPassword, setAdminPassword] = useState("Family@Archive2026");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  // Which brother branch is open
  const [openBranch, setOpenBranch] = useState<string | null>("akhtar");

  useEffect(() => {
    fetch("/api/family-tree")
      .then((res) => res.json())
      .then((data) => {
        if (data?.members && Array.isArray(data.members)) {
          setMembers(data.members);
        }
      })
      .catch((err) => console.error("Error loading family:", err));

    // Load saved admin password from localStorage if exists
    if (typeof window !== "undefined") {
      const savedPw = localStorage.getItem("family_admin_pw");
      if (savedPw) setAdminPassword(savedPw);
    }
  }, []);

  // When a person is clicked, load their profile and documents
  // Fully resilient: opens immediately even if members list is loading or has case differences
  const handleOpenPerson = async (memberId: string) => {
    const targetId = memberId.toLowerCase().trim();
    let person = members.find((m) => m.id.toLowerCase() === targetId);

    if (!person) {
      // Find in BRANCHES_DATA
      for (const b of BRANCHES_DATA) {
        if (b.id.toLowerCase() === targetId) {
          person = {
            id: b.id,
            first_name: b.name,
            last_name: "Pinjari",
            nickname: b.nickname,
            family_role: b.role,
            is_family_lead: b.isLead ? 1 : 0,
            gender: "male",
            generation: 2,
            is_deceased: 0,
          } as unknown as FamilyMember;
          break;
        }
        if (b.spouse && b.spouse.id.toLowerCase() === targetId) {
          person = {
            id: b.spouse.id,
            first_name: b.spouse.name,
            last_name: "Pinjari",
            gender: "female",
            generation: 2,
            family_role: `${b.name}'s Wife`,
            is_deceased: 0,
          } as unknown as FamilyMember;
          break;
        }
        for (const child of b.children) {
          if (child.id.toLowerCase() === targetId) {
            person = {
              id: child.id,
              first_name: child.name,
              last_name: "Pinjari",
              gender: "male",
              generation: 3,
              is_deceased: 0,
            } as unknown as FamilyMember;
            break;
          }
          if (child.spouse && child.spouse.id.toLowerCase() === targetId) {
            person = {
              id: child.spouse.id,
              first_name: child.spouse.name,
              last_name: "Pinjari",
              gender: "female",
              generation: 3,
              is_deceased: 0,
            } as unknown as FamilyMember;
            break;
          }
          const gc = child.children?.find((g) => g.id.toLowerCase() === targetId);
          if (gc) {
            person = {
              id: gc.id,
              first_name: gc.name,
              last_name: "Pinjari",
              generation: 4,
              is_deceased: 0,
            } as unknown as FamilyMember;
            break;
          }
        }
        if (person) break;
      }

      if (!person) {
        if (targetId === "mohammad") {
          person = {
            id: "mohammad",
            first_name: "Mohammad",
            last_name: "Pinjari",
            is_deceased: 1,
            generation: 1,
            family_role: "Grandfather",
          } as unknown as FamilyMember;
        } else if (targetId === "hamida") {
          person = {
            id: "hamida",
            first_name: "Hamida",
            last_name: "Pinjari",
            is_deceased: 0,
            generation: 1,
            family_role: "Grandmother",
          } as unknown as FamilyMember;
        } else {
          person = {
            id: targetId,
            first_name: targetId.charAt(0).toUpperCase() + targetId.slice(1),
            last_name: "Pinjari",
            generation: 2,
            is_deceased: 0,
          } as unknown as FamilyMember;
        }
      }
    }

    // Always immediately open the drawer
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
          setMembers((prev) => {
            const exists = prev.some((m) => m.id === json.person.id);
            return exists
              ? prev.map((m) => (m.id === json.person.id ? json.person : m))
              : [...prev, json.person];
          });
        }
      } else {
        setMemberDocs([]);
      }
    } catch (err) {
      console.error("Error loading docs:", err);
      setMemberDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Change / Add Profile Photo Handler
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMember) return;
    setUploadingPhoto(true);
    setPhotoFeedback(null);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(`/api/members/${selectedMember.id}/photo`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.photo_url) {
        setSelectedMember((prev) => (prev ? { ...prev, photo_url: data.photo_url } : null));
        setMembers((prev) =>
          prev.map((m) => (m.id === selectedMember.id ? { ...m, photo_url: data.photo_url } : m))
        );
        setPhotoFeedback("✅ Photo updated!");
        setTimeout(() => setPhotoFeedback(null), 3000);
      } else {
        setPhotoFeedback(data.error || "Failed to update photo");
      }
    } catch (err) {
      console.error("Profile photo error:", err);
      setPhotoFeedback("Upload error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Delete Document directly from drawer
  const handleDeleteMemberDoc = async (docId: string, docName: string) => {
    if (!confirm(`Delete "${docName}"?`)) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        setMemberDocs((prev) => prev.filter((d) => d.id !== docId));
      }
    } catch (err) {
      console.error("Delete doc error:", err);
    }
  };

  // Quick Bulk / Single 1-Tap Upload Handler
  const handleQuickUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0 || !selectedMember) {
      setUploadError("Please choose or photograph at least one document.");
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
      formData.append("admin_password", adminPassword);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed. Check admin password.");
      }

      // Save admin password to phone localStorage for future convenience
      if (typeof window !== "undefined" && adminPassword) {
        localStorage.setItem("family_admin_pw", adminPassword);
      }

      setUploadSuccess(true);
      setUploadFiles([]);

      // Refresh documents
      const docsRes = await fetch(`/api/members/${selectedMember.id}`);
      if (docsRes.ok) {
        const json = await docsRes.json();
        setMemberDocs(json.documents || []);
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

  // Sibling & descendants data
  const branches = BRANCHES_DATA;

  const filteredSearch = search.trim()
    ? members.filter(
        (m) =>
          m.first_name.toLowerCase().includes(search.toLowerCase()) ||
          (m.nickname && m.nickname.toLowerCase().includes(search.toLowerCase()))
      )
    : [];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] font-sans pb-20">
      {/* Mobile-Friendly Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-3 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌳</span>
            <div>
              <h1 className="text-lg font-bold text-stone-900 leading-tight">
                {t("appName")}
              </h1>
              <p className="text-[11px] text-stone-500">{t("appSubtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 rounded-full text-xs font-semibold border border-amber-300 transition-colors shadow-2xs cursor-pointer"
              title="Switch Language / भाषा बदलें"
            >
              <Globe className="w-3.5 h-3.5 text-amber-800" />
              <span>{language === "en" ? "हिंदी" : "English"}</span>
            </button>

            <a
              href="/login"
              className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full text-xs font-semibold"
              title="Admin Login"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t("adminBtn")}</span>
            </a>
          </div>
        </div>

        {/* Big Search Bar */}
        <div className="max-w-xl mx-auto mt-2.5">
          <div className="relative">
            <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-11 pr-4 py-2.5 bg-stone-100/80 border border-stone-200 rounded-2xl text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Search Results */}
        {search.trim() ? (
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Matching Members ({filteredSearch.length})
            </h3>
            {filteredSearch.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {filteredSearch.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSearch("");
                      handleOpenPerson(m.id);
                    }}
                    className="w-full py-3 flex items-center justify-between text-left hover:bg-stone-50 px-2 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      {m.photo_url ? (
                        <img
                          src={m.photo_url}
                          alt={m.first_name}
                          className="w-10 h-10 rounded-full object-cover border border-amber-300 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center flex-shrink-0">
                          {m.first_name[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-sm text-stone-900">
                          {m.first_name}{" "}
                          {m.nickname && (
                            <span className="text-amber-800 font-normal">({m.nickname})</span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500">
                          {m.is_family_lead ? "👑 Family Lead" : m.is_deceased ? "🕊️ In Memory" : m.family_role || `Gen ${m.generation}`}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                      Open 📄
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500 py-4 text-center">No name found.</p>
            )}
          </div>
        ) : (
          <>
            {/* Grandparents (Dada & Dadi) Card */}
            <div className="bg-gradient-to-r from-amber-900 via-stone-800 to-stone-900 text-white rounded-3xl p-5 shadow-md">
              <div className="text-[11px] font-bold uppercase tracking-widest text-amber-300 mb-2">
                {t("grandparentsTitle")}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleOpenPerson("mohammad")}
                  className="bg-white/10 hover:bg-white/15 p-3 rounded-2xl text-left border border-white/15 transition-all cursor-pointer"
                >
                  {members.find((m) => m.id === "mohammad")?.photo_url ? (
                    <img
                      src={members.find((m) => m.id === "mohammad")!.photo_url!}
                      alt="Mohammad"
                      className="w-10 h-10 rounded-full object-cover mb-2 border border-amber-300"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-800 font-bold flex items-center justify-center mb-2">
                      M
                    </div>
                  )}
                  <div className="font-bold text-sm text-white">Mohammad</div>
                  <div className="text-[11px] text-amber-200 mt-0.5">{t("inMemoryBadge")}</div>
                  <div className="mt-2 text-[10px] text-stone-300 font-medium">{t("tapForDocs")}</div>
                </button>

                <button
                  onClick={() => handleOpenPerson("hamida")}
                  className="bg-white/10 hover:bg-white/15 p-3 rounded-2xl text-left border border-white/15 transition-all cursor-pointer"
                >
                  {members.find((m) => m.id === "hamida")?.photo_url ? (
                    <img
                      src={members.find((m) => m.id === "hamida")!.photo_url!}
                      alt="Hamida"
                      className="w-10 h-10 rounded-full object-cover mb-2 border border-amber-300"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center mb-2">
                      H
                    </div>
                  )}
                  <div className="font-bold text-sm text-white">Hamida</div>
                  <div className="text-[11px] text-stone-300 mt-0.5">Grandmother</div>
                  <div className="mt-2 text-[10px] text-stone-300 font-medium">{t("tapForDocs")}</div>
                </button>
              </div>
            </div>

            {/* The 4 Brothers Branches */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500 px-1 pt-2">
                {t("brothersTitle")}
              </div>

              {branches.map((b, idx) => {
                const isOpen = openBranch === b.id;
                const bMember = members.find((m) => m.id === b.id);

                return (
                  <div
                    key={b.id}
                    className={`bg-white rounded-3xl border transition-all overflow-hidden shadow-xs ${
                      b.isLead ? "border-amber-400 ring-1 ring-amber-400/40" : "border-stone-200"
                    }`}
                  >
                    {/* Brother Header */}
                    <div
                      onClick={() => setOpenBranch(isOpen ? null : b.id)}
                      className={`p-4 sm:p-5 flex items-center justify-between cursor-pointer ${
                        b.isLead ? "bg-gradient-to-r from-amber-50 to-white" : "bg-stone-50/70"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        {bMember?.photo_url ? (
                          <img
                            src={bMember.photo_url}
                            alt={b.name}
                            className="w-12 h-12 rounded-2xl object-cover shadow-xs border border-amber-300 flex-shrink-0"
                          />
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-xs flex-shrink-0 ${
                              b.isLead
                                ? "bg-amber-800 text-white"
                                : "bg-stone-800 text-amber-200"
                            }`}
                          >
                            {b.name[0]}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="font-bold text-base text-stone-900">
                              {idx + 1}. {b.name}
                            </h2>
                            {b.nickname && (
                              <span className="text-xs font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-lg">
                                {b.nickname}
                              </span>
                            )}
                            {b.isLead && (
                              <span className="text-[11px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                {t("leadBadge")}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {t("spouseLabel")}: <strong>{b.spouse?.name}</strong> • {b.children.length} {t("childrenCount")}
                          </p>
                        </div>
                      </div>

                      <div className="p-2 rounded-full bg-stone-100 text-stone-600">
                        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </div>

                    {/* Children & Actions */}
                    {isOpen && (
                      <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/30 space-y-4 animate-in slide-in-from-top-1 duration-200">
                        {/* 1-Tap Brother & Spouse Actions */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleOpenPerson(b.id)}
                            className="flex-1 py-2.5 px-3 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            <span>{b.name}&apos;s {t("documentsCount")}</span>
                          </button>

                          {b.spouse && (
                            <button
                              onClick={() => handleOpenPerson(b.spouse!.id)}
                              className="flex-1 py-2.5 px-3 rounded-2xl bg-white border border-stone-300 hover:border-amber-400 text-stone-800 font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <FileText className="w-4 h-4 text-amber-800" />
                              <span>{b.spouse.name} ({t("wifeLabel")})</span>
                            </button>
                          )}
                        </div>

                        {/* Children List */}
                        <div className="space-y-2.5 pt-1">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            {t("childrenTitle")}
                          </div>

                          <div className="space-y-2">
                            {b.children.map((child) => (
                              <div
                                key={child.id}
                                className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-bold text-sm text-stone-900">
                                      {child.name}
                                    </div>
                                    {child.spouse && (
                                      <div className="text-xs text-stone-500 mt-0.5">
                                        Married to: <strong>{child.spouse.name}</strong>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => handleOpenPerson(child.id)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-200 flex items-center gap-1 cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-amber-800" />
                                    <span>{t("docsBtn")}</span>
                                  </button>
                                </div>

                                {/* Grandchildren */}
                                {child.children && child.children.length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-stone-100">
                                    <div className="text-[10px] font-bold uppercase text-stone-400 mb-1">
                                      Children:
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {child.children.map((gc) => (
                                        <button
                                          key={gc.id}
                                          onClick={() => handleOpenPerson(gc.id)}
                                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-800 text-xs font-medium border border-stone-200 transition-colors"
                                        >
                                          {gc.name}
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
          </>
        )}
      </main>

      {/* Slide-up Profile & Document Drawer */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/90 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Profile Avatar with Photo Upload button */}
                <div className="relative flex-shrink-0">
                  {selectedMember.photo_url ? (
                    <img
                      src={selectedMember.photo_url}
                      alt={selectedMember.first_name}
                      className="w-14 h-14 rounded-2xl object-cover shadow-sm border-2 border-amber-300"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-amber-800 text-white font-bold text-xl flex items-center justify-center shadow-xs">
                      {selectedMember.first_name[0]}
                    </div>
                  )}

                  {/* Camera Icon Overlay to Add/Change Profile Photo */}
                  <label
                    htmlFor="member-photo-input"
                    className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-amber-700 hover:bg-amber-800 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                    title="Add or Change Profile Photo"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </label>
                  <input
                    id="member-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-lg text-stone-900 leading-snug">
                      {selectedMember.first_name}
                    </h3>
                    {selectedMember.nickname && (
                      <span className="text-xs font-bold text-amber-800">
                        &ldquo;{selectedMember.nickname}&rdquo;
                      </span>
                    )}
                    {photoFeedback && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                        {photoFeedback}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">
                    {selectedMember.is_family_lead
                      ? "👑 Family Lead"
                      : selectedMember.is_deceased
                      ? "🕊️ In Loving Memory"
                      : selectedMember.family_role || `Generation ${selectedMember.generation}`}
                  </p>
                  <label
                    htmlFor="member-photo-input"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 cursor-pointer mt-0.5"
                  >
                    <Camera className="w-3 h-3" />
                    <span>{selectedMember.photo_url ? "Change Photo" : "+ Add Profile Photo"}</span>
                  </label>
                </div>
              </div>

              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Header with Upload Toggle Button */}
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-800" />
                  <span>Documents ({memberDocs.length})</span>
                </h4>

                <button
                  onClick={() => setShowUploadForm(!showUploadForm)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    showUploadForm
                      ? "bg-stone-200 text-stone-800"
                      : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                  }`}
                >
                  {showUploadForm ? (
                    <span>Cancel</span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>+ Add Document(s)</span>
                    </>
                  )}
                </button>
              </div>

              {/* ULTRA-SIMPLE INLINE UPLOAD FORM */}
              {showUploadForm && (
                <div className="p-4 bg-amber-50/70 rounded-2xl border-2 border-dashed border-amber-300 space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1">
                      <span>📸</span> Add Document(s) for {selectedMember.first_name}
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">
                      Bulk Supported
                    </span>
                  </div>

                  {uploadError && (
                    <div className="p-2.5 bg-rose-100 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="p-2.5 bg-emerald-100 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Document(s) uploaded successfully!</span>
                    </div>
                  )}

                  <form onSubmit={handleQuickUpload} className="space-y-3">
                    {/* 1. Take Photo or Choose Files (Bulk allowed) */}
                    <div>
                      <input
                        type="file"
                        id="quick-camera-input"
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
                        htmlFor="quick-camera-input"
                        className="w-full py-3.5 px-4 rounded-2xl bg-white border-2 border-dashed border-amber-400 hover:border-amber-600 text-amber-900 flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xs font-semibold text-sm transition-all text-center"
                      >
                        <Camera className="w-6 h-6 text-amber-700" />
                        {uploadFiles.length > 0 ? (
                          <span className="truncate max-w-xs text-emerald-800 font-bold text-xs">
                            ✅ {uploadFiles.length} file(s) chosen ({uploadFiles.map((f) => f.name).slice(0, 2).join(", ")}{uploadFiles.length > 2 ? "..." : ""})
                          </span>
                        ) : (
                          <>
                            <span>Take Photo or Choose Files</span>
                            <span className="text-[11px] text-stone-400 font-normal">
                              You can select multiple files / photos at once
                            </span>
                          </>
                        )}
                      </label>
                    </div>

                    {/* 2. Quick 1-Tap Name Preset Pills */}
                    <div>
                      <span className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                        Choose Document Type (1-Tap):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_DOCUMENT_PRESETS.map((p) => {
                          const isSelected = uploadName === p.name;
                          return (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => {
                                setUploadName(p.name);
                                setUploadCategory(p.category);
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                                isSelected
                                  ? "bg-amber-800 text-white shadow-xs scale-102"
                                  : "bg-white text-stone-700 border border-stone-300 hover:border-amber-400"
                              }`}
                            >
                              <span>{p.icon}</span>
                              <span>{p.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Optional custom document name input */}
                    <div>
                      <input
                        type="text"
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        placeholder="Or type document name..."
                        required
                        className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600"
                      />
                    </div>

                    {/* 4. Big Upload Action Button */}
                    <button
                      type="submit"
                      disabled={uploading || uploadFiles.length === 0}
                      className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading {uploadFiles.length} Document(s)...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>
                            Upload {uploadFiles.length > 1 ? `${uploadFiles.length} Documents` : "Document"}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Document List */}
              {loadingDocs ? (
                <div className="py-8 text-center text-sm text-stone-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                  <span>Loading documents...</span>
                </div>
              ) : memberDocs.length > 0 ? (
                <div className="space-y-2.5">
                  {memberDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-white hover:border-amber-300 flex items-center justify-between gap-3 shadow-2xs transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Interactive Thumbnail Preview */}
                        <div
                          onClick={() => setPreviewDoc(doc)}
                          className="relative cursor-pointer flex-shrink-0 group"
                          title="Tap to preview"
                        >
                          {doc.file_type.startsWith("image/") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/documents/${doc.id}/preview`}
                              alt={doc.name}
                              className="w-12 h-12 rounded-xl object-cover border border-amber-200 shadow-2xs group-hover:ring-2 group-hover:ring-amber-500 transition-all"
                            />
                          ) : doc.file_type.includes("pdf") ? (
                            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex flex-col items-center justify-center text-rose-700 shadow-2xs group-hover:bg-rose-100 transition-colors">
                              <FileText className="w-5 h-5 text-rose-600" />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-800">PDF</span>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center text-amber-800 shadow-2xs group-hover:bg-amber-100 transition-colors">
                              <FileText className="w-5 h-5 text-amber-700" />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-900">DOC</span>
                            </div>
                          )}
                        </div>

                        <div className="truncate">
                          <div className="font-bold text-sm text-stone-900 truncate flex items-center gap-1.5">
                            <span
                              onClick={() => setPreviewDoc(doc)}
                              className="truncate hover:text-amber-800 cursor-pointer"
                            >
                              {doc.name}
                            </span>
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="text-[10px] font-bold text-amber-900 bg-amber-100/90 hover:bg-amber-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors flex-shrink-0"
                            >
                              {t("preview")}
                            </button>
                          </div>
                          <div className="text-xs text-stone-500 mt-0.5">
                            {doc.category} • {(doc.file_size / 1024).toFixed(0)} KB
                          </div>
                        </div>
                      </div>

                      {/* View, Download & Delete Buttons */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="px-3 py-1.5 rounded-xl bg-amber-800 text-white text-xs font-semibold shadow-xs hover:bg-amber-900 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t("viewBtn")}</span>
                        </button>

                        <a
                          href={`/api/documents/${doc.id}/download`}
                          className="p-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 transition-colors"
                          title="Download to Phone"
                        >
                          <Download className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => handleDeleteMemberDoc(doc.id, doc.name)}
                          className="p-1.5 rounded-xl bg-stone-200 hover:bg-rose-100 text-stone-500 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-stone-700">{t("noDocsYet")}</p>
                  <p className="text-xs text-stone-400 mt-1">
                    {t("noDocsPrompt")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col p-2 sm:p-4">
          <div className="flex items-center justify-between p-3 text-white">
            <h4 className="font-bold text-sm truncate">{previewDoc.name}</h4>
            <div className="flex items-center gap-2">
              <a
                href={`/api/documents/${previewDoc.id}/download`}
                className="px-3.5 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 text-stone-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl overflow-hidden relative flex items-center justify-center p-2">
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
                className="w-full h-full"
                title={previewDoc.name}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
