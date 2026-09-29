# Configuration

Almost all configuration lives in the database and is edited in the Settings page. Environment variables cover paths, ports, and a small set of AI transport patches.

## Environment variables

Every variable has a default, so local development needs none.

### Paths and ports

| Variable | Default | Meaning |
|---|---|---|
| `SQLITE_PATH` | `<repo>/data/huobao.sqlite3` | Database file |
| `PORT` | `5679` | Backend HTTP port |
| `STORAGE_PATH` | `<repo>/data/static` | Static file storage root. Its parent becomes the data root when `HUOBAO_DATA_DIR` is unset |
| `HUOBAO_DATA_DIR` | — | Data root. Injected by the Electron main process; set it in Docker |
| `WORKSPACE_PATH` | `backend/workspace` | Agent prompts and skills directory |
| `FRONTEND_DIST` | `frontend/dist` | Built frontend directory |
| `FFMPEG_BIN`, `FFPROBE_BIN` | bundled npm binaries | Override the FFmpeg executables |
| `HUOBAO_DESKTOP` | — | Set to `1` by the desktop shell. Selects the `desktop` storage mode reported by the API |

Only `backend/src/utils/paths.ts` and the FFmpeg helper read the path variables. See [architecture/overview.md](../architecture/overview.md).

### AI transport

These exist because relay services and some domestic providers break a multi-step agent loop. See [workflows/ai-agents.md](../workflows/ai-agents.md) for the full reasoning.

| Variable | Default | Meaning |
|---|---|---|
| `AI_DISABLE_THINKING` | `true` | Set to `false` to stop injecting thinking-off parameters |
| `AI_THINKING_OFF_PATCH` | built-in object | JSON that replaces the OpenAI-style thinking-off patch, for relay services that need different field names |
| `AI_MAX_TOKENS` | `16384` | Output token ceiling injected into non-official OpenAI endpoints |

Related product-level variable:

| Variable | Meaning |
|---|---|
| `PUBLIC_BASE_URL` | Public base URL used to expose local reference video, audio, and file paths to the video provider. Without it, that feature fails with an actionable error. Images do not need it because they are inlined as data URLs |

### Updates and deployment

| Variable | Meaning |
|---|---|
| `HUOBAO_VERSION` | Injected at build time. Reported by `/api/v1/health` and used by the update check |
| `HUOBAO_UPDATE_FEED` | Overrides the release manifest URL. Default is the COS mirror, then GitHub Releases |
| `HUOBAO_WATCHTOWER_URL` | Enables the one-click update button on server deployments |
| `HUOBAO_WATCHTOWER_TOKEN` | Watchtower HTTP API token. Must match the container |
| `WATCHTOWER_TOKEN` | Compose variable that feeds the app and Watchtower services |

### Legacy MySQL import

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Full MySQL connection string. Takes precedence |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | Individual connection fields |
| `MYSQL_AUTO_IMPORT` | `false` disables the one-time import |

The import runs only when MySQL is configured, the SQLite database is empty, and no marker file exists. See [architecture/data-model.md](../architecture/data-model.md).

## AI service configuration

Configs are stored in `ai_service_configs` and edited on the Settings page. A config has a service type, a provider, a name, a base URL, an API key, a model list, a priority, an active flag, and an optional temperature.

### The active config rule

The active config for a service type is the **highest-priority active row whose provider is official for that type**. The used model is the **first entry** of the model list.

This gives a single rule that both the Settings page and the backend follow. `setDefaultModel` in the UI makes a model the default by moving it to the front of the list and, when needed, raising the config's priority above the current maximum and reactivating it.

### Priority of the built-in quick setup

The "Huobao quick setup" card writes seven configs from one API key. Their priorities decide the out-of-the-box defaults:

| Service | Provider | Priority | First model |
|---|---|---|---|
| text | gemini | 101 | `gemini-3.8-flash` |
| text | openai | 100 | `deepseek-v4-pro` |
| image | openai | 99 | `gpt-image-2` |
| video | minimax | 98 | `MiniMax-H3` |
| image | gemini | 97 | `gemini-3-pro-image` |
| video | aliyun | 97 | `wan3.0-video` |
| video | volcengine | 96 | `doubao-seedance-2-0-mini-260615` |

So the default text model is Gemini 3.8 Flash, the default image model is `gpt-image-2`, and the default video model is MiniMax H3. Seedance sits last.

The quick setup is idempotent: it matches an existing config by name or by service type plus provider plus base URL and updates it, rather than creating duplicates.

### Provider presets

The Add-config form offers presets that fill the base URL and model list:

| Service | Provider | Base URL |
|---|---|---|
| text | gemini | `https://generativelanguage.googleapis.com` |
| text | openai | `https://api.openai.com` |
| image | gemini | `https://generativelanguage.googleapis.com` |
| image | openai | `https://api.openai.com` |
| video | aliyun | `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com` |
| video | volcengine | `https://ark.cn-beijing.volces.com` |
| video | minimax | `https://api.minimaxi.com` |

The UI also supports a custom base URL, which is how relay services are configured.

### Temperature

Temperature is optional and lives inside the config's `settings` JSON, surfaced as a top-level field by the API. It is valid from 0 to 2. Set it when a model rejects the provider default, such as a model that only accepts one fixed value. The request patch chain writes it into every agent call. See [workflows/ai-agents.md](../workflows/ai-agents.md).

### Testing a config

`POST /ai-configs/test` probes a provider with a minimal legal request. Use it after adding a config. A Gemini probe deliberately uses `:generateContent`, the endpoint the text runtime actually calls, so a relay service that has not enabled `interactions` is not reported as broken.

## Content language

`app_settings.content_language` holds one of `zh`, `en`, `ja`, `ko`. It controls:

- The instructions used by every agent, through the language directive.
- Which prompt and skill variant file is loaded.

Default is `zh`. The Settings page and the header language switcher both call `PUT /settings/content-language`, then reload the page. See [architecture/frontend.md](../architecture/frontend.md).

The per-agent prompt editor follows the content language and shows a "follows Chinese" hint when a variant file does not exist yet.

## Style presets

Style presets are rows in `style_presets`. Each has a name, a `value` key, an English prompt fragment, a description, a sort order, and an active flag. A project stores the `value` in `dramas.style`.

The prompt fragment is prepended to image prompts by the save tools and to video prompts by `POST /tasks`. The presets are seeded, and a seed upgrade or removal happens only when the stored prompt still equals the original seed text. That content-addressed rule protects user edits. See [architecture/data-model.md](../architecture/data-model.md).

## Agent prompts and skills

Both are files under `WORKSPACE_PATH`, edited through the Settings page.

- **Prompts** — `workspace/prompts/<agent_type>[.<lang>].md`. Frontmatter carries `name` and `model`. The Settings page can restore the code default by deleting the file.
- **Skills** — `workspace/skills/<dir>/SKILL[.<lang>].md`. New skill ids must be lowercase letters, digits, and hyphens.

On a packaged desktop install, `prompts/` is force-overwritten on a template version bump, while `skills/` is only added to. See [architecture/desktop.md](../architecture/desktop.md).

## Storage location

`GET /api/v1/storage` reports the mode (`desktop` or `server`), the data directory, the storage root, the database path, a bucketed disk usage, and free space. Usage is cached for 60 seconds with stale-while-revalidate because walking the data directory is expensive.

On the desktop app the Settings page can move the data directory. It calls the Electron bridge, and the migration engine validates and moves the files. See [architecture/desktop.md](../architecture/desktop.md).

## Related pages

- [operations/deployment.md](deployment.md) — Docker variables and release flow
- [architecture/data-model.md](../architecture/data-model.md) — the `ai_service_configs` and `app_settings` tables
- [workflows/media-generation.md](../workflows/media-generation.md) — how configs are used at generation time
