# 🌳 Family Tree & Private Digital Archive

A modern, private, and secure digital family tree and historical document vault. Designed specifically for Indian family structures with generation tracking, kinship linkages, Hindi/English multilingual support, and seamless 100% free Google Drive storage integration.

---

## ✨ Key Features

- **Interactive Family Tree & Lineage Navigation**:
  - Generation-based organization (Elders/Grandparents, The 4 Brothers, Children & Grandchildren).
  - Instant member profile drawer with relationship links (spouse, children, parents).
  - Case-insensitive, resilient name and document search.

- **🌐 Multilingual Support (English & हिंदी)**:
  - 1-tap language toggle switch in the header (`English` ⇄ `हिंदी`).
  - Persistent language preference saved in browser storage.
  - Complete localized UI across family tree, document drawer, filters, and forms.

- **📁 Zero-Redirect Google Drive Storage (100% Free)**:
  - Backed by Google Drive API using a free Google Cloud Service Account (no credit card required).
  - All documents and photos are streamed directly through a secure backend proxy (`/api/documents/[id]/preview` and `/api/documents/[id]/download`).
  - **Zero redirects to Google Drive** — family members view PDFs and images directly inside the website without needing a Google account.

- **🔍 Inline Document Thumbnail Previews for Easy Review & Approval**:
  - **Tree Member Drawer**: Shows miniature preview thumbnails for images and colored badges for PDFs/DOCs with 1-tap view modal.
  - **Document Vault**: Cards include clickable thumbnail previews for instant verification.
  - **Admin Table**: Displays inline thumbnails with instant "Preview", "Download", and "Delete" actions.

- **📸 Mobile-Optimized 1-Tap Document & Photo Upload**:
  - Quick camera capture or file picker directly from phone.
  - Single and bulk multi-file uploads with document presets (Aadhaar Card, PAN Card, Passport, Property Deed, Medical Records).
  - Profile photo update directly from the member drawer.

- **🛡️ Admin Panel & Google Drive Sync**:
  - Deep folder recursive import: crawls nested Google Drive folders (`Root -> Generation -> Family Unit -> Person`) and auto-maps files to family members.
  - Live Google Drive connection tester and one-click database sync.
  - Kinship relationship editor with loop detection.
  - Audit logging of all file uploads, modifications, and deletions.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript & React 19
- **Database**: SQLite via `better-sqlite3` (with WAL mode for fast, atomic operations)
- **Cloud Storage**: Google Drive API (`googleapis`) via Service Account
- **Styling**: Tailwind CSS & Lucide Icons
- **Internationalization**: Lightweight custom client-side i18n context (`src/lib/i18n.tsx`)

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+ (Node 20+ recommended)
- A Google Cloud Service Account (free tier, no billing required)

### 2. Clone and Install Dependencies

```bash
git clone https://github.com/MustafaPinjari/FamilyArchive.git
cd FamilyArchive
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Application Security
SESSION_SECRET="your-strong-random-session-secret-at-least-32-chars"
ADMIN_PASSWORD="Family@Archive2026"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google Drive Integration (100% Free)
# 1. Email of your Google Cloud Service Account:
GOOGLE_DRIVE_CLIENT_EMAIL="family-archive@gen-lang-client-0182253668.iam.gserviceaccount.com"

# 2. Private Key (format with \n or use service-account.json in project root):
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# 3. Google Drive Folder ID (from folder URL: drive.google.com/drive/folders/<FOLDER_ID>):
GOOGLE_DRIVE_FOLDER_ID="1nYtuGB68RxFFNurV4bq8bEtMq89DosdE"

# 4. Optional: Shared Drive ID (leave blank for standard folders)
GOOGLE_DRIVE_SHARED_DRIVE_ID=""
```

> **Tip**: You can alternatively place your downloaded Google Cloud JSON key as `service-account.json` in the project root. The app will automatically detect it!

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Google Drive Free Setup Guide

Follow these steps to set up Google Drive without paying a single cent:

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `FamilyArchive`).
3. Navigate to **APIs & Services > Library** and search for **Google Drive API**. Click **Enable**.
4. Navigate to **APIs & Services > Credentials** > **Create Credentials** > **Service Account**:
   - Name: `family-archive`
   - Grant role: **Editor** (or basic viewer).
   - Click Done.
5. Click on the newly created Service Account > **Keys** tab > **Add Key** > **Create new key** (JSON).
6. Save the downloaded JSON file as `service-account.json` in this project's root folder.
7. Open [Google Drive](https://drive.google.com/), create a main folder (e.g. `Family Archive`).
8. Click **Share** on that folder, paste the Service Account email (`...@iam.gserviceaccount.com`), give it **Editor** permissions, and save.
9. Copy the Folder ID from the browser URL (e.g., `1nYtuGB68RxFFNurV4bq8bEtMq89DosdE`) into `GOOGLE_DRIVE_FOLDER_ID`.
10. Open `/admin` in the website, navigate to the **Google Drive** tab, and click **Test Connection** & **Import from Drive**!

---

## 📂 Google Drive Folder Hierarchy

The deep crawler automatically maps nested Google Drive folders to family members:

```text
📁 Family Archive (Root)
└── 📁 Generation 2
    ├── 📁 Mukhtar Family
    │   ├── 📁 Mukhtar
    │   │   └── Mukhtar_Aadhaar.pdf
    │   ├── 📁 Mustafa
    │   │   ├── Mustafa_Passport.jpg
    │   │   └── Mustafa_PAN.pdf
    │   └── 📁 Shabana
    │       └── Shabana_Aadhaar.pdf
    └── 📁 Akhtar Family
        ├── 📁 Akhtar
        │   └── Akhtar_Aadhaar.pdf
        └── 📁 Afroz
            └── Afroz_VoterID.pdf
```

---

## 🌐 API Routes

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/family-tree` | `GET` | Fetches dynamic family tree layout, members, and relationships |
| `/api/members/[id]` | `GET` | Fetches member profile, kinship nodes, and documents |
| `/api/members/[id]/photo` | `POST` | Uploads member profile avatar |
| `/api/documents/[id]/preview` | `GET` | Direct inline stream for PDFs and images |
| `/api/documents/[id]/download` | `GET` | Attachment stream with download headers |
| `/api/documents/upload` | `POST` | 1-tap single/bulk upload endpoint |
| `/api/admin/gdrive/test` | `POST` | Tests Google Drive credentials |
| `/api/admin/gdrive/sync` | `POST` | Syncs local database records with Google Drive |
| `/api/admin/gdrive/import` | `POST` | Deep crawler importing Google Drive folders into database |

---

## 🚢 Production Deployment

Since the database uses `better-sqlite3` for fast, private local storage:

- **Recommended Platforms**:
  - **Docker / VPS / Coolify** (Self-hosted or DigitalOcean, Hetzner)
  - **Railway / Render** (Persistent disk supported)
- **Netlify / Vercel Serverless**:
  - Serverless functions have read-only, ephemeral filesystems. If deploying to Netlify or Vercel, connect SQLite to [Turso](https://turso.tech/) (free distributed SQLite) or host via a Docker container on Railway or Render.

---

## 📄 License

Private and confidential for family archive usage. All rights reserved.
