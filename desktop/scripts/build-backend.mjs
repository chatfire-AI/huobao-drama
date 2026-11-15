/**
 * esbuild 打包后端 — backend/src → desktop/build/backend.mjs（单文件 ESM）
 *
 * - format esm：backend 顶层 await initDb() 要求 ESM
 * - external 四件套：sharp / better-sqlite3（原生模块，electron-builder 按
 *   Electron ABI 重编并 asarUnpack）、ffmpeg-static / ffprobe-static（postinstall
 *   下载的二进制，且 ffmpeg.ts 经 createRequire 动态引入，无法静态打包）
 * - banner 注入 createRequire：externals 在 ESM 产物里经 require 解析到
 *   desktop/node_modules（与主应用同 ABI 的副本）
 */
import { build } from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

await build({
  entryPoints: [path.resolve(__dirname, '../../backend/src/index.ts')],
  outfile: path.resolve(__dirname, '../build/backend.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  external: ['sharp', 'better-sqlite3', 'ffmpeg-static', 'ffprobe-static'],
  banner: {
    // esbuild 打 CJS→ESM 不垫片 __dirname/__filename/require（fluent-ffmpeg 等依赖），
    // 在产物顶层统一注入；__dirname 指向 build/ 目录，仅 presets 等未用到的模块相对路径受影响
    js: [
      `import { createRequire as __hbCreateRequire } from 'module'`,
      `import __hbPath from 'path'`,
      `import { fileURLToPath as __hbFileURLToPath } from 'url'`,
      `const require = __hbCreateRequire(import.meta.url)`,
      // 用 var：esbuild 对部分 CJS 依赖也会生成 var __filename，重复声明合法
      `var __filename = __hbFileURLToPath(import.meta.url)`,
      `var __dirname = __hbPath.dirname(__filename)`,
    ].join('\n'),
  },
  logLevel: 'info',
})
