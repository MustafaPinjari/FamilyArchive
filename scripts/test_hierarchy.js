const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "../data/archive.db"));
const members = db.prepare("SELECT * FROM family_members ORDER BY generation ASC, display_order ASC").all();
const marriages = db.prepare("SELECT * FROM marriages").all();
const relationships = db.prepare("SELECT * FROM relationships").all();

const memberMap = new Map();
for (const m of members) {
  memberMap.set(m.id, m);
}

const findSpouse = (personId) => {
  const marriage = marriages.find(
    (m) =>
      (m.person1_id === personId || m.person2_id === personId) &&
      m.status !== "separated"
  );
  if (marriage) {
    const spouseId = marriage.person1_id === personId ? marriage.person2_id : marriage.person1_id;
    return memberMap.get(spouseId) || null;
  }
  const rel = relationships.find(
    (r) =>
      (r.person_id === personId || r.related_person_id === personId) &&
      r.relationship_type === "spouse"
  );
  if (rel) {
    const spouseId = rel.person_id === personId ? rel.related_person_id : rel.person_id;
    return memberMap.get(spouseId) || null;
  }
  return null;
};

const findChildren = (parentIds) => {
  const childIds = new Set();
  for (const pid of parentIds) {
    const rels = relationships.filter(
      (r) => r.person_id === pid && r.relationship_type === "child"
    );
    for (const r of rels) {
      childIds.add(r.related_person_id);
    }
  }
  return Array.from(childIds)
    .map((id) => memberMap.get(id))
    .filter(Boolean)
    .sort((a, b) => a.display_order - b.display_order);
};

// Dynamic Gen 2 branch heads: children of Gen 1 members
const gen1Members = members.filter((m) => m.generation === 1);
const gen1Ids = new Set(gen1Members.map((m) => m.id));

const branchHeadIds = new Set();
for (const rel of relationships) {
  if (rel.relationship_type === "child" && gen1Ids.has(rel.person_id)) {
    branchHeadIds.add(rel.related_person_id);
  }
}
if (branchHeadIds.size === 0) {
  members
    .filter((m) => m.generation === 2 && (m.is_family_lead || m.gender === "male"))
    .forEach((m) => branchHeadIds.add(m.id));
}

const branchHeads = Array.from(branchHeadIds)
  .map((id) => memberMap.get(id))
  .filter(Boolean)
  .sort((a, b) => a.display_order - b.display_order);

console.log("Found Branch Heads:", branchHeads.map(b => b.first_name));

for (const head of branchHeads) {
  const spouse = findSpouse(head.id);
  const children = findChildren([head.id, spouse ? spouse.id : null].filter(Boolean));
  console.log(`\nBranch: ${head.first_name} & ${spouse ? spouse.first_name : "None"} (${children.length} children)`);
  for (const child of children) {
    const childSpouse = findSpouse(child.id);
    const grandChildren = findChildren([child.id, childSpouse ? childSpouse.id : null].filter(Boolean));
    console.log(`  - Child: ${child.first_name} & ${childSpouse ? childSpouse.first_name : "unmarried"} (${grandChildren.length} children)`);
    if (grandChildren.length > 0) {
      console.log(`    Grandchildren: ${grandChildren.map(g => g.first_name).join(", ")}`);
    }
  }
}
