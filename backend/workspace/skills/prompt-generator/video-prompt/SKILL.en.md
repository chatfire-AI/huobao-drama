---
name: video-prompt
description: Video prompt specification — generates a time-segmented video-generation prompt from storyboard-segment content, with cuts allowed within a segment
---

# Video Prompt (storyboard segment → video_prompt)

From a single storyboard segment's description (containing the 【镜头N】 sub-shot structure and dialogue/narration) / atmosphere / duration, generate the `video_prompt` that drives AI video generation. **One storyboard segment = one 8-15-second video, with cuts allowed inside it**: consecutive segments may be different shots (change of shot size/angle/subject), joined with hard cuts; but the whole segment **never crosses scenes** and never uses flashbacks.

## Format

The **first line of the `video_prompt` is the header**: first introduce which characters and scene appear in this video, then follow with the time segments. Characters and scenes are always referenced with @ (during generation they are replaced with the corresponding reference-image markers, so the video model first locks onto "who" and "where").

```
Characters: @Xiaoming, @Xiaohong; Scene: @Coffee Shop.
0-3s: @Coffee Shop, close shot, static camera; @Xiaoming looks down at his phone, fingers repeatedly tapping the table, expression anxious.
3-6s: Cut to a wide shot of the doorway; the doorbell rings as @Xiaohong pushes the door open and walks in, bringing in a gust of cold air.
6-9s: Cut back to a medium shot; @Xiaohong walks over with a smile and sits down across from Xiaoming; Xiaoming says: "You finally made it."
```

Header rules:
- Only list the characters who actually appear in this storyboard segment and the bound scene — do not list those who do not appear
- When a prop has a notable appearance, it may be appended to the header (e.g. `; Props: @Letter`)
- The header is its own line, ending with a period, followed by the time segments

Split into 3-second segments, each segment on its own line separated by newlines, with time ranges continuous and adjoining (no overlaps, no gaps).

## Mapping to the Storyboard Description

The `description` is the sole content source of the video_prompt (visuals, actions, dialogue, and narration are all in it). Conversion rules:

- Each `【镜头N】` in the `description` maps to **1-2 consecutive 3-second segments** — same order, no omissions, no merging, no new sub-shots
- Dialogue/narration is extracted from the "CharacterName says: "..."" / "Narration: ..." entries inside the corresponding `【镜头N】` and assigned to that sub-shot's mapped segments; **do not invent new dialogue beyond the description**
- Visual actions follow the `description`; `atmosphere` is only used to supplement each segment's lighting, color tone, and mood descriptions

## Within-Segment Structure

Organize each segment's content in this order (items with no content may be omitted, but action/visuals are mandatory):

**Time range + scene @reference + shot size/camera move + character @reference + main action·expression + dialogue/narration + mood and lighting**

- **The first segment must establish the space**: scene + camera position + each character's position and state, so the audience knows at a glance where we are and whom to watch
- **Cuts**: start a post-cut segment with a transition word such as "cut to / cut back", and restate the shot size and subject; cut points should align with the `【镜头N】` structure in the storyboard `description`
- **Shot size/camera move**: one camera state per segment (close shot / medium shot / wide shot / close-up; static / push / pull / pan / tracking); the camera move is continuous within a single sub-shot and may change after a cut
- **Action**: one main action per segment, with concrete visible verbs (walk, turn around, look up, clench, pause)
- **All emotion must become visible description**: no abstract words like "he is very sad / the mood is tense" — write it as "he lowers his head, fingers clench the rim of the cup, breathing grows heavier"
- **Dialogue/narration**: write "CharacterName says: "line""; narration as "Narration: content"; a long line that cannot be spoken within 3 seconds is split across multiple segments; a segment without dialogue may note ambient/action sounds (e.g. "machines keep roaring")

## Reference Rules

- `@SceneName` — scene reference; the name must exactly match the location in the scene list
- `@CharacterName` — character reference; the name must exactly match the name in the character list
- `@PropName` — prop reference; the name must exactly match the name in the prop list; reference a prop when it is clearly visible in frame, used, or shown in close-up
- During generation, each `@name` is automatically replaced with the corresponding reference-image marker (e.g. `@Xiaoming` → `@Image1Xiaoming`), so names must match exactly — do not abbreviate or add extra symbols
- **Every segment must have at least one @ reference anchoring the frame**; any segment in which a character appears must @ that character; only reference scenes/characters/props already bound to this storyboard segment

## Timeline Rules

- Number of segments = storyboard-segment duration ÷ 3 seconds (rounded up); the segment time ranges must add up exactly to the total segment duration
- Content pacing: the first segment establishes → middle segments advance the action/conflict → the final segment lands on the result or emotional beat

## Prohibitions

- Cross-scene switching, flashbacks (a segment takes place in a single scene only)
- Referencing scene/character names outside the lists
- Abstract psychological description, literary metaphor (the model only recognizes visible imagery)
- Language that does not match the session language directive

## Saving

Call `update_storyboard` to update only this storyboard segment's `video_prompt` field; do not modify any other field, and do not re-breakdown the whole episode.
