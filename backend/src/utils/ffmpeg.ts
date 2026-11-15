/**
 * FFmpeg 统一配置与可用性探测
 *
 * 背景：Windows 上若 node_modules 跨平台拷贝、或 ffmpeg-static postinstall
 * 下载损坏（HTML 错误页被存成 ffmpeg.exe），spawn 非 PE 文件会同步抛
 * EFTYPE；该异常发生在 fluent-ffmpeg 的延迟回调里，外层 try/catch 接不住，
 * 直接崩掉整个 Node 进程。这里在业务调用前主动 spawn -version 探测，
 * 不可用时由业务侧优雅降级（海报帧跳过 / 拼接返回明确错误）。
 */
import { spawn } from 'child_process'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import { createRequire } from 'module'

// ffmpeg-static / ffprobe-static 均为可选依赖：npm 安装时提供内置二进制；
// 桌面版打包不携带这两个 npm 包（二进制随 resources/bin 分发），缺失时走 FFMPEG_BIN/FFPROBE_BIN
const req = createRequire(import.meta.url)

function resolveStatic(moduleName: string): string | null {
  try {
    const mod = req(moduleName)
    return (moduleName === 'ffprobe-static' ? mod?.path : mod) ?? null
  } catch {
    return null
  }
}

const ffmpegPath = process.env.FFMPEG_BIN || resolveStatic('ffmpeg-static')
const ffprobePath = process.env.FFPROBE_BIN || resolveStatic('ffprobe-static')

// 系统未安装 ffmpeg 时使用项目内置二进制
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)
if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath)

export { ffmpeg }

/** spawn 一次 -version 验证二进制真实可执行（含同步 EFTYPE 兜底） */
function probeBinary(binPath: string | null): Promise<boolean> {
  if (!binPath || !fs.existsSync(binPath)) return Promise.resolve(false)
  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(ok)
    }
    const timer = setTimeout(() => finish(false), 10_000)
    let child
    try {
      child = spawn(binPath, ['-version'], { stdio: 'ignore', windowsHide: true })
    } catch {
      // Windows 上 spawn 非 PE 文件（如下载损坏的 ffmpeg.exe）会同步抛 EFTYPE
      finish(false)
      return
    }
    child.on('error', () => finish(false))
    child.on('close', (code) => finish(code === 0))
  })
}

export interface FfmpegSuite {
  ffmpeg: boolean
  ffprobe: boolean
}

// 成功的探测结果缓存（进程内只探测一次）；失败不缓存，修复二进制后无需重启即可恢复
let okCache: FfmpegSuite | null = null
let warned = false

/** 探测内置 ffmpeg/ffprobe 是否可用 */
export async function checkFfmpegSuite(): Promise<FfmpegSuite> {
  if (okCache) return okCache
  const [ffmpegOk, ffprobeOk] = await Promise.all([probeBinary(ffmpegPath), probeBinary(ffprobePath)])
  const suite = { ffmpeg: ffmpegOk, ffprobe: ffprobeOk }
  if (ffmpegOk && ffprobeOk) {
    okCache = suite
  } else if (!warned) {
    warned = true
    console.warn(
      `[ffmpeg] 内置二进制不可用 (ffmpeg=${ffmpegOk ? 'ok' : 'FAIL'}, ffprobe=${ffprobeOk ? 'ok' : 'FAIL'})。` +
      `海报帧提取与视频拼接将跳过/失败。修复：删除 node_modules 后在本机重新 npm install，` +
      `或设置 FFMPEG_BIN/FFPROBE_BIN 指向有效的可执行文件`
    )
  }
  return suite
}
