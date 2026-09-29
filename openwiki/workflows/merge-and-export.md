# Merge and export

Export stitches one episode's storyboard videos into a single MP4 with FFmpeg. There is no re-encode per clip — the clips are concatenated and encoded once.

## The routes

`routes/merge.ts` mounts three endpoints:

| Route | Effect |
|---|---|
| `POST /merge/episodes/:id/merge` | Start a merge. Optional body `{ storyboard_ids: number[] }` merges a subset |
| `GET /merge/episodes/:id/merge` | Latest merge record for the episode |
| `GET /merge/episodes/:id/merges` | Merge history, newest first, capped at 30 |

`POST` returns `{ merge_id, status: 'processing' }` immediately and runs the FFmpeg job in the background.

## Input selection

`mergeEpisodeVideos(episodeId, dramaId, storyboardIds?)` in `services/ffmpeg-merge.ts`:

1. Loads the episode's storyboards ordered by `storyboard_number`.
2. Filters to `storyboardIds` when provided. The filter still preserves number order, so a user's checkbox set cannot reorder the episode.
3. Builds the clip list from `video_url`, falling back to `composed_video_url` for rows written by older versions.

```ts
const clips = storyboards
  .map(sb => ({ sb, url: sb.videoUrl || sb.composedVideoUrl }))
  .filter(c => Boolean(c.url)) as { sb: typeof storyboards[number]; url: string }[]

if (clips.length === 0) throw new Error('所选镜头还没有可拼接的视频')
```

Partial merges are intentional. A shot without a video is skipped so a user can export a work in progress. The merge fails only when no clip qualifies.

## Pre-flight checks

Two checks run before any FFmpeg work.

**FFmpeg availability.** `checkFfmpegSuite()` spawns `-version` on both binaries. The header of `utils/ffmpeg.ts` explains the reason: a corrupted Windows `ffmpeg.exe` makes fluent-ffmpeg throw `EFTYPE` inside a deferred callback, which crashes the process. The merge route therefore converts the failure into a 400 with the message: reinstall `node_modules` on this machine, or set `FFMPEG_BIN` to a valid executable and restart.

**File existence.** A `video_url` in the database can point at a deleted file. The code checks `fs.existsSync` on each resolved absolute path and fails with a message naming the missing shots:

```
镜头 S3、S7 的视频文件已丢失（本地文件不存在），请重新生成这些镜头的视频，或在拼接时取消勾选
```

Without this check, FFmpeg would fail with an opaque "No such file or directory".

`toAbsPath` resolves a relative path. `static/...` paths resolve against `DATA_ROOT`; anything else resolves against `STORAGE_ROOT`.

## The FFmpeg command

The merge uses the concat demuxer with a list file:

```
static/temp/<uuid>.txt      file '/abs/path/to/clip1.mp4'
                            file '/abs/path/to/clip2.mp4'
static/merged/<uuid>.mp4    output
```

Options, with their purpose:

| Option | Purpose |
|---|---|
| `-f concat -safe 0` | Enable the concat demuxer and allow absolute paths |
| `-fflags +genpts` | Regenerate timestamps, because clips from different providers can have inconsistent time bases |
| `-c:v libx264 -preset medium -crf 23` | One H.264 encode at a constant quality |
| `-c:a aac -ar 48000 -b:a 192k` | Normalize audio to AAC at 48 kHz |
| `-movflags +faststart` | Move the moov atom to the front so the file streams and previews without a full download |

The concat demuxer is stream-copy friendly, but the output options force a re-encode of the decoder output. This is deliberate: clips come from different providers with different codecs and parameters, so a pure copy would produce a broken stream.

## Post-processing

After the encode finishes:

1. The temp list file is deleted.
2. `ffprobe` reads the output duration, rounded to whole seconds. A probe failure resolves to 0 rather than rejecting.
3. `extractVideoPoster` writes `static/merged/<uuid>_poster.jpg` for the export page cover.
4. `video_merges` is updated to `completed` with `merged_url` and `duration`.
5. `episodes.video_url` is set to the merged path.

The merge record always persists, even on failure. The background wrapper catches the error and writes `status: 'failed'` with `error_msg`, so the UI can show the reason.

## The merge record

The row is created before the job starts, with fixed values:

```ts
provider: 'ffmpeg', model: 'ffmpeg-concat-h264-aac', status: 'processing'
```

`scenes` holds the ordered list of input video paths as JSON. It is the only record of which clips produced the output, which matters when history is shown.

## The export UI

The workbench export panel has two regions. The top lists `exportMerges` with a preview player. The bottom lists shot material with checkboxes filtered to storyboards that have a video (`exportReadyIds`). `toggleSelectAllExport` selects them all.

The panel sends the checked ids as `storyboard_ids`. An empty selection means "merge everything that has a video". Finishing the export is recorded by setting the episode status to `completed`, which drives the `merge_episode` pipeline step.

## Limits and caveats

- **No subtitles.** `storyboards.subtitle_url` exists in the schema but the merge does not burn in subtitles.
- **No transitions or BGM.** The merge is a plain concatenation. `bgm_prompt` and `sound_effect` columns exist but the merge does not consume them.
- **One encode pass over the whole episode.** Long episodes take time proportional to total duration. Progress is not reported during the encode; the UI polls the merge status.
- **The temp list file lives under `static/temp`.** It is deleted on success. A crash mid-merge leaves it behind.

## Related pages

- [workflows/media-generation.md](media-generation.md) — how the input videos are produced
- [architecture/data-model.md](../architecture/data-model.md) — `video_merges` and `storyboards` columns
- [operations/configuration.md](../operations/configuration.md) — FFmpeg binary resolution and environment variables
