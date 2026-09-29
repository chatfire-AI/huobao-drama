# Railway configuration

This project defines its Railway infrastructure in code.

```txt
.railway/railway.ts
```

Use this file to describe the Railway project you want: services, databases, buckets, custom domains, replicas, groups, and environment variables.

The TypeScript file imports `railway/iac`. Install the SDK from the repository root:

```bash
npm install railway
```

## Common commands

Create the configuration files:

```bash
railway config init
```

Import an existing Railway project into code:

```bash
railway config pull
```

Preview what Railway would change:

```bash
railway config plan
```

Apply the planned changes:

```bash
railway config apply
```

## Manage named partial ownership

These commands use the linked project and environment, including environment-scoped
`RAILWAY_TOKEN` credentials. Release and transfer require environment ADMIN access.
They work even when the original authoring file no longer exists.

List partial names and every owned address:

```bash
railway config partials list
railway config partials list --json
```

Preview moving two services from an orphaned partial to a new or existing partial:

```bash
railway config partials transfer legacy-ops operations \
  --resource service.api --resource service.admin --dry-run
```

Run the same command without `--dry-run` to review the addresses and confirm the
transfer. Omit every `--resource` option to transfer the entire source partial.
Every selected address must currently belong to that source.

Release all ownership held by a partial:

```bash
railway config partials release operations --dry-run
railway config partials release operations
```

Use repeated `--resource ADDRESS` options to release only selected addresses.
Release and transfer change ownership metadata only: they do not delete resources,
change resource configuration, or redeploy anything. They do not edit local files.
All named ownership must be cleared before whole-project planning is available;
releasing one partial is insufficient if another still owns resources.

After release, remove the named partial export (`partial`, `PARTIAL`, or `Partial`)
from your authoring configuration if moving to whole-project management, and run a
fresh `railway config plan`. Ensure that configuration includes the resources you
want to retain, since ordinary whole-project applies can delete omitted resources.
After a transfer, update both partials' configurations to match the new ownership
and re-plan. Applying an old named-partial configuration can reclaim released
ownership. To restore ownership later, use an ordinary named-partial plan/apply.

For automation, `--yes` confirms without prompting. As with `config apply`,
`--json` also proceeds without prompting; add `--dry-run` for a read-only JSON
preview. JSON includes `affectedResources`, the complete resulting `iacPartials`
map (predicted for dry runs), and `wholeProjectAvailable`.

Every mutation sends the preview's existing `Environment.configEtag` and exact
affected addresses. Configuration or ownership changes during review reject the
operation; refresh the preview and review it again. For a separate CI review step:

```bash
railway config partials release operations --dry-run --json > ownership-preview.json
# After reviewing that preview, pass its baseConfigEtag with the same command:
railway config partials release operations \
  --base-config-etag "$(jq -r .baseConfigEtag ownership-preview.json)" --yes --json
```

Ownership operations do not produce a resource ChangeSet, so they do not use
`config plan --out` / `config apply --plan` artifacts or require a `.railway` source
tree. They reuse the same config etag, and ownership changes make previously saved
configuration plans stale. Create a fresh configuration plan after changing
ownership. If a backend has not yet rolled out the ownership mutations, the
command reports the API error without falling back to a configuration apply.

## Notes

- `railway config plan` is safe and does not change Railway.
- `railway config apply` previews changes and asks before applying unless you pass `--yes`.
- Destructive changes in non-interactive or agent sessions require `railway config apply --confirm-destructive` after reviewing the plan.
- CI should pin a plan (`railway config plan --out railway-plan.json`) and apply that file on merge (`railway config apply --plan railway-plan.json --yes --confirm-destructive`) so the reviewed change set is what lands. On GitHub Actions, use https://github.com/railwayapp/config.
- Services already managed by `railway.json` must be migrated before `.railway/railway.ts` can manage them.
- Keep one `.railway` file for the whole project. A named `export const partial` (or `PARTIAL` / `const Partial`) is a last resort for separate repos that cannot share that file. Do not add it unless omit=delete across repos is a blocker.
- Use `replicas` for scaling; advanced placement can still specify region names.
- Use `group("Name", [resources])` to keep large projects organized on the Railway canvas.
- Secrets imported from Railway are rendered as `preserve()` so existing values are retained without writing secret values to source. Use `railway config pull --omit-preserved-variables` for a smaller import. `railway config pull --include-variables` decrypts and inlines non-sealed values (including secrets that were never sealed).
- `railway config migrate` finds every `railway.json` / `railway.toml` in the repository and writes them into this one file.

## This project

The live project is `hidrama`, environment `production`, and this file owns two resources:

- service `app` — builds the repo `Dockerfile` from `infra-soulmate/hidrama` (branch `master`), serves the API and the static frontend on one port, healthcheck `/api/v1/health`
- volume `app-volume` — 50 GB in `asia-southeast1-eqsg3a`, mounted at `/app/data` (SQLite, generated media, editable workspace)

`railway.json` was migrated into this file and removed. Railway needs the GitHub App connected to `infra-soulmate/hidrama` before the first GitHub-sourced deploy can run; `PUBLIC_BASE_URL` is kept as `preserve()` because the live value already points at the service domain.
