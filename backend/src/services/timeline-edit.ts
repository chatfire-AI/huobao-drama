/**
 * 简易时间轴：裁切、拼接、音轨分离与合成（依赖本机 ffmpeg）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'
import { v4 as uuid } from 'uuid'
import { resolveFfmpegPath, ensureFfmpegOrThrow } from '../utils/ffmpeg-bin.js'
import { getAbsolutePath } from '../utils/storage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORAGE_ROOT = process.env.STORAGE_PATH || path.resolve(__dirname, '../../../data/static')

export interface TimelineSegment {
  path: string
  /** 从源文件开头算起的入点（秒） */
  in_sec: number
  /** 片段时长（秒） */
  duration_sec: number
}

function ffmpegBin(): string {
  const p = resolveFfmpegPath()
  if (!p) throw new Error('ffmpeg not found')
  return p
}

function escapeConcatPath(absPath: string): string {
  return absPath.replace(/'/g, `'\\''`)
}

/** 从视频文件提取音轨为 m4a */
export function extractAudioFromVideo(videoRelativePath: string): string {
  ensureFfmpegOrThrow()
  const ff = ffmpegBin()
  const absIn = getAbsolutePath(videoRelativePath.replace(/^\//, ''))
  if (!fs.existsSync(absIn)) throw new Error(`文件不存在: ${videoRelativePath}`)

  const outDir = path.join(STORAGE_ROOT, 'timeline', 'audio')
  fs.mkdirSync(outDir, { recursive: true })
  const outName = `${uuid()}.m4a`
  const absOut = path.join(outDir, outName)

  execFileSync(ff, ['-y', '-i', absIn, '-vn', '-acodec', 'aac', '-b:a', '192k', absOut], {
    stdio: 'pipe',
    maxBuffer: 20 * 1024 * 1024,
  })
  return `static/timeline/audio/${outName}`
}

/** 将单个片段裁切为临时 mp4（含音视频，便于拼接） */
function trimSegmentToTemp(inputRel: string, inSec: number, durationSec: number): string {
  const ff = ffmpegBin()
  const absIn = getAbsolutePath(inputRel.replace(/^\//, ''))
  if (!fs.existsSync(absIn)) throw new Error(`文件不存在: ${inputRel}`)
  if (durationSec <= 0.05) throw new Error('片段时长过短')

  const tmpDir = path.join(STORAGE_ROOT, 'timeline', 'tmp')
  fs.mkdirSync(tmpDir, { recursive: true })
  const outName = `${uuid()}.mp4`
  const absOut = path.join(tmpDir, outName)

  execFileSync(
    ff,
    [
      '-y',
      '-ss',
      String(inSec),
      '-i',
      absIn,
      '-t',
      String(durationSec),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      absOut,
    ],
    { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 },
  )
  return absOut
}

/** 去掉视频中的音轨，仅保留画面 */
function stripAudioToTemp(videoAbs: string): string {
  const ff = ffmpegBin()
  const tmpDir = path.join(STORAGE_ROOT, 'timeline', 'tmp')
  fs.mkdirSync(tmpDir, { recursive: true })
  const outName = `${uuid()}_v.mp4`
  const absOut = path.join(tmpDir, outName)
  execFileSync(ff, ['-y', '-i', videoAbs, '-c:v', 'copy', '-an', absOut], {
    stdio: 'pipe',
    maxBuffer: 50 * 1024 * 1024,
  })
  return absOut
}

function concatVideoFiles(absFiles: string[], outputAbs: string): void {
  const ff = ffmpegBin()
  const listDir = path.join(STORAGE_ROOT, 'timeline', 'tmp')
  fs.mkdirSync(listDir, { recursive: true })
  const listPath = path.join(listDir, `${uuid()}_vlist.txt`)
  const body = absFiles.map((p) => `file '${escapeConcatPath(p)}'`).join('\n')
  fs.writeFileSync(listPath, body, 'utf-8')

  execFileSync(
    ff,
    ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-fflags', '+genpts', outputAbs],
    { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 },
  )
  try {
    fs.unlinkSync(listPath)
  } catch {}
}

/** 拼接多段音频（统一重编码为 AAC，避免 concat demuxer + copy 在片段间失败） */
function concatAudioFiles(absFiles: string[], outputAbs: string): void {
  const ff = ffmpegBin()
  const listDir = path.join(STORAGE_ROOT, 'timeline', 'tmp')
  fs.mkdirSync(listDir, { recursive: true })
  const listPath = path.join(listDir, `${uuid()}_alist.txt`)
  const body = absFiles.map((p) => `file '${escapeConcatPath(p)}'`).join('\n')
  fs.writeFileSync(listPath, body, 'utf-8')

  execFileSync(
    ff,
    ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:a', 'aac', '-b:a', '192k', outputAbs],
    { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 },
  )
  try {
    fs.unlinkSync(listPath)
  } catch {}
}

/** 裁切音频片段（aac/m4a/mp3 等） */
function trimAudioToTemp(inputRel: string, inSec: number, durationSec: number): string {
  const ff = ffmpegBin()
  const absIn = getAbsolutePath(inputRel.replace(/^\//, ''))
  if (!fs.existsSync(absIn)) throw new Error(`文件不存在: ${inputRel}`)

  const tmpDir = path.join(STORAGE_ROOT, 'timeline', 'tmp')
  fs.mkdirSync(tmpDir, { recursive: true })
  const outName = `${uuid()}.m4a`
  const absOut = path.join(tmpDir, outName)

  execFileSync(
    ff,
    ['-y', '-ss', String(inSec), '-i', absIn, '-t', String(durationSec), '-c:a', 'aac', '-b:a', '192k', absOut],
    { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 },
  )
  return absOut
}

async function emitProgress(
  onProgress: ((pct: number) => void) | undefined,
  completed: number,
  total: number,
): Promise<void> {
  if (!onProgress || total <= 0) return
  const pct = Math.min(100, Math.round((completed / total) * 100))
  onProgress(pct)
  await new Promise<void>((r) => setImmediate(r))
}

/**
 * 渲染时间轴：顺序拼接视频轨；若提供音频轨则用独立音轨与画面合成（短视频以 shortest 截断）
 * @param onProgress 可选；提供时会在各 ffmpeg 步骤之间 yield，便于流式响应刷新百分比
 */
export async function renderTimeline(
  videoSegments: TimelineSegment[],
  audioSegments?: TimelineSegment[] | null,
  onProgress?: (pct: number) => void,
): Promise<string> {
  ensureFfmpegOrThrow()
  if (!videoSegments?.length) throw new Error('至少需要一个视频片段')

  const n = videoSegments.length
  const m = audioSegments?.length ?? 0
  const hasAudio = m > 0
  /** 视频逐段裁切 + 拼接 +（无音轨）复制成片；有音轨时再：逐段裁切 + 拼接 + 去画面音 + 合成 */
  const totalSteps = hasAudio ? n + 1 + m + 1 + 1 + 1 : n + 1 + 1
  let completed = 0

  await emitProgress(onProgress, completed, totalSteps)

  const exportDir = path.join(STORAGE_ROOT, 'timeline', 'exports')
  fs.mkdirSync(exportDir, { recursive: true })
  const outFileName = `${uuid()}.mp4`
  const outAbs = path.join(exportDir, outFileName)

  const videoParts: string[] = []
  for (const seg of videoSegments) {
    videoParts.push(trimSegmentToTemp(seg.path, seg.in_sec, seg.duration_sec))
    completed++
    await emitProgress(onProgress, completed, totalSteps)
  }

  const tmpDir = path.join(STORAGE_ROOT, 'timeline', 'tmp')
  const mergedVideo = path.join(tmpDir, `${uuid()}_merged_v.mp4`)
  concatVideoFiles(videoParts, mergedVideo)
  completed++
  await emitProgress(onProgress, completed, totalSteps)
  for (const p of videoParts) {
    try {
      fs.unlinkSync(p)
    } catch {}
  }

  if (!audioSegments?.length) {
    fs.copyFileSync(mergedVideo, outAbs)
    try {
      fs.unlinkSync(mergedVideo)
    } catch {}
    completed++
    await emitProgress(onProgress, completed, totalSteps)
    return `static/timeline/exports/${outFileName}`
  }

  const audioParts: string[] = []
  for (const seg of audioSegments) {
    audioParts.push(trimAudioToTemp(seg.path, seg.in_sec, seg.duration_sec))
    completed++
    await emitProgress(onProgress, completed, totalSteps)
  }
  const mergedAudio = path.join(tmpDir, `${uuid()}_merged_a.m4a`)
  concatAudioFiles(audioParts, mergedAudio)
  completed++
  await emitProgress(onProgress, completed, totalSteps)
  for (const p of audioParts) {
    try {
      fs.unlinkSync(p)
    } catch {}
  }

  const videoOnly = stripAudioToTemp(mergedVideo)
  try {
    fs.unlinkSync(mergedVideo)
  } catch {}
  completed++
  await emitProgress(onProgress, completed, totalSteps)

  const ff = ffmpegBin()
  execFileSync(
    ff,
    [
      '-y',
      '-i',
      videoOnly,
      '-i',
      mergedAudio,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-shortest',
      outAbs,
    ],
    { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 },
  )
  completed++
  await emitProgress(onProgress, completed, totalSteps)

  try {
    fs.unlinkSync(videoOnly)
  } catch {}
  try {
    fs.unlinkSync(mergedAudio)
  } catch {}

  return `static/timeline/exports/${outFileName}`
}
