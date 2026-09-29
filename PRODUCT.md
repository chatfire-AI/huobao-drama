# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

The product ships as a hosted web service and as an Electron desktop build. The Electron shell renders the same web UI, so the design language stays web.

## Users

Each client is a tenant. The users of one client share a single workspace, and more than one of them works on the same dramas.

A user is a member of a client's production team who makes short dramas. They work inside the shared workspace: one person pastes the source novel and rewrites the script, another reviews the extracted characters and generates their reference images, another writes the storyboard and starts the video tasks, and the finished episode is exported from the same place.


## Product Purpose

The product turns a written novel into a finished short-drama episode. One episode flows through the whole pipeline inside the product: script rewrite → asset extraction → AI image generation → storyboard breakdown → AI video generation → FFmpeg stitching → export.

Success means that a client's team can run that whole pipeline in its shared workspace, from the first pasted chapter to the exported file, without leaving the product for another tool.

## Positioning

The product owns the whole episode pipeline end to end, in one place. A single-shot video tool cannot make that claim.

The mechanism behind the claim is the asset library. Characters, scenes, and props are extracted once, given a reference image each, and then feed every storyboard video prompt through `@character` references. One face and one place stay recognisable across an episode because the shots read from one shared source of truth rather than from a prompt written again each time.

## Operating Context

- The user works in a browser at the service address. A packaged desktop build of the same UI exists for local use.
- AI service configuration is set in Settings and stored in the database. API keys, base URLs, and model parameters never live in config files or environment variables.
- Generation is asynchronous. The backend writes a task row, calls the provider, polls it, downloads the file, and writes the result back. The interface shows progress by polling that row.
- Image and video tasks are long-running and cost money. The user starts them in batches and retries the failures.
- The interface ships in 中文 / English / 日本語 / 한국어, with a separate setting for the language of the generated content.
- Aspect ratio (16:9 or 9:16) is chosen when a drama is created and is fixed after that. A visual style preset is chosen at the same time and is injected into every image prompt.

## Capabilities and Constraints

### Built

- The six pipeline stages, and four agents that own four of the jobs: `script_rewriter`, `extractor`, `storyboard_breaker`, `prompt_generator`. Agent instructions assemble per request from `backend/workspace/prompts/` plus the skills in `backend/workspace/skills/`, and the user can edit the skills in the interface.
- Text providers: OpenAI-compatible endpoints and Gemini. Image providers: OpenAI, Gemini, and Volcano Engine. Video providers: Volcano Engine Seedance 2.0, MiniMax, and Alibaba Bailian Wan 3.0.
- Storage is one SQLite file in WAL mode plus a static-file directory. FFmpeg and FFprobe ship with the product.
- A one-click quick setup writes three provider configurations from a single vendor key.

### Constraints

- The data model is single-workspace. No account, login, session, or tenant isolation exists in the code today. A `research/auth` branch exists, and Railway deployment config was added, but tenancy is a plan and not a built feature.
- One SQLite file per deployment bounds the service to a single node.
- The repository ships the upstream license, CC BY-NC-SA 4.0 (non-commercial, share-alike). A paid tenant service and this license are in conflict until the licensing question is settled.
- The code must stay mergeable with upstream `chatfire-AI/huobao-drama`: no wide renames, file moves, or structural refactors. Brand, copy, and the visual layer may diverge; code structure may not.

### Undecided

- The pricing and billing model.
- How a client tenant is isolated and provisioned — one deployment per client, or isolation inside one deployment.
- Whether the packaged desktop build stays a shipped distribution alongside the hosted service.

## Brand Commitments

- The product name is **hidrama**, and it appears everywhere a user sees the product: interface chrome, window title, package name, and READMEs.
- The upstream names 火宝短剧 / Huobao Drama / Huobao Shorts are still in the interface today (`frontend/app/layouts/default.vue`, the Settings page, the READMEs). They are to be replaced, and they are not part of the product identity.
- The only mark in the repository is the firelumi flame used for the desktop icons. It carries no name or meaning anywhere in the code, and its role is not decided.
- New user-facing strings go into all four locale files in `frontend/app/locales/` and are read through `t()`. Chinese product text stays Chinese where it already exists; new written content is English.

## Evidence on Hand

- Nine product screenshots, one per pipeline step: `docs/screenshots/01-projects.png` … `docs/screenshots/09-export.png`.
- `README.md` and its translations `README.zh-CN.md`, `README.ja.md`, `README.ko.md`, with the feature list, the walkthrough, and the provider table.
- `drama.png`, `donate.png`, and `docs/images/wx-group.jpg`.
- The upstream project links: `https://github.com/chatfire-AI/huobao-drama`, the release page, `https://www.chatfire.site`, and the key vendor `https://api.firemux.com`.

Absences that future work must not fill in: there are no customers, testimonials, benchmarks, usage numbers, case studies, or prices. There is no hidrama logo file other than the firelumi desktop icons.

## Product Principles

1. One episode, one place. Any stage that forces the user into another tool is a defect, not a gap.
2. The asset library is the source of truth. Consistency between shots comes from one shared reference set, never from re-writing a prompt.
3. The client's workspace is the unit of work. Sharing, isolation, and history are decided at that boundary.
4. Bring your own providers. The key and the model choice stay in Settings, and no vendor is welded into the product.
5. Differ from upstream in brand and surface, never in code structure. The upstream fixes keep arriving.
