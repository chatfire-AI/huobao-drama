# Media generation

Image and video generation share one lifecycle, one table, and one service. Providers differ only through adapters.

## The lifecycle

`services/generation.ts` implements this path for both task types:

```
create row (processing) → adapter builds request → fetch provider → sync result or poll
    → download to local storage → write back to the business table
```

`generateImage` and `generateVideo` validate the config, create a `sys_task` row through `createTask`, and return the task id immediately. The caller never waits.

`createTask` writes the row and then starts `processTask` without awaiting it. A failure updates the row to `failed` with the error message.

## Config resolution

Both entry points resolve the config the same way:

```ts
const config = params.configId
  ? (await getConfigById(params.configId)) ?? await getActiveConfig(type)
  : await getActiveConfig(type)
```

An explicit config id wins. If that config was deleted, disabled, or its provider is no longer supported, the code falls back to the active config instead of failing. The comment gives the reason: an episode lock must not permanently block generation after a provider change.

`getActiveConfig` filters to active rows whose provider is official for the service type, then sorts by priority descending. The model is the first element of the `model` JSON array.

Official providers (`services/ai.ts`):

```ts
text:  openai, gemini, volcengine
image: openai, gemini, volcengine
video: volcengine, minimax, aliyun
```

A row with any other provider is ignored, so a leftover legacy row cannot be selected.

## Polling profiles

```ts
const POLL_PROFILES = {
  image: { attempts: 120, intervalMs: 5000,  maxDurationMs: 600_000 },
  video: { attempts: 300, intervalMs: 10_000, maxDurationMs: null },
}
```

Images poll for up to 10 minutes. Videos poll for up to about 50 minutes with no hard duration cap. Each poll request uses `AbortSignal.timeout(remainingMs)`, so the last attempt cannot outlive the image budget.

Polling behavior:

- `completed` → download, or for Gemini extract base64.
- `failed` → fail immediately. The comment notes this is a terminal state such as a content-moderation block; retrying is pointless.
- Any thrown error in a non-final attempt logs a warning and continues. The final attempt fails the task.
- A non-OK HTTP response is skipped rather than fatal, so a transient 5xx does not kill the task.

## Sync and async responses

The adapter's `parseGenerateResponse` decides:

- `{ isAsync: true, taskId }` → poll.
- `{ isAsync: false, imageUrl }` or `{ videoUrl }` → finish immediately.
- For an image with no URL, `extractImageBase64` handles providers that return inline base64. Gemini uses this path.

Base64 handling differs at completion: `handleImageComplete` downloads a URL, `handleImageCompleteBase64` writes the bytes. Both then generate a thumbnail.

## Local storage layout

`utils/storage.ts` writes everything under `STORAGE_ROOT` with UUID names and returns a relative path such as `static/images/<uuid>.png`.

```
static/images/<uuid>.png           generated and uploaded images
static/images/<uuid>_thumb.webp    list thumbnail, 400 px wide
static/videos/<uuid>.mp4           generated videos
static/videos/<uuid>_poster.jpg    poster frame at 0.5 s, 640 px wide
static/merged/<uuid>.mp4           episode exports
static/uploads/<uuid>.<ext>        user-uploaded images, videos, and audio
static/temp/                       concat list files, deleted after use
```

`downloadFile` derives the extension from the URL path and defaults to `.bin`. `saveUploadedFile` keeps the original extension.

Thumbnails and posters use name conventions, not database rows. `thumbPathFor` and `posterPathFor` replace the extension with `_thumb.webp` and `_poster.jpg`. The frontend can therefore construct the thumbnail URL from the image URL without an API call, and the static route marks all `/static` content immutable so the browser caches it forever. See [architecture/overview.md](../architecture/overview.md).

Both derivations are best-effort. A failure logs a warning and does not fail the task.

## FFmpeg safety

`utils/ffmpeg.ts` probes the binaries before use with `spawn -version`. The header explains why: on Windows, a `node_modules` copied across platforms or a corrupted `ffmpeg-static` download produces a non-PE file, and spawning it throws `EFTYPE` synchronously inside fluent-ffmpeg's deferred callback, which crashes the Node process and cannot be caught by an outer `try/catch`.

Results are cached on success only. A failed probe is not cached, so fixing the binary recovers without a restart. When ffmpeg is unavailable, poster extraction returns null and merge fails with an actionable message.

Resolution order for the binaries: `FFMPEG_BIN`/`FFPROBE_BIN` first, then the `ffmpeg-static`/`ffprobe-static` packages. The desktop bundle excludes those packages and relies on the environment variables.

## Reference material normalization

Providers need different reference formats, so `generation.ts` converts everything before the adapter sees it.

- **Reference images** — local `static/...` paths and remote `https://` URLs are both read and compressed to a data URL with `maxWidth: 768`, `maxHeight: 768`, `quality: 68`. Duplicates are removed and the list is capped at 6.
  - Data URLs are needed by two consumers: OpenAI image edits upload a multipart form, and Gemini inlines base64. One representation serves both.
  - A failed conversion logs a warning and drops that reference instead of failing the task.
- **Video, audio, and file references** — these are too large to inline, so they must be publicly reachable. `resolvePublicMediaUrl` returns `http`, `https`, and `data:` values unchanged and rewrites local `static/...` paths with `PUBLIC_BASE_URL`.
  - When a local path is used and `PUBLIC_BASE_URL` is unset, it throws a Chinese error naming the file and telling the user to set the variable or use a public URL. The error lands in `error_msg` and reaches the UI.
  - This is a real limitation for the desktop app, which has no public entry point. Text-to-video and image generation are unaffected.

Video resolution is stored internally as `480p`, `720p`, `1080p`, or `2K`. Each adapter converts to its provider's casing and enum.

## Writing results back

`writeBackImageAssets` maps a completed image task to the right column by foreign key and `frameType`:

| Task key | Target |
|---|---|
| `storyboardId` + `frameType: 'first_frame'` | `storyboards.first_frame_image` |
| `storyboardId` + `frameType: 'last_frame'` | `storyboards.last_frame_image` |
| `storyboardId` (default) | `storyboards.composed_image` |
| `characterId` | `characters.image_url` |
| `sceneId` | `scenes.image_url` and `scenes.status = 'completed'` |
| `propId` | `props.image_url` |

Video completion sets the storyboard's `video_url` and `duration`.

This is why the frontend never needs to read `sys_task` for display data. It polls the task for progress and reads the business row for the result.

## Provider adapters

`services/adapters/registry.ts` maps provider names to adapter instances. One interface per media type, five methods each: build request, parse response, build poll request, parse poll response, extract result.

Adding a provider means adding one file and one registry line.

### Image adapters

| Adapter | Endpoint | Notes |
|---|---|---|
| `openai` | `/v1/images/generations`, `/v1/images/edits` | With references it uses `edits` as `multipart/form-data`; without, plain JSON. `gpt-image-2` accepts arbitrary sizes rounded to a multiple of 16 within 256–4096; other `gpt-image-*` snap to one of three aspect presets |
| `gemini` | `/v1beta/interactions` or `:generateContent` | Gemini 3 image models on the official host use the `interactions` endpoint. Relay services usually have not enabled it, so the adapter detects a non-official host and falls back to `generateContent`. Response is inline base64 |
| `volcengine` | `/api/v3/images/generations` | Seedream models. Size splits into `width` and `height`. Error objects are flattened into `[code] message` |

### Video adapters

| Adapter | Provider family |
|---|---|
| `volcengine-video` | Seedance |
| `minimax-video` | MiniMax |
| `aliyun-wan-video` | Alibaba Bailian Wan 3.0 |

The Aliyun adapter accepts the official `input.media` structure with typed entries. `routes/tasks.ts` normalizes the flat project shape into that structure and validates the limits. See [architecture/backend.md](../architecture/backend.md).

`services/adapters/url.ts` joins base URL and path safely. It avoids a doubled prefix when the configured base URL already ends in `/v1` or `/api/v3`, and collapses duplicate slashes.

## Provider configuration and testing

`routes/aiConfigs.ts` manages configs. It exposes `temperature` as a top-level field by reading it out of the `settings` JSON, and validates it to the range 0 to 2.

The `POST /ai-configs/test` endpoint probes a provider with a minimal but valid request. The Gemini probe deliberately uses `:generateContent` rather than `interactions`, because the text runtime uses `generateContent` and many relay services have not configured `interactions`, so probing it would report a false failure. The probe uses a minimal legal body rather than an empty one, because some relay services turn an empty body into a fake auth error.

## Where generation is triggered

| Caller | Endpoint |
|---|---|
| Character image, single or batch | `POST /characters/:id/generate-image`, `POST /characters/batch-generate-images` |
| Scene image | `POST /scenes/:id/generate-image` |
| Prop image | `POST /props/:id/generate-image` |
| Storyboard image or video | `POST /tasks` |
| Uploads | `POST /upload/image`, `/upload/video`, `/upload/audio` |

The asset routes first ensure a final prompt through the `prompt_generator` agent, then generate. They fall back to a locally assembled prompt when the agent fails, so a text-model outage does not block image generation.

## Related pages

- [workflows/production-pipeline.md](production-pipeline.md) — the steps that call generation
- [workflows/merge-and-export.md](merge-and-export.md) — what happens after videos exist
- [operations/configuration.md](../operations/configuration.md) — provider settings, `PUBLIC_BASE_URL`, and defaults
