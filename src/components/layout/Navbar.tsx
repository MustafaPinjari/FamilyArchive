"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  GitFork,
  Users,
  FileText,
  Camera,
  Search,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Lock,
} from "lucide-react";
import { User } from "@/types";
import { GlobalSearchModal } from "../search/GlobalSearchModal";

interface NavbarProps {
  initialUser?: User | null;
}

export function Navbar({ initialUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

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

  const navLinks = [
    { href: "/", label: "Family Tree", icon: GitFork },
    { href: "/members", label: "Relatives", icon: Users },
    { href: "/documents", label: "Document Vault", icon: FileText },
    { href: "/photos", label: "Photos", icon: Camera },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <a
                href="/"
                className="flex items-center gap-2.5 font-serif font-bold text-base sm:text-lg text-amber-300 hover:text-amber-200 transition-colors"
              >
                <span className="text-xl">🌳</span>
                <span>Our Family Archive</span>
              </a>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-amber-600/25 text-amber-300 border border-amber-600/40"
                        : "text-stone-300 hover:text-white hover:bg-stone-800/70"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-400" />
                    <span>{link.label}</span>
                  </a>
                );
              })}
            </nav>

            {/* Right side: Search & Admin Controls */}
            <div className="hidden md:flex items-center gap-2.5">
              <button
                onClick={() => setSearchModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-stone-300 text-xs border border-stone-700 transition-colors"
                title="Global Search"
              >
                <Search className="w-3.5 h-3.5 text-amber-400" />
                <span>Search</span>
              </button>

              {isAdmin ? (
                <div className="flex items-center gap-2 pl-2 border-l border-stone-800">
                  <a
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin Panel</span>
                  </a>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                    title="Log out from Admin"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <a
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-medium border border-stone-700 transition-colors"
                >
                  <Lock className="w-3 h-3 text-stone-400" />
                  <span>Admin Login</span>
                </a>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                onClick={() => setSearchModalOpen(true)}
                className="p-2 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800"
                aria-label="Search"
              >
                <Search className="w-4 h-4 text-amber-400" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-800 bg-stone-900 px-4 py-3 space-y-1.5 animate-in slide-in-from-top-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-amber-600/25 text-amber-300 border border-amber-600/40"
                      : "text-stone-300 hover:bg-stone-800"
                  }`}
                >
                  <Icon className="w-4 h-4 text-amber-400" />
                  <span>{link.label}</span>
                </a>
              );
            })}

            <div className="pt-2 mt-2 border-t border-stone-800">
              {isAdmin ? (
                <div className="flex items-center justify-between">
                  <a
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-xs font-semibold text-amber-300 py-1"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </a>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-xs text-rose-400 py-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <a
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-xs text-stone-400 hover:text-white py-1"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Admin Sign In</span>
                </a>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectMember={(memberId) => {
          router.push(`/members/${memberId}`);
        }}
        onSelectDocument={(doc) => {
          router.push(`/documents?id=${doc.id}`);
        }}
      />
    </>
  );
}
