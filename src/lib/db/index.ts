import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

import os from "os";

// Ensure data and vault storage directories exist (Resilient to read-only serverless filesystems)
function resolveStorage() {
  const localDataDir = path.join(process.cwd(), "data");
  let chosenDataDir = localDataDir;

  try {
    if (!fs.existsSync(localDataDir)) {
      fs.mkdirSync(localDataDir, { recursive: true });
    }
    const testFile = path.join(localDataDir, ".perm-check");
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
  } catch {
    // Read-only filesystem (Netlify / AWS Lambda / Serverless)
    chosenDataDir = path.join(os.tmpdir(), "family-archive-data");
    if (!fs.existsSync(chosenDataDir)) {
      fs.mkdirSync(chosenDataDir, { recursive: true });
    }
    const packagedDb = path.join(localDataDir, "archive.db");
    const tmpDb = path.join(chosenDataDir, "archive.db");
    if (fs.existsSync(packagedDb) && !fs.existsSync(tmpDb)) {
      try {
        fs.copyFileSync(packagedDb, tmpDb);
      } catch (err) {
        console.warn("Could not copy pre-built db to tmp directory:", err);
      }
    }
  }

  const vaultDir = path.join(chosenDataDir, "vault");
  const photosDir = path.join(chosenDataDir, "photos");

  try {
    if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });
    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
  } catch (err) {
    console.warn("Could not initialize storage subdirectories:", err);
  }

  return {
    DATA_DIR: chosenDataDir,
    VAULT_DIR: vaultDir,
    PHOTOS_DIR: photosDir,
    DB_PATH: path.join(chosenDataDir, "archive.db"),
  };
}

const { DATA_DIR, VAULT_DIR, PHOTOS_DIR, DB_PATH } = resolveStorage();

export { VAULT_DIR, PHOTOS_DIR, DATA_DIR };

// Singleton connection to prevent connection leaks during Next.js HMR
const globalForDb = globalThis as unknown as {
  dbInstance?: Database.Database;
};

import { seedDatabase } from "./seed";

export function getDb(): Database.Database {
  if (!globalForDb.dbInstance) {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
    globalForDb.dbInstance = db;
    // Idempotent seeding on first run
    seedDatabase();
  }
  return globalForDb.dbInstance;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      family_member_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT,
      nickname TEXT,
      gender TEXT,
      date_of_birth TEXT,
      date_of_death TEXT,
      is_deceased INTEGER NOT NULL DEFAULT 0,
      profile_photo TEXT,
      bio TEXT,
      family_role TEXT,
      is_family_lead INTEGER NOT NULL DEFAULT 0,
      generation INTEGER NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      related_person_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES family_members(id) ON DELETE CASCADE,
      FOREIGN KEY (related_person_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS marriages (
      id TEXT PRIMARY KEY,
      person1_id TEXT NOT NULL,
      person2_id TEXT NOT NULL,
      marriage_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person1_id) REFERENCES family_members(id) ON DELETE CASCADE,
      FOREIGN KEY (person2_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      document_number TEXT,
      issue_date TEXT,
      expiry_date TEXT,
      notes TEXT,
      visibility TEXT NOT NULL DEFAULT 'FAMILY_ONLY',
      uploaded_by TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_permissions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      user_id TEXT,
      role TEXT,
      can_view INTEGER NOT NULL DEFAULT 1,
      can_download INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS photo_albums (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      cover_photo TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      album_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      caption TEXT,
      date_taken TEXT,
      uploaded_by TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (album_id) REFERENCES photo_albums(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS photo_members (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_name TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_properties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      description TEXT,
      survey_number TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS property_members (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (property_id) REFERENCES family_properties(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_members_name ON family_members(first_name, last_name);
    CREATE INDEX IF NOT EXISTS idx_members_generation ON family_members(generation, display_order);
    CREATE INDEX IF NOT EXISTS idx_relationships_person ON relationships(person_id, relationship_type);
    CREATE INDEX IF NOT EXISTS idx_marriages_person1 ON marriages(person1_id);
    CREATE INDEX IF NOT EXISTS idx_marriages_person2 ON marriages(person2_id);
    CREATE INDEX IF NOT EXISTS idx_documents_person ON documents(person_id);
    CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
  `);
}

export const db = getDb();
