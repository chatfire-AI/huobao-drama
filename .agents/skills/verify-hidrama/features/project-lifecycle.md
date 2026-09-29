# Project lifecycle

A drama project is the top of the hierarchy: an episode belongs to it, and its aspect ratio and visual style are chosen once and then fixed. This feature covers creating a project, finding it again in the list, opening it, marking its status, and deleting it.

Proven end to end by `helpers/steps/project-lifecycle.mjs` on a fresh verification instance.

## Sub-features

- `create-project` creates a project from a name, a visual style, and an aspect ratio.
- `list-projects` shows the project cards with character, scene, and episode counts, plus search, status filter, and sort.
- `open-project` opens `/drama/:id` from a card, or from the card menu.
- `set-status` marks a project draft, active, or completed from the card badge menu.
- `delete-project` removes a project behind a confirmation dialog.

## How to get to it (user POV)

- Choose `Projects` in the header, or open `/`.
- Choose `New Project` in the page header, or the same button in the empty state.
- Choose a project card to open it.
- Choose the status badge on a card, or the `More` menu on a card.

## Driving it with Chrome CDP

Preconditions:

- `helpers/app.sh start` reports both servers up, and `helpers/app.sh doctor` agrees.
- The database is empty for the create and empty-state steps: delete `.verification/run/data/verify.sqlite3` first.

- **Reach an empty list.** `await page.goto('/')`, then `await page.waitFor('.launcher-title')`. `page.text('.empty-title')` reads the empty-state heading.
- **Dismiss the walkthrough.** Sleep about 1.2s, then `await page.count('.driver-overlay')`. When it is non-zero, `await page.click('.driver-popover-close-btn')` and `await page.waitForGone('.driver-overlay')`. Without this the overlay swallows the next click.
- **Create a project.** `await page.click('.head-actions .btn-primary')` and `await page.waitFor('.create-dialog')`. Then `await page.type('.create-dialog input.input', title)`.
- **Choose the aspect ratio.** `await page.click('.create-dialog .dialog-body label.field:nth-of-type(3) .base-select-trigger')`, `await page.waitFor('.app-menu-item')`, read the labels with `page.evaluate`, and `await page.clickText('.app-menu-item', label)` for the one containing `9:16`.
- **Submit.** `await page.click('.create-dialog button[type="submit"]')`. The app navigates to `/drama/:id`; `await page.waitFor('.page-title')` and compare `page.text('.page-title')` with the name you typed.
- **Add an episode.** The episode dialog is on the project page: `await page.click('.head-action')`, `await page.waitFor('.ep-dialog')`, `await page.click('.ep-dialog .btn-primary')`, `await page.waitFor('.ep-card')`. This needs an image and a video config — see `Gotchas`.
- **Confirm the list.** `await page.goto('/')` and `await page.waitFor('.project-card')`. The card carries the style tag, the status badge, and the per-project counts.
- **Confirm the stored row.** `await page.evaluate("return fetch('/api/v1/dramas').then(r => r.json())")` and find the item by title. Assert `aspect_ratio`, `status`, and the episode count. A `9:16` pick must come back as `9:16`; the seed default is `16:9`.
- **Proof.** `shot('07-project-list-with-project')` plus a JSON report beside it, as `helpers/steps/project-lifecycle.mjs` writes.

## Gotchas

- The first load on a fresh database raises the driver.js walkthrough, and its overlay intercepts clicks. `autoTour` waits 600ms after mount, so check only after the page has settled.
- `POST /api/v1/episodes` returns 400 with `未找到启用的图片生成配置` until one active image config and one active video config exist. Either seed them as a labelled fixture, as `project-lifecycle.mjs` does, or verify only up to project creation.
- The aspect ratio is fixed at creation, and the create form defaults to `16:9`. A proof that skips the picker proves nothing about the ratio.
- Episode creation locks the active image and video configs onto the episode. Adding a config later does not move an existing episode onto it.
- Deleting a project is a soft delete: the row keeps a `deleted_at` timestamp and the list endpoint filters it out. A database check must filter the same way.
- The status badge is optimistic: it changes before the `PUT` answers, and reverts on failure. Read the badge after a round trip, not immediately.
- A create with an empty name returns early in `create()` and writes nothing, even though the dialog stays open.
