---
name: scene-prompt
description: Final scene prompt specification — a clear wide-angle establishing shot: fixed relative positions of foreground/midground/background/entrances/floor/walls/key set dressing; spatially continuous, self-consistent, reusable, no people
---

# Final Scene Prompt (wide-angle establishing shot · empty scene with no people)

What is generated is a **clear wide-angle establishing shot** scene image: a pure empty shot of the scene with **absolutely no people**, fully showing the **fixed relative positions of the foreground, midground, background, entrances/exits, floor, walls, and key set dressing** — spatially continuous, self-consistent, and reusable.

This image serves as the background reference anchor for every shot in this scene: both the audience and the model must be able to read the entire spatial layout from it — where one enters and exits, what the floor and walls feel like, and where each key piece of set dressing is fixed. The viewpoint must be stable and general-purpose.

## Output Structure (assemble a single coherent passage in this order, following the session language directive)

```
Fixed-camera wide-angle shot, a clear establishing shot, [location + period texture], [time period];
three-layer composition of foreground ([foreground elements]), midground ([main space of the midground]),
and background ([depth of the background]);
entrances/exits ([position and style of doors/passages]), floor ([floor material and condition]),
walls ([wall material and color]);
[key set dressing and its fixed relative positions];
spatial structure continuous and self-consistent;
[light sources + color temperature + brightness contrast], [mood];
No people in the scene, empty scene, cinematic quality
```

## Spatial Structure Rules

The space must be **readable, consistent, and reusable**:

- **Foreground**: framing/occluding elements (door frames, table corners, plants, equipment edges) that create depth — write 1-2 specific elements
- **Midground**: the scene's main space and core set dressing (assembly line, beds, counter)
- **Background**: the extension of the space (distant walls, windows, corridors, city skyline)
- **Entrances/exits**: the position and style of doors, stairs, and passages must be explicit (e.g. "an iron door on the left of the frame") — this is the basis for staging character entrances and exits in later shots
- **Floor and walls**: make material, color, and condition specific (e.g. "oil stains on the concrete floor", "mottled lime plaster on the walls")
- **Key set dressing**: write 2-4 core pieces and their **fixed relative positions** (e.g. "the assembly line runs along the wall, ending at the bar counter"); the left-right/near-far relationships among pieces must be self-consistent — do not just list item names

## People (Hard Rule · Highest Priority)

**No people of any kind may appear in the scene image — keep only the scene itself.**

- The prompt must not describe people or mention anything related to people
- Any human information appearing in the scene description (prompt) must be ignored and not written into the prompt
- The prompt must end with: "No people in the scene, empty scene"

All set dressing, period texture, and key visual elements in `prompt` (scene description) must be carried through; `lighting` (scene lighting) must be made specific: light-source direction, warm/cool color temperature, brightness contrast (e.g. "overhead tubes emit cold white light, casting hard shadows beneath the machines").

## Viewpoint & Atmosphere

- A stable eye-level or slightly high-angle wide shot; no extreme high/low angles, fisheye, or tilted composition (it will be reused repeatedly as a fixed scene)
- Determine the time period and overall lighting scheme from `location` + `time` (day / night / dusk are completely different lighting schemes)
- Make mood words concrete: "oppressive" → "stifling air, dim and low light"; do not write only abstract emotion words
- Do not mix unrelated words into the output

## Prohibitions

- Any people — **no people of any kind may appear in the scene image; keep only the scene itself**
- Text, readable text on signboards, watermarks, signatures
- Motion blur, objects in motion (the scene reference image must be still and stable)
- Merely listing set dressing without giving relative positions (the spatial structure must be continuous and self-consistent)

## Saving

Call `save_scene_final_prompt`: the prompt parameter contains no style words — **the project's visual style is automatically injected by the tool at the very front of the final prompt**.
