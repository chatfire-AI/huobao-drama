# Frontend

The frontend is a Nuxt 3 single-page application (`ssr: false`). It is plain Vue 3 with pure CSS — no component library. Styling uses CSS custom properties defined in `frontend/app/assets/studio.css`.

## Routes

Only two pages exist on disk. `nuxt.config.ts` registers the two drama routes by hand in a `pages:extend` hook:

| Path | File | Purpose |
|---|---|---|
| `/` | `app/pages/index.vue` | Project launcher — list, create, filter, delete projects |
| `/settings` | `app/pages/settings.vue` | AI services, style presets, storage, updates, agents, prompts, skills |
| `/drama/:id` | `app/views/drama/detail.vue` | Project detail — episode list and asset library |
| `/drama/:id/episode/:episodeNumber` | `app/views/drama/episode.vue` | The production workbench |

The dynamic views live in `app/views/` rather than `app/pages/` on purpose. The comment in `nuxt.config.ts` gives the reason: a literal `[id]` in a file path is awkward in git and shell commands, and some deployment environments handle the brackets badly. The URLs are unchanged.

Warning: `frontend/tests/` still reads the old `app/pages/drama/[id]/...` paths, so those tests fail. See [operations/development.md](../operations/development.md).

## The workbench

`app/views/drama/episode.vue` is the largest file in the repository (about 6,100 lines) and the center of the product. It has three panels.

### Left sidebar — the pipeline navigator

The sidebar renders `sidebarSections` as a fixed three-section navigation:

```
script       → script:raw, script:rewrite
production   → prod:assets, prod:videos
export       → export:merge
```

Each section computes a state: `done`, `active`, `pending`, or `none`. `sectionState` decides:

- `script` is done when `script_content` exists.
- `production` is done when every asset has an image and every storyboard has a video.
- `export` always shows `none` (the export step has no "in progress" state).

The bottom of the sidebar shows a four-segment progress marquee over `mainProgressSteps` (script, assets, videos, export). Clicking a segment jumps to that stage through `goMainStage`.

### Script panel

Two steps. Step 0 holds the raw content the user pastes or types. Step 1 runs the `script_rewriter` agent and shows the formatted screenplay. Length counters strip whitespace.

### Production panel

Two tabs, `assets` and `videos`.

The **assets** tab lists characters, scenes, and props that are linked to the episode. For each asset the user can generate a final prompt, generate an image, batch-generate images, upload an image manually, edit fields, or delete it. Pending states are tracked in arrays such as `pendingCharImageIds` and `pendingVideoIds`.

The **videos** tab is the storyboard workspace. It has three columns with draggable dividers whose widths persist in `localStorage` under `huobao:workbench:video-cols`. A storyboard inspector shows the description, atmosphere, duration, bound scene, bound characters, bound props, and the video prompt. Video generation defaults are `duration` from the storyboard, the drama `aspect_ratio`, `generate_audio: true`, and the selected video model.

### Export panel

Two regions. The top shows the merge list (`exportMerges`) with a large preview. The bottom shows shot material with checkboxes, so the user can merge only the selected storyboards. `toggleSelectAllExport` selects every storyboard that has a video.

### Task drawer

`taskDrawer` opens a drawer that reads `GET /episodes/:id/generation-tasks` and shows task and merge history for the episode.

## Model selection

The workbench offers three model dropdowns — chat (text), image, and video. Each is a custom `ModelSelect` popover, not a native `<select>`.

The selection is stored in `localStorage` under keys built from `MODEL_STORE_KEYS`:

```js
const MODEL_STORE_KEYS = { chat: 'huobao:model:chat', image: 'huobao:model:image', video: 'huobao:model:video' }
```

The stored value is a `configId:model` string. Two helpers interpret it: `bareModelName` extracts the model name, and `ownerConfigId` extracts the config id. The workbench sends both to the API as `model` and `config_id`. That is how the backend knows to use the config the user picked rather than the episode lock. See [architecture/backend.md](backend.md).

## The `@mention` mechanism

Video prompts reference assets with `@name`. Before a generation request, `resolveVideoPromptRefs` rewrites each mention to `@图片Nname`, where N is the 1-based index of that asset in the reference-image list for the storyboard.

The reference list comes from `getShotReferenceImages(sb)`, which gathers the images of the storyboard's bound scene, characters, and props. The rewritten prompt and the image list are sent together as `prompt` and `reference_image_urls`.

This is why asset names must match exactly between the prompt and the asset tables: a rewritten mention that names an unknown asset stays literal and the provider receives a dangling reference. The frontend sorts names longest-first so a name that contains another name resolves correctly.

## Composables

| Composable | Contract |
|---|---|
| `useApi.ts` | One `api` object (`get`, `post`, `put`, `del`) plus typed API groups. Unwraps `json.data`, throws on `code >= 400`, logs every call to the console with color. |
| `useAgent.ts` | `run(type, msg, dramaId, episodeId, onDone, model, configId)` — posts to `/agent/:type/chat`, sets `running`/`runningType`, toasts success or error. Blocks a second run while one is active. |
| `useToast.ts` | Toast helpers over `vue-sonner`. |
| `useTheme.ts` | Light/dark theme with a resolved value for the toaster. |
| `usePopover.ts` | Popover positioning and dismiss behavior. |
| `useTour.ts` | driver.js onboarding tours. Seen flags persist to `app_settings` through the API, with `localStorage` as an offline cache. See below. |
| `useUnifiedLanguage.ts` | Switches UI language and AI content language together. |
| `useDesktopBridge.ts` | Typed access to `window.huobaoDesktop`; returns `null` outside the desktop app. |
| `useMigrateState.ts` | Shared state for the storage-migration overlay. |
| `useMedia.ts`, `useProviderIcon.ts` | Media helpers and provider icon lookup. |
| `i18n.ts` | The `vue-i18n` singleton. It lives in its own module so non-setup code such as `useAgent` can call `i18n.global.t`. |

### Why tours persist to the server

The desktop app picks a free port on every start, so its origin changes. `localStorage` is scoped to the origin, so a tour flag stored locally would be lost on the next launch. `useTour.ts` therefore hydrates from `GET /settings/tours-seen` and merges the server list with the local cache.

### Why the language switch reloads the page

`confirmUnifiedLanguage` writes the content language to the backend, switches the `vue-i18n` locale, shows a short toast, and calls `location.reload()` after one second. The comment explains that a full reload rebuilds every component cleanly instead of relying on `watch` timing in deeply nested components.

UI language and AI content language are the same switch. One control changes both.

## Internationalization

`app/locales/{zh,en,ja,ko}.json` hold the UI strings. `zh` is the fallback. Agent output language is a separate backend setting stored in `app_settings`, but the UI drives it through the same control. See [workflows/ai-agents.md](../workflows/ai-agents.md).

## Layouts

`layouts/default.vue` is the shell for the launcher and settings: header with brand, nav, GitHub link, theme toggle, locale switcher, and a banner when an AI service type is missing. `layouts/studio.vue` is a full-viewport layout with no chrome, used by the workbench.

## Related pages

- [workflows/production-pipeline.md](../workflows/production-pipeline.md) — what the panels actually do end to end
- [architecture/desktop.md](desktop.md) — the bridge the frontend talks to
- [operations/development.md](../operations/development.md) — dev server, tests, and known breakage
