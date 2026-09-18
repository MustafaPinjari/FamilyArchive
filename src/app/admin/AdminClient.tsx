"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Users,
  GitFork,
  FileText,
  UserPlus,
  History,
  Settings,
  Download,
  Trash2,
  Crown,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  HardDrive,
  Cloud,
  Check,
  Key,
  ExternalLink,
  ArrowRight,
  UploadCloud,
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "members" | "relationships" | "documents" | "users" | "audit" | "settings" | "gdrive"
  >("overview");

  const [members, setMembers] = useState(initialMembers);
  const [users, setUsers] = useState(initialUsers);
  const [documents, setDocuments] = useState(initialDocuments);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [settings, setSettings] = useState(initialSettings);

  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Member Form State
  const [newMember, setNewMember] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    nickname: "",
    gender: "male" as "male" | "female",
    generation: 3,
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

  // Relationship Editor State
  const [relPersonId, setRelPersonId] = useState(members[0]?.id || "");
  const [relFatherId, setRelFatherId] = useState("");
  const [relMotherId, setRelMotherId] = useState("");
  const [relSpouseId, setRelSpouseId] = useState("");
  const [savingRel, setSavingRel] = useState(false);

  // New User Form State
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

  // Confirm delete doc dialog
  const [docToDelete, setDocToDelete] = useState<FamilyDocument | null>(null);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Add Member
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
      if (!res.ok) throw new Error(data.error || "Failed to add member.");

      showStatus("success", `Added ${newMember.first_name} to the family archive!`);
      setNewMember({
        first_name: "",
        middle_name: "",
        last_name: "",
        nickname: "",
        gender: "male",
        generation: 3,
        display_order: 1,
        family_role: "",
        bio: "",
        is_deceased: false,
        is_family_lead: false,
        father_id: "",
        mother_id: "",
        spouse_id: "",
      });

      // Refresh members
      const mRes = await fetch("/api/members");
      if (mRes.ok) {
        const mData = await mRes.json();
        setMembers(mData.members || []);
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setSavingMember(false);
    }
  };

  // Update Relationships
  const handleUpdateRelationships = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relPersonId) return;

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

      showStatus("success", "Kinship relationships updated successfully!");
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setSavingRel(false);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username.trim() || !newUser.password) {
      showStatus("error", "Username and password are required.");
      return;
    }

    setSavingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user.");

      showStatus("success", `User account "${newUser.username}" created successfully!`);
      setNewUser({
        username: "",
        email: "",
        password: "",
        role: "FAMILY_MEMBER",
        family_member_id: "",
      });

      // Refresh users
      const uRes = await fetch("/api/admin/users");
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users || []);
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setSavingUser(false);
    }
  };

  // Update Settings
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

      showStatus("success", "Family settings saved successfully!");
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setSavingSettings(false);
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
        showStatus("success", "Document deleted from vault.");
      }
    } catch (err) {
      showStatus("error", "Failed to delete document.");
    }
  };

  // Google Drive State
  const [gdriveEmail, setGdriveEmail] = useState(settings.gdrive_service_account_email || "");
  const [gdrivePrivateKey, setGdrivePrivateKey] = useState(settings.gdrive_private_key || "");
  const [gdriveFolderId, setGdriveFolderId] = useState(settings.gdrive_folder_id || "");
  const [savingGDrive, setSavingGDrive] = useState(false);
  const [testingGDrive, setTestingGDrive] = useState(false);
  const [syncingGDrive, setSyncingGDrive] = useState(false);
  const [gdriveTestResult, setGdriveTestResult] = useState<{
    success: boolean;
    message: string;
    isConfigured?: boolean;
    email?: string;
    folderName?: string;
    folderId?: string;
    configDetails?: {
      hasEmail: boolean;
      hasKey: boolean;
      hasFolderId: boolean;
      hasOAuth: boolean;
      email?: string;
      folderId?: string;
    };
  } | null>(null);
  const [syncResult, setSyncResult] = useState<{
    syncedDocuments: number;
    syncedPhotos: number;
    errors?: string[];
  } | null>(null);

  const handleTestGDrive = async () => {
    setTestingGDrive(true);
    setGdriveTestResult(null);
    try {
      const res = await fetch("/api/admin/gdrive/test");
      const data = await res.json();
      setGdriveTestResult(data);
      if (data.success) {
        showStatus("success", `Google Drive Connected: ${data.folderName || "Target Folder OK"}`);
      } else {
        showStatus("error", data.message || "Google Drive connection test failed.");
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
      if (!res.ok) throw new Error(data.error || "Failed to save Google Drive settings.");
      showStatus("success", "Google Drive settings saved! Testing connection now...");
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
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/gdrive/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync files.");
      setSyncResult(data);
      showStatus("success", `Migrated ${data.syncedDocuments} document(s) and ${data.syncedPhotos} photo(s) to Google Drive!`);
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as Error;
      showStatus("error", errorObj.message);
    } finally {
      setSyncingGDrive(false);
    }
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: ShieldCheck },
    { id: "members", label: "Members", icon: Users },
    { id: "relationships", label: "Relationships", icon: GitFork },
    { id: "documents", label: "Vault Documents", icon: FileText },
    { id: "users", label: "User Accounts", icon: UserPlus },
    { id: "audit", label: "Audit Logs", icon: History },
    { id: "settings", label: "Family Settings", icon: Settings },
    { id: "gdrive", label: "Google Drive (Free)", icon: HardDrive },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Status banner */}
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

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-stone-200 shadow-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-amber-800 text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Total Members
              </div>
              <div className="text-3xl font-serif font-bold text-stone-900 mt-2">
                {members.length}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Vault Documents
              </div>
              <div className="text-3xl font-serif font-bold text-stone-900 mt-2">
                {documents.length}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
                User Accounts
              </div>
              <div className="text-3xl font-serif font-bold text-stone-900 mt-2">
                {users.length}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Audit Events
              </div>
              <div className="text-3xl font-serif font-bold text-stone-900 mt-2">
                {auditLogs.length}
              </div>
            </div>
          </div>

          {/* Backup Export Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900">
                Complete Archive Backup
              </h3>
              <p className="text-xs text-stone-500 mt-1 max-w-xl leading-relaxed">
                Export all structured family members, kinship linkages, marriages, vault metadata, and albums into a standard portable JSON file.
              </p>
            </div>
            <a
              href="/api/admin/export"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Backup</span>
            </a>
          </div>
        </div>
      )}

      {/* MEMBERS TAB */}
      {activeTab === "members" && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900">Add Family Member</h3>
            <p className="text-xs text-stone-500 mt-1">
              Add a new relative to the family tree with parent and spouse bindings.
            </p>
          </div>

          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
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
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Gender
                </label>
                <select
                  value={newMember.gender}
                  onChange={(e) =>
                    setNewMember({ ...newMember, gender: e.target.value as "male" | "female" })
                  }
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Generation
                </label>
                <select
                  value={newMember.generation}
                  onChange={(e) =>
                    setNewMember({ ...newMember, generation: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
                >
                  <option value="1">Gen 1 (Grandparents)</option>
                  <option value="2">Gen 2 (Brothers & Spouses)</option>
                  <option value="3">Gen 3 (Cousins)</option>
                  <option value="4">Gen 4 (Children)</option>
                  <option value="5">Gen 5</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Family Role (Optional)
                </label>
                <input
                  type="text"
                  value={newMember.family_role}
                  onChange={(e) => setNewMember({ ...newMember, family_role: e.target.value })}
                  placeholder="e.g. Eldest Grandson"
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  value={newMember.display_order}
                  onChange={(e) =>
                    setNewMember({ ...newMember, display_order: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Parents & Spouse */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Father
                </label>
                <select
                  value={newMember.father_id}
                  onChange={(e) => setNewMember({ ...newMember, father_id: e.target.value })}
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
                >
                  <option value="">None / Unknown</option>
                  {members.filter(m => m.gender === "male").map((m) => (
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
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
                >
                  <option value="">None / Unknown</option>
                  {members.filter(m => m.gender === "female").map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Spouse
                </label>
                <select
                  value={newMember.spouse_id}
                  onChange={(e) => setNewMember({ ...newMember, spouse_id: e.target.value })}
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
                >
                  <option value="">None / Unmarried</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Biography / Notes
              </label>
              <textarea
                value={newMember.bio}
                onChange={(e) => setNewMember({ ...newMember, bio: e.target.value })}
                rows={2}
                placeholder="Memories, profession, or notes..."
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm resize-none"
              />
            </div>

            {/* Flags */}
            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newMember.is_deceased}
                  onChange={(e) => setNewMember({ ...newMember, is_deceased: e.target.checked })}
                  className="rounded text-amber-800"
                />
                <span>Deceased (🕊️ Respectful styling)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newMember.is_family_lead}
                  onChange={(e) => setNewMember({ ...newMember, is_family_lead: e.target.checked })}
                  className="rounded text-amber-800"
                />
                <span>Designate as Family Lead (👑 Badge)</span>
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={savingMember}
                className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {savingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Save New Member</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RELATIONSHIPS TAB */}
      {activeTab === "relationships" && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900">
              Kinship & Relationship Editor
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Update parents and spouses with automated cycle loop detection.
            </p>
          </div>

          <form onSubmit={handleUpdateRelationships} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Select Person
              </label>
              <select
                value={relPersonId}
                onChange={(e) => setRelPersonId(e.target.value)}
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.nickname ? `(${m.nickname})` : ""} — Gen {m.generation}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Father
                </label>
                <select
                  value={relFatherId}
                  onChange={(e) => setRelFatherId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
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
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
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
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
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
                className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {savingRel ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitFork className="w-4 h-4" />}
                <span>Update Kinship Linkages</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {activeTab === "documents" && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900">
                Vault Documents Management
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Total {documents.length} records in private storage.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Relative</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-stone-50/50">
                    <td className="py-3 px-4 font-semibold text-stone-900">{doc.name}</td>
                    <td className="py-3 px-4 text-stone-600">{doc.first_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md font-medium">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-500">{(doc.file_size / 1024).toFixed(0)} KB</td>
                    <td className="py-3 px-4 text-stone-500">{doc.uploaded_by}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDocToDelete(doc)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* Create User Form */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="text-lg font-serif font-bold text-stone-900">Create User Account</h3>
            <form onSubmit={handleCreateUser} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                    Role *
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Full control)</option>
                    <option value="FAMILY_ADMIN">FAMILY_ADMIN (Manage members & docs)</option>
                    <option value="FAMILY_MEMBER">FAMILY_MEMBER (Standard family access)</option>
                    <option value="VIEWER">VIEWER (Read-only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                    Link to Family Member
                  </label>
                  <select
                    value={newUser.family_member_id}
                    onChange={(e) => setNewUser({ ...newUser, family_member_id: e.target.value })}
                    className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
                  >
                    <option value="">None / External</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.first_name} {m.nickname ? `(${m.nickname})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {savingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>

          {/* Users List */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="text-base font-serif font-bold text-stone-900">Existing Accounts</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Linked Member</th>
                    <th className="py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 px-4 font-semibold text-stone-900">{u.username}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded-md font-medium">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-600">{u.first_name || "—"}</td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {activeTab === "audit" && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900">Security Audit Logs</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Chronological log of logins, document downloads, and changes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/50">
                    <td className="py-3 px-4 text-stone-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-900">{log.user_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-700 font-medium">{log.target_name}</td>
                    <td className="py-3 px-4 text-stone-500 max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === "settings" && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900">Family Archive Settings</h3>
            <p className="text-xs text-stone-500 mt-1">Configure family archive identity and rules.</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Family Archive Title
              </label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Archive Description / Subtitle
              </label>
              <input
                type="text"
                value={familyDesc}
                onChange={(e) => setFamilyDesc(e.target.value)}
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Designated Family Lead
              </label>
              <select
                value={familyLeadId}
                onChange={(e) => setFamilyLeadId(e.target.value)}
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-sm"
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
                className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                <span>Save Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* GOOGLE DRIVE TAB */}
      {activeTab === "gdrive" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-serif font-bold text-stone-900">
                    Google Drive Integration
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    100% Free
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
                  Connect your family archive to Google Drive. Files uploaded through the website are saved directly into your Google Drive, and family members can <strong>directly view and download them from this website without ever visiting Google Drive</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestGDrive}
                  disabled={testingGDrive}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {testingGDrive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Test Connection</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncGDrive}
                  disabled={syncingGDrive}
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {syncingGDrive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  <span>Migrate Local Files</span>
                </button>
              </div>
            </div>

            {/* Live Status Result */}
            {gdriveTestResult && (
              <div
                className={`mt-4 p-4 rounded-xl border text-xs font-medium flex items-start gap-3 ${
                  gdriveTestResult.success
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    : "bg-rose-50/80 border-rose-200 text-rose-900"
                }`}
              >
                {gdriveTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold">{gdriveTestResult.message}</div>
                  {gdriveTestResult.folderName && (
                    <div>Target Folder: <strong>{gdriveTestResult.folderName}</strong> (ID: {gdriveTestResult.folderId})</div>
                  )}
                  {gdriveTestResult.email && (
                    <div>Service Account: <strong>{gdriveTestResult.email}</strong></div>
                  )}
                </div>
              </div>
            )}

            {/* Sync Migration Result */}
            {syncResult && (
              <div className="mt-4 p-4 rounded-xl border bg-amber-50/80 border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Migration Complete!</div>
                  <div className="mt-0.5">
                    Successfully migrated <strong>{syncResult.syncedDocuments}</strong> vault document(s) and <strong>{syncResult.syncedPhotos}</strong> photo(s) to Google Drive.
                  </div>
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className="mt-2 text-rose-700 font-mono text-[11px]">
                      {syncResult.errors.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Step-by-step Setup Guide */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-amber-800" />
                <h4 className="text-sm font-serif font-bold text-stone-900">
                  How to Set Up (100% Free &amp; No Credit Card)
                </h4>
              </div>

              <ol className="space-y-3.5 text-xs text-stone-600 list-decimal list-inside leading-relaxed">
                <li className="pl-1">
                  <strong>Create Google Cloud Project:</strong> Go to{" "}
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-800 hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    console.cloud.google.com <ExternalLink className="w-3 h-3 inline" />
                  </a>{" "}
                  and create a project. You do <strong>not</strong> need to add any billing or credit card.
                </li>
                <li className="pl-1">
                  <strong>Enable Google Drive API:</strong> In the search bar, search for <em>&quot;Google Drive API&quot;</em> and click <strong>Enable</strong>.
                </li>
                <li className="pl-1">
                  <strong>Create a Service Account:</strong> Go to <strong>IAM &amp; Admin &gt; Service Accounts</strong>, click <strong>Create Service Account</strong>, give it a name (e.g., <code>family-archive</code>) and click Done.
                </li>
                <li className="pl-1">
                  <strong>Generate JSON Key:</strong> Click your new Service Account, navigate to the <strong>Keys</strong> tab, click <strong>Add Key &gt; Create new key &gt; JSON</strong>. Download the JSON key file.
                </li>
                <li className="pl-1">
                  <strong>Create Folder in Google Drive:</strong> Open your Google Drive, create a folder (e.g. <em>&quot;Family Archive Vault&quot;</em>), click <strong>Share</strong>, and paste the service account email (ends with <code>@...iam.gserviceaccount.com</code>) with <strong>Editor</strong> permission.
                </li>
                <li className="pl-1">
                  <strong>Paste Settings:</strong> Copy the Folder ID (the characters at the end of the folder URL) and credentials into the form on the right!
                </li>
              </ol>
            </div>

            {/* Direct Configuration Form */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-800" />
                <h4 className="text-sm font-serif font-bold text-stone-900">
                  Google Drive Credentials
                </h4>
              </div>

              <form onSubmit={handleSaveGDrive} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Service Account Email
                  </label>
                  <input
                    type="email"
                    placeholder="family-archive@your-project.iam.gserviceaccount.com"
                    value={gdriveEmail}
                    onChange={(e) => setGdriveEmail(e.target.value)}
                    className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Google Drive Folder ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                    value={gdriveFolderId}
                    onChange={(e) => setGdriveFolderId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-xs font-mono"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Found in your Google Drive folder URL: <code>drive.google.com/drive/folders/<strong>[FOLDER_ID]</strong></code>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Private Key (from downloaded JSON)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                    value={gdrivePrivateKey}
                    onChange={(e) => setGdrivePrivateKey(e.target.value)}
                    className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-xs font-mono resize-y"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Tip: You can also place the downloaded JSON file as <code>service-account.json</code> in the project root folder.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingGDrive}
                    className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingGDrive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Save &amp; Test Credentials</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(docToDelete)}
        title="Delete this document?"
        message={`Are you sure you want to permanently delete "${docToDelete?.name}"?`}
        confirmText="Delete Document"
        isDestructive={true}
        onConfirm={handleDeleteDoc}
        onCancel={() => setDocToDelete(null)}
      />
    </div>
  );
}
