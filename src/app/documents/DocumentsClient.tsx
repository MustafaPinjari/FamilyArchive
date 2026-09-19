"use client";

import React, { useState, useMemo } from "react";
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
  Archive,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Sparkles,
  QrCode,
  Users,
  FolderArchive,
  Layers,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { DocumentCategory, FamilyDocument, FamilyMember, Marriage, Relationship, User } from "@/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DocumentUploadModal } from "@/components/documents/DocumentUploadModal";
import { IdCardModal } from "@/components/id-card/IdCardModal";
import { useLanguage } from "@/lib/i18n";
import {
  buildFamilyHierarchy,
  getImmediateHouseholdIds,
  FamilyBranchNode,
  FamilyHouseholdNode,
} from "@/lib/family-tree-structure";
import Link from "next/link";

interface DocumentsClientProps {
  initialDocuments: (FamilyDocument & { first_name: string; last_name: string | null })[];
  members: FamilyMember[];
  marriages?: Marriage[];
  relationships?: Relationship[];
  currentUser?: User | null;
  initialPersonId?: string;
  initialCategory?: string;
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
  marriages = [],
  relationships = [],
  currentUser,
  initialPersonId = "All",
  initialCategory = "All",
}: DocumentsClientProps) {
  const { language, tName } = useLanguage();
  const [documents, setDocuments] = useState(initialDocuments);
  const [search, setSearch] = useState("");

  // Three clear discovery pathways:
  // 1. "nested_tree" (Collapsible Family Branch & Household Hierarchy)
  // 2. "by_person" (Relative Filter with Immediate Family toggle)
  // 3. "by_type" (Category Filter)
  const [discoveryMode, setDiscoveryMode] = useState<"nested_tree" | "by_person" | "by_type">(
    initialPersonId !== "All" ? "by_person" : "nested_tree"
  );

  const [selectedPersonId, setSelectedPersonId] = useState<string>(initialPersonId);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [includeFamily, setIncludeFamily] = useState<boolean>(true);

  // Bulk Selection Mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  // Modals
  const [previewDoc, setPreviewDoc] = useState<FamilyDocument | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<FamilyDocument | null>(null);
  const [idCardMember, setIdCardMember] = useState<FamilyMember | null>(null);

  // Expanded branches in Nested Tree View
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({
    "branch-akhtar": true,
    "branch-mukhtar": true,
    "branch-shakur": false,
    "branch-sattar": false,
  });

  const [expandedHouseholds, setExpandedHouseholds] = useState<Record<string, boolean>>({
    "hh-naziya": true,
    "hh-mussavir": false,
    "hh-arshiya": false,
    "hh-mustafa": true,
    "hh-sharmin": false,
  });

  const isAdmin = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "FAMILY_ADMIN";

  const memberMap = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  // Build full family hierarchy
  const familyBranches = useMemo(() => {
    return buildFamilyHierarchy(members, marriages, relationships);
  }, [members, marriages, relationships]);

  // Document counts per person
  const memberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of documents) {
      counts[d.person_id] = (counts[d.person_id] || 0) + 1;
    }
    return counts;
  }, [documents]);

  const toggleBranch = (branchId: string) => {
    setExpandedBranches((prev) => ({ ...prev, [branchId]: !prev[branchId] }));
  };

  const toggleHousehold = (hhId: string) => {
    setExpandedHouseholds((prev) => ({ ...prev, [hhId]: !prev[hhId] }));
  };

  const getDocEmoji = (doc: FamilyDocument) => {
    const n = doc.name.toLowerCase();
    const c = doc.category.toLowerCase();
    if (n.includes("aadhaar") || c.includes("identity")) return "🪪";
    if (n.includes("pan")) return "💳";
    if (n.includes("property") || n.includes("7/12") || c.includes("property")) return "🏠";
    if (n.includes("marriage") || c.includes("marriage")) return "💍";
    if (n.includes("medical") || n.includes("health") || c.includes("medical")) return "🏥";
    if (n.includes("birth") || n.includes("certificate")) return "📜";
    if (n.includes("passport")) return "🛂";
    if (n.includes("school") || n.includes("degree") || c.includes("education")) return "🎓";
    return "📄";
  };

  // Helper to determine relationship between document owner and selected relative
  const getDocRelationBadge = (docPersonId: string, primaryId: string) => {
    if (docPersonId === primaryId) return null;
    const isSpouse = marriages.some(
      (m) =>
        ((m.person1_id === primaryId && m.person2_id === docPersonId) ||
          (m.person2_id === primaryId && m.person1_id === docPersonId)) &&
        m.status !== "separated"
    );
    if (isSpouse) return "Spouse / जीवनसाथी";

    const isChild = relationships.some(
      (r) =>
        r.person_id === primaryId &&
        r.related_person_id === docPersonId &&
        r.relationship_type === "child"
    );
    if (isChild) return "Child / बच्चा";

    const isParent = relationships.some(
      (r) =>
        r.person_id === docPersonId &&
        r.related_person_id === primaryId &&
        r.relationship_type === "child"
    );
    if (isParent) return "Parent / माता-पिता";

    return null;
  };

  // Immediate family IDs if viewing by person with includeFamily enabled
  const activeFamilyIds = useMemo(() => {
    if (selectedPersonId === "All") return null;
    if (!includeFamily) return new Set([selectedPersonId]);
    const ids = getImmediateHouseholdIds(selectedPersonId, members, marriages, relationships);
    return new Set(ids);
  }, [selectedPersonId, includeFamily, members, marriages, relationships]);

  // Filtered documents for flat view / search / person mode
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Relative Filter
      if (selectedPersonId !== "All") {
        if (activeFamilyIds && !activeFamilyIds.has(doc.person_id)) return false;
      }
      // Category Filter
      if (selectedCategory !== "All" && doc.category !== selectedCategory) return false;
      // Text Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = doc.name.toLowerCase().includes(q);
        const matchCat = doc.category.toLowerCase().includes(q);
        const matchPerson = doc.first_name.toLowerCase().includes(q);
        return matchName || matchCat || matchPerson;
      }
      return true;
    });
  }, [documents, selectedPersonId, selectedCategory, search, activeFamilyIds]);

  // Bulk Download handler
  const handleBulkDownload = async (options: {
    all?: boolean;
    personId?: string;
    includeFamily?: boolean;
    ids?: string[];
  }) => {
    setIsBulkDownloading(true);
    try {
      let downloadUrl = "/api/documents/bulk-download?";
      if (options.all) {
        downloadUrl += "all=true";
      } else if (options.ids && options.ids.length > 0) {
        downloadUrl += `ids=${encodeURIComponent(options.ids.join(","))}`;
      } else if (options.personId && options.personId !== "All") {
        downloadUrl += `person_id=${encodeURIComponent(options.personId)}`;
        if (options.includeFamily) downloadUrl += "&include_family=true";
      } else if (filteredDocuments.length > 0) {
        const docIds = filteredDocuments.map((d) => d.id).join(",");
        downloadUrl += `ids=${encodeURIComponent(docIds)}`;
      }

      // Trigger browser download via anchor
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", "Pinjari_Family_Documents.zip");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Reset selection mode if it was active
      setSelectionMode(false);
      setSelectedDocIds(new Set());
    } catch (err) {
      console.error("Bulk download error:", err);
      alert("Failed to download documents in bulk. Please try again.");
    } finally {
      setTimeout(() => setIsBulkDownloading(false), 1500);
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedDocIds.size === filteredDocuments.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(filteredDocuments.map((d) => d.id)));
    }
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

  const selectedMemberObj = memberMap.get(selectedPersonId);

  const renderDocumentRow = (
    doc: FamilyDocument & { first_name: string; last_name: string | null },
    badge?: string | null
  ) => {
    const canDelete =
      isAdmin || (currentUser && currentUser.family_member_id === doc.person_id);
    const isSelected = selectedDocIds.has(doc.id);
    const memberObj = memberMap.get(doc.person_id);

    return (
      <div
        key={doc.id}
        className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors ${
          isSelected ? "bg-amber-50/50" : ""
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Checkbox in selection mode */}
          {selectionMode && (
            <button
              onClick={() => toggleSelectDoc(doc.id)}
              className="p-1 text-stone-400 hover:text-amber-900 cursor-pointer flex-shrink-0"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-amber-900" />
              ) : (
                <Square className="w-5 h-5 text-stone-300" />
              )}
            </button>
          )}

          {/* Thumbnail / Emblem */}
          <div
            onClick={() => setPreviewDoc(doc)}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-xl flex-shrink-0 cursor-pointer overflow-hidden hover:ring-2 hover:ring-amber-500 shadow-2xs"
            title="Click to view"
          >
            {doc.file_type?.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
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
            <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-amber-950 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                {tName(doc.first_name)}
              </span>
              {badge && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  {badge}
                </span>
              )}
              <span>•</span>
              <span>{doc.category}</span>
              <span>•</span>
              <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          {/* ID Card Quick Jump */}
          {memberObj && (
            <button
              onClick={() => setIdCardMember(memberObj)}
              className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
              title={`View ID Card of ${doc.first_name}`}
            >
              <QrCode className="w-3.5 h-3.5 text-amber-900" />
              <span className="hidden md:inline">ID Card</span>
            </button>
          )}

          <button
            onClick={() => setPreviewDoc(doc)}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-950 text-white font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>OPEN</span>
          </button>

          <a
            href={`/api/documents/${doc.id}/download`}
            className="min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center border border-stone-200 cursor-pointer transition-colors"
            title="Download document"
          >
            <Download className="w-3.5 h-3.5" />
          </a>

          {canDelete && (
            <button
              onClick={() => setDocToDelete(doc)}
              className="min-h-[40px] min-w-[40px] p-2 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner if arriving from ID Card QR scan */}
      {selectedPersonId !== "All" && selectedMemberObj && (
        <div className="p-4 rounded-2xl bg-amber-900/10 border border-amber-900/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-900 text-amber-200 flex items-center justify-center font-bold text-lg flex-shrink-0">
              🪪
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Viewing Personal Papers for {selectedMemberObj.first_name} {selectedMemberObj.last_name || "Pinjari"}
              </h3>
              <p className="text-xs text-stone-600">
                Permanent ID: <span className="font-mono font-bold text-amber-950">PINJ-G{selectedMemberObj.generation}-{selectedMemberObj.id.toUpperCase()}</span>
                {includeFamily && " • Includes immediate spouse & children records"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setIdCardMember(selectedMemberObj)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-900" />
              <span>View ID Card</span>
            </button>

            <button
              onClick={() => setSelectedPersonId("All")}
              className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              View All Family
            </button>
          </div>
        </div>
      )}

      {/* Search & Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search papers (Aadhaar, Naziya, Atiqa, 7/12, Mukhtar)..."
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

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bulk Download Action */}
          <button
            onClick={() => handleBulkDownload({ all: selectedPersonId === "All", personId: selectedPersonId, includeFamily })}
            disabled={isBulkDownloading || documents.length === 0}
            className="min-h-[42px] px-3.5 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors disabled:opacity-50"
            title="Download documents as ZIP"
          >
            {isBulkDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Creating ZIP...</span>
              </>
            ) : (
              <>
                <FolderArchive className="w-4 h-4 text-amber-400" />
                <span>
                  {selectedPersonId !== "All"
                    ? `Bulk Download (${filteredDocuments.length})`
                    : "Download All (ZIP)"}
                </span>
              </>
            )}
          </button>

          {/* Multi-Select Toggle */}
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              setSelectedDocIds(new Set());
            }}
            className={`min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              selectionMode
                ? "bg-amber-100 border-amber-400 text-amber-950"
                : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>{selectionMode ? "Cancel Select" : "Select Papers"}</span>
          </button>

          {/* Add Document Action (if authenticated) */}
          {currentUser && (
            <button
              onClick={() => setUploadModalOpen(true)}
              className="min-h-[42px] px-3.5 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Multi-Select Action Bar */}
      {selectionMode && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAllFiltered}
              className="text-xs font-bold text-amber-900 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              {selectedDocIds.size === filteredDocuments.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-amber-800" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-amber-800" />
                  <span>Select All ({filteredDocuments.length})</span>
                </>
              )}
            </button>
            <span className="text-xs text-amber-950 font-medium">
              • {selectedDocIds.size} paper(s) selected
            </span>
          </div>

          <button
            onClick={() => handleBulkDownload({ ids: Array.from(selectedDocIds) })}
            disabled={selectedDocIds.size === 0 || isBulkDownloading}
            className="px-4 py-1.5 bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Selected ({selectedDocIds.size}) as ZIP</span>
          </button>
        </div>
      )}

      {/* Three Natural Pathways: Nested Family Tree | By Relative | By Document Type */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setDiscoveryMode("nested_tree");
              setSelectedPersonId("All");
              setSelectedCategory("All");
            }}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              discoveryMode === "nested_tree"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            }`}
          >
            <span>🌳</span>
            <span>Nested Family Tree</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              Branches & Cousins
            </span>
          </button>

          <button
            onClick={() => {
              setDiscoveryMode("by_person");
              setSelectedCategory("All");
            }}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              discoveryMode === "by_person"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            }`}
          >
            <span>👤</span>
            <span>By Relative</span>
          </button>

          <button
            onClick={() => {
              setDiscoveryMode("by_type");
              setSelectedPersonId("All");
            }}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              discoveryMode === "by_type"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            }`}
          >
            <span>🗂️</span>
            <span>By Document Type</span>
          </button>
        </div>

        {/* Path A: Relative Selector Pills with Immediate Family Toggle */}
        {discoveryMode === "by_person" && (
          <div className="space-y-2">
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

              {members.map((m) => {
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

            {/* Nested Family Toggle when a relative is selected */}
            {selectedPersonId !== "All" && (
              <div className="flex items-center justify-between bg-stone-100/80 px-4 py-2 rounded-xl text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-stone-800">
                  <input
                    type="checkbox"
                    checked={includeFamily}
                    onChange={(e) => setIncludeFamily(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-900 focus:ring-amber-800"
                  />
                  <span>
                    Include immediate family & children records (Spouse + Kids)
                  </span>
                </label>

                {selectedMemberObj && (
                  <button
                    onClick={() => setIdCardMember(selectedMemberObj)}
                    className="text-amber-900 hover:text-amber-950 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View {selectedMemberObj.first_name}&apos;s ID Card</span>
                  </button>
                )}
              </div>
            )}
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

      {/* ================= PATH 1: NESTED FAMILY TREE LIST VIEW ================= */}
      {discoveryMode === "nested_tree" ? (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-950 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>🌳</span>
              <span>
                <strong>Nested Family Architecture:</strong> Explore documents organized by branch (Akhtar, Mukhtar, Shakur, Sattar), married cousins (Naziya, Mussavir, Arshiya), and grandchildren.
              </span>
            </div>
            <button
              onClick={() => handleBulkDownload({ all: true })}
              className="px-3 py-1 bg-amber-900 hover:bg-amber-950 text-white rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
            >
              Download Full Archive (ZIP)
            </button>
          </div>

          {familyBranches.map((branch) => {
            const isBranchOpen = expandedBranches[branch.id];
            // Total documents in this branch
            const branchDocCount = documents.filter((d) => branch.allMemberIds.includes(d.person_id)).length;

            return (
              <div
                key={branch.id}
                className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden"
              >
                {/* Branch Header Accordion */}
                <div
                  onClick={() => toggleBranch(branch.id)}
                  className="p-4 sm:p-5 flex items-center justify-between bg-stone-50 hover:bg-stone-100/80 cursor-pointer border-b border-stone-200/80 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center">
                      {isBranchOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
                        <span>{branch.title}</span>
                        <span className="text-xs font-sans font-normal text-stone-500">
                          (Branch of Mohammad Pinjari)
                        </span>
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {branch.households.length} Households • {branchDocCount} Documents
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setIdCardMember(branch.lead)}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title={`View ID Card for ${branch.lead.first_name}`}
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-900" />
                      <span>{branch.lead.first_name}&apos;s Card</span>
                    </button>
                    <button
                      onClick={() => handleBulkDownload({ personId: branch.lead.id, includeFamily: true })}
                      className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-stone-200"
                      title={`Download all documents for ${branch.title}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download Branch</span>
                    </button>
                  </div>
                </div>

                {/* Branch Households (Nested Children & Married Cousins) */}
                {isBranchOpen && (
                  <div className="divide-y divide-stone-100 p-2 sm:p-4 bg-stone-50/40 space-y-3">
                    {/* Branch Head's Own Documents */}
                    {documents.filter((d) => d.person_id === branch.lead.id).length > 0 && (
                      <div className="p-3 bg-white rounded-xl border border-stone-200/80 mb-2">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-2">
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-amber-700" />
                            <span>{branch.lead.first_name}&apos;s Direct Personal & Land Papers</span>
                          </span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            {documents.filter((d) => d.person_id === branch.lead.id).length} items
                          </span>
                        </div>
                        <div className="divide-y divide-stone-100">
                          {documents
                            .filter((d) => d.person_id === branch.lead.id)
                            .map((doc) => renderDocumentRow(doc))}
                        </div>
                      </div>
                    )}

                    {/* Households (e.g. Naziya & Azhar, Mussavir & Saniya, etc.) */}
                    {branch.households.map((hh) => {
                      const isHhOpen = expandedHouseholds[hh.id];
                      const hhDocs = documents.filter((d) => hh.allMemberIds.includes(d.person_id));

                      return (
                        <div
                          key={hh.id}
                          className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden"
                        >
                          {/* Household Header */}
                          <div
                            onClick={() => toggleHousehold(hh.id)}
                            className="p-3 sm:p-4 flex items-center justify-between bg-stone-100/60 hover:bg-stone-100 cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-5 h-5 rounded-md bg-stone-200 text-stone-600 flex items-center justify-center">
                                {isHhOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                                  <span>{hh.title}</span>
                                  {hh.children.length > 0 && (
                                    <span className="text-xs font-normal text-stone-500">
                                      (Kids: {hh.children.map((c) => c.first_name).join(", ")})
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[11px] text-stone-500">
                                  Household of {branch.lead.first_name}&apos;s Branch • {hhDocs.length} Papers
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setIdCardMember(hh.primary)}
                                className="p-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                title={`View ID Card for ${hh.primary.first_name}`}
                              >
                                <QrCode className="w-3.5 h-3.5 text-amber-900" />
                                <span className="hidden sm:inline">ID Card</span>
                              </button>
                              <button
                                onClick={() => handleBulkDownload({ personId: hh.primary.id, includeFamily: true })}
                                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                title={`Download all documents for ${hh.title}`}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Household Documents (Parent, Spouse & Children) */}
                          {isHhOpen && (
                            <div className="divide-y divide-stone-100 p-2 sm:p-3 bg-white">
                              {hhDocs.length > 0 ? (
                                hhDocs.map((doc) => {
                                  // Determine relation to household primary
                                  let rolePill = "Relative";
                                  if (doc.person_id === hh.primary.id) rolePill = "Primary";
                                  else if (hh.spouse && doc.person_id === hh.spouse.id) rolePill = "Spouse";
                                  else if (hh.children.some((c) => c.id === doc.person_id)) rolePill = "Child";

                                  return renderDocumentRow(doc, rolePill);
                                })
                              ) : (
                                <div className="p-4 text-center text-xs text-stone-400">
                                  No documents stored under this household yet.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= PATH 2 & 3: FLAT LIST / SEARCH / BY RELATIVE / BY TYPE ================= */
        filteredDocuments.length > 0 ? (
          <div className="divide-y divide-stone-200/90 bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
            {filteredDocuments.map((doc) => {
              const relationBadge =
                selectedPersonId !== "All"
                  ? getDocRelationBadge(doc.person_id, selectedPersonId)
                  : null;

              return renderDocumentRow(doc, relationBadge);
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
        )
      )}



      {/* Full-Screen Document Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-in fade-in">
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

      {/* ID Card Modal */}
      {idCardMember && (
        <IdCardModal
          isOpen={Boolean(idCardMember)}
          onClose={() => setIdCardMember(null)}
          member={idCardMember}
          allMembers={members}
          marriages={marriages}
          relationships={relationships}
        />
      )}

      {/* Delete Confirmation Dialog */}
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
