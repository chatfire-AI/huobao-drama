# Backend

The backend is one Hono application in `backend/src/index.ts`. It serves the JSON API under `/api/v1`, generated files under `/static`, and the built frontend for every other path.

## Entry and middleware order

`backend/src/index.ts` mounts middleware in this order, and the order is load-bearing:

```ts
app.use('*', cors({ origin: ['http://localhost:3013', 'http://localhost:5679'], credentials: true }))
app.use('*', requestLogger)
app.use('*', errorHandler)
```

CORS lists only the two dev origins. Production and desktop are same-origin, so they do not need an entry. `errorHandler` wraps `next()` and converts any thrown error into `{ code, message }` with the error's status or 500 (`backend/src/middleware/logger.ts`). `requestLogger` prints method, path, status, elapsed time, and a truncated request body — but only for `POST`, `PUT`, and `PATCH`.

After the API routes, the app serves static files and the frontend:

```ts
app.use('/static/*', ...immutable cache header)
app.use('/static/*', serveStatic({ root: DATA_ROOT }))
const distPath = process.env.FRONTEND_DIST || path.join(projectRoot, 'frontend', 'dist')
app.use('*', serveStatic({ root: distPath }))
app.get('*', serveStatic({ root: distPath, path: 'index.html' }))
```

The last line is the SPA fallback. `FRONTEND_DIST` is injected by the desktop main process; in Docker it is `/app/frontend-dist`.

## Startup work

Two things happen before `serve()`:

1. `db/index.ts` imports and runs the schema on module load: `initSqliteSchema(sqlite)` replays idempotent DDL and seeds style presets. It then runs the optional one-time MySQL import when MySQL is configured and the SQLite file is empty.
2. A sweep marks every `processing` task as `failed` with the message "服务重启，生成任务中断，请重试".

The sweep exists because pollers live in memory. After a restart no poller can finish a task, so the row would otherwise show "generating" forever.

## Route map

| Mount | File | Responsibility |
|---|---|---|
| `/api/v1/dramas` | `routes/dramas.ts` | Project CRUD, list with counts, `/stats` |
| `/api/v1/episodes` | `routes/episodes.ts` | Episode CRUD, linked assets, storyboards, extraction, video-prompt batch, pipeline status |
| `/api/v1/storyboards` | `routes/storyboards.ts` | Storyboard CRUD with binding validation |
| `/api/v1/scenes` | `routes/scenes.ts` | Scene CRUD, prompt and image generation |
| `/api/v1/characters` | `routes/characters.ts` | Character CRUD, prompt and image generation, batch images |
| `/api/v1/props` | `routes/props.ts` | Prop CRUD, prompt and image generation |
| `/api/v1/tasks` | `routes/tasks.ts` | Create and poll image/video generation tasks |
| `/api/v1/merge` | `routes/merge.ts` | Episode video stitching and merge history |
| `/api/v1/upload` | `routes/upload.ts` | Image, video, audio file upload |
| `/api/v1/ai-configs`, `/ai-providers` | `routes/aiConfigs.ts` | AI service config CRUD, test probe, provider presets |
| `/api/v1/settings` | `routes/settings.ts` | Content language, tour-seen flags |
| `/api/v1/skills` | `routes/skills.ts` | Skill file CRUD |
| `/api/v1/prompts` | `routes/prompts.ts` | Agent prompt file CRUD |
| `/api/v1/agent` | `routes/agent.ts` | Non-streaming agent chat |
| `/api/v1/style-presets` | `routes/stylePresets.ts` | Visual style presets |
| `/api/v1/storage` | `routes/storage.ts` | Storage location and disk usage |
| `/api/v1/server-update` | `routes/serverUpdate.ts` | Version check and Watchtower trigger |
| `/api/v1/health` | `index.ts` | Health probe with `HUOBAO_VERSION` |

## Episode sub-resources

`routes/episodes.ts` carries most of the pipeline API:

- `GET /:id/characters`, `/:id/scenes`, `/:id/props` — assets linked to the episode through join tables.
- `GET /:episode_id/storyboards` — storyboards with ordered character and prop bindings and the full asset objects.
- `POST /:id/extract` — start an async extraction for one target (`characters`, `scenes`, or `props`). Returns immediately.
- `GET /:id/extract-status` — per-target extraction state.
- `POST /:id/generate-video-prompts` — start the async video-prompt batch.
- `GET /:id/video-prompts-status` — batch progress.
- `GET /:id/pipeline-status` — the seven pipeline steps and their state.
- `GET /:id/generation-tasks` — tasks and merges belonging to this episode.

`generation-tasks` needs attention. `sys_task` has no `episode_id` column, so the handler re-derives membership: it collects the episode's storyboard ids, scene ids (including legacy `scenes.episode_id` links), character ids, and all props of the drama, then keeps tasks whose foreign key belongs to one of those sets (`routes/episodes.ts`).

## Episode creation locks configuration

`POST /episodes` captures two values at creation time:

```ts
const imageConfigId = body.image_config_id ?? await getActiveConfigId('image')
const videoConfigId = body.video_config_id ?? await getActiveConfigId('video')
```

If no active config exists for either type the request fails with an actionable message. The episode also stores a `resolution` restricted to `480p`, `720p`, or `1080p`.

Later, `POST /tasks` resolves the config in this order (`routes/tasks.ts`):

1. `body.config_id` when the request names one (the workbench model dropdown).
2. Else the episode lock (`episode.image_config_id` or `episode.video_config_id`).
3. Else the currently active config.

The comment in the file explains the reason: a request that selects a MiniMax model must not be sent through a Seedance-locked config. The request-level choice wins.

The episode resolution overrides a request-level resolution for video tasks, again unless the caller is explicit.

## Validation that protects the model

`POST /tasks` normalizes both the project's flat request shape and the official Wan 3.0 `input.media` shape, then validates limits per provider:

- Non-Aliyun: at most 9 reference images, 3 reference videos, 3 reference audios; audio requires at least one image or video.
- Aliyun Wan 3.0: at most 10 images, 5 videos, 5 audios, 20 media items total; last frame requires first frame; `file` and `link` are mutually exclusive; first/last frame cannot mix with reference media.
- Every request needs either a prompt or at least one reference file.

`routes/storyboards.ts` enforces a second rule: a storyboard may bind only a scene, characters, and props that the episode already links to. The agent tools relax this and auto-link assets of the same drama, but the HTTP route rejects foreign ids. See [workflows/ai-agents.md](../workflows/ai-agents.md).

## Error handling conventions

Route handlers catch errors and return `badRequest(c, err.message)` for expected failures. `errorHandler` catches the rest. Messages are written for the end user in Chinese, and several are explicitly actionable — for example the merge route tells the user to reinstall `node_modules` or set `FFMPEG_BIN` when ffmpeg is unavailable.

## Non-obvious details

- `GET /dramas/stats` is registered before `GET /dramas/:id` so the literal path is not captured as an id.
- Deletes are soft: the handler writes `deleted_at` and list queries filter `isNull(deletedAt)`. `storyboards`, `storyboard_characters`, and `storyboard_props` are hard-deleted.
- `/storage` caches disk usage for 60 seconds and recomputes in the background (stale-while-revalidate) because walking the data directory is expensive. A warmup timer runs 10 seconds after boot.
- The text-model fetch patch chain lives in `agents/index.ts`; see [workflows/ai-agents.md](../workflows/ai-agents.md) for the thinking-off, temperature, and max-tokens patches.

## Related pages

- [architecture/data-model.md](data-model.md) — the tables these routes read
- [workflows/media-generation.md](../workflows/media-generation.md) — the task lifecycle behind `POST /tasks`
- [workflows/merge-and-export.md](../workflows/merge-and-export.md) — the merge route internals
