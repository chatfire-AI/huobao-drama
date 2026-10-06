# 🎬 Huobao Drama - AI Short Drama Generation Platform

<div align="center">

**A full-stack TypeScript platform for automated AI short-drama production**

[![Node Version](https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=node.js)](https://nodejs.org)
[![Vue Version](https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat&logo=vue.js)](https://vuejs.org)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Download](https://img.shields.io/github/v/release/chatfire-AI/huobao-drama?style=flat&logo=github&label=Download)](https://github.com/chatfire-AI/huobao-drama/releases/latest)

**English** | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[Features](#-features) • [Quick Start](#-quick-start) • [Walkthrough](#-visual-walkthrough) • [Desktop App](#-desktop-app-recommended) • [Deployment](#-deployment)

<h2>🔑 <a href="https://api.firemux.com">Get a Huobao API Key 👉 Get started</a></h2>

**Text, image, and video AI capabilities — one key unlocks everything**

After deploying, paste the key in "Settings → Huobao Quick Setup" to write three recommended configs in one click

<h3>📥 <a href="https://github.com/chatfire-AI/huobao-drama/releases/latest">Download Desktop App (macOS / Windows)</a></h3>
<h3>🌐 <a href="https://www.chatfire.site">Official Website</a></h3>

</div>

---

## 📖 Overview

Huobao Drama is an AI-powered short-drama production platform that automates the entire pipeline: script generation, character design, storyboard breakdown, and video compositing.

### 🎯 Core Value

- **🤖 AI-Driven**: LLMs parse scripts and extract characters, scenes, and storyboard information
- **🎨 Intelligent Creation**: AI image generation for character designs and scene backgrounds
- **📹 Video Generation**: Text-to-video and image-to-video models automatically produce storyboard clips
- **🔄 End-to-End Workflow**: A complete pipeline from idea to finished episode

### 🛠️ Architecture

```
frontend/   — Nuxt 3 + Vue 3 + TypeScript (pure CSS, no UI framework)
backend/    — Hono + Drizzle ORM + Mastra AI Agents + better-sqlite3
backend/workspace/skills/ — Agent skill definitions (SKILL.md, editable in the UI)
desktop/    — Electron desktop app (main process + esbuild + electron-builder dmg/exe)
data/       — Generated assets and the SQLite database
```

---

## ✨ Features

### 🎭 Character Management

- ✅ AI-generated character designs
- ✅ Batch character generation
- ✅ Character image upload and management

### 🎬 Video Tasks

- ✅ Automatic AI video-task generation
- ✅ Scene descriptions and video prompt generation
- ✅ Batch video generation per task

### 🎥 Video Generation

- ✅ Text-to-video generation
- ✅ FFmpeg per-shot compositing and subtitle handling
- ✅ Full-episode stitching and export

### 📦 Asset Management

- ✅ Unified asset library
- ✅ Local storage support
- ✅ Task progress tracking

### 🤖 AI Agents

Four built-in Mastra agents with database-backed configuration and Skill extensions:

| Agent | Role |
|---|---|
| `script_rewriter` | Novel → formatted script rewriting |
| `extractor` | Intelligent extraction and dedup of characters / scenes / props |
| `storyboard_breaker` | Script → storyboard sequence breakdown |
| `prompt_generator` | Image prompts for characters/scenes/props + storyboard video prompts |

### 🌐 Multi-Language UI

The interface ships in **中文 / English / 日本語 / 한국어**, with a global setting for AI-generated content language.

### 🔌 Multi-Provider Support

| Type | Providers |
|---|---|
| **Text** | OpenAI (compatible APIs), Gemini |
| **Image** | OpenAI, Gemini, Volcano Engine |
| **Video** | Volcano Engine Seedance 2.0 (Standard / Fast / Mini), MiniMax H3, Alibaba Bailian Wan 3.0 (Prime / Standard) |

---

## 🚀 Quick Start

### 📋 Requirements

| Software | Version | Notes |
|---|---|---|
| **Node.js** | 20+ | Runtime for frontend and backend |
| **npm** | 9+ | Package manager |

> **Zero-install database**: Bundled SQLite (single file in the project data directory) — no database server required.
> **No FFmpeg install needed**: Binaries ship via the `ffmpeg-static` / `ffprobe-static` npm packages — works out of the box.

### ⚙️ Environment Variables

No config files — everything is set via environment variables (all have defaults; local dev needs zero configuration):

| Variable | Default | Description |
|---|---|---|
| `SQLITE_PATH` | `<repo>/data/huobao.sqlite3` | SQLite database file location |
| `PORT` | `5679` | Backend service port |
| `STORAGE_PATH` | `<repo>/data/static` | Generated-file storage directory |
| `HUOBAO_DATA_DIR` | — | Injected by the Electron main process (userData data root) |
| `WORKSPACE_PATH` | `backend/workspace` | Agent skills/prompts directory (desktop: writable copy under userData) |
| `FRONTEND_DIST` | `frontend/dist` | Frontend static build directory |
| `FFMPEG_BIN` / `FFPROBE_BIN` | bundled npm binaries | Custom ffmpeg/ffprobe executable paths |
| `PUBLIC_BASE_URL` | — | Public URL Seedance needs to reference local assets (server deployments) |

> **Note**: AI service API keys, base URLs, and model parameters are all configured in the web UI "Settings" page and stored in the database — never in config files or environment variables.

### 📥 Installation

```bash
# Clone the repository
git clone https://github.com/chatfire-AI/huobao-drama.git
cd huobao-drama

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 🎯 Running

#### Option 1: Development mode (recommended)

Frontend and backend run separately with hot reload:

```bash
# Terminal 1: backend
cd backend
npm run dev

# Terminal 2: frontend
cd frontend
npm run dev
```

- Frontend: `http://localhost:3013`
- Backend API: `http://localhost:5679/api/v1`
- The frontend automatically proxies `/api` and `/static` to the backend

#### Option 2: Single-service mode

The backend serves both the API and the frontend static files:

```bash
# 1. Build the frontend
cd frontend && npm run generate

# 2. Copy the build output where the backend expects it
#    (generate outputs to .output/public; the backend reads frontend/dist)
cp -r .output/public dist

# 3. Start the backend
cd ../backend && npm start
```

Visit: `http://localhost:5679`

### 🗄️ Database

Bundled SQLite (`better-sqlite3` + WAL mode). Tables are created automatically on first launch (idempotent DDL replay + seed data). Default file: `data/huobao.sqlite3`, overridable via `SQLITE_PATH`. The desktop app stores data in the user-data directory (`~/Library/Application Support/HuobaoDrama/data/`).

Migrating data from a legacy MySQL deployment:

**Automatic migration on startup (recommended)**: When MySQL is explicitly configured (`DATABASE_URL` or `MYSQL_HOST`) and the SQLite database is empty, the backend automatically detects and imports all tables once (per-table row-count validation, single-transaction atomic writes, automatic rollback with retry on next launch, and a `.mysql-imported` marker to avoid re-importing). Set `MYSQL_AUTO_IMPORT=false` to disable.

```bash
# Or run manually (non-empty target requires --force; automatic backup before writing)
cd backend && npx tsx scripts/import-mysql-to-sqlite.ts
```

> Migration covers database rows only; media files (images/videos) under the old deployment's `data/static/` must be copied manually, or historical assets won't load.

### 🔑 First Use: Configure AI Services

All AI features (text/image/video) require model services to be configured first — a banner at the top of the page guides you until then:

1. Open the "Settings" page
2. Paste your Huobao API key in "Huobao Quick Setup" ([get one at api.firemux.com](https://api.firemux.com)) to write three recommended configs (text, image, video) in one click
3. Or add providers one by one via "Manual Templates", with connectivity testing

Once configured, the banner disappears and you can start producing episodes.

---

## 📖 Visual Walkthrough

The complete pipeline from novel to finished episode. The left progress rail always shows where you are.

### Step 1 · Create a Project

On the home page click "New Project", pick a **aspect ratio** (16:9 landscape / 9:16 portrait, fixed after creation) and a **visual style** (3D, realistic, … — injected into every image prompt).

<p align="center">
  <img src="docs/screenshots/02-create-drama.png" alt="Create a project" width="800">
</p>

<p align="center">
  <img src="docs/screenshots/01-projects.png" alt="Project list" width="800">
</p>

### Step 2 · Configure AI Services (first run)

Paste an API key in Settings → "Huobao Quick Setup" to write the three recommended configs at once, or add providers manually. The current model can be switched any time from the top bar (see Step 5).

<p align="center">
  <img src="docs/screenshots/03-settings-quick.png" alt="AI service setup" width="800">
</p>

### Step 3 · Script Stage

Paste your **source novel** into the workbench, then hit "AI Rewrite" to produce a shooting script — split by episode with scenes and characters annotated. You can switch text models and tone while rewriting.

<p align="center">
  <img src="docs/screenshots/05-script.png" alt="Script stage" width="800">
</p>

### Step 4 · Assets

Run **extraction** on the script to get the character / scene / prop list, then generate a consistent reference image for each (or in batch). These images are injected as reference material when generating videos.

<p align="center">
  <img src="docs/screenshots/06-assets.png" alt="Asset production" width="800">
</p>

### Step 5 · Storyboard & Videos

On the "Video Production" page, first run **storyboard breakdown** (AI splits shots and writes video prompts). Then:

- Pick the **video model** in the top bar (Seedance / Wan 3.0 / MiniMax…); resolution and duration tiers follow the model
- Review and tweak each shot's prompt on the right (`@character` references map to reference images automatically)
- Click "Batch Generate Videos"; failed tasks can be retried in one click

<p align="center">
  <img src="docs/screenshots/07-storyboard.png" alt="Storyboard breakdown" width="800">
</p>

<p align="center">
  <img src="docs/screenshots/08-videos.png" alt="Video generation" width="800">
</p>

### Step 6 · Merge & Export

Select shots (hover to preview each clip), click "Start Merging" and FFmpeg assembles the full episode — play online or download. Click "Mark Done" when finished to light up the progress rail.

<p align="center">
  <img src="docs/screenshots/09-export.png" alt="Merge & export" width="800">
</p>

The episode list shows the production status of every episode — click "Enter Studio" to continue:

<p align="center">
  <img src="docs/screenshots/04-episodes.png" alt="Episode list" width="800">
</p>

---

## 📦 Deployment

### 🖥️ Desktop App (recommended)

**⬇️ Prebuilt installers: [GitHub Releases](https://github.com/chatfire-AI/huobao-drama/releases/latest) · [Mirror for China (Tencent COS)](https://installer.chatfire.site/huobao-drama/v4.0.5/)**

| Platform | File to download |
|---|---|
| macOS (Apple Silicon, M-series) | `HuobaoDrama-4.0.5-arm64.dmg` |
| macOS (Intel) | `HuobaoDrama-4.0.5.dmg` |
| Windows | `HuobaoDrama.Setup.4.0.5.exe` |

> China users: use the COS mirror above (GitHub is slow/unreachable in mainland China). The in-app updater also checks the COS mirror first, then falls back to GitHub.

**Command-line install (recommended, no Gatekeeper fix needed)**: downloading via curl never sets macOS's quarantine attribute, so the app opens cleanly with no "damaged" prompt (use the `-arm64.dmg` for Apple Silicon, the plain dmg for Intel):

```bash
curl -L -o /tmp/HuobaoDrama.dmg https://installer.chatfire.site/huobao-drama/v4.0.5/HuobaoDrama-4.0.5-arm64.dmg \
  && hdiutil attach -nobrowse /tmp/HuobaoDrama.dmg \
  && cp -R /Volumes/HuobaoDrama*/HuobaoDrama.app /Applications/ \
  && hdiutil detach /Volumes/HuobaoDrama*
```

No build required — download the dmg/exe and install. Installed clients auto-update via the built-in updater. (To package from source instead, see the commands below.)

Double-click to install, works out of the box (macOS + Windows): the SQLite database, generated media, and Agent skills all live in the user-data directory — uninstalling the app does not affect your data.

```bash
# One-command packaging (frontend generate → backend esbuild → electron-builder)
npm run dist        # macOS dmg (arm64 + Intel)
npm run dist:win    # Windows NSIS installer (win-x64, cross-buildable on macOS)

# Artifacts
# desktop/release/HuobaoDrama-<version>-arm64.dmg     (Apple Silicon)
# desktop/release/HuobaoDrama-<version>.dmg           (Intel)
# desktop/release/HuobaoDrama Setup <version>.exe     (Windows)
```

Installation notes:

- The macOS build is unsigned — on first launch you may see "App is damaged and can't be opened" (common on Apple Silicon). This is Gatekeeper's quarantine attribute, not actual file damage. Two ways to fix it:
  1. **The dmg bundles a fix script**: after dragging the app into Applications, double-click the "如提示已损坏请双击我.command" script at the bottom of the dmg window — it removes the quarantine attribute automatically;
  2. Or run `sudo xattr -cr /Applications/HuobaoDrama.app` in Terminal.

  The fix is one-time only — the app then launches normally, and in-app auto-updates are not affected.
- The Windows build is unsigned — SmartScreen will prompt "More info → Run anyway"
- User-data directory: `~/Library/Application Support/HuobaoDrama/` (database, generated media, writable copies of online-edited skills)
- FFmpeg/FFprobe binaries are bundled — no system install needed
- Electron is pinned to 37.x: better-sqlite3's win32 prebuilds max out at that ABI (the key to compilation-free cross-packaging)
- External links open in the system browser (e.g. "Get a key at api.firemux.com")

#### 🔄 In-App Updates (no Apple signing required)

The desktop app ships with a built-in updater (same class of solution as Tauri: directory replacement on macOS / silent installer on Windows, with local sha256 verification). To publish a new release:

```bash
# 1. Bump version in desktop/package.json, then package
npm run dist        # macOS (produces dmg + update zip)
npm run dist:win    # Windows (produces Setup.exe)

# 2. Generate the release manifest release/latest.json (with per-platform sha256)
cd desktop && npm run feed

# 3. Publish: upload latest.json + installers + zips to a GitHub Release (tag like v1.0.1)
```

Installed clients check the manifest automatically after launch (manual check available in "Settings → About & Updates") and prompt to download and install when a new version is found. Override the manifest URL with the `HUOBAO_UPDATE_FEED` environment variable.

Desktop development:

```bash
npm run build:frontend   # frontend static output (frontend/.output/public)
cd desktop && npm run dev  # bundle the backend and run in an Electron window
```

> Known limitation: Seedance video models need a `PUBLIC_BASE_URL` public address to reference local assets; the desktop app has no public entry point, so that scenario produces a clear error message. Text-to-video, image generation, and all other capabilities are unaffected.

---

### 🏭 Server Deployment

```bash
# 1. Build the frontend
cd frontend && npm run generate

# 2. Copy the build output (generate outputs to frontend/.output/public; the backend reads
#    frontend/dist — skip this step and the API works but pages 404)
cp -r .output/public dist && cd ..

# 3. Start the backend
cd backend && npm start
```

Files to upload to the server:

```
backend/                    # backend source + node_modules
backend/workspace/skills/   # Agent skill files
frontend/dist/              # frontend build output
data/                       # data directory (auto-created on first run)
```

#### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Max 50MB for reference video/audio uploads
    client_max_body_size 100m;

    # Generated images/videos served straight from disk, bypassing Node:
    # sendfile zero-copy + long-lived caching
    # (files are uuid-named and immutable, so immutable caching is safe)
    location /static/ {
        alias /path/to/huobao-drama/data/static/;
        sendfile on;
        tcp_nopush on;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://localhost:5679;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

> Media loading optimization: the backend automatically generates 400px thumbnails (`*_thumb.webp`) for list pages and extracts poster frames (`*_poster.jpg`) as video covers — the frontend only loads original files when opening the full image or playing. To backfill historical files, run `npm run backfill-artwork` under `backend/`.

### 🐳 Docker Deployment (with in-app updates)

**Option A — prebuilt image (no clone, no build):** multi-arch (`linux/amd64` + `linux/arm64`), x86 servers and ARM devices match automatically

```bash
docker pull huobao/huobao-drama:4.0.6

docker run -d \
  --name huobao-drama \
  -p 5679:5679 \
  -v huobao-data:/app/data \
  --restart unless-stopped \
  huobao/huobao-drama:4.0.6
```

**Option B — docker compose (source build + Watchtower in-app updates):** the repo root provides an all-in-one `Dockerfile` (three stages: frontend generate + backend dependencies + runtime; the backend runs via tsx just like server deployment) and `docker-compose.yml` (app + Watchtower):

```bash
# 1. Configure the environment (Watchtower token — must match on the app and watchtower sides)
cp .env.example .env   # edit WATCHTOWER_TOKEN

# 2. Build and start (inject a version at publish time for "About & Updates" comparison)
HUOBAO_VERSION=4.0.5 docker compose up -d --build

# 3. Visit http://localhost:5679
```

- **Data persistence**: the named volume `huobao-data` mounts `/app/data` (SQLite + generated images/videos + workspace/skills) — image updates don't lose data
- **In-app updates**: the compose file ships a [Watchtower](https://containrrr.dev/watchtower/) sidecar (`--label-enable` only updates labeled containers, `--cleanup` removes old images, daily self-check). "Settings → About & Updates" can check for new versions and "Update Now" — the backend triggers it via the Watchtower HTTP API, which pulls the new image and rebuilds the container; refresh the page after a few minutes
- **Manual mode**: remove the app's two `HUOBAO_WATCHTOWER_*` env vars (or the whole watchtower service) from `docker-compose.yml` — "About & Updates" then degrades to a new-version notice + manual `docker compose pull && docker compose up -d`
- **Publishing images**: `docker buildx build --platform linux/amd64,linux/arm64 --build-arg HUOBAO_VERSION=x.y.z -t huobao/huobao-drama:x.y.z -t huobao/huobao-drama:latest --push .` — the version manifest is shared with the desktop app via `latest.json` on GitHub Releases (overridable with `HUOBAO_UPDATE_FEED`)

---

## 🎨 Tech Stack

### Backend

- **Runtime**: Node.js 20+
- **Web framework**: Hono
- **ORM**: Drizzle ORM + better-sqlite3 (WAL mode)
- **AI Agents**: Mastra + AI SDK (OpenAI compatible)
- **Video processing**: FFmpeg (fluent-ffmpeg + bundled binaries)
- **Image processing**: Sharp

### Desktop

- **Shell**: Electron (utilityProcess hosts the backend; BrowserWindow loads same-origin)
- **Packaging**: esbuild (single-file backend bundle) + electron-builder (dmg arm64/x64, NSIS win-x64)

### Frontend

- **Framework**: Nuxt 3 (SPA mode)
- **Language**: Vue 3 + TypeScript
- **Routing**: File-based routing (Vue Router 4)
- **Styling**: Pure CSS + CSS Variables
- **Icons**: Lucide Vue
- **i18n**: vue-i18n (中文 / English / 日本語 / 한국어)

---

## 📝 FAQ

### Q: Where does the desktop app store data?

A: `~/Library/Application Support/HuobaoDrama/data/` (SQLite database + generated images/videos); writable copies of online-edited skills live in the sibling `workspace/` directory. In development mode the repo's `data/` directory is used instead.

### Q: How do I migrate legacy MySQL data to SQLite?

A: Keep MySQL reachable (environment variables or `backend/.env`), then run `cd backend && npx tsx scripts/import-mysql-to-sqlite.ts`. The script creates tables automatically, imports table-by-table, and validates row counts (non-empty targets require `--force`; a backup is made before writing).

### Q: FFmpeg not installed or not found?

A: No install needed. The project bundles `ffmpeg-static` / `ffprobe-static` binaries (carried along in the desktop package). A system `PATH` FFmpeg won't conflict either, and you can point explicitly via `FFMPEG_BIN`/`FFPROBE_BIN`.

### Q: The top of the page says "No model configured"?

A: That's the normal first-deploy guidance. Go to "Settings" and use "Huobao Quick Setup" to paste an API key and write configs in one click, or add providers via "Manual Templates". The banner disappears once text, image, and video all have an enabled config.

### Q: The frontend can't reach the backend API?

A: Check that the backend is running and the port is correct. In dev mode the proxy config lives in `frontend/nuxt.config.ts`.

### Q: Database tables not created?

A: The backend creates all tables automatically on first launch — check the logs to confirm initialization succeeded.

---

## 📋 Changelog

### v4.0.0 (2026-08)

#### 🖥️ Desktop App + Database Migration

- Electron desktop app (macOS dmg, arm64/x64 dual architecture)
  - Double-click install, works out of the box: automatic port selection, single-instance lock, crash-isolated backend subprocess
  - User-data isolation: SQLite database / generated media / skill copies all live in the userData directory
  - FFmpeg/FFprobe bundled; workspace skill templates copied on first launch, upgrades only fill gaps without overwriting
- Database fully migrated from MySQL to SQLite (better-sqlite3 + WAL)
  - Zero business-code changes (the Drizzle query layer is naturally portable); idempotent DDL replay
  - New one-shot import script `import-mysql-to-sqlite.ts` (per-table row-count validation + automatic backup)
- Backend bundled to a single file with esbuild (externals: sharp/better-sqlite3/ffmpeg binary packages)
- Removed Docker/MySQL deployment (recoverable from git history)

### v3.1.0 (2026-09)

- Added Alibaba Bailian Wan 3.0 video models (Prime / Standard, official `input.media`/`parameters` payloads)
- Resolution selector in the workbench top bar with native tiers per provider (Seedance 480p/720p, MiniMax 768P/2K, Wan 480P/720P/1080P)
- Default video model changed to Seedance 2.0 Mini
- Fixed generation errors caused by provider/model mismatch when switching video models
- Batch video: selection mode + pre-generation confirmation (shot count / total duration / model / resolution), one-click retry for failed tasks
- Storyboard duration now editable directly in the video-generation params area, applied to single and batch generation
- Content-moderation failures (real-person / sensitive content) now prompt to switch models and retry

### v3.0.0 (2026-08)

#### 🚀 Deployment & Experience Improvements

- Docker deployment readiness
  - MySQL / app health checks; the app waits for the database before starting
  - Database initialization retries — zero manual intervention on first containerized deploy
  - Removed the system FFmpeg dependency; bundled binaries everywhere
  - Agent skills directory volume persistence (online edits in Settings survive)
  - New `docker/init.sql` and export scripts (DBA review / pre-created tables)
- First-use guidance
  - Site-wide banner guiding to Settings when no AI service is configured
  - New "Huobao Quick Setup" in Settings: one key writes three recommended configs (text/image/video)
  - Unconfigured-model errors localized with pointers to Settings
- Default video model changed to Seedance 2.0 Fast
- Provider consolidation: OpenAI / Gemini / Volcano Engine only
- Workbench: task-list drawer, pipeline stage status, selective stitching (validates video files exist before merging)
- Asset library redesign, @mention improvements, episode list rework

### v2.0.0 (2026-04)

#### 🚀 Major Update

- Full migration to a TypeScript stack
  - Backend: Hono + Drizzle ORM + mysql2
  - Frontend: Nuxt 3 + Vue 3
  - AI Agents: Mastra framework
- Episode workbench UI and production flow rebuilt
  - More compact console layout
  - Storyboard editing area rebuilt
  - Shot image, video, compositing, and export screens rebuilt
- Docker deployment support — frontend and backend merged into a single image
- Runtime Skill loading mechanism
- Expanded multi-provider media adapters
  - Image: OpenAI, Gemini, Volcano Engine, Alibaba
  - Video: Volcano Engine/Seedance, Vidu, Alibaba
- Improved local file handling and on-demand reference-image transcoding

### v1.0.4 (2026-01-27)

- Local storage strategy to avoid dead external asset links
- Base64 reference-image embedded transport
- Fixed shot-switch state reset
- Scene migration to chapters

### v1.0.3 (2026-01-16)

- Database concurrency performance improvements
- Docker cross-platform support for host.docker.internal

### v1.0.2 (2026-01-14)

- Fixed video-generation API response parsing
- OpenAI Sora video endpoint configuration
- Improved error handling and logging

---

## 📄 License

This project is licensed under **[CC BY-NC-SA 4.0](LICENSE)** (Attribution-NonCommercial-ShareAlike 4.0 International).

- ✅ Personal use, learning, and non-commercial projects are welcome
- ✅ Modifications and redistribution allowed under the same license with attribution
- ❌ **Commercial use is prohibited** — you may not use this project, in whole or in part, for any commercial purpose (including paid services, commercial deployments, or resale) without prior written permission from the author

Full license text: see [LICENSE](LICENSE).

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Common checks:

```bash
cd backend && npm run typecheck
cd ../frontend && npm run generate  # emits index.html (npm run build does not)
```

---

## ☕ Donate

If this project helps you, buy the author a coffee ☕ — your support keeps the updates coming!

<div align="center">
  <img src="donate.png" alt="Alipay donation QR code" width="240" />
</div>

---

## 💬 WeChat Group

Scan the QR code to join the WeChat group:

<div align="center">
  <img src="docs/images/wx-group.jpg" width="200" alt="WeChat group QR code" />
</div>

---

> _"Let AI do the creating with us"_

## 🔗 Links

This project has been recognized with a link from the [LINUX DO](https://linux.do/) community.

- [LINUX DO](https://linux.do/) — a genuine open-source spirit, a community built on sharing

---

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=chatfire-ai/huobao-drama&type=date&legend=top-left)](https://www.star-history.com/?repos=chatfire-ai%2Fhuobao-drama&type=date&legend=top-left)
