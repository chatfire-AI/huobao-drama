import { Hono } from 'hono'
import { z } from 'zod'
import { success, badRequest } from '../utils/response.js'
import { extractAudioFromVideo, renderTimeline } from '../services/timeline-edit.js'

const segmentSchema = z.object({
  path: z.string().min(1),
  in_sec: z.number().nonnegative(),
  duration_sec: z.number().min(0.05),
})

const app = new Hono()

// POST /timeline/extract-audio — 从视频提取音轨为 m4a
app.post('/extract-audio', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = z.object({ path: z.string().min(1) }).safeParse(body)
  if (!parsed.success) return badRequest(c, '无效参数：需要 path')
  try {
    const rel = extractAudioFromVideo(parsed.data.path)
    return success(c, { path: rel })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '提取失败'
    return badRequest(c, msg)
  }
})

// POST /timeline/render — 按片段裁切并拼接；可选独立音轨
app.post('/render', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = z
    .object({
      video_segments: z.array(segmentSchema).min(1),
      audio_segments: z.array(segmentSchema).optional().nullable(),
    })
    .safeParse(body)
  if (!parsed.success) return badRequest(c, '无效参数：video_segments 至少一段，且需 in_sec / duration_sec')
  try {
    const outPath = await renderTimeline(parsed.data.video_segments, parsed.data.audio_segments ?? undefined)
    return success(c, { path: outPath })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '渲染失败'
    return badRequest(c, msg)
  }
})

// POST /timeline/render-stream — 同上，NDJSON 流式返回进度与最终 path（每行一个 JSON）
app.post('/render-stream', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = z
    .object({
      video_segments: z.array(segmentSchema).min(1),
      audio_segments: z.array(segmentSchema).optional().nullable(),
    })
    .safeParse(body)
  if (!parsed.success) return badRequest(c, '无效参数：video_segments 至少一段，且需 in_sec / duration_sec')

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`))
      }
      try {
        const outPath = await renderTimeline(
          parsed.data.video_segments,
          parsed.data.audio_segments ?? undefined,
          (pct) => send({ progress: pct }),
        )
        send({ progress: 100, path: outPath })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '渲染失败'
        send({ error: msg })
      } finally {
        controller.close()
      }
    },
  })

  return c.body(stream, 200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  })
})

export default app
