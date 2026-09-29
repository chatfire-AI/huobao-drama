# AI service settings

Every AI call in hidrama resolves through a config row in `ai_service_configs`, and the Settings page is the only place that writes one. This feature covers provider configuration, agent instructions and skills, style presets, general settings, storage, and updates.

## Sub-features

- `add-config` adds a text, image, or video provider by hand, with a preset per provider.
- `toggle-config` enables or disables a config; disabled configs are never selected.
- `default-model` marks one model of a config as the type's default.
- `test-config` probes a text config and shows the request it made and the response it got.
- `quick-setup` writes three recommended configs from one vendor key.
- `agent-config` edits one of the four agents' system prompt and its skills.
- `style-presets` maintains the visual styles offered when a project is created.
- `general` sets the language of the generated content.
- `storage` shows usage and migrates the data directory (desktop build).
- `about` shows the version and checks for a server update.

## How to get to it (user POV)

- Choose `Settings` in the header, or open `/settings`.
- Choose a group in the left navigation: `AI Services`, `General`, `Style Presets`, `Agent Config`, `Storage`, `About & Updates`.
- On `AI Services`, choose a type chip under `Manual Templates`, or `Add` in a type group. Choose a config row's pencil to edit, its switch to enable or disable, or its bin to delete.

## Driving it with Chrome CDP

Preconditions:

- `helpers/app.sh start` and `helpers/app.sh doctor` are both clean.
- No network access to a provider is required for everything below, because nothing here calls one.

- **Reach the page.** `await page.goto('/settings')` and `await page.waitFor('.settings-nav')`. The left navigation holds six `.nav-item` buttons in the order `AI Services`, `General`, `Style Presets`, `Agent Config`, `Storage`, `About & Updates`; the first is active on arrival.
- **Open the add dialog.** `await page.click('.template-row .template-type-chip')` — the first chip is the text type. Then `await page.waitFor('form.config-dialog')`. Inside, `.preset-pill` buttons fill the form for a known provider.
- **Fill and save.** The dialog's fields appear in this order: name, provider (`BaseSelect`), priority, `API Key`, `Base URL`, models, and — for the text type only — `Temperature`. Add a model with `.model-add-row input` and its `Add` button, then submit with `.config-dialog button[type="submit"]`.
- **Confirm the row.** The dialog closes and a new `.config-row` appears under its type group with the name, the `has key` tag, the model chips, and the base URL. Read the same values back with `await page.evaluate("return fetch('/api/v1/ai-configs').then(r => r.json())")`.
- **Toggle it.** `await page.click('.config-row .config-switch')` and confirm the tag changes, then confirm `is_active` in the API response.
- **Delete it.** `await page.click('.config-row .btn-danger')` and confirm in the dialog. The row disappears and the API no longer returns it.
- **Prove the banner rule.** The header banner (`.config-banner`) lists the service types that have no active config. With none configured it names text, image, and video; adding one active config of each type removes it.
- **Proof.** Screenshots of the dialog and the resulting row, plus the API read-back before and after the toggle.

## Gotchas

- `Quick Config` calls the vendor at `api.firemux.com` with the key you paste. It needs network and a real key, so it is not part of an offline proof.
- `test-config` sends a real request to the configured base URL. A placeholder URL fails, and that failure is a correct result, not a broken test.
- The verification instance must never hold a real API key. Use an obvious placeholder, and remember that a key typed into this page is stored in plain text in the instance database.
- The type groups are per service type, and the `Add` button in a group preselects that type. The `Manual Templates` chip opens the same dialog with a type you choose inside it.
- Editing a config does not move existing episodes onto it. An episode locks its image and video config when it is created.
- The `Storage` group is desktop-only for migration; under `app.sh start` the page reports the server-side data directory instead.
- `Style Presets` writes rows that the project creation dialog reads. A preset deleted here disappears from that picker on the next load.
