# hidrama

The domain model of hidrama: the language the code, the interface, and the product documents share when they name the parts of a short-drama episode pipeline.

## Language

**Drama**:
The top-level container: one short drama, one visual style, and one aspect ratio, holding many episodes.
The interface calls it a project; code and documentation call it a drama.
_Avoid_: series, show, film

**Episode**:
One instalment of a drama. It carries the pasted source text, the rewritten screenplay, the storyboard set, and the merged video.
_Avoid_: chapter, part, scene

**Episode content**:
The source text pasted into an episode, before any rewriting. There is no separate novel or chapter record.
_Avoid_: novel, chapter (as records)

**Asset**:
The umbrella for a drama's characters, scenes, and props. A drama owns its assets; an episode links the ones it uses.
_Avoid_: resource, element

**Character**:
A person in the story, described by appearance (age, build, bearing) and styling (hair, wardrobe, makeup).
_Avoid_: actor, persona, role

**Scene**:
A place at a time. Location plus time is its identity, so the same place at another time is another scene.
_Avoid_: location, set, backdrop

**Prop**:
A plot-relevant object that earns its own image. An episode has at most three.
_Avoid_: item, object, item prop

**Storyboard**:
One shot segment, and one video generation task. This pair is the unit the pipeline counts and the workbench edits.
_Avoid_: shot (for the task unit), panel

**Sub-shot**:
One beat inside a storyboard, written as a bracketed 镜头 marker in the storyboard description. A storyboard holds two to four of them.
_Avoid_: frame, cut

**Final prompt**:
The stored image prompt of one asset, with the project style already attached. It is written once and reused by later generations.
_Avoid_: master prompt, image prompt (for the asset prompt)

**Video prompt**:
The stored video prompt of one storyboard, written in three-second lines with assets named as `@name`.
_Avoid_: motion prompt, video script

**Style preset**:
A named visual style whose prompt fragment is prepended to image and video prompts. A drama stores the preset's value, not the fragment.
_Avoid_: theme, look, filter

**Task**:
One image or video generation row, and its lifecycle: started, run, finished or failed.
_Avoid_: job, run, request

**Provider**:
The vendor behind an AI service configuration, and the source of the model list.
_Avoid_: service, backend

**AI service config**:
One stored provider configuration: type, provider, base URL, key, models, priority, and active flag. Settings is its only writer.
_Avoid_: credentials, API config, connection

**Active config**:
The highest-priority active config of a service type whose provider is official. It answers a request that names no config.
_Avoid_: default config

**Extraction**:
The agent job that reads an episode's screenplay and writes the assets it names. Characters, scenes, and storyboards are extracted separately.
_Avoid_: parsing, analysis

**Dedup**:
Reusing an existing asset instead of creating a duplicate when the same person, place, or object is extracted again. Characters and props match by normalized name; scenes match by location plus time.
_Avoid_: merge, matching

**Merge**:
Joining a drama's storyboard videos into one episode video. The result is 成片.
_Avoid_: render, export, stitch (as a noun)

**Pipeline step**:
One of the seven stage checks an episode reports: script rewrite, character extraction, scene extraction, storyboard extraction, image generation, video generation, and merge. A step is pending, ready, partial, or done.
_Avoid_: stage, phase, milestone

**UI language**:
The language of the interface, one of zh, en, ja, or ko. It lives in the browser.
_Avoid_: locale, app language

**Content language**:
The language of everything the agents write: screenplays, extracted fields, storyboard descriptions, prompts, and new asset names. One control sets it, and it follows the UI language.
_Avoid_: output language, AI language

**Episode asset**:
An asset an episode links and can use.
_Avoid_: asset library

**Asset library**:
The legacy unified asset table and its interface. It is not an episode's asset list.
_Avoid_: —
