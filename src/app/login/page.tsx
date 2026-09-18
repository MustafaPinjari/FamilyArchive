"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, AlertCircle, ArrowRight, Loader2, KeyRound, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("mustafa");
  const [password, setPassword] = useState("Family@Archive2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "Invalid admin credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
        <span className="text-[28rem] font-serif select-none">🌳</span>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <a href="/" className="inline-flex items-center gap-2 mb-4 text-xs font-semibold text-amber-800 hover:underline">
          ← Back to Family Tree
        </a>
        <div className="w-16 h-16 rounded-2xl bg-amber-800 text-white flex items-center justify-center text-3xl shadow-lg mx-auto mb-3">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
          Admin Sign In
        </h2>
        <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
          Family members can freely browse the tree and documents without a password. Password is only needed for editing and admin privileges.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-stone-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Admin Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="mustafa"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-semibold text-white bg-amber-800 hover:bg-amber-900 focus:outline-none disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Admin Panel</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 text-center text-xs text-stone-400">
            Default Admin: <code className="text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">mustafa</code> / Password: <code className="text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">Family@Archive2026</code>
          </div>
        </div>
      </div>
    </div>
  );
}
