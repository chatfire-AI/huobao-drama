# AI agents

Four Mastra agents own the four AI jobs. Their instructions come from files, their tools write directly to the database, and their model is resolved per request.

## The four agents

| Agent id | Role | Tools |
|---|---|---|
| `script_rewriter` | Novel to formatted screenplay | `read_episode_script`, `rewrite_to_screenplay`, `save_script` |
| `extractor` | Extract and deduplicate characters, scenes, props | `read_script_for_extraction`, `read_existing_characters`, `read_existing_scenes`, `read_existing_props`, `save_dedup_characters`, `save_dedup_scenes`, `save_dedup_props` |
| `storyboard_breaker` | Screenplay to storyboards | `read_storyboard_context`, `save_storyboards`, `update_storyboard` |
| `prompt_generator` | Final image prompts and video prompts | `read_characters`, `save_character_final_prompt`, `read_scenes`, `save_scene_final_prompt`, `read_props`, `save_prop_final_prompt`, plus `read_storyboard_context` and `update_storyboard` |

The registry lives in `backend/src/agents/index.ts`. `AGENT_TOOLS` maps each agent id to its tool set. The `prompt_generator` agent shares two storyboard tools so it can also write `video_prompt`.

`backend/src/mastra/index.ts` mounts the registry on a `Mastra` instance with `logger: false`, because the project already has its own logging.

## Instructions are files

Instructions are resolved per request by `buildInstructions(type)`. The result is the concatenation of three parts:

1. The base prompt — `backend/workspace/prompts/<type>.md` when present, else `DEFAULT_PROMPTS[type].instructions` in code.
2. The full text of the agent's skills.
3. The output-language directive.

`DEFAULT_PROMPTS` is a real fallback, not dead code. When a prompt file is missing, the code default keeps the app working.

### Prompt file format

`backend/src/agents/prompts.ts` parses a frontmatter block with two scalar fields and no YAML dependency:

```
---
name: 分镜拆解
model: ""
---
<system prompt body>
```

- `model` overrides the text model. An empty value means "use the AI service default".
- `model` is read only from the base (Chinese) file, never from a language variant, so translations cannot drift the model.
- The Settings page writes these files through `PUT /prompts/:type`.

### Language variants

For a non-`zh` content language, the loader prefers `<type>.<lang>.md` and falls back to the base file. `GET /prompts/:type?lang=en` reports `is_default: true` when the content shown is actually the fallback, and the UI labels it "follows Chinese".

The same pattern applies to skills: `SKILL.<lang>.md` next to `SKILL.md`. Skill variants are read directly from the filesystem to bypass the skill cache, so an edit is always current.

## Skills

Skills are `SKILL.md` directories under `backend/workspace/skills/`. `AGENT_SKILL_MAP` in `agents/skills.ts` maps each agent to a directory prefix:

```
script_rewriter    → script-rewriter
extractor          → extractor
storyboard_breaker → storyboard-breaker
prompt_generator   → prompt-generator/character-prompt,
                     prompt-generator/scene-prompt,
                     prompt-generator/prop-prompt,
                     prompt-generator/video-prompt
```

Prefix matching means every `SKILL.md` in a directory and its subdirectories is injected. A new sub-skill created in Settings is picked up without a code change, because the skill resolver is a function that rescans on demand.

Skill text is injected **in full** into the instructions. Mastra's native skill support injects only metadata, and this codebase found that insufficient for consistent behavior.

### Why the filesystem instructions are overridden

`skills.ts` replaces Mastra's default filesystem description with a Chinese string that contains no "workspace" word:

```ts
const FILESYSTEM_INSTRUCTIONS =
  '本地文件目录：用于读写技能定义、提示词等项目文件。相对路径均以此目录为根解析；文件访问仅限此目录之内。'
```

The file comment explains the bug this fixes. The default text includes an absolute path containing the directory name `workspace`. Under Gemini's low-thinking setting, the model sometimes reinterpreted "workspace" as Google Workspace and then refused the tool call on "organization policy" grounds.

The workspace root is `WORKSPACE_PATH` when injected (desktop and Docker use a writable copy under the data directory) and `backend/workspace` in dev. All skill and prompt file access goes through a jailed Mastra `Workspace` filesystem.

After the base (Chinese) skill or prompt file changes, the route calls `refreshSkillWorkspaces()`, which calls `maybeRefresh()` and then `refresh()`. Both are needed: a directory `mtime` does not change when a file inside it is edited, so the staleness check alone is unreliable.

## Request context

The HTTP route builds a Mastra `RequestContext` per request (`agents/context.ts`):

```ts
buildAgentRequestContext({ episodeId, dramaId, modelOverride, textConfigId, language })
```

Tools read `episodeId` and `dramaId` from it through `getEpisodeId` and `getDramaId`. This is why tools are module-level singletons and why the agent never needs an id in a prompt.

The language is resolved once, at context construction, so all four call paths — chat, extraction, image prompts, and video prompts — obey one global setting. An explicit `values.language` overrides it.

When `episodeId` or `dramaId` is missing, `requireIds` returns an error object and the tool does nothing. This prevents an agent from writing to the wrong episode.

## Tool design rules

Three patterns repeat across `agents/tools/`.

**Tools own validation and persistence, not the model.** `save_dedup_characters` merges or creates, `validateStoryboardBindings` checks ownership and auto-links, and `save_character_final_prompt` prepends the project style. The model supplies content; the tools supply invariants.

**Saves are the only writes.** Read tools return JSON summaries with the ids the model needs. Save tools take ids. A model that hallucinates a name cannot corrupt the database, because it must pass a real id.

**Batch saves carry a replace flag.** `save_storyboards` uses `replace_existing: true` on its first call to clear old shots, then appends. This makes a full regeneration deterministic.

## Model resolution and request patches

`getModel(fileModel, modelOverride, textConfigId)` resolves the text configuration in this order:

1. `textConfigId` from the request.
2. Else the currently active text config.
3. The model name is `modelOverride`, else the prompt file's `model`, else the config's first model.

The provider is constructed with `createGoogleGenerativeAI` for Gemini and `createOpenAI` for everything else. Base URLs are normalized per provider in `services/ai.ts`:

| Provider | Prefix applied |
|---|---|
| `openai` | `/v1` |
| `gemini` | `/v1beta` |
| `volcengine` | `/api/v3` |

### The fetch patch chain

Some relay services and domestic providers break a multi-step agent loop unless request bodies are adjusted. The backend wraps `fetch` with three patches, applied in this order:

1. **Thinking off** (`createThinkingOffFetch`) — enabled by default; `AI_DISABLE_THINKING=false` disables it. It is skipped for official OpenAI and Gemini hosts, which reject unknown parameters.
   - OpenAI-compatible body: `thinking: { type: 'disabled' }`, `enable_thinking: false`, `reasoning_effort: 'none'`.
   - Gemini body: `thinkingConfig`. Gemini 3 models need `thinkingLevel: 'low'`; 2.x and earlier need `thinkingBudget: 0`. The code picks by sniffing `gemini-3` in the URL or body, because the parameter was renamed and the old one is rejected.
   - `AI_THINKING_OFF_PATCH` overrides the OpenAI-style patch with JSON.
   - The reason from the comment: relay services in the `new-api` family force `reasoning_content` to be echoed on later turns, which the agent loop cannot do, producing a 400.
2. **Temperature** (`createTemperatureFetch`) — only when the config sets one. Some models accept one fixed value, such as `kimi-k2`, and reject anything else.
3. **Max tokens** (`createMaxTokensFetch`) — default `16384`, overridable with `AI_MAX_TOKENS`. Skipped for official OpenAI. It sets `max_tokens` (OpenAI-compatible) or `maxOutputTokens` (Gemini).
   - The reason from the comment: provider defaults are small, so a model writing a plan plus tool calls gets truncated and finishes with a normal stop but no save. The symptom is "the agent finished and saved nothing".

Each patch parses the outgoing body, edits it, and re-serializes. A parse failure passes the request through untouched.

## The chat route

`POST /api/v1/agent/:type/chat` is non-streaming. It requires `drama_id` and `episode_id`, rejects an unknown agent type, and runs:

```ts
const result = await agent.generate([{ role: 'user', content: message }],
  { maxSteps: 20, requestContext })
```

`maxSteps: 20` bounds the tool-calling loop. The response normalizes tool calls and results across Mastra chunk shapes, because the shape changed between versions, and returns `{ type: 'done', text, toolCalls, toolResults }`.

`GET /agent/:type/debug` is a validity probe.

## The output-language directive

`agents/language.ts` appends a directive when the content language is not `zh`. For `zh` it returns an empty string, so the default behavior has no extra tokens.

The directive is written in English because multilingual models follow it best. It declares itself highest priority and explicitly overrides conflicting rules such as "output must be pure Chinese". That override is required for existing desktop installs: their workspace template is copied once and never overwritten, so an old `SKILL.md` can still contain the Chinese-only rule.

Two exceptions are stated: `@` asset names must match exactly and must not be translated, and the English style prefix is added by the system and must not be duplicated.

## Cost and reliability notes

- Extraction and video-prompt batches are in-memory `Map`s. A restart loses the status, though saved data remains.
- Every agent call re-resolves the model, so changing a config takes effect on the next call without a restart.
- Endpoint logging is deduplicated by key, so a 20-step loop prints the model endpoint once.
- `redactUrl` masks `key`, `api_key`, `token`, and similar query parameters before logging.

## Related pages

- [workflows/production-pipeline.md](production-pipeline.md) — where each agent sits in the flow
- [operations/configuration.md](../operations/configuration.md) — AI service configs, content language, prompt editing
- [architecture/data-model.md](../architecture/data-model.md) — the tables the tools write
