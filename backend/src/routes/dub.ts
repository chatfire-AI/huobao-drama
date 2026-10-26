import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, badRequest } from '../utils/response.js'
import { toSnakeCaseArray } from '../utils/transform.js'
import { getActiveConfig } from '../services/ai.js'
import {
  VOICE_CATALOG, NARRATOR,
  listLines, extractLines, createLine, updateLine, deleteLine,
  getVoices, setVoice, listSpeakers, castVoices,
  synthesizeLine, synthesizeEpisode, previewVoice,
  isDubEnabled, setDubEnabled,
} from '../services/dub.js'

const app = new Hono()

/** 顶栏配音模型选择：audio_model / audio_config_id */
function audioOpts(body: any) {
  return { model: body?.audio_model || undefined, configId: Number(body?.audio_config_id) || undefined }
}

async function dramaIdOf(episodeId: number) {
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId))
  return ep?.dramaId ?? null
}

async function episodeState(episodeId: number, dramaId: number) {
  return {
    enabled: isDubEnabled(dramaId),
    lines: toSnakeCaseArray(await listLines(episodeId)),
    voices: await getVoices(dramaId),
    speakers: await listSpeakers(dramaId),
    configured: !!(await getActiveConfig('audio')),
  }
}

// GET /dub/catalog — 可选音色
app.get('/catalog', (c) => success(c, { voices: VOICE_CATALOG, narrator: NARRATOR }))

// GET /dub/episodes/:id — 台词 + 音色绑定 + 说话人 + 是否已配置配音服务
app.get('/episodes/:id', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const dramaId = await dramaIdOf(episodeId)
  if (!dramaId) return badRequest(c, '剧集不存在')
  return success(c, await episodeState(episodeId, dramaId))
})

// POST /dub/episodes/:id/extract — 从分镜提取台词（覆盖本集台词），并为新说话人分配音色
app.post('/episodes/:id/extract', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const dramaId = await dramaIdOf(episodeId)
  if (!dramaId) return badRequest(c, '剧集不存在')
  const body = await c.req.json().catch(() => ({}))
  try {
    await extractLines(episodeId, { model: body.text_model || undefined, configId: body.text_config_id || undefined })
    return success(c, await episodeState(episodeId, dramaId))
  } catch (err: any) {
    return badRequest(c, err.message)
  }
})

// POST /dub/episodes/:id/cast — 为未分配音色的说话人自动挑选音色
app.post('/episodes/:id/cast', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const dramaId = await dramaIdOf(episodeId)
  if (!dramaId) return badRequest(c, '剧集不存在')
  const body = await c.req.json().catch(() => ({}))
  try {
    await castVoices(dramaId, { model: body.text_model || undefined, configId: body.text_config_id || undefined })
    return success(c, await episodeState(episodeId, dramaId))
  } catch (err: any) {
    return badRequest(c, err.message)
  }
})

// PUT /dub/dramas/:id/enabled — { enabled }：剧级「单独配音」开关
app.put('/dramas/:id/enabled', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return success(c, { enabled: setDubEnabled(Number(c.req.param('id')), !!body.enabled) })
})

// PUT /dub/dramas/:id/voices — { speaker, voice }
app.put('/dramas/:id/voices', async (c) => {
  const dramaId = Number(c.req.param('id'))
  const body = await c.req.json()
  const speaker = String(body.speaker || '').trim()
  const voice = String(body.voice || '').trim()
  if (!speaker || !voice) return badRequest(c, '需要 speaker 与 voice')
  await setVoice(dramaId, speaker, voice)
  return success(c, await getVoices(dramaId))
})

// POST /dub/episodes/:id/lines — 新增一句
app.post('/episodes/:id/lines', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const dramaId = await dramaIdOf(episodeId)
  if (!dramaId) return badRequest(c, '剧集不存在')
  await createLine(episodeId, await c.req.json().catch(() => ({})))
  return success(c, await episodeState(episodeId, dramaId))
})

// PUT /dub/lines/:id — 修改说话人/台词/语气/所属分镜
app.put('/lines/:id', async (c) => {
  await updateLine(Number(c.req.param('id')), await c.req.json())
  return success(c)
})

// DELETE /dub/lines/:id
app.delete('/lines/:id', async (c) => {
  await deleteLine(Number(c.req.param('id')))
  return success(c)
})

// POST /dub/lines/:id/synthesize — 合成单句（同步返回），body.force 强制重合成
app.post('/lines/:id/synthesize', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  try {
    await synthesizeLine(Number(c.req.param('id')), !!body.force, audioOpts(body))
    return success(c)
  } catch (err: any) {
    return badRequest(c, err.message)
  }
})

// POST /dub/episodes/:id/synthesize — 整集后台合成，前端轮询 GET 状态
app.post('/episodes/:id/synthesize', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const total = await synthesizeEpisode(Number(c.req.param('id')), audioOpts(body))
    return success(c, { total })
  } catch (err: any) {
    return badRequest(c, err.message)
  }
})

// POST /dub/preview — 试听 { voice, text, emotion }，返回 audio/mpeg
app.post('/preview', async (c) => {
  const body = await c.req.json()
  const voice = String(body.voice || '').trim()
  const text = String(body.text || '').trim()
  if (!voice || !text) return badRequest(c, '需要 voice 与 text')
  try {
    const audio = await previewVoice(voice, text.slice(0, 200), body.emotion || undefined, audioOpts(body))
    return new Response(new Uint8Array(audio), { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
  } catch (err: any) {
    return badRequest(c, err.message)
  }
})

export default app
