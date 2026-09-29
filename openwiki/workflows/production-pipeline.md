# Production pipeline

This page follows one episode from raw text to exported video. Every step names the API call, the agent, and the table it writes.

## Overview

```
  raw text ──► script rewrite ──► asset extraction ──► asset images
                                          │
                                          ▼
                     storyboard breakdown ──► storyboard videos ──► FFmpeg merge ──► MP4
```

The backend reports progress through `GET /api/v1/episodes/:id/pipeline-status`, which returns these steps:

| Step | Done when |
|---|---|
| `script_rewrite` | `episodes.script_content` is set (`ready` when only `content` is set) |
| `extract_characters` | the drama has at least one character |
| `extract_scenes` | the drama has at least one scene |
| `extract_storyboards` | the episode has at least one storyboard |
| `generate_images` | every storyboard has an image (`partial` while some exist) |
| `generate_videos` | every storyboard has a video |
| `merge_episode` | the latest merge is `completed`; carries `merged_url` |

## Step 0 — Create the project and the episode

The launcher (`/`) calls `POST /dramas` with a title, style, and aspect ratio. No episode is created automatically.

`POST /episodes` creates an episode and locks configuration:

- `image_config_id` and `video_config_id` default to the highest-priority active official config for each type. The request fails if either type has no active config.
- `resolution` defaults to `720p` and accepts `480p`, `720p`, or `1080p`.
- `episode_number` is `max(existing) + 1`, ignoring soft-deleted episodes so a gap is reused.

These locks matter later, at `POST /tasks`. See [architecture/backend.md](../architecture/backend.md).

## Step 1 — Script rewrite

The user pastes raw source text into the script panel and saves it through `PUT /episodes/:id` as `content`.

The **script_rewriter** agent runs through `POST /api/v1/agent/script_rewriter/chat`. Its tools are:

| Tool | Effect |
|---|---|
| `read_episode_script` | reads `content` or `script_content` |
| `rewrite_to_screenplay` | returns the source text plus the format instructions |
| `save_script` | writes `episodes.script_content` |

The required screenplay format comes from the agent instructions:

```
## S编号 | 内景/外景 · 地点 | 时间段      scene header
natural paragraphs                            action, no camera language
角色名：（状态/表情）台词内容                  dialogue
```

Each scene should be 30 to 60 seconds of content. The instruction tells the model to rewrite the text itself and then save, rather than to return instructions.

The result is stored in `script_content`. That single field is what the next step reads.

## Step 2 — Asset extraction

Extraction is asynchronous and runs per target. `POST /episodes/:id/extract` with `target` equal to `characters`, `scenes`, or `props` returns immediately; the frontend polls `GET /episodes/:id/extract-status`.

The three targets are independent. The same episode can extract characters and scenes at the same time. A second request for a running target returns `already_running: true` instead of starting a second run.

The **extractor** agent runs through `services/extraction.ts`. Each target has its own instruction message that limits the model to that asset type.

### Deduplication rules

The extraction instructions and tools define these rules:

- **Characters and props** match by exact name. A name with a parenthetical alias, such as `林小雨（主角）` and `林小雨`, is the same entity. The `read_existing_*` tools return a `normalized_name` for this comparison.
- **Scenes** match by location plus time. The same location at a different time is a new scene.

Deduplication happens in the tool layer, not in the model. `save_dedup_characters`, `save_dedup_scenes`, and `save_dedup_props` merge an existing row and create a new one only when no match exists. Every saved asset is linked to the current episode through the join tables.

### The prop filter

Props have an unusually strict rule because they cost one image generation each. A prop qualifies only when both conditions hold:

1. It drives the plot — its appearance, hand-off, damage, or discovery causes a turn.
2. It deserves its own image — a later shot gives it a close-up or it recurs.

Three test questions reject a candidate: does the plot still work without it, is it an everyday item the character just uses (phone, chopsticks, cup), and is it scene furniture.

The output limit is 0 to 3 props per episode. The agent must submit an empty array rather than pad the list.

### Field contracts

- **Character** — `appearance` covers age impression, features, build, and temperament, with personality expressed as visible bearing. `styling` covers hair, wardrobe, makeup, and accessories. There is no separate personality field.
- **Scene** — `prompt` covers space, furnishings, period texture, and key visual elements. `lighting` covers source, tone, contrast, and mood.
- **Prop** — `description` covers only the physical appearance of the object. It must not describe plot use or relationships to other entities. The image prompt is written later by a different agent.

## Step 3 — Asset images

The workbench asset tab generates a **final prompt** and then an **image** for each asset.

`POST /characters/:id/generate-prompt` (and the scene and prop equivalents) calls `ensureCharacterFinalPrompt` and the matching siblings in `services/final-prompt.ts`. That service returns the stored `final_prompt` when one exists, unless `force` is set. When the field is empty it runs the **prompt_generator** agent with a message naming the asset id, then re-reads the row.

Each asset type has its own framing rule:

| Asset | Prompt shape |
|---|---|
| Character | three-view turnaround — front, side, back |
| Scene | fixed viewpoint with foreground, midground, and background. Explicitly an empty plate: no people, not even a back view, silhouette, reflection, or photo of a person |
| Prop | single product shot on a pure white background |

The save tools inject the project visual style in front of the prompt:

```ts
const stylePrompt = await getDramaStylePrompt(dramaId)
const finalPrompt = stylePrompt ? `${stylePrompt}, ${prompt}` : prompt
```

The agent is told not to include style words, because the tool adds them. See [operations/configuration.md](../operations/configuration.md) for how a project picks its style.

`POST /characters/:id/generate-image` then calls `generateImage` with the final prompt, or with a locally built fallback prompt when prompt generation fails. The fallback is `characterImagePrompt` in `routes/characters.ts`. Character images use a fixed `1920x1080` size.

`POST /characters/batch-generate-images` loops the same path over an id list and silently skips failures. It returns the count of started tasks.

When a task completes, `writeBackImageAssets` writes the result to the right column: `characters.image_url`, `scenes.image_url` plus `status = 'completed'`, `props.image_url`, or one of the storyboard image columns depending on `frameType`. See [workflows/media-generation.md](media-generation.md).

## Step 4 — Storyboard breakdown

The **storyboard_breaker** agent turns the screenplay into storyboards. It runs through `POST /agent/storyboard_breaker/chat`.

The agent instructions define the central concept: **one storyboard equals one shot segment equals one video generation task.** A segment lasts 8 to 15 seconds and contains 2 to 4 sub-shots. Sub-shots may change shot size, angle, or subject, but must stay inside one scene.

The workflow:

1. `read_storyboard_context` returns the screenplay, characters, scenes, props, and any existing storyboards, each filtered to the episode's linked assets.
2. The model identifies narrative beats and splits each beat into one or more segments.
3. It writes `description` and `video_prompt` together.
4. It saves in batches with `save_storyboards`. The first batch must pass `replace_existing: true` so a full regeneration leaves no stale shots. Each batch holds at most 8 segments, and shot numbers increase in order.

### Duration rules

The instructions give the model a numeric model rather than a vibe:

- Target total duration is `word count ÷ 500 words per minute`.
- Segment count is about `target total ÷ 12 seconds`, with ±20% tolerance.
- Transition segments run 8 to 10 seconds, narrative segments 10 to 15, and climax segments 12 to 15 with slower inner pacing.
- A segment must be at least `dialogue characters ÷ 4.5 characters per second + 2 seconds`. Dialogue that does not fit moves to the next segment.

The workbench lets the user edit duration directly and clamps it to 2 to 30 seconds. The provider adapter converges it to the model's supported range. See [operations/configuration.md](../operations/configuration.md) for the clamp location.

### `video_prompt` structure

The `video_prompt` is written in 3-second lines, one line per segment. Each `【镜头N】` in `description` maps to one or two consecutive 3-second lines, in order, with no additions or omissions. Each line states the picture first (who, action, shot size, angle) and then the dialogue for that time range, taken from the matching `【镜头N】`. Dialogue is never invented.

Scenes and characters are referenced as `@name`, and the names must match the context lists exactly. `@` mentions are how reference images get attached; see [architecture/frontend.md](../architecture/frontend.md).

`save_storyboards` validates bindings. A scene, character, or prop id must belong to the drama, and the tool auto-links it to the episode when it is not already linked. The HTTP route is stricter and rejects foreign ids. See [architecture/backend.md](../architecture/backend.md).

## Step 5 — Video prompts (batch fill)

Some storyboards arrive without a `video_prompt`. `POST /episodes/:id/generate-video-prompts` starts a batch that runs the **prompt_generator** agent once per pending storyboard.

The batch is tracked in memory by episode in `services/video-prompts.ts`. It processes storyboards in number order, reports `completed` and `failed` counts, and decides success by re-reading the row: if `video_prompt` is still empty after the agent returns, the shot counts as failed. This avoids trusting the model's claim of success.

The batch also tells the agent which video model the episode is locked to, so the prompt matches that model's behavior and duration limits.

Passing `storyboard_ids` regenerates those shots even when they already have a prompt. Without it, only shots with an empty prompt are processed.

## Step 6 — Storyboard videos

`POST /tasks` with `type: 'video'` starts one video generation per storyboard. The workbench sends the rewritten prompt and the reference images gathered from the bound scene, characters, and props.

The backend may prefix the project style prompt:

```ts
if (type === 'video' && String(videoPrompt || '').trim()) {
  const stylePrompt = await getDramaStylePrompt(dramaId)
  if (stylePrompt) videoPrompt = `${stylePrompt}，\n${videoPrompt}`
}
```

The rest of the lifecycle is in [workflows/media-generation.md](media-generation.md).

## Step 7 — Merge and export

`POST /merge/episodes/:id/merge` stitches the storyboard videos. It accepts an optional `storyboard_ids` array to merge a subset. Shots without a video are skipped, and the merge fails with a clear message when none remain. See [workflows/merge-and-export.md](merge-and-export.md).

## Failure handling in the middle of a run

- An agent call can fail with no side effect if it never reached a save tool. The extraction and video-prompt status becomes `error`, and the frontend can retry.
- A generation task can fail from provider errors, content moderation, or timeout. The row's `error_msg` holds the reason.
- A backend restart marks every processing task as failed, because pollers are in memory.
- Extraction and video-prompt batch status is in memory only. After a restart the status resets to null while the database keeps whatever the agent already saved.

## Related pages

- [workflows/ai-agents.md](ai-agents.md) — the four agents, their tools, and prompt files
- [workflows/media-generation.md](media-generation.md) — the task lifecycle and adapters
- [domain/concepts.md](../domain/concepts.md) — asset and storyboard vocabulary
