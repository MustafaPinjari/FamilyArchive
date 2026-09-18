import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { getDb } from "@/lib/db";
import { FamilyMember, Photo, PhotoAlbum } from "@/types";
import { PhotosClient } from "./PhotosClient";

export default async function PhotosPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const db = getDb();

  const albums = db.prepare("SELECT * FROM photo_albums ORDER BY name ASC").all() as PhotoAlbum[];

  const photos = db
    .prepare(`
      SELECT p.*, pa.name as album_name
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      ORDER BY p.uploaded_at DESC
    `)
    .all() as (Photo & {
      album_name: string;
      tagged_members?: { id: string; first_name: string; last_name: string | null }[];
    })[];

  const memberTagStmt = db.prepare(`
    SELECT fm.id, fm.first_name, fm.last_name
    FROM family_members fm
    JOIN photo_members pm ON fm.id = pm.member_id
    WHERE pm.photo_id = ?
  `);

  for (const p of photos) {
    p.tagged_members = memberTagStmt.all(p.id) as { id: string; first_name: string; last_name: string | null }[];
  }

  const members = db
    .prepare("SELECT * FROM family_members ORDER BY generation ASC, display_order ASC")
    .all() as FamilyMember[];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <Navbar initialUser={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Family Photo Memories
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Visual archive of celebrations, Eid gatherings, weddings, and generational milestones.
          </p>
        </div>

        <PhotosClient
          initialPhotos={photos}
          albums={albums}
          members={members}
          currentUser={user}
        />
      </main>
    </div>
  );
}
