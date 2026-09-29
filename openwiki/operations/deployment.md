# Deployment

There are three deployment forms: server, Docker, and desktop. All three run the same backend and the same frontend build.

## Server deployment

```bash
cd frontend && npm run generate      # must be generate, not build
cd backend && npm start              # tsx src/index.ts
```

`npm run build` (`nuxt build`) does not emit `index.html`, so a static host cannot serve the result. The backend's SPA fallback serves `index.html` for unknown paths, and only `generate` produces it.

Set `FRONTEND_DIST` when the built frontend is not at the default `frontend/dist`. Set `PUBLIC_BASE_URL` when video generation must reference local video, audio, or file material, because the provider must be able to fetch those URLs. See [workflows/media-generation.md](../workflows/media-generation.md).

## Docker

The `Dockerfile` has three stages.

1. **frontend-build** — `npm ci` and `npm run generate` in `frontend/`.
2. **backend-build** — `npm ci` in `backend/`, then `npm prune --omit=dev` and a separate `tsx` install. The comment explains why `tsx` is needed: the source uses bundler-style extensionless imports, so compiled `tsc` output cannot run directly under Node.
3. **runtime** — copies `backend/src`, `node_modules`, `workspace-template`, and the frontend dist. It sets `HUOBAO_DATA_DIR=/app/data`, `SQLITE_PATH`, `WORKSPACE_PATH=/app/data/workspace`, and `FRONTEND_DIST=/app/frontend-dist`.

Both build stages delete the `resolved` field from their lockfiles before `npm ci`. The comment explains: a lockfile can carry a private-registry URL from a developer's `.npmrc`, and the registry rejects it inside the image. Integrity hashes are unaffected.

The runtime has a `HEALTHCHECK` that fetches `/api/v1/health` every 30 seconds.

### entrypoint.sh

```sh
if [ ! -e /app/data/workspace/.template-version ]; then
  mkdir -p /app/data/workspace
  cp -a /app/workspace-template/. /app/data/workspace/
  touch /app/data/workspace/.template-version
fi
exec node_modules/.bin/tsx src/index.ts
```

This is the same copy-once semantics as the desktop app: the workspace template moves into the data volume on first run, so prompts and skills stay editable and survive container replacement.

### Compose and Watchtower

`docker-compose.yml` runs two services. `app` publishes port 5679 and mounts the named volume `huobao-data` at `/app/data`. `watchtower` watches containers labelled `com.centurylinklabs.watchtower.enable=true` and pulls new images.

The app and Watchtower share a token:

- `WATCHTOWER_TOKEN` in the root `.env` feeds both services.
- The app reads `HUOBAO_WATCHTOWER_URL` and `HUOBAO_WATCHTOWER_TOKEN`.

When `HUOBAO_WATCHTOWER_URL` is unset, the update mode is `manual` and the UI shows the `docker compose pull && docker compose up -d` instructions instead of an update button. The comment in `services/server-update.ts` states the principle: a container is immutable, so in-container self-update is an anti-pattern and the correct path is for Watchtower to replace the container.

Version checks reuse the desktop release manifest. `HUOBAO_VERSION` is a build argument and is reported by the health endpoint.

## Desktop packaging

From the repo root, `npm run dist` runs the chain. Individually:

```bash
cd desktop
npm run build:backend       # backend/src → build/backend.mjs (esbuild, ESM)
npm run build:main          # src/main.ts + src/preload.ts → dist/ (esbuild, CJS)
npm run dist                # prepare-resources + electron-builder --mac
npm run dist:win            # prepare-resources + electron-builder --win
```

`prepare-resources.mjs` fails with a clear message when `frontend/.output/public/index.html` is missing, so run `npm run generate` first.

### Output artifacts

| Target | Artifacts |
|---|---|
| mac (arm64 and x64) | `HuobaoDrama-<v>-arm64.dmg`, `HuobaoDrama-<v>.dmg`, and matching `-mac.zip` files for the in-app updater |
| win (x64) | NSIS installer `HuobaoDrama Setup <v>.exe` |

The zip target exists only because the macOS updater replaces the `.app` bundle; a dmg cannot be applied in place. See [architecture/desktop.md](../architecture/desktop.md).

### Signing status

Both platforms ship unsigned. `identity: null` on macOS and `signExecutable: false` on Windows are configured with the positions reserved for signing. The consequences are documented in the config:

- macOS quarantines a browser-downloaded unsigned app, and Gatekeeper may report "damaged". The dmg therefore includes a `如提示已损坏请双击我.command` script that runs `xattr -cr` for the user.
- Windows SmartScreen warns on an unsigned installer.

### Cross-build caveats

`dist:win` runs on macOS and needs two cached prebuilt artifacts under `desktop/build/win-bin/`: `ffmpeg.exe` and `better_sqlite3.node`. Both scripts print the download URL when the file is missing. See [architecture/desktop.md](../architecture/desktop.md).

## Release flow

### 1. Bump the version

The version lives in `desktop/package.json` and appears in the README download links. Releases in this repository consistently bump both together.

### 2. Build the artifacts

```bash
cd desktop && npm run dist && npm run dist:win
```

### 3. Generate the manifest

```bash
npm run feed -- --notes "update notes"
# or
node scripts/make-update-feed.mjs --base-url <url> --notes "<text>"
```

This writes `release/latest.json`:

```json
{ "version": "...", "notes": "...",
  "platforms": { "darwin-arm64": { "url": "...", "sha256": "...", "size": 0 } } }
```

Platform keys match the updater's `process.platform-process.arch`. Development is disabled there, so only packaged builds update.

### 4. Publish

```bash
npm run publish [-- --notes "update notes"] [-- --skip-gh]
```

`publish-release.mjs` uploads to two channels:

- **GitHub Releases** for overseas users, via the `gh` CLI.
- **Tencent COS** for users in China, via `cos-upload.mjs`, a dependency-free client that signs requests with COS's sha1 scheme.

It normalizes the NSIS file name by replacing spaces with dots, matching what GitHub does server-side, so both channels produce the same URL. The COS mirror is the first source the updater and the server update checker try. Both fall back to GitHub.

COS credentials come from the environment or `desktop/.env.local` (`TENCENT_SECRET_ID`, `TENCENT_SECRET_KEY`). The bucket and region default to `huobao-installer-1304922933` and `ap-guangzhou`, overridable with `COS_BUCKET` and `COS_REGION`. The public base URL defaults to `https://installer.chatfire.site/huobao-drama` and is overridable with `COS_BASE_URL`.

### 5. Publish the Docker image

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  --build-arg HUOBAO_VERSION=x.y.z \
  -t huobao/huobao-drama:x.y.z -t huobao/huobao-drama:latest --push .
```

The image and the desktop app share one manifest, so both advertise the same version.

## Related pages

- [architecture/desktop.md](../architecture/desktop.md) — main process, migration, updater internals
- [operations/configuration.md](configuration.md) — every environment variable
- [operations/development.md](development.md) — local setup
