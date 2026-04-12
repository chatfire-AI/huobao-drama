/**
 * 解析本机 ffmpeg / ffprobe 可执行路径（fluent-ffmpeg 默认只查 PATH，GUI 启动时常找不到 Homebrew 路径）
 */
import fs from 'fs'
import { execFileSync } from 'child_process'

export const FFMPEG_MISSING_MESSAGE =
  '未检测到 ffmpeg。视频合成与成片拼接需要本机安装 FFmpeg。\n' +
  'macOS：在终端执行 brew install ffmpeg，然后重启后端。\n' +
  '若已安装仍报错，可设置环境变量 FFMPEG_PATH（及可选 FFPROBE_PATH）为可执行文件绝对路径，例如：/opt/homebrew/bin/ffmpeg'

export function resolveFfmpegPath(): string | null {
  const fromEnv = process.env.FFMPEG_PATH
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv

  const candidates = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg']
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  try {
    const out = execFileSync('which', ['ffmpeg'], { encoding: 'utf8' }).trim().split('\n')[0]
    if (out && fs.existsSync(out)) return out
  } catch {}
  return null
}

export function resolveFfprobePath(): string | null {
  const fromEnv = process.env.FFPROBE_PATH
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv

  const ff = resolveFfmpegPath()
  if (ff) {
    const probe = ff.replace(/ffmpeg$/i, 'ffprobe')
    if (probe !== ff && fs.existsSync(probe)) return probe
    const dir = ff.replace(/[/\\][^/\\]+$/, '')
    const sibling = `${dir}/ffprobe`
    if (fs.existsSync(sibling)) return sibling
  }
  for (const p of ['/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe', '/usr/bin/ffprobe']) {
    if (fs.existsSync(p)) return p
  }
  try {
    const out = execFileSync('which', ['ffprobe'], { encoding: 'utf8' }).trim().split('\n')[0]
    if (out && fs.existsSync(out)) return out
  } catch {}
  return null
}

export function ensureFfmpegOrThrow(): void {
  if (!resolveFfmpegPath()) {
    throw new Error(FFMPEG_MISSING_MESSAGE)
  }
}
