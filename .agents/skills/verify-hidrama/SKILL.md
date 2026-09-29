---
name: verify-hidrama
description: Drive the real hidrama app to prove a change works. Use when verifying hidrama behaviour in the web UI or its HTTP API — projects, the episode workbench, the asset library, AI service settings, or export. Launches the Nuxt frontend and the Hono backend against an isolated database, drives Chrome over CDP, and captures screenshots plus API evidence.
---

# Verify hidrama

hidrama is one product in three shells: a Nuxt 3 SPA (`frontend/`), a Hono API that also serves the built SPA (`backend/`), and an Electron wrapper (`desktop/`).

The surface to verify is the web UI on `:3013`; the API under it is `http://localhost:5679/api/v1`. The Electron shell renders the same UI, so anything proved here holds there too — except native window, menu, and updater behaviour, which this skill does not cover.

Start from the feature map in [features/](features/README.md) and drive the feature the change touches.

## Launch

```bash
helpers/app.sh install    # once per checkout: backend + frontend deps
helpers/app.sh start
helpers/app.sh stop
```

`start` runs the backend as `node --import tsx src/index.ts` with `SQLITE_PATH` and `STORAGE_PATH` under `.verification/run/data`, so it never touches the repo's own `data/huobao.sqlite3`. The frontend runs the repo's documented `npm run dev`.

Ready means `GET :5679/api/v1/health` answers `{"status":"ok"}` and `:3013` answers HTTP 200. `start` waits for both and tears the run down when either never answers.

Both ports are fixed, and this is the only instance you can run. The Nuxt dev server proxies `/api` and `/static` to `localhost:5679` (`frontend/nuxt.config.ts`) and its dev script pins `:3013`, so a second instance needs edits to tracked config. Do not try to run two.

`serveStatic: root path '.../frontend/dist' is not found` in `backend.log` is expected in dev: the backend serves the built SPA from that directory in production, and the Vite dev server serves it here.

## Doctor

```bash
helpers/app.sh doctor
```

Read-only. It prints the backend health JSON, the frontend status code, the first dramas page, and the database this instance writes. Run it before blaming a drive: HTTP 200 on `:3013` together with `DOWN` on `:5679` means the API is dead, not the UI.

## Drive

`helpers/drive.mjs` launches an isolated headless Chrome (its own profile under `.verification/run/chrome-profile`) and runs a steps module against the page.

```bash
node .agents/skills/verify-hidrama/helpers/drive.mjs \
     .agents/skills/verify-hidrama/helpers/steps/project-lifecycle.mjs
```

Environment: `BASE` (default `http://localhost:3013`), `EVIDENCE`, `RUN`, `CHROME`, `CHROME_PORT`. Extra arguments after the steps file reach the module as `page.args`.

A steps module default-exports one async function:

```js
export default async ({ page, shot, log, evidence, base }) => {
  await page.goto('/')                              // SPA route or absolute URL
  await page.waitFor('.project-card')               // selector polling, 20s
  await page.click('.head-actions .btn-primary')    // real mouse event at the element centre
  await page.type('.create-dialog input.input', 'My Drama')
  await page.pick('.base-select-trigger', '9:16 · Portrait')
  await page.text('.page-title')                    // trimmed textContent, or null
  await page.evaluate(`return document.title`)
  await shot('step-1')                              // PNG into EVIDENCE
}
```

`page` also carries `waitForGone`, `waitForText`, `clickText(sel, text)`, `key('Escape')`, `count`, `body`, `sleep`, `errors`, and `domClick` — a DOM click, which bypasses pointer interception, so use it only when a real click cannot reach the element and say so in the report.

`drive.mjs` closes Chrome on every exit path, also after a failed step, and exits non-zero with the failing message.

### Selectors that survive a language change

The UI defaults to Chinese and every label goes through `t()`. Anchor on structure (`.head-actions .btn-primary`, `.create-dialog button[type="submit"]`, `.ep-card`) or on the data you just wrote, never on translated text. `project-lifecycle.mjs` picks the portrait aspect ratio by finding the option whose label contains `9:16`, which holds in all four locales.

The first run against a fresh database raises the driver.js walkthrough (`.driver-overlay`), and its overlay intercepts clicks. Wait about 1.2s after the first page load, click `.driver-popover-close-btn`, then continue. The seen-once flag lives in the database (`app_settings.tours_seen`), so it appears once per fresh instance.

## Evidence

Write every artifact to `.verification/evidence/` (gitignored). Screenshots come from `shot()`; write everything else from the steps module with `fs`, beside them. Name each file after the feature and the moment it records.

The proof standards for this repo:

- Drive the real path. A proof of project creation clicks the button a user clicks; it does not call `POST /api/v1/dramas` itself. Prerequisites are the one exception, and a prerequisite must be labelled as a fixture in the run log and in the report — `project-lifecycle.mjs` seeds one image config and one video config through the app's own `/api/v1/ai-configs`, because `POST /api/v1/episodes` refuses with 400 until they exist.
- Cross-check the screen against the server. Read the rows back over the API, or from `.verification/run/data/verify.sqlite3`, and fail when the screen and the data disagree. A screenshot cannot show that the row was written.
- Assert real values, not mere presence: the aspect ratio you picked, the episode count you created.
- Page errors count. `drive.mjs` collects uncaught exceptions and `console.error` output; treat a non-empty list as a failure unless the error is the thing under test.
- Never put a real API key in the instance.

Absence to state plainly in any report: nothing here reaches an AI provider, so no generated script, image, or video is verified. A change to a provider adapter needs a real key in a scratch instance, or a mock at the provider boundary.

## Cleanup

```bash
helpers/app.sh stop
```

It kills only what `start` launched, walking the whole tree of each recorded PID and matching nothing by name, and it leaves the evidence in place. Run it after a failed experiment too: a stranded instance holds `:5679` and `:3013`, and the next `start` refuses while its PID files exist.

`stop` keeps `.verification/run/data` on purpose, so a re-run keeps its state. Delete `.verification/run/data/verify.sqlite3` when the next run must start from an empty database.

## Helpers

- `helpers/app.sh` — `install` | `start` | `doctor` | `stop`.
- `helpers/drive.mjs` — the CDP driver; the file header repeats its flags.
- `helpers/steps/project-lifecycle.mjs` — the worked example, and the proof this skill was tested with. Copy its shape for a new proof.
