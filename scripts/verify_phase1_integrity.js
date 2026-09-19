const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "../data/archive.db"));

// 5 Test Members from different branches & generations
const testMemberIds = [
  "mohammad", // Gen 1 (Patriarch)
  "akhtar",   // Gen 2 (Family Lead, Branch 1)
  "mukhtar",  // Gen 2 (Youngest brother, Branch 4)
  "naziya",   // Gen 3 (Branch 1, married to Azhar, 2 kids)
  "mustafa",  // Gen 3 (Branch 4, Mukhtar's son)
];

console.log("===============================================================");
console.log("PHASE 1 DATA INTEGRITY VERIFICATION — 5 REAL FAMILY MEMBERS");
console.log("===============================================================\n");

for (const memberId of testMemberIds) {
  const member = db.prepare("SELECT * FROM family_members WHERE id = ?").get(memberId);
  if (!member) {
    console.error(`❌ Member ${memberId} NOT FOUND in database!`);
    continue;
  }

  // Parents
  const parents = db.prepare(`
    SELECT fm.id, fm.first_name, fm.gender FROM family_members fm
    JOIN relationships r ON fm.id = r.person_id
    WHERE r.related_person_id = ? AND r.relationship_type = 'child'
  `).all(memberId);

  // Spouse
  const spouse = db.prepare(`
    SELECT fm.id, fm.first_name, fm.gender FROM family_members fm
    JOIN marriages m ON (fm.id = m.person2_id AND m.person1_id = ?) OR (fm.id = m.person1_id AND m.person2_id = ?)
    WHERE m.status != 'separated'
  `).get(memberId, memberId);

  // Children
  const children = db.prepare(`
    SELECT fm.id, fm.first_name, fm.gender FROM family_members fm
    JOIN relationships r ON fm.id = r.related_person_id
    WHERE r.person_id = ? AND r.relationship_type = 'child'
    ORDER BY fm.display_order ASC
  `).all(memberId);

  // Documents
  const documents = db.prepare("SELECT id, name, category, file_path, file_size FROM documents WHERE person_id = ?").all(memberId);

  // QR destination verification
  const qrDestination = `/documents?person=${member.id}`;

  console.log(`---------------------------------------------------------------`);
  console.log(`MEMBER: ${member.first_name} ${member.last_name || ""} (ID: "${member.id}")`);
  console.log(`- Generation: ${member.generation}`);
  console.log(`- Role/Lead: ${member.family_role || "N/A"} | Is Family Lead: ${member.is_family_lead}`);
  console.log(`- Photo Field: ${member.profile_photo || "(No photo)"}`);
  console.log(`- Parents: ${parents.length > 0 ? parents.map(p => `${p.first_name} (${p.gender})`).join(", ") : "None recorded (Root)"}`);
  console.log(`- Spouse: ${spouse ? `${spouse.first_name} (${spouse.id})` : "None recorded"}`);
  console.log(`- Children (${children.length}): ${children.length > 0 ? children.map(c => `${c.first_name} (${c.id})`).join(", ") : "None"}`);
  console.log(`- Documents in SQLite (${documents.length}):`);
  documents.forEach(d => console.log(`    • [${d.category}] ${d.name} (${d.file_path})`));
  console.log(`- QR Code Destination: "${qrDestination}"`);
  console.log(`---------------------------------------------------------------\n`);
}
