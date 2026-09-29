# Architecture overview

Huobao Drama is a monorepo with four deployable shapes that share one backend and one frontend build.

## Deployable shapes

| Shape | Entry point | Serves frontend | Data location |
|---|---|---|---|
| Dev server | `backend/src/index.ts` (tsx watch, port 5679) + `frontend` Vite dev (3013) | Vite dev server, proxies `/api` and `/static` | repo `data/` |
| Server / Docker | same backend via tsx, port 5679 | backend serves `FRONTEND_DIST` static files | `HUOBAO_DATA_DIR` (Docker: `/app/data`) |
| Desktop (packaged) | `desktop/src/main.ts` forks `build/backend.mjs` in a `utilityProcess` | backend serves `resources/frontend` | userData `~/Library/Application Support/HuobaoDrama/data` |
| Desktop (dev) | same, but frontend dist comes from `frontend/.output/public` | backend | `HuobaoDrama-Dev/data` |

Source: `backend/src/index.ts`, `desktop/src/main.ts`, `Dockerfile`.

## Process and layering

```
Browser (Nuxt SPA)
   │  fetch /api/v1/*  (relative, same origin)
   ▼
Hono app (backend/src/index.ts)
   │  cors → requestLogger → errorHandler → /api/v1 routes
   ▼
Route layer (routes/*.ts)         validation, snake_case mapping, response envelope
   ▼
Service layer (services/*.ts)     AI config, generation lifecycle, extraction, merge, style
   ▼
Agent layer (agents/, mastra/)    Mastra agents + tools (writes DB directly)
   ▼
Data layer (db/)                  Drizzle ORM over better-sqlite3 + idempotent DDL
```

The desktop shell adds one process above the backend: Electron main forks the backend bundle, waits for health, then opens a `BrowserWindow` pointed at `http://127.0.0.1:<port>`. The backend and the window share an origin, so the frontend needs no base URL.

## The single path anchor

`backend/src/utils/paths.ts` resolves two constants and nothing else resolves data paths:

```ts
export const DATA_ROOT = process.env.HUOBAO_DATA_DIR
  ?? (process.env.STORAGE_PATH
    ? path.dirname(path.resolve(process.env.STORAGE_PATH))
    : path.join(repoRoot, 'data'))

export const STORAGE_ROOT = process.env.STORAGE_PATH ?? path.join(DATA_ROOT, 'static')
```

Why it exists: in dev, `__dirname`-relative resolution points at the repo. In the packaged desktop app the backend bundle lives inside `app.asar`, which is read-only, so all writes must land outside the archive. The Electron main process injects `HUOBAO_DATA_DIR` to redirect them. `SQLITE_PATH` and `WORKSPACE_PATH` are injected the same way.

`STORAGE_PATH` keeps its legacy meaning: it overrides only the static storage root, and its parent directory becomes the data root when `HUOBAO_DATA_DIR` is absent.

## Request and response contract

Every API route returns the same envelope:

```json
{ "code": 200, "data": { }, "message": "success" }
```

Helpers live in `backend/src/utils/response.ts`. The frontend client unwraps `json.data ?? json` in `frontend/app/composables/useApi.ts`.

The database uses camelCase columns through Drizzle. Routes convert to snake_case before responding with `toSnakeCase` / `toSnakeCaseArray` (`backend/src/utils/transform.ts`). The comment says this keeps compatibility with an older Go backend. That is why frontend payloads use `drama_id`, `episode_id`, `final_prompt`, and similar names, while server code uses `dramaId`, `episodeId`, `finalPrompt`.

## Static file serving

The backend serves `DATA_ROOT` at `/static/*` with `Cache-Control: public, max-age=31536000, immutable` (`backend/src/index.ts`). This is safe because generated files are named with a UUID and never change. Thumbnails and poster frames are derived by name convention, so the frontend can predict their URLs without an API call — see [workflows/media-generation.md](../workflows/media-generation.md).

## Where state lives

| State | Storage | Lifetime |
|---|---|---|
| Business data (dramas, assets, storyboards) | SQLite tables | persistent |
| Generation tasks | `sys_task` table | persistent row, in-memory poller |
| Extraction / video-prompt batch status | in-memory `Map` in services | lost on restart |
| AI provider configs | `ai_service_configs` table | persistent |
| Agent prompts and skills | `backend/workspace/` files | persistent, user-editable |
| UI preferences (model choice, panel, column widths) | browser `localStorage` | per browser |
| Global content language, tour flags | `app_settings` table | persistent |

The split matters for debugging: a task status that disappears after a restart is expected for extraction batches, and the startup sweep converts interrupted `processing` tasks to `failed`.

## Design decisions worth knowing

**One generation lifecycle for images and videos.** `services/generation.ts` handles both task types through provider adapters and one `sys_task` table. The type discriminator is `sys_task.type`. This avoids two parallel pollers and two status vocabularies.

**Config in the database, not in files.** AI keys, base URLs, and model lists live in `ai_service_configs`. The Settings page is the only writer. `configs/config.yaml` exists but no code reads it.

**Prompts and skills as files.** Agent instructions are files under `backend/workspace/`, not string constants. The Settings page edits them through a jailed Mastra `Workspace` filesystem. Code defaults exist only as a fallback. See [workflows/ai-agents.md](../workflows/ai-agents.md).

**Adapters per provider.** Each image or video provider implements one interface, so adding a provider means adding one file and one registry line. See [workflows/media-generation.md](../workflows/media-generation.md).

## Related pages

- [architecture/backend.md](backend.md) — routes, middleware, error handling
- [architecture/frontend.md](frontend.md) — pages, workbench, composables
- [architecture/desktop.md](desktop.md) — Electron main process, the fork/bootstrap sequence
- [architecture/data-model.md](data-model.md) — tables and relationships
