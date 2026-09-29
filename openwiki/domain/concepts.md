# Domain concepts

This page is the vocabulary the code, the UI, the prompts, and the API all use. Use these terms in code, comments, commits, and issues.

## Project hierarchy

**Drama** (剧 / project) — the top-level container. Holds a title, a genre, an aspect ratio, a status, and one visual style. The launcher lists dramas.

**Episode** (集) — belongs to a drama and holds the raw content and the screenplay. An episode carries three locks captured at creation: the image config, the video config, and the output resolution. See [architecture/backend.md](../architecture/backend.md).

**Asset** (资产) — the umbrella term for **characters**, **scenes**, and **props**. Assets are owned by the drama, not by an episode. An episode references them through join tables, and a storyboard can additionally bind them individually.

## The three asset types

### Character (角色)

A person in the story. Two description fields do all the work:

- **appearance** (样貌) — age impression, features, build, and bearing. Personality is expressed here as visible temperament, not as a separate field.
- **styling** (妆造) — hair, wardrobe, makeup, accessories.

The extraction agent is explicitly told not to output a personality field. Personality belongs inside the appearance description as observable quality.

A character's **final prompt** produces a three-view turnaround: front, side, and back. This is the reference sheet that keeps the character consistent across shots.

### Scene (场景)

A place at a time. The identity of a scene is `location` + `time`. The same place at a different time is a **different scene**. Deduplication follows this rule.

Two description fields:

- **prompt** — space, furnishings, period texture, key visual elements.
- **lighting** — light source, tone, contrast, and mood.

A scene's **final prompt** produces a fixed viewpoint with foreground, midground, and background. It is strictly an empty plate: no people appear, not even a back view, a silhouette, a reflection, or a photographed person. The `ensureSceneFinalPrompt` message states this explicitly because models otherwise add crowd figures from the script. See [workflows/production-pipeline.md](../workflows/production-pipeline.md).

### Prop (道具)

A plot-relevant object. Props are the most restricted asset type, because each one costs an image generation.

A prop qualifies only when it both drives the plot and deserves its own image. The limit is 0 to 3 per episode. Everyday items and scene furnishings are excluded by rule. See the prop filter in [workflows/production-pipeline.md](../workflows/production-pipeline.md).

A prop's **description** covers only physical appearance: material, colour, shape, size, wear. It must not describe plot use, and it must not mention characters. A prop's **final prompt** produces a single object on a pure white background.

## Storyboard vocabulary

**Storyboard** (分镜) — one shot segment and one video generation task. This equivalence is the central rule of the system. The storyboard_breaker instructions state it directly: 一个分镜 = 一个「分镜段落」= 一个视频生成任务.

**Shot** (镜头) — overloaded word, and the overload is intentional:

- In the database and the API, a storyboard is a shot. `storyboard_number` is the shot number, and the UI writes it as `S1`, `S2`.
- Inside `storyboards.description`, `【镜头N】` marks a **sub-shot**. A storyboard contains 2 to 4 sub-shots that may change shot size, angle, or subject but never change scene.

**Duration** (时长) — seconds, stored per storyboard. The agent plans 8 to 15 seconds. The workbench allows 2 to 30 seconds. The provider adapter converges the value to the model's supported range.

**Description** — the human-readable shot plan. It carries the `【镜头N】` structure with dialogue inline as `角色名说：「台词」` and narration as `旁白：…`.

**Atmosphere** (氛围) — light, colour, and environmental feeling for the segment.

**video_prompt** — the machine-facing prompt for video generation. Written in 3-second lines. Each `【镜头N】` maps to one or two consecutive 3-second lines. Dialogue is copied from the description, never invented. Assets are referenced as `@name`.

**image_prompt** — a prompt for storyboard still images. It exists in the schema and the update route, but the primary flow produces images from asset final prompts.

**Frame types** — a storyboard image can be `first_frame`, `last_frame`, or the default composed image. The `frameType` parameter selects which column receives the result.

**Reference image** — in the video task sense, the images of the bound scene, characters, and props that are sent with the prompt. The `@name` mentions in `video_prompt` are rewritten to `@图片Nname`, where N is the 1-based index in this list. See [architecture/frontend.md](../architecture/frontend.md).

## Prompt vocabulary

**Final prompt** (最终提示词) — the image-generation prompt stored on an asset in `final_prompt`. It is produced once by the `prompt_generator` agent, saved with the project style prefix already attached, and reused for every subsequent generation. The route regenerates it only when `force` is set or the field is empty.

**Video prompt** — the storyboard-level prompt described above. Also produced by `prompt_generator`, but through a separate skill and a separate tool call.

**Style preset** (风格预设) — a named visual style with an English prompt fragment. A project stores the preset's `value` in `dramas.style`. The fragment is prepended to image and video prompts so style words stay out of the agent's creative text. Eight presets ship: 3D 漫剧, 日漫赛璐璐, 吉卜力手绘, 水彩绘本, 美式漫画, 国风 2.5D, 韩系网漫, 黑白漫画. An earlier ninth seed, `live` (photorealistic live action), is now removed in code because real-person imagery fails platform content review. The removal is content-addressed, so a user-edited row with that value survives.

**Prompt file** — the system prompt for one agent, stored at `workspace/prompts/<agent_type>.md`, with optional language variants. Editable in Settings.

**Skill** — a `SKILL.md` directory under `workspace/skills/` that adds rules to one agent. Injected in full into the instructions. Editable in Settings.

## Generation vocabulary

**Task** — one row in `sys_task`. Either an image or a video. A task has a status of `processing`, `completed`, or `failed`.

**Provider** — the vendor behind a config. The supported set is fixed per service type. See [workflows/media-generation.md](../workflows/media-generation.md).

**AI service config** — a stored provider configuration: type, provider, base URL, API key, model list, priority, and active flag. The Settings page is the only writer.

**Active config** — the highest-priority active config of a service type whose provider is official. Used when a request does not name a config.

**Adapter** — the per-provider class that translates the project's request and response model into the provider's HTTP API.

**Reference mode** — the video task's mode field. The workbench always sends `reference`.

## Pipeline vocabulary

**Pipeline step** — one of the seven steps returned by `pipeline-status`: script rewrite, character extraction, scene extraction, storyboard extraction, image generation, video generation, and episode merge. Each step is `pending`, `ready`, `partial`, `done`, or, for the merge, the merge status.

**Extraction** — one of the three async jobs that populate episode assets. Tracked per episode and per target.

**Dedup** (去重) — merging an extracted asset into an existing row instead of creating a duplicate. Characters and props match by normalized name; scenes match by location plus time.

**Merge** (拼接) — concatenating storyboard videos into the episode video. The output is called **成片** in the UI.

## Language vocabulary

**UI language** — the language of the interface, one of `zh`, `en`, `ja`, `ko`. Stored in browser `localStorage`.

**Content language** (AI 内容语言) — the language of everything the agents write: screenplays, extracted fields, storyboard descriptions, prompts, and new asset names. Stored in `app_settings` and injected as a directive into every agent request.

The product deliberately unifies the two: one control in the UI changes both and reloads the page. See [architecture/frontend.md](../architecture/frontend.md).

Existing asset names are exempt from translation, because `@` mentions must match exactly.

## Terms to avoid

- Do not call a storyboard a "shot" in new prose unless you mean a sub-shot. Use "storyboard" or "shot segment" for the task unit and "sub-shot" for `【镜头N】`.
- Do not call an episode's asset list "the asset library". The **asset library** is the legacy `assets` table and its UI. Episode assets are linked assets.
- Do not say "project" when you mean the `dramas` row in a code or API discussion. Use "drama" in code contexts and "project" in user-facing prose.

## Related pages

- [workflows/production-pipeline.md](../workflows/production-pipeline.md) — these concepts in motion
- [architecture/data-model.md](../architecture/data-model.md) — the tables behind the concepts
- [workflows/ai-agents.md](../workflows/ai-agents.md) — how the agents are instructed to use this vocabulary
