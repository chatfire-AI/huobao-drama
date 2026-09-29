# Asset library

Characters, scenes, and props are the episode's shared reference set. Extraction writes the rows, and generation gives each one an image that later feeds the storyboard video prompts. This feature covers the library view on the project page and the generation actions behind it.

## Sub-features

- `assets-tab` lists every material of a project, filtered by character, scene, or prop.
- `extract-types` writes the rows from the script, per type or all at once.
- `generate-image` generates one reference image, or a batch for a whole type.
- `edit-asset` changes an asset's name, description, and image through its editor.
- `view-image` opens a material in the full-size viewer.

## How to get to it (user POV)

- Open a project from `/` and choose the `Asset Library` tab.
- In the workbench, choose the `Asset Production` stage to extract or batch-generate.
- Choose a material card to open its editor.

## Driving it with Chrome CDP

Preconditions:

- `helpers/app.sh start` and `helpers/app.sh doctor` are both clean.
- A project with one episode that has a script exists, or extraction has nothing to read.
- An active image config with a working key, for generation.

- **Reach the library.** `await page.goto('/drama/<id>')`, then `await page.click('.page-tabs .tab-btn:nth-of-type(2)')`. The tab is active when `.tab-btn.on` carries the assets label and `.asset-grid`, `.character-asset-grid` or the empty state renders.
- **Read the counts.** The tab count chip (`.tab-count`) and the header meta (`.meta-item`) both carry the material total. `GET /api/v1/dramas/:id` returns `characters` and `scenes` arrays for the same numbers.
- **Extract a type.** In the workbench, go to `prod:assets` and click the primary action; the types that are ready extract in parallel. Assert the new cards, then read `GET /api/v1/episodes/:id/characters` (or `/scenes`, `/props`) for the stored rows.
- **Generate one image.** Open a material card, click the generate action in the editor, and wait for the image element to carry a source. The file lands under `STORAGE_ROOT`; confirm it exists on disk, not only in the DOM.
- **Generate a batch.** From the workbench asset stage, the batch action asks for confirmation first. Assert the count of images that appear, not the count of tasks started.
- **Proof.** A screenshot of the library with the new material visible, plus the API read-back and the file on disk under `.verification/run/data/static`.

## Gotchas

- Extraction and image generation both need an AI provider. Neither is verifiable without a working key, and neither is simulated by this skill.
- Generation is asynchronous: the card shows a pending state, the backend task row changes, and the image appears later. Assert the finished state.
- Materials are stored per project and reused across its episodes. A proof that runs twice on one database sees the materials of the first run.
- The library reads from the same tables as the workbench, so a change made in either view shows in both. Confirm which view wrote the row.
- Deleting a material is a soft delete; the list endpoint filters it, and a raw database query must filter the same way.
