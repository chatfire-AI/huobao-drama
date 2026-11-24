import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

export function retainPreviousAssets(frontendRoot) {
  const root = path.resolve(frontendRoot)
  const assets = path.join(root, '.output/public/_nuxt')
  if (!fs.existsSync(assets)) return
  const previous = path.resolve(root, '../tmp/frontend-previous')
  // Only replace this dedicated build cache, never application data or an arbitrary path.
  const workspaceTmp = path.resolve(root, '../tmp')
  if (path.dirname(previous) !== workspaceTmp || path.basename(previous) !== 'frontend-previous') throw new Error('Invalid frontend asset cache path')
  fs.rmSync(previous, { recursive: true, force: true })
  fs.mkdirSync(previous, { recursive: true })
  fs.cpSync(assets, path.join(previous, '_nuxt'), { recursive: true })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  retainPreviousAssets(root)
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/nuxt/bin/nuxt.mjs'), 'generate'], { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
}
