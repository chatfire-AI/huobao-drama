/**
 * esbuild 打包 Electron 主进程与 preload — desktop/src → desktop/dist/
 * main.ts → dist/main.js（package.json main 入口）；preload.ts → dist/preload.js
 */
import { build } from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

await build({
  entryPoints: [
    { in: path.resolve(__dirname, '../src/main.ts'), out: 'main' },
    { in: path.resolve(__dirname, '../src/preload.ts'), out: 'preload' },
  ],
  outdir: path.resolve(__dirname, '../dist'),
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  sourcemap: true,
  logLevel: 'info',
})

fs.copyFileSync(path.resolve(__dirname, '../assets/starting.html'), path.resolve(__dirname, '../dist/starting.html'))
