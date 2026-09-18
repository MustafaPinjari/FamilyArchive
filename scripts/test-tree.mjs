import Database from "better-sqlite3";
import { computeFamilyTreeLayout } from "../src/lib/tree-layout.ts";

const db = new Database("data/archive.db");
const rawMembers = db.prepare("SELECT * FROM family_members ORDER BY generation ASC, display_order ASC").all();
const members = rawMembers.map((m) => ({
  ...m,
  photo_url: m.profile_photo ? `/api/photos/${encodeURIComponent(m.profile_photo)}/view` : null,
}));
const marriages = db.prepare("SELECT * FROM marriages").all();
const relationships = db.prepare("SELECT * FROM relationships").all();

const docCountRows = db.prepare("SELECT person_id, count(*) as count FROM documents GROUP BY person_id").all();
const docCounts = {};
for (const r of docCountRows) docCounts[r.person_id] = r.count;

const photoCountRows = db.prepare("SELECT member_id, count(*) as count FROM photo_members GROUP BY member_id").all();
const photoCounts = {};
for (const r of photoCountRows) photoCounts[r.member_id] = r.count;

try {
  const layout = computeFamilyTreeLayout(members, marriages, relationships, docCounts, photoCounts);
  console.log("Layout computed successfully! Generations:", layout.generations.length, "Total nodes:", layout.nodes.length);
} catch (e) {
  console.error("Layout computation error:", e);
}
