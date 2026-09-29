# Data model

Storage is one SQLite file. The default is `data/huobao.sqlite3` in the repo, `<dataDir>/huobao.sqlite3` on the desktop, and `/app/data/huobao.sqlite3` in Docker. Override it with `SQLITE_PATH`.

Two files define the shape:

- `backend/src/db/sqlite-schema.ts` — the DDL that runs at startup, plus style-preset seeds. This is the authority for the physical schema.
- `backend/src/db/schema.ts` — the Drizzle table definitions that the application code uses.

`backend/src/db/index.ts` opens the database with `journal_mode = WAL`, `busy_timeout = 5000`, and `synchronous = NORMAL`. WAL lets generation pollers and page reads proceed without blocking each other.

## Entity relationships

```
dramas (project)
  ├── episodes
  │     ├── episode_characters ─┐
  │     ├── episode_scenes ─────┼── characters / scenes / props   (project-level assets)
  │     ├── episode_props ──────┘
  │     └── storyboards
  │           ├── storyboard_characters ── characters
  │           └── storyboard_props      ── props
  ├── characters
  ├── scenes
  └── props

sys_task          (image + video generation tasks)
video_merges      (episode stitching runs)
ai_service_configs / ai_service_providers   (provider configuration)
style_presets     (visual style prompt fragments)
assets            (legacy unified asset library)
app_settings      (global key-value settings)
```

## Tables

### `dramas` — the project

Holds `title`, `genre`, `style`, `aspect_ratio`, `status`, `tags` (JSON text), and `metadata`. `style` stores a `style_presets.value`. List and detail queries join episode, character, and scene counts for the launcher UI.

### `episodes`

Belongs to a drama. Holds `content` (raw novel text) and `script_content` (the rewritten screenplay). Two configuration locks are captured at creation: `image_config_id` and `video_config_id`, plus a `resolution` of `480p`, `720p`, or `1080p`. `video_url` points at the merged episode video.

### `characters`, `scenes`, `props` — the assets

These are project-level, not episode-level. An episode reaches them through join tables.

| Table | Distinguishing columns |
|---|---|
| `characters` | `name`, `role`, `appearance`, `styling`, `final_prompt`, `image_url`, `reference_images`, `seed_value` |
| `scenes` | `location`, `time`, `prompt`, `lighting`, `final_prompt`, `image_url`, `storyboard_count`, `status` |
| `props` | `name`, `type`, `description`, `final_prompt`, `image_url`, `reference_images` |

The `appearance`/`styling` split for characters and the `prompt`/`lighting` split for scenes are the fields the extraction agent fills. `final_prompt` is the image-generation prompt the `prompt_generator` agent writes. See [domain/concepts.md](../domain/concepts.md) for the field semantics and [workflows/ai-agents.md](../workflows/ai-agents.md) for how they are produced.

### Join tables

`episode_characters`, `episode_scenes`, and `episode_props` link assets to episodes. `storyboard_characters` and `storyboard_props` link assets to individual storyboards. The storyboard join tables use a composite primary key.

A scene can also carry a legacy direct `episode_id` column. The `generation-tasks` handler reads both links for backward compatibility.

### `storyboards`

The unit of video generation. Key columns:

- `storyboard_number` — display and ordering number.
- `description` — the shot description with `【镜头N】` sub-shot markers and dialogue.
- `atmosphere`, `video_prompt`, `image_prompt`.
- `duration` — seconds.
- `composed_image`, `first_frame_image`, `last_frame_image` — image outputs.
- `video_url`, `composed_video_url`, `subtitle_url` — video outputs. Merge prefers `video_url` and falls back to `composed_video_url` for legacy rows.
- `scene_id` and the join tables bind assets.

### `sys_task` — generation tasks

One table for image and video generation. `type` is `image` or `video`. Foreign keys `storyboard_id`, `drama_id`, `scene_id`, `character_id`, `prop_id` say what the result belongs to.

`params` is a JSON blob whose shape depends on `type`:

```
image: { size, frameType, referenceImages[] }
video: { referenceMode, firstFrameUrl, lastFrameUrl, referenceImageUrls[],
         referenceVideoUrls[], referenceAudioUrls[], referenceFileUrl,
         referenceLinkUrl, generateAudio, duration, aspectRatio,
         resolution, seed, promptExtend, watermark }
```

`status` moves `processing` → `completed` or `failed`. `result_url` is the provider URL; `local_path` is the downloaded relative path such as `static/images/<uuid>.png`.

There is no `episode_id`. Episode aggregation re-derives membership from the foreign keys. See [architecture/backend.md](backend.md).

### `video_merges`

One row per stitching run. Holds `episode_id`, `drama_id`, the ordered input list in `scenes` (JSON), `merged_url`, `duration`, and `status`. Soft-deleted.

### `ai_service_configs` and `ai_service_providers`

`ai_service_configs` stores provider credentials and preferences: `service_type` (`text`, `image`, `video`), `provider`, `base_url`, `api_key`, `model` (a JSON array — the first element is the active model), `priority`, `is_active`, and `settings` (JSON; currently holds `temperature`).

The active config for a service type is the highest-priority active row whose provider is official for that type (`services/ai.ts`). `ai_service_providers` holds provider presets — display names, default URLs, and preset model lists.

This table has no `deleted_at`. Deletion is hard.

### `style_presets`

`value` is the key stored in `dramas.style`; `prompt` is the English prompt fragment injected in front of image and video prompts. Display names and descriptions ship in English. `value` has a unique index. Seeds are idempotent and content-addressed: a seed row is upgraded or removed only when its `prompt` still equals the seeded text, and a row is renamed only while it still carries the earlier Chinese name, so user edits survive (`sqlite-schema.ts`).

The seed file also explains a product decision: the `live` (photorealistic live-action) preset was removed because real-person imagery fails platform content review.

### `assets`

A general asset library with dimensions, size, MIME type, and favorite flag. It stores references by generation id. It is not part of the primary pipeline.

### `app_settings`

A key-value table used by `services/app-settings.ts` for `content_language` (`zh`/`en`/`ja`/`ko`) and `tours_seen`. The service is deliberately synchronous because `buildAgentRequestContext` calls it synchronously.

## Schema evolution

There is no migration framework. `initSqliteSchema` replays `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` on every start, so a new table or index appears automatically. A new column requires an explicit `ALTER TABLE` statement appended to the statement list; nothing does this automatically.

Style presets are seeded, upgraded, and removed idempotently in the same function.

## Legacy MySQL import

`backend/src/db/mysql-import.ts` performs a one-time import when a MySQL connection is configured (`DATABASE_URL` or `MYSQL_HOST`), the SQLite database is empty, and no `.mysql-imported` marker exists. It imports per table with row-count validation, writes in a single transaction, and rolls back on error so the next launch retries. `MYSQL_AUTO_IMPORT=false` disables it.

The Drizzle schema keeps its MySQL heritage in the header comment: `varchar(x)` became `text` because SQLite does not enforce length, `tinyint(1)` became `integer` in boolean mode, and timestamps remain ISO strings in `text` columns. Table and column names did not change.

## Timestamp and id conventions

- Timestamps are ISO 8601 strings written by `now()` in `utils/response.ts`. They are sortable as text.
- Inserts go through `getInsertId(res)`, which converts `better-sqlite3`'s possible bigint `lastInsertRowid` to a number.
- Soft delete uses `deleted_at`. Queries filter `isNull(deletedAt)`. `ai_service_configs` and `style_presets` do not use it.

## Related pages

- [domain/concepts.md](../domain/concepts.md) — what each entity means in the product
- [workflows/media-generation.md](../workflows/media-generation.md) — how `sys_task` rows are processed
- [operations/configuration.md](../operations/configuration.md) — where the database file goes
