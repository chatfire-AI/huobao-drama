# Episode export

Export is the last stage: the finished shot videos are merged into one episode file with FFmpeg, subtitles are burned in where configured, and the result is offered for download. This feature covers that stage and the states around it.

## Sub-features

- `shot-selection` lists the episode's shots with the ones that have a finished video marked as ready.
- `select-all` selects or clears every ready shot at once.
- `merge` runs the FFmpeg merge over the selected shots and reports progress.
- `download` offers the merged file, and the film viewer plays it.
- `export-empty` states the case where no shot has a video yet.

## How to get to it (user POV)

- In the workbench, choose `Export` in the left rail, or `Go to Export` at the foot of an earlier stage, or `View Film` in the top bar.
- Choose `Select all ready`, then `Merge selected`.

## Driving it with Chrome CDP

Preconditions:

- `app.sh start` and `app.sh doctor` are both clean.
- An episode whose shots have finished videos. Reaching that state needs a working video provider, time, and money, and this skill does not fake it.
- A merge needs at least one selected shot: the merge button stays disabled otherwise.

- **Reach the stage.** In the workbench, `await page.click('.pipeline .pipe-item:nth-of-type(5)')` for `export:merge`, then `await page.waitFor('.export-section')`.
- **Read the ready count.** The section head carries a `done/total/selected` counter. With no shot videos it reads zero, and `.export-merge-empty` states the empty case — that state is verifiable without a provider.
- **Select the shots.** `await page.click('.export-section-head .btn:not(.btn-primary)')` selects or clears every ready shot, and the counter's third number follows.
- **Merge.** `await page.click('.export-section-head .btn-primary')` starts the merge. It is disabled while nothing is selected, and the panel shows progress while FFmpeg runs.
- **Confirm the file.** The merged result is written under `STORAGE_ROOT`, and the download link points at it. Check the file exists on disk and has a non-zero size, not just that a link appeared.
- **Proof.** A screenshot of the export stage with the file listed, the size and path of the merged file, and `GET /api/v1/episodes/:id/pipeline-status`.

## Gotchas

- Nothing here is verifiable without generated videos. Report the stage as unreachable and name the missing precondition rather than driving the empty state and calling the feature verified.
- The merge is server-side FFmpeg. Binaries come from `ffmpeg-static` and `ffprobe-static`, and `FFMPEG_BIN` and `FFPROBE_BIN` override them. A missing or wrong binary fails the merge, not the interface.
- A merge over many shots takes time. Assert the finished file, not the click.
- The empty state (`.export-merge-empty`) is the only part of this stage that a run without a provider can prove. Say so in that shape.
- Merged files accumulate under the instance's storage directory across runs. `.verification/run/data/static` is disposable; delete it with the database when a run must start clean.
