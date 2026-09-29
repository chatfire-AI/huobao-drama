# AGENTS.md

Primary agent guidance for this repo. The OpenWiki documentation index and the agent skills configuration live here only; `CLAUDE.md` points here for tools that read that filename.

## Language

Write new content in English: identifiers, comments, logs, test names, file names, and documentation. The Chinese already in the repo stays as it is — the rule binds what you add.

User-facing text keeps its product language, and the locale files are the source:

- New UI strings go into all four files in `frontend/app/locales/` (`zh`, `en`, `ja`, `ko`), and components read them through `t()`.
- README translations (`README.zh-CN.md`, `README.ja.md`, `README.ko.md`) keep their language.
- `backend/workspace/prompts/` pairs a Chinese base file with `.en` / `.ja` / `.ko` variants; `backend/workspace/skills/**` stays Chinese, since `src/agents/language.ts` appends the target-language directive at request time.

Git text is English: commit messages, branch names, and pull request bodies.

## Project Overview

Huobao Drama (火宝短剧) is an all-in-one tool for AI short dramas and comic dramas. The stack is all TypeScript: novel → script rewrite → asset extraction → image generation → storyboard breakdown → video generation → FFmpeg merge. It ships as an Electron desktop app (macOS dmg) and as a server deployment.

## Structure

```
backend/   — Hono + Drizzle ORM (better-sqlite3) + Mastra (AI agents)
backend/workspace/ — agent working directory (Mastra Workspace jail root)
backend/workspace/skills/ — Agent SKILL.md definitions (editable in Settings)
frontend/  — Nuxt 3 + Vue 3 + TypeScript, ssr:false (plain CSS, no UI framework)
desktop/   — Electron app: main process + esbuild bundling scripts + electron-builder config
data/      — SQLite database (huobao.sqlite3) + generated static files (static/)
configs/   — legacy dead config, zero code references
```

## Commands

Dependencies are not vendored. Install once with `.agents/skills/verify-hidrama/helpers/app.sh install`; a plain `npm install` in `backend/` or `frontend/` fails, because the committed lockfiles resolve tarballs to a private registry that answers 401.

### Backend (`backend/`)
- `npm run dev` — tsx watch dev server (port 5679)
- `npm start` — tsx production start
- `npm run typecheck` — TypeScript type check
- `npm run backfill-artwork` — backfill thumbnails and poster frames for existing images and videos

### Frontend (`frontend/`)
- `npm run dev` — Vite dev server (port 3013, proxies /api and /static to 5679)
- `npm run generate` — static site with an index.html (`.output/public`). `nuxt build` emits no index.html and cannot serve static hosting

### Desktop (`desktop/`; root `npm run dist` chains the whole flow)
- `npm run dev` — bundle the backend, then open the Electron window
- `npm run build:backend` — esbuild bundles backend/src → build/backend.mjs (ESM; externals: sharp/better-sqlite3/ffmpeg-static/ffprobe-static)
- `npm run build:main` — bundle the main process → dist/main.js
- `npm run rebuild:native` — rebuild better-sqlite3 against the Electron ABI. Run it after any native-module ABI change; postinstall already does it
- `npm run dist` — prepare-resources + electron-builder → arm64/x64 dmg in release/
- `npm run dist:win` — cross-build the Windows NSIS installer (win-x64). The Windows ffmpeg.exe caches in build/win-bin/; the script prints the download URL when it is missing

## Architecture

### Backend
- **HTTP**: Hono (entry `src/index.ts`); routes mount under `/api/v1`; `/static` serves DATA_ROOT; production serves the built frontend directory
- **Database**: SQLite (better-sqlite3 + WAL); `SQLITE_PATH` overrides the database file location; the DDL in `src/db/sqlite-schema.ts` replays idempotently at startup; Drizzle table definitions in `src/db/schema.ts` (sqlite-core)
- **Path anchor**: `src/utils/paths.ts` resolves DATA_ROOT and STORAGE_ROOT in one place. The Electron main process injects `HUOBAO_DATA_DIR`/`SQLITE_PATH`/`WORKSPACE_PATH`/`FRONTEND_DIST`/`FFMPEG_BIN`/`FFPROBE_BIN`; dev uses repo-relative defaults
- **AI Agents**: Mastra with four agents (script_rewriter / extractor / storyboard_breaker / prompt_generator). Instructions assemble per request from `workspace/prompts/*.md` plus skills, and the model resolves per request. A fetch patch chain adapts domestic relay services (thinking off / temperature / max_tokens)
- **Media generation**: `services/generation.ts` owns the task lifecycle (sys_task table) behind an adapter pattern — images: openai/gemini/volcengine, videos: volcengine/minimax
- **Video merge**: `services/ffmpeg-merge.ts`. FFmpeg binaries are bundled through ffmpeg-static and overridable with `FFMPEG_BIN`/`FFPROBE_BIN`

### Frontend
- Nuxt 3 SPA. Dynamic routes register by hand in `nuxt.config.ts` through the `pages:extend` hook (views/drama/)
- `app/composables/useApi.ts` is the single fetch client (relative paths only; same origin as the backend in production)
- The core workbench is `app/views/drama/episode.vue` (script → production → export pipeline)

### Desktop
- Main process `desktop/src/main.ts`: single-instance lock → free port → userData preparation (workspace template copy-once + `.template-version` marker) → `utilityProcess.fork` backend → health polling → BrowserWindow
- userData: packaged `~/Library/Application Support/HuobaoDrama/`, dev `HuobaoDrama-Dev/`. The two never interfere
- The backend bundle sits inside the asar. Externals resolve through the asar node_modules, and .node files redirect to unpacked automatically

## Database
SQLite single file (default `data/huobao.sqlite3`; userData in the desktop app). `initSqliteSchema` creates tables idempotently at startup and seeds style presets. One-time MySQL→SQLite migration: `cd backend && npx tsx scripts/import-mysql-to-sqlite.ts [--force]`, which validates per-table row counts and backs up before it writes.

## Key Config
- AI service configuration lives in the database (`ai_service_configs`), maintained in Settings, never in config files
- The full environment-variable set is in the README's environment variables section
- `configs/config.yaml` is dead config with zero code references
- `PUBLIC_BASE_URL` gives Seedance a public address for local reference material. The desktop app cannot provide one, and reports a Chinese error when the feature is used

## OpenWiki

This repository has documentation located in the /openwiki directory.

Start here:
- [OpenWiki quickstart](openwiki/quickstart.md)

OpenWiki includes repository overview, architecture notes, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

When working in this repository, read the OpenWiki quickstart first, then follow its links to the relevant architecture, workflow, domain, operation, and testing notes.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues on the origin fork (`infra-soulmate/hidrama`), managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles map to label strings of the same name (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Verification

`verify-hidrama` starts the backend and frontend against an isolated database and drives the real UI and HTTP API to prove a change, capturing screenshots and server-side read-backs. Reach for it whenever you need to run the app or prove a user-facing behaviour. See `.agents/skills/verify-hidrama/SKILL.md`.
