# Desktop app (Electron)

The desktop build wraps the backend and frontend in an Electron shell. The backend is not a separate process the user installs: Electron forks a bundled copy.

## Boot sequence

`desktop/src/main.ts` runs this sequence in `bootstrap()`:

1. **Single instance lock.** A second launch would contend for the SQLite write lock, so it focuses the existing window and quits.
2. **Pick a free port.** `getFreePort()` binds port 0 on `127.0.0.1` and reads the assigned port.
3. **Read the storage config** (`userData/storage-config.json`) to determine the data directory. Failures fall back to the default and never block startup.
4. **Prepare the workspace.** The packaged app copies a workspace template into `userData/workspace` with copy-once semantics.
5. **Fork the backend** with `utilityProcess.fork(BACKEND_BUNDLE)` and injected environment variables.
6. **Wait for health** by polling `http://127.0.0.1:<port>/api/v1/health` for up to 15 seconds.
7. **Open the window** at `http://127.0.0.1:<port>`.

Because the backend serves the frontend, the window and the API share an origin. The frontend uses relative URLs and no CORS rules are needed.

## userData isolation

```ts
app.setPath('userData', path.join(app.getPath('appData'),
  app.isPackaged ? 'HuobaoDrama' : 'HuobaoDrama-Dev'))
```

Packaged and dev builds use different userData directories on purpose. They get separate databases, uploads, and single-instance locks. The comment warns that relying on the `package.json` name would make dev and packaged builds share one lock and kill each other.

## Injected environment variables

The desktop main process is the source of truth for paths:

| Variable | Value |
|---|---|
| `PORT` | the chosen free port |
| `HUOBAO_DESKTOP` | `'1'` |
| `HUOBAO_DATA_DIR` | current data directory |
| `SQLITE_PATH` | `<dataDir>/huobao.sqlite3` |
| `WORKSPACE_PATH` | current workspace directory |
| `FRONTEND_DIST` | packaged: `resources/frontend`; dev: `frontend/.output/public` |
| `FFMPEG_BIN`, `FFPROBE_BIN` | packaged only: `resources/bin/ffmpeg[.exe]` |

The backend never guesses these in desktop mode. It reads them through `utils/paths.ts`. See [architecture/overview.md](overview.md).

## Workspace template sync

The packaged app ships `resources/workspace-template` and copies it into `userData/workspace` on first launch. `syncWorkspaceTemplate` uses a `.template-version` marker:

```ts
const TEMPLATE_VERSION = '4'
```

The rules are asymmetric by design:

- **skills/** — copy missing files only, never overwrite. Users can create and edit skills, so the template must not clobber them.
- **prompts/** — force overwrite on a version bump. Prompts iterate together with `DEFAULT_PROMPTS` in the backend, and the Settings page offers a "restore default" action.

A version bump therefore refreshes prompts but preserves skills.

## Backend bundle

`desktop/scripts/build-backend.mjs` uses esbuild to bundle `backend/src/index.ts` into one ESM file, `desktop/build/backend.mjs`. Four modules stay external:

- `sharp` and `better-sqlite3` — native modules, rebuilt for the Electron ABI and unpacked from the asar.
- `ffmpeg-static` and `ffprobe-static` — downloaded binaries that cannot be statically bundled into JS.

The bundle injects `createRequire` and `__dirname` through an esbuild banner, because fluent-ffmpeg and other CJS dependencies expect them and esbuild does not shim them for ESM output.

`electron-builder.yml` puts `build/backend.mjs` inside the asar. The externals resolve up to `app.asar/node_modules`, and Electron redirects `.node` files to `app.asar.unpacked` automatically. `asarUnpack` lists `sharp`, `@img`, and `better-sqlite3`.

## Resource preparation

`desktop/scripts/prepare-resources.mjs` assembles `desktop/resources/`:

1. `frontend/` from `frontend/.output/public`. The script fails if `index.html` is missing, which is why the frontend must be built with `nuxt generate`.
2. `workspace-template/` from `backend/workspace`.
3. `bin-mac/` and `bin-win/` with the ffmpeg and ffprobe binaries for each platform. The `electron-builder.yml` line `resources/bin-${os}` selects the right directory at pack time so the macOS build does not carry a 144 MB Windows binary.

`after-pack.mjs` runs after packing and hard-fails when `bin/ffmpeg` or `bin/ffprobe` is missing, because electron-builder only warns about missing extra resources.

## Cross-platform packaging fixes

Windows packages are cross-built on macOS. Two fixes exist because prebuilt native artifacts default to the host platform:

- `after-pack.mjs` replaces `better_sqlite3.node` inside the Windows package with the official `win32-x64` prebuilt, because `@electron/rebuild` downloaded a Mach-O binary on the Mac host.
- `prepare-resources.mjs` reads `ffmpeg.exe` from a cached `build/win-bin/` directory and `ffprobe.exe` from `ffprobe-static`.

Both caches live under `desktop/build/win-bin/` and print the download URL when missing.

## Storage migration

`desktop/src/migrate.ts` moves the data directory at runtime, which is why the backend must be restartable. The sequence is:

```
validate → stop backend → move → write config → restart backend → done
```

Two rules from the file header:

- **Never delete the old directory before the copy is verified.**
- **Write the config only after the files are in place.** Any failure rolls back and restarts the backend on the old directory.

Validation rejects a target that is the current data directory, inside it, a parent of it, or the userData root. It probes writability and, for a cross-volume move, checks free space with a 5% margin. Progress streams to the renderer through the `huobao:migrate-progress` IPC channel, throttled to 80 ms, with `done` and `error` always sent.

`main.ts` coordinates through `MigrationDeps`, so the migration engine does not import the main-process module.

## In-app updates

`desktop/src/updater.ts` implements updates without Apple code signing, following the Tauri updater pattern.

- **Feed.** `HUOBAO_UPDATE_FEED` if set; otherwise two sources in order — the COS mirror first for China, then GitHub Releases as a fallback.
- **macOS.** Download the zip, verify sha256, unzip, rename the running bundle to `.old`, place the new bundle, launch it with `open`, and quit. The next launch cleans `.old`.
- **Windows.** Download `Setup.exe`, verify sha256, run it silently with `/S` detached, and quit.
- **Dev mode.** Disabled entirely.

The updater refuses to proceed outside a packaged app. A failed sha256 check deletes the download and aborts.

The download progress event is `huobao:update-progress`. The renderer subscribes through `preload.ts`. The feed manifest is shared with the Docker deployment and is produced by `desktop/scripts/publish-release.mjs`.

## Preload bridge

`desktop/src/preload.ts` exposes a narrow API on `window.huobaoDesktop` through `contextBridge`:

```
pickDirectory, startMigration, onMigrateProgress,
getUpdateState, checkUpdate, downloadUpdate, applyUpdate, onUpdateProgress
```

`contextIsolation` is on by default, so the renderer gets only these methods. `frontend/app/composables/useDesktopBridge.ts` types them and returns `null` outside the desktop app, which is how the UI hides desktop-only features such as storage migration and in-app updates.

## External link handling

Every navigation to an external `http(s)` URL opens in the system browser. The window-open handler denies in-app windows; the `will-navigate` handler prevents replacement of the app page. The comment names the case: the Settings page links to `api.firemux.com`.

## Crash guards worth knowing

- `process.stdout.on('error', () => {})` and the same for stderr. Launching from a terminal and piping to a program that exits sends `EPIPE` in an async callback, which a `try/catch` cannot catch and which would raise an uncaught-exception dialog.
- The backend `exit` handler suppresses the fatal dialog while `backendRestarting` or `quitting` is true, because migration and restart intentionally stop the backend.
- `stopBackend()` waits for the `exit` event with a 5-second timeout before force-killing.

## Related pages

- [operations/deployment.md](../operations/deployment.md) — release commands
- [operations/configuration.md](../operations/configuration.md) — storage locations and the settings that control them
- [architecture/overview.md](overview.md) — how the paths flow into the backend
