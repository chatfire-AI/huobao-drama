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
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { prepareMacMedia } from './prepare-mac-media.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DESKTOP = path.resolve(__dirname, '..')
const REPO = path.resolve(DESKTOP, '..')
const RES = path.join(DESKTOP, 'resources')

fs.rmSync(RES, { recursive: true, force: true })
fs.mkdirSync(RES, { recursive: true })

/**
 * 用 `file` 命令读二进制架构，匹配 arm64 / x86_64 / x64。
 * `file` 在 macOS 自带、Linux 也在 coreutils，无需引新依赖。
 */
function readArchOf(binPath) {
  try {
    const out = execFileSync('file', [binPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    if (/arm64|aarch64/i.test(out)) return 'arm64'
    if (/x86[_-]64|amd64/i.test(out)) return 'x64'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * 校验两个二进制架构一致。darwin/arm64 缺失 Rosetta 时，x86_64 二进制
 * spawn 即报 "bad CPU type" → 桌面版视频拼接全失败。这里提前在打包阶段
 * 暴露问题，避免错误二进制流入 dmg。
 */
function detectArchMismatch(nameA, pathA, nameB, pathB) {
  const archA = readArchOf(pathA)
  const archB = readArchOf(pathB)
  if (archA === 'unknown' || archB === 'unknown') {
    console.warn(`[prepare-resources] 架构探测失败（${nameA}=${archA}, ${nameB}=${archB}），跳过自检。请确认本机已安装 file 工具。`)
    return
  }
  if (archA !== archB) {
    console.error(
      `[prepare-resources] 架构不一致：${nameA}=${archA}，${nameB}=${archB}。\n` +
      `  这会导致桌面版在 Apple Silicon（无 Rosetta）/ 其它架构上运行失败（#135）。\n` +
      `  常见原因：ffprobe-static v3.1.0 的 bin/darwin/arm64/ffprobe 实际是 x86_64，\n` +
      `  打包脚本误取该路径。修复建议：\n` +
      `    1) 在本机用 arm64 native ffmpeg 替换 resources/bin-mac/ffprobe，\n` +
      `    2) 或 rm -rf node_modules && npm install 重新触发 postinstall。\n` +
      `  详见 https://github.com/chatfire-AI/huobao-drama/issues/135`,
    )
    process.exit(1)
  }
  console.log(`[prepare-resources] 架构自检通过：${nameA}=${nameB}=${archA}`)
}

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
// 3a. 架构自检（#135）：prepareMacMedia 下载时已用 lipo 逐个校验产物架构，
//     这里对最终拷入 resources/bin-mac-<arch>/ 的 ffmpeg/ffprobe 再做一次
//     同架构交叉验证，防止 build/mac-bin 缓存或镜像产物被替换后混入异架构
//     二进制（无 Rosetta 的 Apple Silicon 上 spawn 即报 bad CPU type）。
if (process.platform === 'darwin') {
  for (const macArch of ['arm64', 'x64']) {
    const binMac = path.join(RES, `bin-mac-${macArch}`)
    for (const name of ['ffmpeg', 'ffprobe']) {
      if (!fs.existsSync(path.join(binMac, name))) {
        console.error(`[prepare-resources] 缺少 macOS ${macArch} ${name}：prepare-mac-media 未产出该二进制（#135），请清理 desktop/build/mac-bin 缓存后重试`)
        process.exit(1)
      }
    }
    detectArchMismatch('ffmpeg', path.join(binMac, 'ffmpeg'), 'ffprobe', path.join(binMac, 'ffprobe'))
  }
}

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
