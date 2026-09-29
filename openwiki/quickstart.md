# Huobao Drama — OpenWiki

Huobao Drama (火宝短剧) is an end-to-end AI short-drama production tool. One episode flows from raw novel text to an exported MP4: script rewrite → asset extraction → AI image generation → storyboard breakdown → AI video generation → FFmpeg stitching.

This wiki explains how the system works and why. Read it before you change code.

## The system in one screen

```
frontend/   Nuxt 3 + Vue 3 SPA (pure CSS, no UI framework)   → browser UI
backend/    Hono + Drizzle + better-sqlite3 + Mastra agents  → HTTP API + AI orchestration
desktop/    Electron shell (main process + esbuild bundle)   → macOS dmg / Windows exe
docker/     entrypoint for server/Docker deployment
data/       SQLite database + generated static files         → runtime data root
backend/workspace/  Agent prompts (prompts/) and skills (skills/)   → editable config
```

The backend serves both the API and the built frontend from the same origin. The frontend uses only relative URLs, so there is no CORS problem in production. In dev the frontend proxies `/api` and `/static` to the backend.

## Run it

### Server (development)

```bash
cd backend && npm install && npm run dev     # port 5679
cd frontend && npm install && npm run dev     # port 3013, proxies to 5679
```

Open `http://localhost:3013`. Add an AI service in Settings before you generate anything.

### Desktop

```bash
cd desktop && npm install && npm run dev      # bundles backend, then opens Electron
```

From the repo root, `npm run dist` runs the whole desktop release chain.

### Production build

```bash
cd frontend && npm run generate               # .output/public — required for static hosting
```

`npm run build` (nuxt build) does not emit `index.html`, so a static host cannot serve it. Use `generate`.

## The five-minute mental model

The domain is a hierarchy. A **project (drama)** holds **episodes**. Each episode links to **characters**, **scenes**, and **props** — collectively called **assets**. An episode is split into **storyboards** (分镜), each storyboard is one video-generation task. Four AI **agents** own four jobs: rewrite, extract, break down, write prompts.

Generation is asynchronous. The backend writes a row to the `sys_task` table, calls the provider, polls, downloads the file, and writes the result back to the business table. The frontend polls the task row.

## Where to go next

| I want to… | Read |
|---|---|
| Understand the big picture | [architecture/overview.md](architecture/overview.md) |
| Work on the HTTP API | [architecture/backend.md](architecture/backend.md) |
| Work on the workbench UI | [architecture/frontend.md](architecture/frontend.md) |
| Work on the Electron shell | [architecture/desktop.md](architecture/desktop.md) |
| Understand tables and relations | [architecture/data-model.md](architecture/data-model.md) |
| Follow one episode end to end | [workflows/production-pipeline.md](workflows/production-pipeline.md) |
| Change an AI agent | [workflows/ai-agents.md](workflows/ai-agents.md) |
| Add or change a model provider | [workflows/media-generation.md](workflows/media-generation.md) |
| Understand the FFmpeg export | [workflows/merge-and-export.md](workflows/merge-and-export.md) |
| Learn the vocabulary | [domain/concepts.md](domain/concepts.md) |
| Configure AI services and env vars | [operations/configuration.md](operations/configuration.md) |
| Ship the app | [operations/deployment.md](operations/deployment.md) |
| Set up a dev machine | [operations/development.md](operations/development.md) |

## Non-obvious invariants

These catch new contributors. Each one is explained in its page.

1. **`utils/paths.ts` is the only path anchor.** Everything resolves `DATA_ROOT`/`STORAGE_ROOT` through it. Never build data paths elsewhere. See [architecture/overview.md](architecture/overview.md).
2. **Generation writes back to business tables, not to the task table alone.** A completed image task updates the character, scene, prop, or storyboard row. See [workflows/media-generation.md](workflows/media-generation.md).
3. **The agent never exposes raw file paths to the model.** Tools read and write the database through Mastra `RequestContext`, which carries `episodeId` and `dramaId` per request. See [workflows/ai-agents.md](workflows/ai-agents.md).
4. **A processing task does not survive a restart.** Startup marks every `processing` row as `failed`, because in-memory pollers die with the process. See [architecture/backend.md](architecture/backend.md).
5. **Episode resolution and config locks are captured at episode creation.** A storyboard's video task uses the episode's locked config and resolution unless the request overrides them. See [architecture/backend.md](architecture/backend.md).
