/**
 * 打包资源准备 — 组装 desktop/resources/（electron-builder extraResources 的来源）
 *
 * 1. frontend/           ← nuxt generate 产物（.output/public，含 index.html）
 * 2. workspace-template/ ← backend/workspace（skills + prompts，首启动拷入 userData）
 * 3. bin-<os>-<arch>/    ← ffmpeg/ffprobe 按平台与架构分目录（electron-builder 宏各取所需，
 *                          避免 mac 包带 exe、win 包带 mac 二进制白白 +144MB）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { prepareMacMedia } from './prepare-mac-media.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DESKTOP = path.resolve(__dirname, '..')
const REPO = path.resolve(DESKTOP, '..')
const RES = path.join(DESKTOP, 'resources')

fs.rmSync(RES, { recursive: true, force: true })
fs.mkdirSync(RES, { recursive: true })

// 1. 前端静态产物
const frontendSrc = path.join(REPO, 'frontend', '.output', 'public')
if (!fs.existsSync(path.join(frontendSrc, 'index.html'))) {
  console.error('缺少前端产物：请先在 frontend/ 执行 npm run generate')
  process.exit(1)
}
fs.cpSync(frontendSrc, path.join(RES, 'frontend'), { recursive: true })
console.log('resources/frontend ✓')

// 2. workspace 模板（skills 技能 + prompts 提示词）
const workspaceSrc = path.join(REPO, 'backend', 'workspace')
fs.cpSync(workspaceSrc, path.join(RES, 'workspace-template'), { recursive: true })
console.log('resources/workspace-template ✓')

// 3. macOS 两种架构独立准备；ffprobe-static 的 arm64 目录实际可能含 x64 二进制，
//    因此两种媒体工具统一使用 ffmpeg-static 对应版本的官方发布产物。
const req = createRequire(import.meta.url)
if (process.platform === 'darwin') await prepareMacMedia(DESKTOP, RES)
const binWin = path.join(RES, 'bin-win-x64')
fs.mkdirSync(binWin, { recursive: true })

// 3b. Windows 二进制（打 win 包用；不打 win 包时缺失不报错，仅提示）
const winBinDir = path.join(DESKTOP, 'build', 'win-bin')
const ffmpegWin = path.join(winBinDir, 'ffmpeg.exe')
const ffprobeWinSrc = path.join(path.dirname(req.resolve('ffprobe-static/package.json')), 'bin', 'win32', 'x64', 'ffprobe.exe')
if (!fs.existsSync(ffmpegWin)) {
  console.warn('提示: 缺少 build/win-bin/ffmpeg.exe，Windows 包将无法内置 ffmpeg。' +
    '获取: https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-win32-x64')
}
if (fs.existsSync(ffmpegWin) && fs.existsSync(ffprobeWinSrc)) {
  fs.copyFileSync(ffmpegWin, path.join(binWin, 'ffmpeg.exe'))
  fs.copyFileSync(ffprobeWinSrc, path.join(binWin, 'ffprobe.exe'))
  console.log('resources/bin-win-x64 ✓')
}
