"use client";

import React, { useState } from "react";
import {
  Users,
  GitFork,
  FileText,
  UserPlus,
  History,
  Settings,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  HardDrive,
  Cloud,
  Check,
  Eye,
  X,
  Camera,
  ArrowRight,
  ArrowLeft,
  Shield,
  Upload,
} from "lucide-react";
import { AuditLog, FamilyDocument, FamilyMember, User } from "@/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useRouter } from "next/navigation";

interface AdminClientProps {
  initialMembers: FamilyMember[];
  initialUsers: (User & { first_name: string | null; last_name: string | null })[];
  initialDocuments: (FamilyDocument & { first_name: string; last_name: string | null })[];
  initialAuditLogs: AuditLog[];
  initialSettings: Record<string, string>;
}

export function AdminClient({
  initialMembers,
  initialUsers,
  initialDocuments,
  initialAuditLogs,
  initialSettings,
}: AdminClientProps) {
  const router = useRouter();
  const [activeTask, setActiveTask] = useState<
    "tasks" | "add_member" | "add_doc" | "relationships" | "documents" | "access" | "activity" | "settings"
  >("tasks");

  const [members, setMembers] = useState(initialMembers);
  const [users, setUsers] = useState(initialUsers);
  const [documents, setDocuments] = useState(initialDocuments);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [settings, setSettings] = useState(initialSettings);

  const [previewDoc, setPreviewDoc] = useState<FamilyDocument | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Guided Add Member State
  const [memberStep, setMemberStep] = useState<1 | 2 | 3 | 4>(1);
  const [newMember, setNewMember] = useState({
    first_name: "",
    middle_name: "",
    last_name: "Pinjari",
    nickname: "",
    gender: "male" as "male" | "female",
    generation: 2,
    display_order: 1,
    family_role: "",
    bio: "",
    is_deceased: false,
    is_family_lead: false,
    father_id: "",
    mother_id: "",
    spouse_id: "",
  });
  const [savingMember, setSavingMember] = useState(false);

  // Guided Add Document State
  const [docPersonId, setDocPersonId] = useState(members[0]?.id || "");
  const [docType, setDocType] = useState("Aadhaar Card");
  const [docCategory, setDocCategory] = useState("Identity");
  const [docVisibility, setDocVisibility] = useState<"FAMILY_ONLY" | "PRIVATE">("FAMILY_ONLY");
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [savingDoc, setSavingDoc] = useState(false);

  // Relationship Editor State
  const [relPersonId, setRelPersonId] = useState(members[0]?.id || "");
  const [relFatherId, setRelFatherId] = useState("");
  const [relMotherId, setRelMotherId] = useState("");
  const [relSpouseId, setRelSpouseId] = useState("");
  const [savingRel, setSavingRel] = useState(false);

  // User Accounts State
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "FAMILY_MEMBER",
    family_member_id: "",
  });
  const [savingUser, setSavingUser] = useState(false);

  // Settings State
  const [familyName, setFamilyName] = useState(settings.family_name || "Our Family Archive");
  const [familyDesc, setFamilyDesc] = useState(settings.family_description || "");
  const [familyLeadId, setFamilyLeadId] = useState(settings.family_lead_id || "akhtar");
  const [savingSettings, setSavingSettings] = useState(false);

  // Google Drive State
  const [gdriveEmail, setGdriveEmail] = useState(settings.gdrive_service_account_email || "");
  const [gdrivePrivateKey, setGdrivePrivateKey] = useState(settings.gdrive_private_key || "");
  const [gdriveFolderId, setGdriveFolderId] = useState(settings.gdrive_folder_id || "");
  const [testingGDrive, setTestingGDrive] = useState(false);
  const [gdriveTestResult, setGdriveTestResult] = useState<{ success: boolean; folderName?: string; message?: string } | null>(null);
  const [syncingGDrive, setSyncingGDrive] = useState(false);
  const [importingGDrive, setImportingGDrive] = useState(false);
  const [savingGDrive, setSavingGDrive] = useState(false);

  // Document Deletion Confirm
  const [docToDelete, setDocToDelete] = useState<FamilyDocument | null>(null);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Add Member Submission
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.first_name.trim()) {
      showStatus("error", "First name is required.");
      return;
    }

    setSavingMember(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add family member.");

      showStatus("success", `Added ${newMember.first_name} to the family!`);
      setNewMember({
        first_name: "",
        middle_name: "",
        last_name: "Pinjari",
        nickname: "",
        gender: "male",
        generation: 2,
        display_order: 1,
        family_role: "",
        bio: "",
        is_deceased: false,
        is_family_lead: false,
        father_id: "",
        mother_id: "",
        spouse_id: "",
      });
      setMemberStep(1);
      setActiveTask("tasks");
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setSavingMember(false);
    }
  };

  // Add Document Submission
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (docFiles.length === 0 || !docPersonId) {
      showStatus("error", "Please select a file.");
      return;
    }

    setSavingDoc(true);
    try {
      const formData = new FormData();
      docFiles.forEach((f) => formData.append("files", f));
      formData.append("person_id", docPersonId);
      formData.append("name", docType);
      formData.append("category", docCategory);
      formData.append("visibility", docVisibility);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not upload document.");

      showStatus("success", `Added "${docType}" to documents!`);
      setDocFiles([]);
      setActiveTask("documents");
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setSavingDoc(false);
    }
  };

  // Update Relationships
  const handleUpdateRelationships = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRel(true);
    try {
      const res = await fetch("/api/admin/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: relPersonId,
          father_id: relFatherId || null,
          mother_id: relMotherId || null,
          spouse_id: relSpouseId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update relationships.");
      showStatus("success", "Family connections updated successfully!");
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setSavingRel(false);
    }
  };

  // Create User Account
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user.");
      showStatus("success", `Created family access account for ${newUser.username}!`);
      setNewUser({ username: "", email: "", password: "", role: "FAMILY_MEMBER", family_member_id: "" });
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setSavingUser(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_name: familyName.trim(),
          family_description: familyDesc.trim(),
          family_lead_id: familyLeadId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings.");
      showStatus("success", "Family archive settings updated!");
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Google Drive Handlers
  const handleTestGDrive = async () => {
    setTestingGDrive(true);
    setGdriveTestResult(null);
    try {
      const res = await fetch("/api/admin/gdrive/test");
      const data = await res.json();
      setGdriveTestResult(data);
      if (data.success) {
        showStatus("success", `Google Drive Connected: ${data.folderName || "Ready"}`);
      } else {
        showStatus("error", data.message || "Connection test failed.");
      }
    } catch {
      showStatus("error", "Unable to test Google Drive connection.");
    } finally {
      setTestingGDrive(false);
    }
  };

  const handleSaveGDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGDrive(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gdrive_service_account_email: gdriveEmail.trim(),
          gdrive_private_key: gdrivePrivateKey.trim(),
          gdrive_folder_id: gdriveFolderId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save credentials.");
      showStatus("success", "Google Drive settings saved! Testing connection...");
      await handleTestGDrive();
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setSavingGDrive(false);
    }
  };

  const handleSyncGDrive = async () => {
    setSyncingGDrive(true);
    try {
      const res = await fetch("/api/admin/gdrive/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync files.");
      showStatus("success", `Migrated ${data.syncedDocuments} document(s) to Google Drive!`);
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setSyncingGDrive(false);
    }
  };

  const handleImportGDrive = async () => {
    setImportingGDrive(true);
    try {
      const res = await fetch("/api/admin/gdrive/import", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import files from Google Drive.");
      showStatus("success", `Imported ${data.importedCount} document(s) from Google Drive!`);
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setImportingGDrive(false);
    }
  };

  // Delete Document
  const handleDeleteDoc = async () => {
    if (!docToDelete) return;
    try {
      const res = await fetch(`/api/documents/${docToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
        setDocToDelete(null);
        showStatus("success", "Document removed.");
      }
    } catch (err) {
      console.error("Delete doc error:", err);
    }
  };

  // Human-Readable Activity Log Formatter
  const formatActivity = (log: AuditLog) => {
    const actor = log.user_name || "Family Member";
    const target = log.target_name || "a file";
    const time = new Date(log.timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let description = "";
    if (log.action.includes("UPLOAD") || log.action.includes("CREATE")) {
      description = `${actor} added "${target}"`;
    } else if (log.action.includes("DOWNLOAD") || log.action.includes("VIEW")) {
      description = `${actor} viewed "${target}"`;
    } else if (log.action.includes("DELETE") || log.action.includes("REMOVE")) {
      description = `${actor} removed "${target}"`;
    } else if (log.action.includes("UPDATE")) {
      description = `${actor} updated "${target}"`;
    } else {
      description = `${actor} checked ${target}`;
    }

    return { description, time };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-sm font-medium flex items-center gap-2.5 animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Task Navigation Breadcrumb */}
      {activeTask !== "tasks" && (
        <div className="flex items-center justify-between bg-white p-3 px-4 rounded-2xl border border-stone-200 shadow-2xs">
          <button
            onClick={() => setActiveTask("tasks")}
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-950 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Back to Admin Tasks</span>
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-950 bg-amber-100/70 px-2.5 py-1 rounded-lg">
            {activeTask === "add_member" && "+ Add Family Member"}
            {activeTask === "add_doc" && "📄 Add Document"}
            {activeTask === "relationships" && "🌳 Family Connections"}
            {activeTask === "documents" && "📁 Documents"}
            {activeTask === "access" && "👥 Family Access"}
            {activeTask === "activity" && "📋 Family Activity"}
            {activeTask === "settings" && "⚙️ Settings & Google Drive"}
          </span>
        </div>
      )}

      {/* 1. TASK-ORIENTED ADMIN HOME ("What would you like to do?") */}
      {activeTask === "tasks" && (
        <div className="space-y-8 animate-in fade-in">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
              What would you like to do?
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Select an action to update family records, add documents, or manage access.
            </p>
          </div>

          {/* Primary Task Buttons (Fitts's Law: 48px+ Touch) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                setMemberStep(1);
                setActiveTask("add_member");
              }}
              className="p-5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-left transition-all shadow-2xs hover:border-amber-400 min-h-[96px] flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">👤</span>
                <span className="text-xs font-bold text-amber-900 group-hover:translate-x-0.5 transition-transform">
                  Start →
                </span>
              </div>
              <div>
                <div className="font-bold text-base text-stone-900">+ Add Family Member</div>
                <div className="text-xs text-stone-500 mt-0.5">Add a new relative, parent, or child</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTask("add_doc")}
              className="p-5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-left transition-all shadow-2xs hover:border-amber-400 min-h-[96px] flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">📄</span>
                <span className="text-xs font-bold text-amber-900 group-hover:translate-x-0.5 transition-transform">
                  Upload →
                </span>
              </div>
              <div>
                <div className="font-bold text-base text-stone-900">Add Document</div>
                <div className="text-xs text-stone-500 mt-0.5">Upload Aadhaar, PAN, Property, Certificate</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTask("relationships")}
              className="p-5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-left transition-all shadow-2xs hover:border-amber-400 min-h-[96px] flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">🌳</span>
                <span className="text-xs font-bold text-amber-900 group-hover:translate-x-0.5 transition-transform">
                  Edit →
                </span>
              </div>
              <div>
                <div className="font-bold text-base text-stone-900">Family Connections</div>
                <div className="text-xs text-stone-500 mt-0.5">Link parents, spouses, and children</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTask("documents")}
              className="p-5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-left transition-all shadow-2xs hover:border-amber-400 min-h-[96px] flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">📁</span>
                <span className="text-xs font-bold text-amber-900 group-hover:translate-x-0.5 transition-transform">
                  View ({documents.length}) →
                </span>
              </div>
              <div>
                <div className="font-bold text-base text-stone-900">All Documents</div>
                <div className="text-xs text-stone-500 mt-0.5">Review, preview, or remove stored papers</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTask("access")}
              className="p-5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-left transition-all shadow-2xs hover:border-amber-400 min-h-[96px] flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">👥</span>
                <span className="text-xs font-bold text-amber-900 group-hover:translate-x-0.5 transition-transform">
                  Manage →
                </span>
              </div>
              <div>
                <div className="font-bold text-base text-stone-900">Family Access</div>
                <div className="text-xs text-stone-500 mt-0.5">Manage accounts and editor permissions</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTask("settings")}
              className="p-5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-left transition-all shadow-2xs hover:border-amber-400 min-h-[96px] flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">⚙️</span>
                <span className="text-xs font-bold text-amber-900 group-hover:translate-x-0.5 transition-transform">
                  Configure →
                </span>
              </div>
              <div>
                <div className="font-bold text-base text-stone-900">Settings & Google Drive</div>
                <div className="text-xs text-stone-500 mt-0.5">Archive name, Drive test, sync & import</div>
              </div>
            </button>
          </div>

          {/* Recent Family Activity (Human Language, No DB Jargon) */}
          <section className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Recent Family Activity
              </h3>
              <button
                onClick={() => setActiveTask("activity")}
                className="text-xs font-semibold text-amber-900 hover:underline cursor-pointer"
              >
                View all ({auditLogs.length}) →
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 shadow-2xs overflow-hidden">
              {auditLogs.slice(0, 5).map((log) => {
                const { description, time } = formatActivity(log);
                return (
                  <div key={log.id} className="p-3.5 px-4 flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-800">{description}</span>
                    <span className="text-stone-400 flex-shrink-0">{time}</span>
                  </div>
                );
              })}
              {auditLogs.length === 0 && (
                <div className="p-6 text-center text-xs text-stone-500">No recent activity yet.</div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* 2. GUIDED ADD FAMILY MEMBER (Step-by-Step, not a giant form) */}
      {activeTask === "add_member" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/90 shadow-2xs max-w-xl mx-auto space-y-6 animate-in fade-in">
          <div className="border-b border-stone-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Step {memberStep} of 4
            </span>
            <h3 className="font-serif text-xl font-bold text-stone-900 mt-1">
              {memberStep === 1 && "Name & Role"}
              {memberStep === 2 && "Who are the parents?"}
              {memberStep === 3 && "Marriage & Spouse"}
              {memberStep === 4 && "Review & Save"}
            </h3>
          </div>

          <form onSubmit={handleAddMember} className="space-y-4">
            {/* Step 1: Basic Identity */}
            {memberStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newMember.first_name}
                    onChange={(e) => setNewMember({ ...newMember, first_name: e.target.value })}
                    placeholder="e.g. Zaid"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                    Nickname (Optional)
                  </label>
                  <input
                    type="text"
                    value={newMember.nickname}
                    onChange={(e) => setNewMember({ ...newMember, nickname: e.target.value })}
                    placeholder="e.g. Chhotu"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                      Gender
                    </label>
                    <select
                      value={newMember.gender}
                      onChange={(e) =>
                        setNewMember({ ...newMember, gender: e.target.value as "male" | "female" })
                      }
                      className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                      Generation
                    </label>
                    <select
                      value={newMember.generation}
                      onChange={(e) =>
                        setNewMember({ ...newMember, generation: parseInt(e.target.value, 10) })
                      }
                      className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm"
                    >
                      <option value="1">Gen 1 (Grandparents)</option>
                      <option value="2">Gen 2 (Brothers & Spouses)</option>
                      <option value="3">Gen 3 (Children/Cousins)</option>
                      <option value="4">Gen 4 (Grandchildren)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!newMember.first_name.trim()) {
                        showStatus("error", "First name is required.");
                        return;
                      }
                      setMemberStep(2);
                    }}
                    className="min-h-[44px] px-5 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next: Parents →</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Parents */}
            {memberStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                    Father
                  </label>
                  <select
                    value={newMember.father_id}
                    onChange={(e) => setNewMember({ ...newMember, father_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm"
                  >
                    <option value="">Unknown / None</option>
                    {members
                      .filter((m) => m.gender === "male")
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.first_name} {m.nickname ? `(${m.nickname})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                    Mother
                  </label>
                  <select
                    value={newMember.mother_id}
                    onChange={(e) => setNewMember({ ...newMember, mother_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm"
                  >
                    <option value="">Unknown / None</option>
                    {members
                      .filter((m) => m.gender === "female")
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.first_name} {m.nickname ? `(${m.nickname})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setMemberStep(1)}
                    className="min-h-[44px] px-4 py-2 border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberStep(3)}
                    className="min-h-[44px] px-5 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Next: Spouse →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Spouse */}
            {memberStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                    Spouse
                  </label>
                  <select
                    value={newMember.spouse_id}
                    onChange={(e) => setNewMember({ ...newMember, spouse_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm"
                  >
                    <option value="">Unmarried / None</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.first_name} {m.nickname ? `(${m.nickname})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setMemberStep(2)}
                    className="min-h-[44px] px-4 py-2 border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberStep(4)}
                    className="min-h-[44px] px-5 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Next: Review →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Save */}
            {memberStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 bg-stone-50 rounded-2xl space-y-2 text-xs text-stone-700">
                  <div><strong>Name:</strong> {newMember.first_name} {newMember.nickname && `(${newMember.nickname})`}</div>
                  <div><strong>Generation:</strong> Gen {newMember.generation}</div>
                  <div><strong>Father:</strong> {members.find((m) => m.id === newMember.father_id)?.first_name || "None"}</div>
                  <div><strong>Mother:</strong> {members.find((m) => m.id === newMember.mother_id)?.first_name || "None"}</div>
                  <div><strong>Spouse:</strong> {members.find((m) => m.id === newMember.spouse_id)?.first_name || "Unmarried"}</div>
                </div>

                <div className="pt-2 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setMemberStep(3)}
                    className="min-h-[44px] px-4 py-2 border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={savingMember}
                    className="min-h-[44px] px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {savingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Save Relative</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* 3. GUIDED ADD DOCUMENT (Whose document? -> What document? -> Upload -> Save) */}
      {activeTask === "add_doc" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/90 shadow-2xs max-w-xl mx-auto space-y-6 animate-in fade-in">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">Add Family Document</h3>
            <p className="text-xs text-stone-500 mt-1">Upload an Aadhaar, PAN, Property paper, or Certificate.</p>
          </div>

          <form onSubmit={handleAddDocument} className="space-y-4">
            {/* Question 1: Whose document is this? */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                1. Whose document is this?
              </label>
              <select
                value={docPersonId}
                onChange={(e) => setDocPersonId(e.target.value)}
                className="w-full px-3.5 py-3 border border-stone-300 rounded-xl text-sm bg-white"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.nickname ? `(${m.nickname})` : ""} — Gen {m.generation}
                  </option>
                ))}
              </select>
            </div>

            {/* Question 2: What document is it? */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  2. Document Name
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-xs bg-white"
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
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-xs bg-white"
                >
                  <option value="Identity">Identity</option>
                  <option value="Property">Property</option>
                  <option value="Marriage & Family">Marriage & Family</option>
                  <option value="Medical">Medical</option>
                  <option value="Education">Education</option>
                </select>
              </div>
            </div>

            {/* Question 3: Choose or Photograph File */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                3. Choose or photograph document
              </label>
              <input
                type="file"
                id="guided-doc-file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => {
                  if (e.target.files) {
                    setDocFiles(Array.from(e.target.files));
                  }
                }}
                className="hidden"
              />
              <label
                htmlFor="guided-doc-file"
                className="w-full min-h-[50px] p-4 bg-stone-50 hover:bg-stone-100 border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Camera className="w-5 h-5 text-amber-900" />
                <span className="text-xs font-semibold text-stone-800">
                  {docFiles.length > 0
                    ? `${docFiles.length} document(s) chosen`
                    : "Tap to take photo or choose file"}
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingDoc || docFiles.length === 0}
                className="w-full min-h-[48px] py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {savingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>Save to Family Cupboard</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. FAMILY CONNECTIONS & KINSHIP */}
      {activeTask === "relationships" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/90 shadow-2xs max-w-xl mx-auto space-y-6 animate-in fade-in">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">Family Connections</h3>
            <p className="text-xs text-stone-500 mt-1">Link relatives as parents, spouses, and children.</p>
          </div>

          <form onSubmit={handleUpdateRelationships} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Select Person
              </label>
              <select
                value={relPersonId}
                onChange={(e) => setRelPersonId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.nickname ? `(${m.nickname})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Father
                </label>
                <select
                  value={relFatherId}
                  onChange={(e) => setRelFatherId(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                >
                  <option value="">None / Remove</option>
                  {members
                    .filter((m) => m.id !== relPersonId && m.gender === "male")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.first_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Mother
                </label>
                <select
                  value={relMotherId}
                  onChange={(e) => setRelMotherId(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                >
                  <option value="">None / Remove</option>
                  {members
                    .filter((m) => m.id !== relPersonId && m.gender === "female")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.first_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Spouse
              </label>
              <select
                value={relSpouseId}
                onChange={(e) => setRelSpouseId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white"
              >
                <option value="">None / Unmarried</option>
                {members
                  .filter((m) => m.id !== relPersonId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingRel}
                className="w-full min-h-[48px] py-2.5 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {savingRel ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitFork className="w-4 h-4" />}
                <span>Update Family Connections</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. ALL DOCUMENTS (Simple Table with Inline Preview & Download) */}
      {activeTask === "documents" && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900">Family Documents</h3>
              <p className="text-xs text-stone-500 mt-0.5">Total {documents.length} records stored in cupboard.</p>
            </div>
            <button
              onClick={() => setActiveTask("add_doc")}
              className="min-h-[40px] px-3 py-1.5 bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Paper</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Relative</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => setPreviewDoc(doc)}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-stone-200 cursor-pointer flex items-center justify-center bg-stone-100 flex-shrink-0 hover:ring-2 hover:ring-amber-500 shadow-2xs"
                        >
                          {doc.file_type?.startsWith("image/") ? (
                            <img src={`/api/documents/${doc.id}/preview`} alt={doc.name} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-4 h-4 text-stone-600" />
                          )}
                        </div>
                        <span
                          onClick={() => setPreviewDoc(doc)}
                          className="font-semibold text-stone-900 hover:text-amber-900 cursor-pointer block truncate max-w-xs"
                        >
                          {doc.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-700 font-medium">{doc.first_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-amber-100/70 text-amber-950 rounded-md font-medium">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-500">{(doc.file_size / 1024).toFixed(0)} KB</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1.5 text-stone-600 hover:text-amber-900 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Open preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => setDocToDelete(doc)}
                          className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. FAMILY ACCESS (User Accounts) */}
      {activeTask === "access" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/90 shadow-2xs max-w-xl mx-auto space-y-4">
            <h3 className="font-serif text-xl font-bold text-stone-900">Grant Family Access</h3>
            <p className="text-xs text-stone-500">Create access credentials for relatives who can manage records.</p>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="e.g. mustafa"
                  required
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter strong password"
                  required
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Connect to Family Member
                </label>
                <select
                  value={newUser.family_member_id}
                  onChange={(e) => setNewUser({ ...newUser, family_member_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white"
                >
                  <option value="">None / Administrator</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.nickname ? `(${m.nickname})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingUser}
                  className="w-full min-h-[48px] py-2.5 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Create Family Access Account</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-2xs max-w-xl mx-auto space-y-3">
            <h4 className="font-bold text-sm text-stone-900">Active Accounts ({users.length})</h4>
            <div className="divide-y divide-stone-100 text-xs">
              {users.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-stone-900">{u.username}</span>
                    <span className="text-stone-400 ml-2">({u.role})</span>
                  </div>
                  <span className="text-stone-500">{u.first_name || "Admin"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. ALL ACTIVITY */}
      {activeTask === "activity" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/90 shadow-2xs max-w-2xl mx-auto space-y-4 animate-in fade-in">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">Family Activity</h3>
            <p className="text-xs text-stone-500">Record of documents added, viewed, or updated.</p>
          </div>

          <div className="divide-y divide-stone-100 text-xs">
            {auditLogs.map((log) => {
              const { description, time } = formatActivity(log);
              return (
                <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                  <span className="text-stone-800 font-medium">{description}</span>
                  <span className="text-stone-400 whitespace-nowrap">{time}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 8. SETTINGS & GOOGLE DRIVE */}
      {activeTask === "settings" && (
        <div className="space-y-6 max-w-xl mx-auto animate-in fade-in">
          {/* General Archive Settings */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/90 shadow-2xs space-y-4">
            <h3 className="font-serif text-xl font-bold text-stone-900">Archive Settings</h3>

            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Family Name
                </label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Family Lead
                </label>
                <select
                  value={familyLeadId}
                  onChange={(e) => setFamilyLeadId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.nickname ? `(${m.nickname})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="min-h-[44px] px-5 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Archive Settings</span>
                </button>
              </div>
            </form>
          </div>

          {/* Google Drive 100% Free Cloud Storage */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/90 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-amber-900" />
              <h3 className="font-serif text-xl font-bold text-stone-900">Google Drive Storage</h3>
            </div>
            <p className="text-xs text-stone-500">
              Files are streamed directly through the website with zero redirects to Google Drive.
            </p>

            {gdriveTestResult && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-medium ${
                  gdriveTestResult.success
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                    : "bg-rose-50 text-rose-900 border border-rose-200"
                }`}
              >
                {gdriveTestResult.success
                  ? `Google Drive Connected: ${gdriveTestResult.folderName}`
                  : `Connection Error: ${gdriveTestResult.message}`}
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleTestGDrive}
                disabled={testingGDrive}
                className="min-h-[44px] px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer border border-stone-200"
              >
                {testingGDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                onClick={handleImportGDrive}
                disabled={importingGDrive}
                className="min-h-[44px] px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {importingGDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                <span>Import from Drive</span>
              </button>

              <button
                type="button"
                onClick={handleSyncGDrive}
                disabled={syncingGDrive}
                className="min-h-[44px] px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer border border-stone-200"
              >
                {syncingGDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                <span>Migrate Local Files</span>
              </button>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleSaveGDrive} className="space-y-3 pt-3 border-t border-stone-100">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Service Account Email
                </label>
                <input
                  type="text"
                  value={gdriveEmail}
                  onChange={(e) => setGdriveEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Folder ID
                </label>
                <input
                  type="text"
                  value={gdriveFolderId}
                  onChange={(e) => setGdriveFolderId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingGDrive}
                  className="min-h-[44px] px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingGDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Drive Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-in fade-in">
          <div className="flex items-center justify-between p-3 text-white max-w-5xl mx-auto w-full">
            <h4 className="font-bold text-sm sm:text-base truncate">{previewDoc.name}</h4>
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
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl overflow-hidden relative flex items-center justify-center p-2 max-w-5xl mx-auto w-full shadow-2xl">
            {previewDoc.file_type?.startsWith("image/") ? (
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(docToDelete)}
        title="Remove Document"
        message={`Are you sure you want to permanently remove "${docToDelete?.name}"?`}
        confirmText="Delete Document"
        isDestructive={true}
        onConfirm={handleDeleteDoc}
        onCancel={() => setDocToDelete(null)}
      />
    </div>
  );
}
