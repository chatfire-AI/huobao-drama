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
  doMerge(mergeId, episodeId, videos).catch(async err => {
    logTaskError('MergeTask', 'episode-merge', { mergeId, episodeId, error: err.message })
    console.error(`[Merge] Failed:`, err)
    await db.update(schema.videoMerges)
      .set({ status: 'failed', errorMsg: err.message })
      .where(eq(schema.videoMerges.id, mergeId))
  })

  return mergeId
}

async function doMerge(mergeId: number, episodeId: number, videos: string[]) {
  // 拼接前逐片段归一化：不同来源的片段（生成/上传）分辨率、帧率、时间基（time_base）
  // 经常不一致，直接 concat 分离器 + genpts 拼接会因时间戳错位疯狂补帧、耗时数小时。
  // 这里先把每个片段转码为统一规格（同画布/帧率/时间基/音频采样率，缺音频补静音），
  // 再用 concat 分离器流拷贝拼接，速度与稳定性都远好于全片一次重编码。
  const workDir = path.join(STORAGE_ROOT, 'temp', `merge-${mergeId}-${uuid()}`)
  fs.mkdirSync(workDir, { recursive: true })

  try {
    const probe = (p: string) => new Promise<any>((resolve) => {
      ffmpeg.ffprobe(p, (err, meta) => resolve(err ? null : meta))
    })

    const metas: any[] = []
    for (const v of videos) metas.push(await probe(toAbsPath(v)))

    const firstStream = metas[0]?.streams?.find((s: any) => s.codec_type === 'video')
    let canvasW = Number(firstStream?.width) || 720
    let canvasH = Number(firstStream?.height) || 1280
    canvasW -= canvasW % 2
    canvasH -= canvasH % 2

    let targetFps = 24
    const rate = String(firstStream?.avg_frame_rate || '')
    const mRate = rate.match(/^(\d+)\/(\d+)$/)
    if (mRate && Number(mRate[2]) > 0) {
      const fps = Math.round(Number(mRate[1]) / Number(mRate[2]))
      if (fps >= 1 && fps <= 60) targetFps = fps
    }

    const normalized: string[] = []
    for (let i = 0; i < videos.length; i++) {
      const srcPath = toAbsPath(videos[i])
      const hasAudio = !!metas[i]?.streams?.some((s: any) => s.codec_type === 'audio')
      const out = path.join(workDir, `clip-${String(i).padStart(3, '0')}.mp4`)
      const vf = `scale=${canvasW}:${canvasH}:force_original_aspect_ratio=decrease,pad=${canvasW}:${canvasH}:(ow-iw)/2:(oh-ih)/2,fps=${targetFps},settb=AVTB,setsar=1,format=yuv420p`
      await new Promise<void>((resolve, reject) => {
        const cmd = ffmpeg()
        cmd.input(srcPath)
        if (!hasAudio) {
          cmd.input('anullsrc=channel_layout=stereo:sample_rate=48000')
          cmd.inputOptions(['-f', 'lavfi'])
        }
        const outputOpts = [
          '-vf', vf,
          '-af', 'aresample=48000:async=1:first_pts=0',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '20',
          '-c:a', 'aac',
          '-ar', '48000',
          '-ac', '2',
          '-b:a', '160k',
          '-video_track_timescale', '12288',
        ]
        if (!hasAudio) outputOpts.push('-shortest')
        cmd.outputOptions(outputOpts)
          .output(out)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      })
      normalized.push(out)
    }

    // 统一规格后走 concat 分离器 + 流拷贝，几乎瞬时完成
    const listPath = path.join(workDir, 'list.txt')
    fs.writeFileSync(listPath, normalized.map(p => `file '${p}'`).join('\n'), 'utf-8')

    const outputDir = path.join(STORAGE_ROOT, 'merged')
    fs.mkdirSync(outputDir, { recursive: true })
    const outputFilename = `${uuid()}.mp4`
    const outputPath = path.join(outputDir, outputFilename)

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy', '-movflags', '+faststart'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run()
    })

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
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
  }
}

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) { resolve(0); return }
      resolve(Math.round(metadata.format.duration || 0))
    })
  })
}
