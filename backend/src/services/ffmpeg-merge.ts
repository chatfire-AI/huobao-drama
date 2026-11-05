/**
 * FFmpeg 多镜头拼接 — 将所有生成后的镜头视频拼接为一集
 */
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { db, getInsertId, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { now } from '../utils/response.js'
import { logTaskError, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'
import { extractVideoPoster } from '../utils/video-poster.js'
import { ffmpeg, checkFfmpegSuite } from '../utils/ffmpeg.js'
import { DATA_ROOT, STORAGE_ROOT } from '../utils/paths.js'
import { placeDubLines, DUB_DUCKING } from './dub.js'

function toAbsPath(relativePath: string): string {
  if (path.isAbsolute(relativePath)) return relativePath
  if (relativePath.startsWith('static/')) return path.join(DATA_ROOT, relativePath)
  return path.join(STORAGE_ROOT, relativePath)
}

/**
 * 拼接一集的镜头视频。
 * 优先使用视频生成产物，兼容历史的 composedVideoUrl 数据。
 * 传入 storyboardIds 时只拼接所选镜头（仍按镜号顺序）。
 */
export async function mergeEpisodeVideos(episodeId: number, dramaId: number, storyboardIds?: number[]): Promise<number> {
  let storyboards = await db.select().from(schema.storyboards)
    .where(eq(schema.storyboards.episodeId, episodeId))
    .orderBy(schema.storyboards.storyboardNumber)

  if (storyboardIds?.length) {
    const allow = new Set(storyboardIds.map(Number))
    storyboards = storyboards.filter(sb => allow.has(sb.id))
  }

  // 允许部分拼接:按镜号顺序拼接已生成的镜头,未生成的跳过
  const clips = storyboards
    .map(sb => ({ sb, url: sb.videoUrl || sb.composedVideoUrl }))
    .filter(c => Boolean(c.url)) as { sb: typeof storyboards[number]; url: string }[]

  if (clips.length === 0) throw new Error('所选镜头还没有可拼接的视频')

  // 拼接前探测 ffmpeg：二进制损坏时 fluent-ffmpeg 的同步 EFTYPE 会崩掉整个进程，
  // 这里提前拦截并给出可操作的修复指引（路由层会作为 400 返回前端）
  const suite = await checkFfmpegSuite()
  if (!suite.ffmpeg || !suite.ffprobe) {
    throw new Error('本机 ffmpeg 不可用，无法拼接视频（常见于 node_modules 跨平台拷贝或 ffmpeg-static 下载损坏）。请删除 node_modules 后在本机重新 npm install，或设置 FFMPEG_BIN 指向有效的 ffmpeg 可执行文件后重启服务')
  }

  // 校验视频文件真实存在:DB 里的 video_url 可能指向已被清理的文件,
  // 直接拼会得到 ffmpeg 的 "No such file or directory" 晦涩报错
  const missing = clips.filter(c => !fs.existsSync(toAbsPath(c.url)))
  if (missing.length > 0) {
    const nums = missing.map(c => `S${c.sb.storyboardNumber}`).join('、')
    throw new Error(`镜头 ${nums} 的视频文件已丢失（本地文件不存在），请重新生成这些镜头的视频，或在拼接时取消勾选`)
  }

  const videos = clips.map(c => c.url)

  logTaskStart('MergeTask', 'episode-merge', { episodeId, dramaId, clips: videos.length })

  // 创建 merge 记录
  const ts = now()
  const res = await db.insert(schema.videoMerges).values({
    episodeId,
    dramaId,
    title: `Episode ${episodeId} Merge`,
    provider: 'ffmpeg',
    model: 'ffmpeg-concat-h264-aac',
    status: 'processing',
    scenes: JSON.stringify(videos),
    createdAt: ts,
  })
  const mergeId = getInsertId(res)

  // 异步执行
  doMerge(mergeId, episodeId, videos, clips.map(c => c.sb.id)).catch(async err => {
    logTaskError('MergeTask', 'episode-merge', { mergeId, episodeId, error: err.message })
    console.error(`[Merge] Failed:`, err)
    await db.update(schema.videoMerges)
      .set({ status: 'failed', errorMsg: err.message })
      .where(eq(schema.videoMerges.id, mergeId))
  })

  return mergeId
}

async function doMerge(mergeId: number, episodeId: number, videos: string[], storyboardIds: number[]) {
  // 生成 concat 列表文件
  const listDir = path.join(STORAGE_ROOT, 'temp')
  fs.mkdirSync(listDir, { recursive: true })
  const listPath = path.join(listDir, `${uuid()}.txt`)

  const listContent = videos
    .map(v => `file '${toAbsPath(v)}'`)
    .join('\n')
  fs.writeFileSync(listPath, listContent, 'utf-8')

  // 输出文件
  const outputDir = path.join(STORAGE_ROOT, 'merged')
  fs.mkdirSync(outputDir, { recursive: true })
  const outputFilename = `${uuid()}.mp4`
  const outputPath = path.join(outputDir, outputFilename)

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions([
        '-fflags', '+genpts',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-ar', '48000',
        '-b:a', '192k',
        '-movflags', '+faststart',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()

  })

  // 清理临时文件
  fs.unlinkSync(listPath)

  // 本集有已合成的配音时混入配音轨（原声降为环境音）；混音失败保留无配音成片
  try {
    await mixDubTrack(episodeId, videos, storyboardIds, outputPath)
  } catch (err: any) {
    logTaskError('MergeTask', 'dub-mix', { mergeId, episodeId, error: err.message })
  }

  // 获取时长
  const duration = await getVideoDuration(outputPath)

  const mergedRelative = `static/merged/${outputFilename}`

  // 成片海报帧（导出页封面用）
  await extractVideoPoster(mergedRelative)

  // 更新 merge 记录
  await db.update(schema.videoMerges)
    .set({ status: 'completed', mergedUrl: mergedRelative, duration, completedAt: now() })
    .where(eq(schema.videoMerges.id, mergeId))

  // 更新 episode
  await db.update(schema.episodes)
    .set({ videoUrl: mergedRelative, updatedAt: now() })
    .where(eq(schema.episodes.id, episodeId))

  logTaskSuccess('MergeTask', 'episode-merge', { mergeId, episodeId, output: mergedRelative, duration, clips: videos.length })
}

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) { resolve(0); return }
      resolve(Math.round(metadata.format.duration || 0))
    })
  })
}

function probeMedia(filePath: string): Promise<{ duration: number; hasAudio: boolean }> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) { resolve({ duration: 0, hasAudio: false }); return }
      resolve({
        duration: Number(metadata.format.duration || 0),
        hasAudio: metadata.streams.some(st => st.codec_type === 'audio'),
      })
    })
  })
}

/**
 * 把配音按镜头位置混入成片：每句 adelay 到起点；原声以配音为侧链做闪避（对白时压低），再与配音 amix。
 * 镜头时长按各镜头文件实测，保证与 concat 结果对齐。没有可用配音时不处理。
 */
async function mixDubTrack(episodeId: number, videos: string[], storyboardIds: number[], outputPath: string) {
  const durations = await Promise.all(videos.map(v => probeMedia(toAbsPath(v)).then(m => m.duration)))
  const placed = await placeDubLines(episodeId, storyboardIds.map((id, i) => ({ storyboardId: id, duration: durations[i] })))
  if (!placed.length) return

  const merged = await probeMedia(outputPath)
  // 先把所有配音按起点排成一条配音轨（apad 补静音到无限长，由原声轨决定成片时长）
  const filters: string[] = placed.map((p, i) => {
    const ms = Math.round(p.start * 1000)
    return `[${i + 1}:a]aresample=48000,adelay=${ms}:all=1[d${i}]`
  })
  filters.push(`${placed.map((_, i) => `[d${i}]`).join('')}amix=inputs=${placed.length}:duration=longest:normalize=0,apad[dub]`)

  if (merged.hasAudio) {
    // 闪避（ducking）：以配音为侧链压缩原声——对白响起时原声自动压低，停顿处恢复原音量，
    // 环境音/音效在无对白段落完整保留
    filters.push('[dub]asplit=2[sc][dubout]')
    filters.push(`[0:a]aresample=48000[orig]`)
    filters.push(`[orig][sc]sidechaincompress=${DUB_DUCKING}[bg]`)
    filters.push('[bg][dubout]amix=inputs=2:duration=first:normalize=0[aout]')
  } else {
    filters.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${merged.duration.toFixed(3)}[bg]`)
    filters.push('[bg][dub]amix=inputs=2:duration=first:normalize=0[aout]')
  }

  const tmpPath = outputPath.replace(/\.mp4$/, '.dub.mp4')
  await new Promise<void>((resolve, reject) => {
    const cmd = ffmpeg().input(outputPath)
    for (const p of placed) cmd.input(p.path)
    cmd
      .complexFilter(filters)
      .outputOptions([
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-ar', '48000',
        '-b:a', '192k',
        '-movflags', '+faststart',
      ])
      .output(tmpPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })
  fs.renameSync(tmpPath, outputPath)
  logTaskSuccess('MergeTask', 'dub-mix', { episodeId, lines: placed.length })
}
