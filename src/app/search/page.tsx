import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { SearchClient } from "./SearchClient";

export default async function SearchPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <Navbar initialUser={user} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Family Archive Search
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Search across all family members, nicknames, kinships, and vault records.
          </p>
        </div>

        <SearchClient />
      </main>
    </div>
  );
}
