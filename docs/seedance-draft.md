# Seedance 2.5 Draft workflow

Drafts let you inspect a shot before requesting its final render. This is an
optional addition to the existing reference-video workflow; normal generation,
existing projects, and saved Seedance 2.0 defaults are unchanged.

## Use

1. Add `doubao-seedance-2-5-260628` to a Volcengine video configuration in Settings.
   The official provider template includes it as an additional choice, retaining
   its existing default model. Your account or gateway must support this model.
2. Select this model in the episode's video workbench. A **Seedance 2.5 Draft**
   panel appears for the selected shot.
3. Generate a **480p draft**. This is a charged generation request, not a free
   preview. The downloaded preview remains separate from the main shot video.
4. Approve the preview to request a **1080p final video**. This is another charged
   request. Its prompt, references, duration, ratio, seed, and audio are inherited
   by the provider; editing the shot after creating a draft does not change that
   draft. Generate another draft to change those inputs.

Draft task IDs created from 2026-10-28 10:00 Asia/Shanghai are valid for 14 days;
earlier task IDs are valid for 7 days. Local preview files remain playable after
the upstream task expires, but cannot then be promoted. The expiry check uses the
local task creation timestamp conservatively; the provider makes the final
availability decision.
If a provider returns an earlier expiry, that shorter limit takes precedence.
An explicit provider response indicating that the result is not a Draft blocks
promotion. Both stages persist a separate UUID request identifier and send it as
`Idempotency-Key`; providers may differ in whether they honor this optional header.

## Persistence and recovery

- Draft metadata and the final task association are stored in `sys_task.params`;
  no schema migration or historical backfill is needed.
- Only the final video can automatically update the shot's main video. Drafts
  are excluded from its final-video history and delivery status.
- Repeated approval returns the existing final task, including after restart.
  A receipt on the draft prevents a deleted child record from causing another
  submission. An uncertain or failed child is not automatically regenerated.
- Existing task recovery resumes polling or local delivery, never resubmitting
  a known provider task. The Draft panel exposes recovery for recoverable failures.
- A final task stays pinned to the draft's original provider configuration and
  model. Deleted, disabled, or changed provider endpoints are rejected.

## HTTP contract

- `POST /api/v1/tasks`: existing video fields plus optional boolean `draft: true`.
  Requires an explicit supported model. Draft resolution is forced to 480p even
  when the episode's normal resolution is different.
- `POST /api/v1/tasks/:id/finalize`: `:id` is the local draft task ID. No creative
  parameters are accepted from the client. The server resolves the saved upstream
  ID and sends only model, `content[].draft_task.id`, 1080p, and watermark settings.
- Existing task GET/recovery endpoints expose both stages using their original
  status values; a draft is a completed preview, not a completed main shot.

This contribution does not introduce a wallet, price estimates, or billing ledger.
Charges are applied by the configured provider. It does not claim every Seedance
2.5 capability: the existing reference-input UI and its conservative media count
limits are retained. Draft generation is per-shot; batch Draft approval is not added.
Seedance 2.0, Fast, and Mini do not enable this Draft workflow.

## Validation

From `backend/`:

```sh
node --import tsx --test tests/seedance-draft.test.ts
npm run typecheck
```

The test uses an isolated SQLite database and a loopback HTTP provider, with no
real credentials or paid model calls. It covers request compatibility, both HTTP
stages, local file delivery, negative cases, duplicate confirmation, process
restart, and deletion of the final history record.

From `frontend/`: run the existing tests with `node --test tests/*.test.mjs` and
build the static site with `npm run generate`. Inspect the episode at 1280×720,
1440×900, 1920×1080, and a narrow viewport.

Official contract checked on 2026-10-30:
[Seedance 2.5 Draft mode](https://docs.volcengine.com/docs/ark/seedance-2-5?lang=zh)
and [create video task API](https://docs.volcengine.com/docs/ark/create-video-generation-task-api?lang=zh).
