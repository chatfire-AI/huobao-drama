# hidrama verification map

This directory is the maintained source for verifying the user-facing behaviour of hidrama. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch the instance with `helpers/app.sh start`, which puts the backend on `:5679` and the frontend on `:3013` and points `SQLITE_PATH` at `.verification/run/data/verify.sqlite3`.
- Drive only an instance this run started. Both ports are fixed, so a second instance cannot run beside the first.
- Run `helpers/app.sh doctor` and require `{"status":"ok"}` on the backend and HTTP 200 on the frontend.
- Accept that the database is shared across runs in the sense that it persists: delete `.verification/run/data/verify.sqlite3` before a run that needs an empty starting state.
- Expect no AI provider to be reachable. Features below that need one say so in their own `Gotchas`.

## Driving conventions

- Drive the UI through `helpers/drive.mjs`; drive the API with `curl` when the proof needs the stored value rather than the screen.
- Anchor on structure and on data, never on translated labels. The UI defaults to Chinese and all four locales are supported.
- Treat `page.click` as the user's click. Reach for `page.domClick` only when a real click cannot land, and name that gap in the report.
- Dismiss the driver.js walkthrough on a fresh database before the first click; `project-lifecycle.mjs` shows the pattern.
- Label any fixture in the run log and in the report. A prerequisite that writes rows through the app's own API is a fixture, not a user path.

## Proof and skip reporting

- Capture the action and the resulting state, not only the final screen, and cross-check the screen against the API or the database.
- Assert the values you chose, not the presence of an element.
- Report an unreachable path with the attempted step and the unmet precondition, and never report a skipped path as verified through another one.
- Name every artifact after the feature and the moment; write it to `.verification/evidence/`.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behaviour. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behaviour.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with Chrome CDP` starts with `Preconditions:` and uses labelled bullets that pair each user action with an exact call and an observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Project lifecycle](./project-lifecycle.md) covers creating, listing, opening, re-status, and deleting a drama. Proven end to end by `helpers/steps/project-lifecycle.mjs`.
- [Episode workbench](./episode-workbench.md) covers the six-stage episode pipeline, from raw novel to export.
- [Asset library](./asset-library.md) covers extraction and the character / scene / prop library.
- [AI service settings](./ai-service-settings.md) covers provider configuration, agent instructions, skills, and the app settings.
- [Episode export](./episode-export.md) covers video selection, FFmpeg merge, and downloading the finished film.
