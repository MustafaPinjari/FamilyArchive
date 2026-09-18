import bcrypt from "bcryptjs";
import { getDb } from "./index";
import initialDocuments from "../../data/initial-documents.json";

export function seedDocuments(dbInstance?: ReturnType<typeof getDb>) {
  const db = dbInstance || getDb();
  try {
    const docCount = db.prepare("SELECT count(*) as count FROM documents").get() as { count: number };
    if (docCount.count > 0) return;

    const now = new Date().toISOString();
    const insertDoc = db.prepare(`
      INSERT OR IGNORE INTO documents (
        id, person_id, name, category, description, file_path, file_type,
        file_size, document_number, issue_date, expiry_date, notes,
        visibility, uploaded_by, uploaded_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const setPhoto = db.prepare(`
      UPDATE family_members
      SET profile_photo = ?, updated_at = ?
      WHERE id = ? AND (profile_photo IS NULL OR profile_photo = '' OR profile_photo NOT LIKE 'gdrive:%')
    `);

    const tx = db.transaction(() => {
      for (const doc of initialDocuments) {
        insertDoc.run(
          doc.id,
          doc.person_id,
          doc.name,
          doc.category,
          doc.description,
          doc.file_path,
          doc.file_type,
          doc.file_size,
          doc.document_number,
          doc.issue_date,
          doc.expiry_date,
          doc.notes,
          doc.visibility,
          doc.uploaded_by,
          doc.uploaded_at || now,
          doc.updated_at || now
        );
      }

      // Automatically link photos
      setPhoto.run("gdrive:1wLlhcPMQH7Cg7Xmwh7zjpEnWDZCYOMmI", now, "mukhtar");
      setPhoto.run("gdrive:1MzT1TOQjaV_Q-iNklvT0MZ84228i4TVu", now, "sharmin");
      setPhoto.run("gdrive:1_ceJa4FxXPEm_qdIaVbA_b7z_bEgM_4K", now, "mustafa");
      setPhoto.run("gdrive:17ZGGDmiJIg3v-AZV3Qcek8r_gOo7f2xU", now, "shabana");
    });

    tx();
    console.log(`Auto-seeded ${initialDocuments.length} initial Google Drive documents.`);
  } catch (err) {
    console.error("Error auto-seeding documents:", err);
  }
}

export function seedDatabase() {
  const db = getDb();

  // Always ensure default admin users exist
  const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    const now = new Date().toISOString();
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, username, email, password_hash, role, family_member_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const defaultPassword = "Family@Archive2026";
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);
    insertUser.run("user-mustafa", "mustafa", "mustafa@family.local", passwordHash, "SUPER_ADMIN", "mustafa", now, now);
    insertUser.run("user-akhtar", "akhtar", "akhtar@family.local", passwordHash, "FAMILY_ADMIN", "akhtar", now, now);
    insertUser.run("user-mukhtar", "mukhtar", "mukhtar@family.local", passwordHash, "FAMILY_MEMBER", "mukhtar", now, now);
    insertUser.run("user-member", "member", "member@family.local", passwordHash, "FAMILY_MEMBER", null, now, now);
    insertUser.run("user-viewer", "viewer", "viewer@family.local", passwordHash, "VIEWER", null, now, now);
  }

  // Always ensure Google Drive documents exist even if family members are already seeded
  seedDocuments(db);

  // Check if family members are already seeded
  const countRow = db.prepare("SELECT count(*) as count FROM family_members").get() as { count: number };
  if (countRow.count > 0) {
    return;
  }

  console.log("Seeding database with structured family data...");

  const now = new Date().toISOString();

  // Transaction for entire seeding process
  const runSeeding = db.transaction(() => {
    // 1. Insert Family Settings
    const insertSetting = db.prepare("INSERT OR REPLACE INTO family_settings (key, value) VALUES (?, ?)");
    insertSetting.run("family_name", "Our Family Archive");
    insertSetting.run("family_description", "A private digital space for our family tree, memories and important documents.");
    insertSetting.run("default_document_visibility", "FAMILY_ONLY");
    insertSetting.run("allowed_file_types", "pdf,jpg,jpeg,png,webp,docx,xlsx");
    insertSetting.run("max_file_size_mb", "25");

    // 2. Insert Photo Albums
    const insertAlbum = db.prepare(`
      INSERT OR IGNORE INTO photo_albums (id, name, description, cover_photo, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const defaultAlbums = [
      { id: "album-memories", name: "Family Memories", desc: "Cherished moments and family milestones." },
      { id: "album-childhood", name: "Childhood", desc: "Growing up through the generations." },
      { id: "album-weddings", name: "Weddings", desc: "Joyous marriage celebrations across the years." },
      { id: "album-eid", name: "Eid", desc: "Festive family Eid gatherings and feasts." },
      { id: "album-gatherings", name: "Family Gatherings", desc: "Reunions, dinners, and weekend get-togethers." },
      { id: "album-old-photos", name: "Old Photos", desc: "Vintage family heritage and ancestry portraits." },
      { id: "album-other", name: "Other", desc: "Miscellaneous family moments." },
    ];
    for (const alb of defaultAlbums) {
      insertAlbum.run(alb.id, alb.name, alb.desc, null, "system", now);
    }

    // 3. Insert Family Members
    const insertMember = db.prepare(`
      INSERT OR IGNORE INTO family_members (
        id, first_name, middle_name, last_name, nickname, gender,
        date_of_birth, date_of_death, is_deceased, profile_photo,
        bio, family_role, is_family_lead, generation, display_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Helper to insert member
    const addMember = (
      id: string,
      first_name: string,
      gender: "male" | "female" | null,
      generation: number,
      display_order: number,
      opts: {
        nickname?: string;
        is_deceased?: number;
        family_role?: string;
        is_family_lead?: number;
        bio?: string;
      } = {}
    ) => {
      insertMember.run(
        id,
        first_name,
        null,
        null,
        opts.nickname || null,
        gender,
        null, // No fake birth dates
        null, // No fake death dates
        opts.is_deceased ? 1 : 0,
        null,
        opts.bio || null,
        opts.family_role || null,
        opts.is_family_lead ? 1 : 0,
        generation,
        display_order,
        now,
        now
      );
    };

    // GENERATION 1
    addMember("mohammad", "Mohammad", "male", 1, 1, {
      nickname: "Grandfather",
      is_deceased: 1,
      family_role: "Grandfather",
      bio: "Beloved patriarch and grandfather of the family. Remembered with deep love, honor, and respect.",
    });

    addMember("hamida", "Hamida", "female", 1, 2, {
      nickname: "Grandmother",
      is_deceased: 0,
      family_role: "Grandmother",
      bio: "Beloved matriarch and grandmother of the family.",
    });

    // GENERATION 2 (Strict sibling order: Akhtar -> Shakur -> Sattar -> Mukhtar)
    // 1. Akhtar
    addMember("akhtar", "Akhtar", "male", 2, 1, {
      nickname: "Bade Pappa",
      is_family_lead: 1,
      family_role: "Current Family Lead",
      bio: "Eldest son of Mohammad and Hamida. Serving as the current Family Lead.",
    });
    addMember("afroz", "Afroz", "female", 2, 2, {
      family_role: "Spouse",
      bio: "Wife of Akhtar.",
    });

    // 2. Shakur
    addMember("shakur", "Shakur", "male", 2, 3, {
      nickname: "Elder Uncle",
      family_role: "Second Son",
      bio: "Second son of Mohammad and Hamida.",
    });
    addMember("chinni", "Chinni", "female", 2, 4, {
      family_role: "Spouse",
      bio: "Wife of Shakur.",
    });

    // 3. Sattar
    addMember("sattar", "Sattar", "male", 2, 5, {
      nickname: "Uncle",
      family_role: "Third Son",
      bio: "Third son of Mohammad and Hamida.",
    });
    addMember("guddi", "Guddi", "female", 2, 6, {
      family_role: "Spouse",
      bio: "Wife of Sattar.",
    });

    // 4. Mukhtar
    addMember("mukhtar", "Mukhtar", "male", 2, 7, {
      nickname: "Youngest Brother",
      family_role: "Youngest Son",
      bio: "Youngest son of Mohammad and Hamida.",
    });
    addMember("shabana", "Shabana", "female", 2, 8, {
      family_role: "Spouse",
      bio: "Wife of Mukhtar.",
    });

    // GENERATION 3 & 4 — AKHTAR'S BRANCH
    // Naziya + Azhar -> Atiqa, Maira
    addMember("naziya", "Naziya", "female", 3, 1, { bio: "Daughter of Akhtar and Afroz." });
    addMember("azhar", "Azhar", "male", 3, 2, { bio: "Husband of Naziya." });
    addMember("atiqa", "Atiqa", "female", 4, 1, { bio: "Daughter of Azhar and Naziya." });
    addMember("maira", "Maira", "female", 4, 2, { bio: "Daughter of Azhar and Naziya." });

    // Mussavir + Saniya -> Yazdan
    addMember("mussavir", "Mussavir", "male", 3, 3, { bio: "Son of Akhtar and Afroz." });
    addMember("saniya", "Saniya", "female", 3, 4, { bio: "Wife of Mussavir." });
    addMember("yazdan", "Yazdan", "male", 4, 3, { bio: "Son of Mussavir and Saniya (Baby boy)." });

    // Arshiya + Sharukh -> Kabir, Umar
    addMember("arshiya", "Arshiya", "female", 3, 5, { bio: "Daughter of Akhtar and Afroz." });
    addMember("sharukh", "Sharukh", "male", 3, 6, { bio: "Husband of Arshiya." });
    addMember("kabir", "Kabir", "male", 4, 4, { bio: "Son of Sharukh and Arshiya." });
    addMember("umar", "Umar", "male", 4, 5, { bio: "Son of Sharukh and Arshiya." });

    // GENERATION 3 & 4 — SHAKUR'S BRANCH
    // Eram (Unmarried)
    addMember("eram", "Eram", "female", 3, 7, { bio: "Daughter of Shakur and Chinni (Unmarried)." });

    // Saba + Farukh -> Zikra, Aarish
    addMember("saba", "Saba", "female", 3, 8, { bio: "Daughter of Shakur and Chinni." });
    addMember("farukh", "Farukh", "male", 3, 9, { bio: "Husband of Saba." });
    addMember("zikra", "Zikra", "female", 4, 6, { bio: "Daughter of Farukh and Saba." });
    addMember("aarish", "Aarish", "male", 4, 7, { bio: "Son of Farukh and Saba." });

    // Sana + Altaf -> Alvina, Alian
    addMember("sana", "Sana", "female", 3, 10, { bio: "Daughter of Shakur and Chinni." });
    addMember("altaf", "Altaf", "male", 3, 11, { bio: "Husband of Sana." });
    addMember("alvina", "Alvina", "female", 4, 8, { bio: "Daughter of Altaf and Sana." });
    addMember("alian", "Alian", "male", 4, 9, { bio: "Son of Altaf and Sana." });

    // Tasmiya + Tayyab -> Azlan
    addMember("tasmiya", "Tasmiya", "female", 3, 12, { bio: "Daughter of Shakur and Chinni." });
    addMember("tayyab", "Tayyab", "male", 3, 13, { bio: "Husband of Tasmiya." });
    addMember("azlan", "Azlan", "male", 4, 10, { bio: "Son of Tayyab and Tasmiya." });

    // GENERATION 3 & 4 — SATTAR'S BRANCH
    // Junaid + Sufiya -> Hamdan
    addMember("junaid", "Junaid", "male", 3, 14, { bio: "Son of Sattar and Guddi." });
    addMember("sufiya", "Sufiya", "female", 3, 15, { bio: "Wife of Junaid." });
    addMember("hamdan", "Hamdan", "male", 4, 11, { bio: "Son of Junaid and Sufiya." });

    // Misbah + Tanveer -> Zoya
    addMember("misbah", "Misbah", "female", 3, 16, { bio: "Daughter of Sattar and Guddi." });
    addMember("tanveer", "Tanveer", "male", 3, 17, { bio: "Husband of Misbah." });
    addMember("zoya", "Zoya", "female", 4, 12, { bio: "Daughter of Tanveer and Misbah." });

    // GENERATION 3 — MUKHTAR'S BRANCH
    // Mustafa (marital status not specified)
    addMember("mustafa", "Mustafa", "male", 3, 18, { bio: "Son of Mukhtar and Shabana." });

    // Sharmin + Sameer (no children specified)
    addMember("sharmin", "Sharmin", "female", 3, 19, { bio: "Daughter of Mukhtar and Shabana." });
    addMember("sameer", "Sameer", "male", 3, 20, { bio: "Husband of Sharmin." });

    // Set family lead in settings
    insertSetting.run("family_lead_id", "akhtar");

    // 4. Insert Marriages
    const insertMarriage = db.prepare(`
      INSERT OR IGNORE INTO marriages (id, person1_id, person2_id, marriage_date, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const marriages = [
      { id: "m-mohammad-hamida", p1: "mohammad", p2: "hamida", status: "widowed" },
      { id: "m-akhtar-afroz", p1: "akhtar", p2: "afroz", status: "active" },
      { id: "m-shakur-chinni", p1: "shakur", p2: "chinni", status: "active" },
      { id: "m-sattar-guddi", p1: "sattar", p2: "guddi", status: "active" },
      { id: "m-mukhtar-shabana", p1: "mukhtar", p2: "shabana", status: "active" },
      // Gen 3 marriages
      { id: "m-naziya-azhar", p1: "naziya", p2: "azhar", status: "active" },
      { id: "m-mussavir-saniya", p1: "mussavir", p2: "saniya", status: "active" },
      { id: "m-arshiya-sharukh", p1: "arshiya", p2: "sharukh", status: "active" },
      { id: "m-saba-farukh", p1: "saba", p2: "farukh", status: "active" },
      { id: "m-sana-altaf", p1: "sana", p2: "altaf", status: "active" },
      { id: "m-tasmiya-tayyab", p1: "tasmiya", p2: "tayyab", status: "active" },
      { id: "m-junaid-sufiya", p1: "junaid", p2: "sufiya", status: "active" },
      { id: "m-misbah-tanveer", p1: "misbah", p2: "tanveer", status: "active" },
      { id: "m-sharmin-sameer", p1: "sharmin", p2: "sameer", status: "active" },
    ];
    for (const m of marriages) {
      insertMarriage.run(m.id, m.p1, m.p2, null, m.status, null, now);
    }

    // 5. Insert Relationships
    const insertRel = db.prepare(`
      INSERT OR IGNORE INTO relationships (id, person_id, related_person_id, relationship_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const addParentChild = (parent: string, child: string) => {
      insertRel.run(`rel-p-${parent}-${child}`, parent, child, "child", now);
      insertRel.run(`rel-c-${child}-${parent}`, child, parent, "parent", now);
    };

    const addSpouses = (p1: string, p2: string) => {
      insertRel.run(`rel-sp-${p1}-${p2}`, p1, p2, "spouse", now);
      insertRel.run(`rel-sp-${p2}-${p1}`, p2, p1, "spouse", now);
    };

    // Mohammad & Hamida -> Children (Akhtar, Shakur, Sattar, Mukhtar)
    const gen2Sons = ["akhtar", "shakur", "sattar", "mukhtar"];
    for (const son of gen2Sons) {
      addParentChild("mohammad", son);
      addParentChild("hamida", son);
    }

    // Spouses
    addSpouses("mohammad", "hamida");
    addSpouses("akhtar", "afroz");
    addSpouses("shakur", "chinni");
    addSpouses("sattar", "guddi");
    addSpouses("mukhtar", "shabana");

    // Akhtar & Afroz children
    for (const child of ["naziya", "mussavir", "arshiya"]) {
      addParentChild("akhtar", child);
      addParentChild("afroz", child);
    }
    addSpouses("naziya", "azhar");
    addSpouses("mussavir", "saniya");
    addSpouses("arshiya", "sharukh");

    // Naziya & Azhar children
    for (const child of ["atiqa", "maira"]) {
      addParentChild("naziya", child);
      addParentChild("azhar", child);
    }
    // Mussavir & Saniya child
    addParentChild("mussavir", "yazdan");
    addParentChild("saniya", "yazdan");

    // Arshiya & Sharukh children
    for (const child of ["kabir", "umar"]) {
      addParentChild("arshiya", child);
      addParentChild("sharukh", child);
    }

    // Shakur & Chinni children
    for (const child of ["eram", "saba", "sana", "tasmiya"]) {
      addParentChild("shakur", child);
      addParentChild("chinni", child);
    }
    addSpouses("saba", "farukh");
    addSpouses("sana", "altaf");
    addSpouses("tasmiya", "tayyab");

    // Saba & Farukh children
    for (const child of ["zikra", "aarish"]) {
      addParentChild("saba", child);
      addParentChild("farukh", child);
    }
    // Sana & Altaf children
    for (const child of ["alvina", "alian"]) {
      addParentChild("sana", child);
      addParentChild("altaf", child);
    }
    // Tasmiya & Tayyab child
    addParentChild("tasmiya", "azlan");
    addParentChild("tayyab", "azlan");

    // Sattar & Guddi children
    for (const child of ["junaid", "misbah"]) {
      addParentChild("sattar", child);
      addParentChild("guddi", child);
    }
    addSpouses("junaid", "sufiya");
    addSpouses("misbah", "tanveer");

    // Junaid & Sufiya child
    addParentChild("junaid", "hamdan");
    addParentChild("sufiya", "hamdan");

    // Misbah & Tanveer child
    addParentChild("misbah", "zoya");
    addParentChild("tanveer", "zoya");

    // Mukhtar & Shabana children
    for (const child of ["mustafa", "sharmin"]) {
      addParentChild("mukhtar", child);
      addParentChild("shabana", child);
    }
    addSpouses("sharmin", "sameer");

    // 6. Pre-seeded Users with secure bcrypt hashes
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, username, email, password_hash, role, family_member_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Standard salt rounds for seed
    const defaultPassword = "Family@Archive2026";
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    // Mustafa - Super Admin
    insertUser.run("user-mustafa", "mustafa", "mustafa@family.local", passwordHash, "SUPER_ADMIN", "mustafa", now, now);
    // Akhtar - Family Admin & Family Lead
    insertUser.run("user-akhtar", "akhtar", "akhtar@family.local", passwordHash, "FAMILY_ADMIN", "akhtar", now, now);
    // Mukhtar - Family Member
    insertUser.run("user-mukhtar", "mukhtar", "mukhtar@family.local", passwordHash, "FAMILY_MEMBER", "mukhtar", now, now);
    // General Family Member
    insertUser.run("user-member", "member", "member@family.local", passwordHash, "FAMILY_MEMBER", null, now, now);
    // Read-only Viewer
    insertUser.run("user-viewer", "viewer", "viewer@family.local", passwordHash, "VIEWER", null, now, now);

    // 7. Initial Audit Log entry
    const insertAudit = db.prepare(`
      INSERT OR IGNORE INTO audit_logs (id, user_id, user_name, action, target_type, target_id, target_name, details, ip_address, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertAudit.run(
      "audit-init",
      "system",
      "System Initializer",
      "INITIALIZE_ARCHIVE",
      "SYSTEM",
      "root",
      "Our Family Archive",
      "Seeded 42 family members and initial structure faithfully from heritage records.",
      "127.0.0.1",
      now
    );

    console.log("Successfully seeded database with all family members, relationships, and user roles.");
  });

  runSeeding();
}
