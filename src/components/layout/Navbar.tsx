"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  GitFork,
  FileText,
  Camera,
  ShieldCheck,
  LogOut,
  Lock,
  Globe,
} from "lucide-react";
import { User } from "@/types";
import { useLanguage } from "@/lib/i18n";

interface NavbarProps {
  initialUser?: User | null;
}

export function Navbar({ initialUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser || null);
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    if (!initialUser) {
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) setUser(data.user);
        })
        .catch(() => {});
    }
  }, [initialUser]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "FAMILY_ADMIN";

  const navItems = [
    { href: "/", label: t("appName"), shortLabel: "Home", icon: Home },
    { href: "/family-tree", label: t("navTree"), shortLabel: "Family", icon: GitFork },
    { href: "/documents", label: t("navVault"), shortLabel: "Documents", icon: FileText },
    { href: "/photos", label: t("navPhotos"), shortLabel: "Photos", icon: Camera },
  ];

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-15">
            {/* Logo */}
            <a
              href="/"
              className="flex items-center gap-2.5 font-serif font-bold text-lg text-stone-900 hover:text-amber-900 transition-colors"
            >
              <img
                src="/logo.png"
                alt="Family Logo"
                className="w-8 h-8 rounded-lg object-contain"
              />
              <span className="tracking-tight">{t("appName")}</span>
            </a>

            {/* Desktop Navigation Links (Human Mental Model) */}
            <nav className="hidden md:flex items-center space-x-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors min-h-[40px] ${
                      isActive
                        ? "bg-amber-900 text-white shadow-2xs"
                        : "text-stone-700 hover:text-stone-900 hover:bg-stone-200/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>

            {/* Right Controls: Language & Discreet Admin Access */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100/70 hover:bg-amber-200/80 text-amber-950 border border-amber-300 transition-colors cursor-pointer min-h-[36px]"
                title="Switch Language / भाषा बदलें"
              >
                <Globe className="w-3.5 h-3.5 text-amber-800" />
                <span>{language === "en" ? "हिंदी" : "English"}</span>
              </button>

              {isAdmin ? (
                <div className="flex items-center gap-1.5 pl-1.5 border-l border-stone-200">
                  <a
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors min-h-[36px]"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                    <span>Admin</span>
                  </a>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl text-stone-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <a
                  href="/login"
                  className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 text-xs font-medium transition-colors min-h-[36px]"
                  title="Family Administrator Sign In"
                >
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Admin</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Fitts's Law: 48px+ Touch Areas) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-lg px-2 py-1 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 min-h-[50px] rounded-xl transition-colors ${
                isActive
                  ? "text-amber-900 font-bold"
                  : "text-stone-500 hover:text-stone-900 font-medium"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-amber-900 stroke-[2.5]" : "text-stone-400"}`} />
              <span className="text-[11px] mt-0.5 tracking-tight">{item.shortLabel}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
