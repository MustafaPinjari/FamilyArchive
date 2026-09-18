import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "data", "archive.db");
const vaultDir = path.join(process.cwd(), "data", "vault");

if (!fs.existsSync(vaultDir)) {
  fs.mkdirSync(vaultDir, { recursive: true });
}

const db = new Database(dbPath);

const sampleDocs = [
  {
    id: "doc-sample-mukhtar-aadhaar",
    person_id: "mukhtar",
    name: "Aadhaar Card",
    category: "Identity",
    description: "Official Government of India Aadhaar Identification Card",
    file_name: "mukhtar_aadhaar.txt",
    file_type: "text/plain",
    content: "GOVERNMENT OF INDIA\nAADHAAR CARD\nName: Mukhtar\nFather: Mohammad\nMother: Hamida\nUnique Identification Authority of India",
  },
  {
    id: "doc-sample-mukhtar-pan",
    person_id: "mukhtar",
    name: "PAN Card",
    category: "Identity",
    description: "Permanent Account Number Card - Income Tax Department",
    file_name: "mukhtar_pan.txt",
    file_type: "text/plain",
    content: "INCOME TAX DEPARTMENT - GOVT OF INDIA\nPAN CARD\nName: Mukhtar\nFather: Mohammad\nStatus: Individual",
  },
  {
    id: "doc-sample-akhtar-aadhaar",
    person_id: "akhtar",
    name: "Aadhaar Card",
    category: "Identity",
    description: "Official Government of India Aadhaar Card",
    file_name: "akhtar_aadhaar.txt",
    file_type: "text/plain",
    content: "GOVERNMENT OF INDIA\nAADHAAR CARD\nName: Akhtar (Bade Pappa)\nFamily Lead\nUIDAI",
  },
  {
    id: "doc-sample-akhtar-property",
    person_id: "akhtar",
    name: "Ancestral Property Document",
    category: "Property",
    description: "Family Ancestral Land & Estate Registry Document",
    file_name: "akhtar_property.txt",
    file_type: "text/plain",
    content: "FAMILY ARCHIVE HERITAGE ESTATE\nRegistry Deed No: 1984/FAM-01\nHeads of Estate: Akhtar (Lead), Shakur, Sattar, Mukhtar\nStatus: Preserved in Vault",
  },
  {
    id: "doc-sample-shakur-aadhaar",
    person_id: "shakur",
    name: "Aadhaar Card",
    category: "Identity",
    description: "Government Identity Card",
    file_name: "shakur_aadhaar.txt",
    file_type: "text/plain",
    content: "GOVERNMENT OF INDIA\nAADHAAR CARD\nName: Shakur\nUIDAI",
  },
  {
    id: "doc-sample-sattar-aadhaar",
    person_id: "sattar",
    name: "Aadhaar Card",
    category: "Identity",
    description: "Government Identity Card",
    file_name: "sattar_aadhaar.txt",
    file_type: "text/plain",
    content: "GOVERNMENT OF INDIA\nAADHAAR CARD\nName: Sattar\nUIDAI",
  },
  {
    id: "doc-sample-mustafa-aadhaar",
    person_id: "mustafa",
    name: "Aadhaar Card",
    category: "Identity",
    description: "Government Identity Proof",
    file_name: "mustafa_aadhaar.txt",
    file_type: "text/plain",
    content: "GOVERNMENT OF INDIA\nAADHAAR CARD\nName: Mustafa\nFather: Mukhtar\nMother: Shabana\nUIDAI",
  },
];

const now = new Date().toISOString();

for (const d of sampleDocs) {
  const filePath = path.join(vaultDir, d.file_name);
  fs.writeFileSync(filePath, d.content);
  const size = Buffer.byteLength(d.content);

  db.prepare(`
    INSERT OR REPLACE INTO documents (
      id, person_id, name, category, description, file_path, file_type,
      file_size, document_number, issue_date, expiry_date, notes,
      visibility, uploaded_by, uploaded_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.id,
    d.person_id,
    d.name,
    d.category,
    d.description,
    d.file_name,
    d.file_type,
    size,
    "SAMPLE-XXXX",
    null,
    null,
    null,
    "FAMILY_ONLY",
    "system",
    now,
    now
  );
}

console.log("Successfully seeded sample documents into vault!");
