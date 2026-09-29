# Development

## Prerequisites

- Node.js 20 or later (the Docker images use `node:20`, and the desktop bundles target `node20`).
- No database server. SQLite is embedded.
- No system FFmpeg. The binaries come from `ffmpeg-static` and `ffprobe-static`, or from `FFMPEG_BIN`/`FFPROBE_BIN`.

## Repository layout

```
backend/    Hono API, Mastra agents, Drizzle schema, workspace prompts and skills
frontend/   Nuxt 3 SPA
desktop/    Electron shell, esbuild scripts, electron-builder config
docker/     container entrypoint
data/       runtime database and generated files (gitignored)
docs/       README screenshots
```

## Commands

### Root

| Command | Effect |
|---|---|
| `npm run dev:backend` | Backend watch mode on 5679 |
| `npm run dev:frontend` | Frontend dev server on 3013 |
| `npm run dev:desktop` | Bundle backend, bundle main, open Electron |
| `npm run build:frontend` | `nuxt generate` |
| `npm run dist` | Full desktop release |

### Backend (`backend/`)

| Command | Effect |
|---|---|
| `npm run dev` | `tsx watch src/index.ts` |
| `npm start` | `tsx src/index.ts` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run backfill-artwork` | Generate missing thumbnails and poster frames for existing files |

`npm run build` exists but its output is not the production path. The source uses extensionless bundler-style imports, so compiled `tsc` output cannot run directly under Node. Both Docker and the desktop app use `tsx` or an esbuild bundle.

`backfill-artwork` is safe to re-run. It scans `static/images` for missing `_thumb.webp` files and `static/videos` and `static/merged` for missing `_poster.jpg` files, and skips what already exists.

### Frontend (`frontend/`)

| Command | Effect |
|---|---|
| `npm run dev` | Nuxt dev server on 3013, proxying `/api` and `/static` to 5679 |
| `npm run generate` | Static site into `.output/public` |

### Desktop (`desktop/`)

| Command | Effect |
|---|---|
| `npm run build:backend` | esbuild bundle to `build/backend.mjs` |
| `npm run build:main` | esbuild bundle to `dist/main.js` and `dist/preload.js` |
| `npm run rebuild:native` | Rebuild `better-sqlite3` for the Electron ABI |
| `npm run dev` | Bundles and opens Electron |
| `npm run dist`, `npm run dist:win` | Platform packages |
| `npm run feed`, `npm run publish` | Manifest and release upload |

Run `rebuild:native` whenever the Electron version changes, because the native module ABI changes with it. The `postinstall` hook does it automatically.

## Tests

Structural tests live in `frontend/tests/`. Each file reads a source file as text and asserts on its content. They require no build and no browser.

**They are currently broken.** Verified state:

```
apple-light-theme-structure        0 pass / 1 fail
asset-library-structure            0 pass / 4 fail
button-system-structure            0 pass / 1 fail
episode-create-dialog-structure    0 pass / 4 fail
model-selection-structure          0 pass / 1 fail
official-provider-settings         3 pass / 2 fail
professional-redesign-surface      0 pass / 1 fail
project-launcher-structure         0 pass / 5 fail
remove-audio-voice-structure       0 pass / 1 fail
remove-grid-feature-structure      0 pass / 1 fail
style-preset-structure             1 pass / 2 fail
video-direct-generation-config     2 pass / 1 fail
```

Run one with `node --test tests/<file>.test.mjs`. Note that `node --test tests/` does not work in this project; pass the file path.

The root cause is path drift. The tests read the old page paths, for example `app/pages/drama/[id]/episode/[episodeNumber].vue`, but the dynamic routes moved to `app/views/drama/episode.vue` when the `pages:extend` hook was introduced. See [architecture/frontend.md](../architecture/frontend.md). The `read` helper throws on a missing file, so every assertion in the file fails.

If you touch the frontend, either fix the paths in the affected test files or leave them alone. Do not treat a passing count as a signal — it currently is not one.

There are no backend tests.

## Type checking

`cd backend && npm run typecheck` is the only static check in the repo. Run it before you commit backend changes. The configuration is `strict: true` with `moduleResolution: bundler`.

## Conventions

**Comments are Chinese in the backend and desktop code, mixed in the frontend.** Backend comments carry a lot of design rationale — why a patch exists, why a guard is present. Read them before you change the code around them. When you add a non-obvious decision, add a comment explaining the reason, not the mechanism.

**The API speaks snake_case; the code speaks camelCase.** Routes convert with `toSnakeCase` before responding. If you add a route, follow that conversion. See [architecture/backend.md](../architecture/backend.md).

**Every response uses the envelope.** `{ code, data, message }` through the helpers in `utils/response.ts`. Do not return a bare object.

**User-visible errors are actionable Chinese sentences.** Several existing messages tell the user exactly what to do, such as setting `PUBLIC_BASE_URL` or reinstalling `node_modules`. Follow that pattern: say what failed and what to do next.

**Frontend UI strings are i18n keys.** Add them to all four locale files. Do not hard-code visible text.

## Common change recipes

### Add a video or image provider

1. Add an adapter file under `backend/src/services/adapters/` implementing the interface in `types.ts`.
2. Register it in `registry.ts`.
3. Add the provider name to `officialProviders` in `services/ai.ts`, or the config will be ignored.
4. Add the provider to the `providers` array and, if useful, to `providerPresets` in `frontend/app/pages/settings.vue`.

See [workflows/media-generation.md](../workflows/media-generation.md).

### Add a database column

1. Add the statement to `sqliteSchemaStatements` in `backend/src/db/sqlite-schema.ts` as an `ALTER TABLE`. The `CREATE TABLE` statement is not re-applied to an existing database.
2. Add the field to the matching table in `backend/src/db/schema.ts`.
3. If the field must be exposed, map it in the relevant route.

There is no migration framework and no version table.

### Change an agent prompt

Edit `backend/workspace/prompts/<agent_type>.md`, or edit it in the Settings page. Both edit the same file.

If you add a new prompt file or change the shipped prompts, bump `TEMPLATE_VERSION` in `desktop/src/main.ts`. Desktop installs overwrite `prompts/` only on a version change. See [architecture/desktop.md](../architecture/desktop.md).

If you change the fallback for a missing prompt file, update `DEFAULT_PROMPTS` in `backend/src/agents/index.ts` too. The two must not diverge.

### Add a language

A content language needs more than a locale file:

1. Add the code to `CONTENT_LANGUAGES` in `services/app-settings.ts`.
2. Add the native name to `LANGUAGE_NATIVE_NAMES` in `agents/language.ts`.
3. Add the code to `LANGS` in `routes/prompts.ts` and `routes/skills.ts`.
4. Add the locale JSON in `frontend/app/locales/` and register it in `composables/i18n.ts` and `UI_LOCALES`.
5. Add optional prompt and skill variants. Missing variants fall back to Chinese by design.

### Change the workspace template

Edit files under `backend/workspace/`. Then bump `TEMPLATE_VERSION` in `desktop/src/main.ts` for packaged installs, and remember the Docker entrypoint copies the template only when no version marker exists.

## Debugging

### Request log

`middleware/logger.ts` prints one line per request with method, path, status, and elapsed time in color, plus a truncated body for writes. It is always on.

### Task log

`utils/task-logger.ts` prints structured events for generation and agents: `logTaskStart`, `logTaskProgress`, `logTaskPayload`, `logTaskSuccess`, `logTaskWarn`, `logTaskError`. Payloads are sanitized and truncated, and `redactUrl` masks API keys in query strings.

Useful events when a generation fails:

| Event | Meaning |
|---|---|
| `AIConfig active-config-selected` / `config-by-id-selected` | Which config was used, and which model |
| `ImageTask request payload` | The exact body sent to the provider |
| `ImageTask response payload` | The provider's raw response |
| `ImageTask poll-retry` | A transient poll failure that did not end the task |
| `AIConfig text-model-endpoint` | The resolved text provider, base URL, and model |
| `Extract <target>-step` | Which tools the extraction agent called per step |
| `VideoPrompt batch-shot` | Per-storyboard batch progress |

The log for a request carries the task id, so you can follow one task from `enqueue` to `downloaded`.

### Common failure signatures

| Symptom | Likely cause |
|---|---|
| "未配置图片模型" or "未配置视频模型" | No active official config for that service type |
| Task stuck at `processing` then `failed` after restart | The process restarted and the startup sweep marked it failed |
| "参考视频为本地路径 … 未配置 PUBLIC_BASE_URL" | Video generation with local video, audio, or file references on a deployment with no public URL |
| Agent finishes with no tool call | Output token truncation, or a thinking-mode relay rejecting the loop. Check `AI_MAX_TOKENS` and the thinking-off patches |
| Merge says ffmpeg is unavailable | `node_modules` copied across platforms, or a corrupted static download |
| Gemini refuses a tool call citing organization policy | An old workspace `SKILL.md` or a filesystem instruction exposing the "workspace" word |

## Related pages

- [operations/configuration.md](configuration.md) — settings and environment variables
- [operations/deployment.md](deployment.md) — building and releasing
- [architecture/overview.md](../architecture/overview.md) — the layering you are editing
