# Local GB10 deployment

Upstream snapshot: `76bf150` (CC BY-NC-SA 4.0; commercial use requires license review).

## Locations

- Local development: `E:\mine\movies\huobao-drama`
- node0 deployment: `/home/node0/huobao-drama-local`
- UI: `http://192.168.110.148:5679`
- Data: `local-data/app` (SQLite/media/workspace), `local-data/bridge` (durable upstream task mappings).
- Secrets: `.env` on node0; do not commit or share.

## Operations

Run in deployment directory:

```sh
docker compose -p huobao-local -f compose.local.yml up -d --build
docker compose -p huobao-local -f compose.local.yml ps
docker compose -p huobao-local -f compose.local.yml logs --tail=100 app comfy-bridge
python3 local-comfy/bootstrap.py
```

No Watchtower or Docker socket mounted. Existing containers are unrelated and must not be stopped.
Backend source is mounted read-only so local compatibility changes remain auditable; restart app after backend edits. Frontend edits require image rebuild.

## Supported capabilities

- `comfyui` image provider: Qwen Image 2512; reference images automatically select Qwen Image Edit 2509 (maximum three references).
- `comfyui` video provider: Wan 2.2 14B + LightX2V four-step LoRAs; 480p/720p; 2–5 seconds; 16fps; silent MP4.
- Images are proportionally limited to about 1 megapixel, aligned to multiples of 16.
- Platform multi-reference requests first create a tracked image-edit composition task, then upload its single first frame to the video node.
- Explicit first-frame API requests skip composition.
- No tail-frame, reference-audio/video, audio generation or 1080p video support.
- Bootstrap does not configure text models: script rewriting/extraction/storyboard/prompt agents require a separately authorized model endpoint in Settings.

## Grok / xAI video

- Select **Grok / xAI** for video services, not MiniMax or OpenAI. Use `https://api.x.ai/v1` or an xAI-compatible relay base URL; `/v1` is added only when needed.
- Submission: `POST /v1/videos/generations`; polling: `GET /v1/videos/{request_id}`. Relays must implement this native protocol.
- Default model: `grok-imagine-video-1.5`; supports 1–15 integer seconds, native audio, first/last frames, and up to 14 reference images. References are never silently truncated for Grok.
- Reference-image/last-frame mode supports up to 720p. Version 1.5 text-to-video and single-first-frame requests also support 1080p. Classic `grok-imagine-video` has lower limits (7 references, 10 seconds for reference mode, 720p).
- Custom audio/video file references and mid-video keyframes are not exposed by this adapter. Preset voice selection is not implemented.
- Store API keys in Settings, never in source files. Provider connectivity probes do not generate a video; a successful probe is not an end-to-end generation test.
- Backend checks: `npm run typecheck` and `node --import tsx --test tests/grok-video.test.ts` from `backend/`. Frontend: `npm run generate` from `frontend/`.

## Reliability and security

- Bridge only listens on the Docker private network and requires a random bearer token.
- Upstream ComfyUI addresses are fixed by deployment environment, not by callers.
- Requests use persistent idempotency keys; ambiguous upstream submissions are never automatically resubmitted.
- Polling resumes from stored upstream IDs for video tasks. An interrupted image/composition task may require manual review; inspect original queues before retrying.
- The platform itself is LAN-only, not a public authenticated production service. Do not forward port 5679 to the Internet. Set firewall/access control before broader access.
- Back up the app SQLite database with SQLite backup API or stop only this app before copying its data directory. Back up bridge task DB as well. Never delete data volumes during upgrades.

## Tests

```sh
cd local-comfy
python3 -m unittest -v test_bridge.py
```

Seven tests cover image/edit workflow construction, video MP4 workflow, unsupported parameters, idempotency, ambiguous failure handling, output URLs and terminal execution errors. Real model smoke tests are additional to unit tests.
