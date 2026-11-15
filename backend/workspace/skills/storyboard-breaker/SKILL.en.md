---
name: storyboard-breaker
description: Professional rules for storyboard breakdown — splitting a script into storyboard segments that each carry multiple sub-shots
---

# Storyboard Breakdown Guide

## Core Definition: Storyboard Segment

One storyboard = one **storyboard segment** = one video-generation task.

- Each segment is **8-15 seconds** long and internally carries **2-4 sub-shots**
- Cuts between sub-shots **are allowed**: change shot size, angle, or subject, joined with hard cuts
- Sub-shots **never cross scenes**: a segment takes place in a single scene (`scene_id` is a segment-level binding)
- Each sub-shot is 2-6 seconds, focused on one visual unit (one action, one reaction, one close-up)

## Breakdown Process (Four Steps)

1. Call `read_storyboard_context` to read the script, characters, scenes, props, and existing storyboard summaries
2. **Beat identification**: first identify the script's narrative beats — markers such as [Opening] [Trigger] [Climax] [Resolution], or narrative turning points (location changes, rule reveals, emotional eruptions, reversals). **Beat boundaries force a segment cut**; group sub-shots within the same beat into the same segment where possible, and do not scatter a causal chain (setup-event-reaction) across different segments
3. **Total-volume anchoring**: target total duration = script character count ÷ 500 characters/minute; segment count ≈ target total duration ÷ 12 seconds, with ±20% tolerance. Do not significantly overshoot or undershoot
4. **Split sub-shots within each segment**: cut sub-shots at action-change points, viewpoint-change points, and subject-change points; after filling in all fields for each segment, call `save_storyboards` to save them in one go

## Pacing-Tier Durations

Determine duration by the segment's function — do not use one size for all:

| Segment type | Duration | Notes |
|---|---|---|
| Transition segment | 8-10 s | Traveling, empty shots, environment establishment, transitions |
| Narrative segment | 10-15 s | Regular plot advancement, dialogue |
| Payoff segment | 12-15 s | Close-ups, rule reveals, emotional eruptions, reversals; slower sub-shot pacing, a single sub-shot may hold for 4-6 s |

## Dialogue Duration Floor (Hard Rule)

**Segment duration ≥ total character count of dialogue and narration within the segment (the part written in description) ÷ 4.5 characters/second + 2 seconds of performance headroom**

Dialogue that does not fit must be moved to the next segment; cramming unperformable dialogue into one segment is not allowed.

## Shot Elements

1. **Shot title**: a 3-5-character summary of the segment's core content (e.g. "Nightmare Awakening")
2. **Time**: specific time of day + lighting description
3. **Location**: full scene description + spatial layout + environmental details
4. **Shot size**: the dominant shot size of the segment; for multi-size segments write a combination, e.g. "medium shot + close-up"
5. **Angle**: eye-level / low angle / high angle / side / back
6. **Camera move**: static / push-in / pull-back / pan / tracking / dolly (different sub-shots within a segment may differ)
7. **Visual description** `description`: describe sub-shot by sub-shot as `【镜头1】…【镜头2】…` what the audience actually sees and hears — the visuals (who + specific action + body-language details + expression) come first; when a sub-shot has dialogue, write it inside the corresponding `【镜头N】` as "CharacterName says: "line"", and narration as "Narration: content"
8. **Visual result** `result`: the immediate consequence at the end of the segment + visual details
9. **Atmosphere** `atmosphere`: lighting + color tone + sound + overall mood
10. **Duration** `duration`: total segment duration 8-15 seconds, and it must satisfy the dialogue duration floor
11. **Scene binding**: if it can be matched to an existing scene, `scene_id` must be filled in
12. **Character binding**: fill in `character_ids`, binding 0 to multiple characters involved in this segment
13. **Prop binding**: fill in `prop_ids`, binding 0 to multiple key props appearing in this segment

## Scene Binding Rules

- Prefer the `scenes` returned by `read_storyboard_context`
- When `location + time` can be clearly matched, the correct `scene_id` must be filled in
- Do not fabricate scene IDs that do not exist
- If the script content clearly falls within an existing scene, do not create a duplicate new scene description

## Character Binding Rules

- `character_ids` must be chosen from the character list returned by `read_storyboard_context`
- A segment may have no characters, or may bind multiple characters
- Any character with a clear appearance in the segment — seen, acting, or speaking — should be bound
- Pure-environment segments, empty shots, and object close-ups may pass an empty array

## Prop Binding Rules

- `prop_ids` must be chosen from the prop list (`props`) returned by `read_storyboard_context`
- When a prop is used by a character, handed over, shown in close-up, or clearly visible in frame and meaningful to the narrative, it must be bound to that segment
- Prop close-up segments (without characters) should also bind the prop; `character_ids` may be empty
- Do not bind background items or set dressing irrelevant to the plot; segments with no props pass an empty array
- Bound props serve as reference images for video generation (white-background product shots), keeping the prop's appearance consistent across segments

## Quality Requirements

- `description` should be human-readable, describing sub-shot by sub-shot what the audience actually sees and hears; dialogue/narration is written directly inside the corresponding `【镜头N】`
- `image_prompt` should highlight the single-frame composition, character appearance, environment, and lighting (corresponding to the segment's first sub-shot)
- `bgm_prompt` and `sound_effect` may be concise phrases, but must not be as vague as just "tense" or "sad"
- To make adjustments, call `update_storyboard` to modify the specific segment
