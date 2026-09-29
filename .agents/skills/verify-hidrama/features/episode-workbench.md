# Episode workbench

The workbench is the core of the product: one episode moves through raw novel, AI rewrite, asset extraction, storyboard breakdown, video generation, and export, and the left rail shows where it stands. This feature covers reaching each stage and the state each one writes.

## Sub-features

- `script-raw` holds the pasted novel or outline in a textarea and saves it to the episode.
- `script-rewrite` calls the `script_rewriter` agent to turn the raw text into a formatted script, or skips that step.
- `prod-assets` extracts characters, scenes, and props from the script.
- `prod-videos` breaks the script into storyboards, writes the video prompts, and generates the clips.
- `stage-rail` moves between stages and reports per-stage progress.
- `model-picks` selects the text, image, and video model from the top bar.

## How to get to it (user POV)

- Open a project from `/`, choose `Add Episode`, then choose the new episode card.
- Open `/drama/:id/episode/:episodeNumber` directly.
- Choose a stage in the left rail, or `Next` and `Back` at the foot of the panel.

## Driving it with Chrome CDP

Preconditions:

- `helpers/app.sh start` and `helpers/app.sh doctor` are both clean.
- A project with one episode exists — `helpers/steps/project-lifecycle.mjs` produces exactly that.
- An active text config exists for the rewrite step.

- **Reach the workbench.** `await page.goto('/drama/<id>')`, `await page.waitFor('.ep-card')`, `await page.click('.ep-card')`, then `await page.waitFor('.studio-topbar')`.
- **Read the rail.** `await page.count('.pipeline .pipe-item')` is 5, in the order `script:raw`, `script:rewrite`, `prod:assets`, `prod:videos`, `export:merge`. Select one with `.pipeline .pipe-item:nth-of-type(n)` inside its section, or click by index through `page.evaluate`.
- **Write the raw text.** On `script:raw`, `await page.type('.fill-textarea', novelText)`. The field autosaves; assert the count chip (`.char-count`) and then read the episode back over `GET /api/v1/dramas` for the stored value.
- **Rewrite.** On `script:rewrite`, the empty state carries the primary action: `await page.click('.step-empty .btn-primary')`. It calls the provider, so it needs a key — see `Gotchas`.
- **Extract.** On `prod:assets`, `await page.click('.btn-primary')` starts extraction for the ready types. The result is a character, scene, and prop list, counted in the header meta.
- **Break down.** On `prod:videos`, `await page.click('.btn-primary')` starts the storyboard breakdown. Each storyboard becomes one video task, and the shot count appears in `.studio-meta-inline`.
- **Proof.** A screenshot of each stage you touched, plus the episode read back over the API: `GET /api/v1/episodes/:id/storyboards` and `GET /api/v1/episodes/:id/pipeline-status`.

## Gotchas

- Everything from `script-rewrite` onward calls an AI provider. Without a working key the run stops there, and the honest report says so instead of skipping to a later stage.
- The rail anchors on structure, not labels: the five `.pipe-item` buttons are translated. Order is stable; text is not.
- Extraction and breakdown run as background tasks (`sys_task` rows). The panel polls, so assert the finished state, not the click.
- A stage's button is disabled while its own task runs. A second click proves nothing.
- The `@character` tokens in a video prompt resolve to asset reference images. A prompt that names a character the episode has not extracted produces a video without that reference.
- The top-bar model pickers write the default model for that service type, which affects later tasks as well as this one.
