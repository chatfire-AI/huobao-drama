/**
 * 配音服务 — 台词提取 → 音色绑定 → 逐句 TTS → 拼接时混音
 *
 * - 台词：文本模型从分镜描述提取 说话人/台词/语气指令，存 dub_lines，可在界面编辑
 * - 音色：dub_voices 按剧绑定 说话人 → 音色，整部剧所有集共用，保证同一角色声音一致
 * - 合成：audio 类型 AI 配置（豆包语音合成 2.0），按参数指纹缓存，未改动的句子不重复计费
 * - 拼接：placeDubLines 计算每句在成片中的起点，ffmpeg-merge 据此混入配音轨
 * - 开关：剧级「单独配音」默认关闭，关闭时一切照旧（使用视频模型自带声音）
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { Agent } from '@mastra/core/agent'
import { db, schema } from '../db/index.js'
import { now } from '../utils/response.js'
import { ffmpeg } from '../utils/ffmpeg.js'
import { DATA_ROOT, STORAGE_ROOT } from '../utils/paths.js'
import { getActiveConfig, getConfigById } from './ai.js'
import { getModel } from '../agents/index.js'
import { synthesizeSpeech, resolveTTSResource } from './adapters/volcengine-tts.js'
import { logTaskError, logTaskProgress, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'

export const NARRATOR = '旁白'

/** 适合短剧的豆包语音合成 2.0 官方音色（官方音色列表 2026-09） */
export const VOICE_CATALOG: { id: string; name: string; gender: 'male' | 'female'; desc: string }[] = [
  { id: 'zh_male_qingcang_uranus_bigtts', name: '擎苍', gender: 'male', desc: '成熟有力' },
  { id: 'zh_male_baqiqingshu_uranus_bigtts', name: '霸气青叔', gender: 'male', desc: '中年，霸气低沉' },
  { id: 'zh_male_gaolengchenwen_uranus_bigtts', name: '高冷沉稳', gender: 'male', desc: '冷静克制' },
  { id: 'zh_male_aojiaobazong_uranus_bigtts', name: '傲娇霸总', gender: 'male', desc: '强势霸总' },
  { id: 'zh_male_silang_uranus_bigtts', name: '四郎', gender: 'male', desc: '深沉' },
  { id: 'zh_male_ruyaqingnian_uranus_bigtts', name: '儒雅青年', gender: 'male', desc: '斯文温和' },
  { id: 'zh_male_yuanboxiaoshu_uranus_bigtts', name: '渊博小叔', gender: 'male', desc: '中年，沉稳' },
  { id: 'zh_male_yizhipiannan_uranus_bigtts', name: '译制片男', gender: 'male', desc: '译制片腔' },
  { id: 'zh_male_m191_uranus_bigtts', name: '云舟', gender: 'male', desc: '清朗沉稳' },
  { id: 'zh_male_taocheng_uranus_bigtts', name: '小天', gender: 'male', desc: '清澈有磁性' },
  { id: 'zh_male_shaonianzixin_uranus_bigtts', name: '少年梓辛', gender: 'male', desc: '少年' },
  { id: 'zh_male_huolixiaoge_uranus_bigtts', name: '活力小哥', gender: 'male', desc: '年轻有活力' },
  { id: 'zh_male_fanjuanqingnian_uranus_bigtts', name: '反卷青年', gender: 'male', desc: '年轻慵懒' },
  { id: 'zh_male_zhuangzhou_uranus_bigtts', name: '庄周', gender: 'male', desc: '苍老悠远' },
  { id: 'zh_male_xuanyijieshuo_uranus_bigtts', name: '悬疑解说', gender: 'male', desc: '旁白，悬疑感' },
  { id: 'zh_male_cixingjieshuonan_uranus_bigtts', name: '磁性解说男声', gender: 'male', desc: '旁白解说' },
  { id: 'zh_female_gaolengyujie_uranus_bigtts', name: '高冷御姐', gender: 'female', desc: '冷艳干练' },
  { id: 'zh_female_sophie_uranus_bigtts', name: '魅力苏菲', gender: 'female', desc: '成熟有魅力' },
  { id: 'zh_female_cancan_uranus_bigtts', name: '知性灿灿', gender: 'female', desc: '知性' },
  { id: 'zh_female_zhishuaiyingzi_uranus_bigtts', name: '直率英子', gender: 'female', desc: '爽朗直率' },
  { id: 'zh_female_linxiao_uranus_bigtts', name: '林潇', gender: 'female', desc: '角色扮演' },
  { id: 'zh_female_lingling_uranus_bigtts', name: '玲玲姐姐', gender: 'female', desc: '姐姐感' },
  { id: 'zh_female_wenroushunv_uranus_bigtts', name: '温柔淑女', gender: 'female', desc: '温柔' },
  { id: 'zh_female_gufengshaoyu_uranus_bigtts', name: '古风少御', gender: 'female', desc: '清冷少御' },
  { id: 'zh_female_shuangkuaisisi_uranus_bigtts', name: '爽快思思', gender: 'female', desc: '爽快' },
  { id: 'zh_female_vv_uranus_bigtts', name: 'Vivi', gender: 'female', desc: '活泼灵动' },
  { id: 'zh_female_zhixingnv_uranus_bigtts', name: '知性女声', gender: 'female', desc: '知性沉稳' },
  { id: 'zh_female_kailangjiejie_uranus_bigtts', name: '开朗姐姐', gender: 'female', desc: '开朗' },
  { id: 'zh_female_linjianvhai_uranus_bigtts', name: '邻家女孩', gender: 'female', desc: '年轻清新' },
  { id: 'zh_female_popo_uranus_bigtts', name: '婆婆', gender: 'female', desc: '老年' },
]
const FALLBACK_VOICE = { male: 'zh_male_m191_uranus_bigtts', female: 'zh_female_zhixingnv_uranus_bigtts' }

// 拼接混音参数
export const DUB_LINE_LEAD = 0.3      // 镜头开始到第一句的留白（秒）
export const DUB_LINE_GAP = 0.25      // 句间停顿（秒）
// 闪避参数（sidechaincompress）：配音电平超过阈值即把原声压低约 20dB；
// attack/release 让压低与恢复平滑过渡，避免音量突变的"咔哒"感
export const DUB_DUCKING = 'threshold=0.015:ratio=12:attack=20:release=400'

export interface TextModelOptions { model?: string; configId?: number }
/** 配音模型选择（顶栏）：configId 指定配置，model 覆盖资源 ID；都不传则用启用中优先级最高的配置 */
export interface AudioModelOptions { model?: string; configId?: number }

function toAbsPath(relativePath: string): string {
  if (path.isAbsolute(relativePath)) return relativePath
  if (relativePath.startsWith('static/')) return path.join(DATA_ROOT, relativePath)
  return path.join(STORAGE_ROOT, relativePath)
}

/** 一次性文本生成：复用 Agent 的模型解析（文本配置/模型覆盖/国内中转补丁） */
async function generateJSON(prompt: string, opts?: TextModelOptions): Promise<any> {
  const agent = new Agent({
    id: 'dub_director',
    name: 'Dub Director',
    instructions: '你是短剧配音导演，只输出 JSON，不输出任何解释。',
    model: () => getModel(undefined, opts?.model, opts?.configId),
  })
  const result = await agent.generate([{ role: 'user', content: prompt }])
  const text = result.text || ''
  const m = text.match(/[[{][\s\S]*[\]}]/)
  try {
    return JSON.parse(m ? m[0] : text)
  } catch {
    throw new Error(`文本模型返回的不是合法 JSON：${text.slice(0, 120)}`)
  }
}

async function episodeContext(episodeId: number) {
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId))
  if (!ep) throw new Error('剧集不存在')
  const storyboards = await db.select().from(schema.storyboards)
    .where(and(eq(schema.storyboards.episodeId, episodeId), isNull(schema.storyboards.deletedAt)))
    .orderBy(asc(schema.storyboards.storyboardNumber))
  const characters = await db.select().from(schema.characters)
    .where(and(eq(schema.characters.dramaId, ep.dramaId), isNull(schema.characters.deletedAt)))
  return { ep, storyboards, characters }
}

// ===================== 开关 =====================
// 是否单独配音（剧级，默认关闭）：关闭时保持视频模型自带声音，拼接导出不混入配音
const enabledKey = (dramaId: number) => `dub_enabled:${dramaId}`

export function isDubEnabled(dramaId: number): boolean {
  const row = db.select().from(schema.appSettings).where(eq(schema.appSettings.key, enabledKey(dramaId))).get()
  return row?.value === '1'
}

export function setDubEnabled(dramaId: number, enabled: boolean) {
  const value = enabled ? '1' : '0'
  db.insert(schema.appSettings)
    .values({ key: enabledKey(dramaId), value, updatedAt: now() })
    .onConflictDoUpdate({ target: schema.appSettings.key, set: { value, updatedAt: now() } })
    .run()
  return enabled
}

// ===================== 台词 =====================

export async function listLines(episodeId: number) {
  const lines = await db.select().from(schema.dubLines)
    .where(eq(schema.dubLines.episodeId, episodeId))
  const sbs = await db.select({ id: schema.storyboards.id, n: schema.storyboards.storyboardNumber })
    .from(schema.storyboards).where(eq(schema.storyboards.episodeId, episodeId))
  const num = new Map(sbs.map(s => [s.id, s.n]))
  return lines
    .map(l => ({ ...l, storyboardNumber: l.storyboardId ? num.get(l.storyboardId) ?? null : null }))
    .sort((a, b) => (a.storyboardNumber ?? 1e9) - (b.storyboardNumber ?? 1e9) || a.lineIndex - b.lineIndex)
}

/** 从分镜描述提取台词，覆盖本集已有台词 */
export async function extractLines(episodeId: number, opts?: TextModelOptions) {
  const { ep, storyboards, characters } = await episodeContext(episodeId)
  const shots = storyboards.filter(s => (s.description || '').trim())
  if (!shots.length) throw new Error('本集还没有分镜描述，请先拆分分镜')

  logTaskStart('Dub', 'extract-lines', { episodeId, shots: shots.length })
  const names = characters.map(c => c.name).join('、') || '（无）'
  const shotText = shots.map(s => `[分镜${s.storyboardNumber}] ${s.description}`).join('\n')
  const prompt = `下面是一集短剧的分镜描述，台词通常写在「」或引号里。
已知角色：${names}。

请逐个分镜提取需要配音的台词（对白；如有明确的旁白/画外音也提取，说话人写"${NARRATOR}"）。
不要编造描述里没有的台词，不要改写台词文字。每句给出：
- shot：分镜编号
- speaker：说话人，必须是已知角色名之一或"${NARRATOR}"，根据上下文判断（例如"木兰低声说：「…」"说话人是木兰）
- text：台词原文
- emotion：一句具体的语气指令，给配音演员看，如"压低声音、带着苦涩自嘲地说"、"轻蔑地嘲笑，语速偏快"

只输出 JSON 数组：[{"shot": 1, "speaker": "...", "text": "...", "emotion": "..."}]
没有台词的分镜不用输出。

${shotText}`

  const raw = await generateJSON(prompt, opts)
  if (!Array.isArray(raw)) throw new Error('文本模型未返回台词数组')
  const byNumber = new Map(storyboards.map(s => [s.storyboardNumber, s.id]))
  const counters = new Map<number, number>()
  const ts = now()
  const rows = raw
    .filter((l: any) => String(l?.text || '').trim())
    .map((l: any) => {
      const sbId = byNumber.get(Number(l.shot)) ?? null
      const idx = counters.get(sbId ?? 0) ?? 0
      counters.set(sbId ?? 0, idx + 1)
      return {
        episodeId,
        storyboardId: sbId,
        lineIndex: idx,
        speaker: String(l.speaker || NARRATOR).trim(),
        text: String(l.text).trim(),
        emotion: String(l.emotion || '').trim() || null,
        status: 'pending',
        createdAt: ts,
        updatedAt: ts,
      }
    })

  await db.delete(schema.dubLines).where(eq(schema.dubLines.episodeId, episodeId))
  if (rows.length) await db.insert(schema.dubLines).values(rows)
  logTaskSuccess('Dub', 'extract-lines', { episodeId, lines: rows.length })

  // 新出现的说话人自动分配音色（失败不影响提取结果）
  try { await castVoices(ep.dramaId, opts) } catch (err: any) {
    logTaskError('Dub', 'cast-voices', { dramaId: ep.dramaId, error: err.message })
  }
  return listLines(episodeId)
}

export async function createLine(episodeId: number, data: { storyboard_id?: number; speaker?: string; text?: string; emotion?: string }) {
  const existing = await db.select().from(schema.dubLines).where(eq(schema.dubLines.episodeId, episodeId))
  const sbId = data.storyboard_id ? Number(data.storyboard_id) : null
  const idx = existing.filter(l => l.storyboardId === sbId).reduce((m, l) => Math.max(m, l.lineIndex + 1), 0)
  const ts = now()
  await db.insert(schema.dubLines).values({
    episodeId,
    storyboardId: sbId,
    lineIndex: idx,
    speaker: (data.speaker || NARRATOR).trim(),
    text: (data.text || '').trim() || '……',
    emotion: data.emotion?.trim() || null,
    status: 'pending',
    createdAt: ts,
    updatedAt: ts,
  })
}

export async function updateLine(id: number, data: Record<string, any>) {
  const updates: Record<string, any> = { updatedAt: now() }
  if ('speaker' in data) updates.speaker = String(data.speaker || '').trim() || NARRATOR
  if ('text' in data) updates.text = String(data.text || '').trim()
  if ('emotion' in data) updates.emotion = String(data.emotion || '').trim() || null
  if ('storyboard_id' in data) updates.storyboardId = data.storyboard_id ? Number(data.storyboard_id) : null
  if ('line_index' in data) updates.lineIndex = Number(data.line_index) || 0
  await db.update(schema.dubLines).set(updates).where(eq(schema.dubLines.id, id))
}

export async function deleteLine(id: number) {
  await db.delete(schema.dubLines).where(eq(schema.dubLines.id, id))
}

// ===================== 音色 =====================

export async function getVoices(dramaId: number): Promise<Record<string, string>> {
  const rows = await db.select().from(schema.dubVoices).where(eq(schema.dubVoices.dramaId, dramaId))
  return Object.fromEntries(rows.map(r => [r.speaker, r.voice]))
}

export async function setVoice(dramaId: number, speaker: string, voice: string) {
  const ts = now()
  const [row] = await db.select().from(schema.dubVoices)
    .where(and(eq(schema.dubVoices.dramaId, dramaId), eq(schema.dubVoices.speaker, speaker)))
  if (row) {
    await db.update(schema.dubVoices).set({ voice, updatedAt: ts }).where(eq(schema.dubVoices.id, row.id))
  } else {
    await db.insert(schema.dubVoices).values({ dramaId, speaker, voice, createdAt: ts, updatedAt: ts })
  }
}

/** 本剧所有说话人（角色 + 台词里出现过的说话人 + 旁白） */
export async function listSpeakers(dramaId: number) {
  const chars = await db.select().from(schema.characters)
    .where(and(eq(schema.characters.dramaId, dramaId), isNull(schema.characters.deletedAt)))
  const eps = await db.select({ id: schema.episodes.id }).from(schema.episodes).where(eq(schema.episodes.dramaId, dramaId))
  const lines = eps.length
    ? await db.select({ speaker: schema.dubLines.speaker }).from(schema.dubLines)
      .where(inArray(schema.dubLines.episodeId, eps.map(e => e.id)))
    : []
  const used = new Set(lines.map(l => l.speaker))
  const out = chars.map(c => ({ name: c.name, description: c.description || c.role || '', used: used.has(c.name) }))
  for (const s of used) if (!out.some(o => o.name === s)) out.push({ name: s, description: s === NARRATOR ? '旁白解说' : '', used: true })
  return out
}

/** 为还没有音色的说话人（只针对台词里出现过的）用文本模型挑选音色 */
export async function castVoices(dramaId: number, opts?: TextModelOptions) {
  const voices = await getVoices(dramaId)
  const missing = (await listSpeakers(dramaId)).filter(s => s.used && !voices[s.name])
  if (!missing.length) return voices

  const catalog = VOICE_CATALOG.map(v => `- ${v.id}：${v.name}（${v.gender === 'male' ? '男' : '女'}，${v.desc}）`).join('\n')
  const who = missing.map(s => `- ${s.name}：${(s.description || '').slice(0, 120)}`).join('\n')
  const prompt = `给短剧角色挑选配音音色。性别必须匹配（zh_male 男声，zh_female 女声），
不同角色尽量区分明显，已被占用的音色（${Object.values(voices).join(', ') || '无'}）不要再用。

角色：
${who}

可选音色：
${catalog}

只输出 JSON 对象：{"角色名": "音色ID"}`
  const picked = await generateJSON(prompt, opts)
  const valid = new Set(VOICE_CATALOG.map(v => v.id))
  for (const s of missing) {
    const v = picked?.[s.name]
    await setVoice(dramaId, s.name, valid.has(v) ? v : FALLBACK_VOICE.male)
  }
  logTaskSuccess('Dub', 'cast-voices', { dramaId, speakers: missing.map(s => s.name) })
  return getVoices(dramaId)
}

// ===================== 合成 =====================

async function requireAudioConfig(opts?: AudioModelOptions) {
  const config = (opts?.configId ? await getConfigById(opts.configId) : null) || await getActiveConfig('audio')
  if (!config) throw new Error('未配置配音服务，请先到「设置 → AI 服务 → 配音」添加豆包语音合成配置')
  return opts?.model ? { ...config, model: opts.model } : config
}

function probeDuration(absPath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(absPath, (err, meta) => resolve(err ? 0 : Number(meta.format.duration || 0)))
  })
}

/** 试听：不落库，直接返回 mp3 */
export async function previewVoice(voice: string, text: string, instruction?: string, opts?: AudioModelOptions) {
  const config = await requireAudioConfig(opts)
  return synthesizeSpeech(config, { text, voice, instruction })
}

/** 合成一句；参数未变且音频文件仍在时直接复用（不重复计费） */
export async function synthesizeLine(lineId: number, force = false, opts?: AudioModelOptions) {
  const [line] = await db.select().from(schema.dubLines).where(eq(schema.dubLines.id, lineId))
  if (!line) throw new Error('台词不存在')
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, line.episodeId))
  if (!ep) throw new Error('剧集不存在')
  const voice = (await getVoices(ep.dramaId))[line.speaker]
  if (!voice) throw new Error(`「${line.speaker}」还没有设置音色`)
  const config = await requireAudioConfig(opts)

  const resource = resolveTTSResource(config, voice)
  const key = crypto.createHash('md5').update(`${voice}|${line.text}|${line.emotion || ''}|${resource}`).digest('hex')
  if (!force && line.audioKey === key && line.audioUrl && fs.existsSync(toAbsPath(line.audioUrl))) {
    if (line.status !== 'completed') {
      await db.update(schema.dubLines).set({ status: 'completed', errorMsg: null }).where(eq(schema.dubLines.id, lineId))
    }
    return false
  }

  await db.update(schema.dubLines).set({ status: 'processing', errorMsg: null, updatedAt: now() })
    .where(eq(schema.dubLines.id, lineId))
  try {
    const audio = await synthesizeSpeech(config, { text: line.text, voice, instruction: line.emotion || undefined })
    const dir = path.join(STORAGE_ROOT, 'dub')
    fs.mkdirSync(dir, { recursive: true })
    const filename = `${uuid()}.mp3`
    fs.writeFileSync(path.join(dir, filename), audio)
    const duration = await probeDuration(path.join(dir, filename))
    if (line.audioUrl && line.audioUrl !== `static/dub/${filename}`) {
      try { fs.unlinkSync(toAbsPath(line.audioUrl)) } catch { /* 旧文件可能已不存在 */ }
    }
    await db.update(schema.dubLines).set({
      audioUrl: `static/dub/${filename}`, audioKey: key, duration, status: 'completed', errorMsg: null, updatedAt: now(),
    }).where(eq(schema.dubLines.id, lineId))
    logTaskProgress('Dub', 'line-done', { lineId, voice, chars: line.text.length, duration })
    return true
  } catch (err: any) {
    await db.update(schema.dubLines).set({ status: 'failed', errorMsg: err.message, updatedAt: now() })
      .where(eq(schema.dubLines.id, lineId))
    throw err
  }
}

/** 整集配音：后台逐句合成（单句失败不中断），返回待处理句数 */
export async function synthesizeEpisode(episodeId: number, opts?: AudioModelOptions) {
  await requireAudioConfig(opts)
  const lines = await listLines(episodeId)
  if (!lines.length) throw new Error('本集还没有台词，请先提取台词')
  await db.update(schema.dubLines).set({ status: 'processing', errorMsg: null })
    .where(eq(schema.dubLines.episodeId, episodeId))
  logTaskStart('Dub', 'episode-synthesize', { episodeId, lines: lines.length })
  ;(async () => {
    let created = 0, failed = 0
    for (const l of lines) {
      try { if (await synthesizeLine(l.id, false, opts)) created++ } catch (err: any) {
        failed++
        // 未设音色等前置错误不会经过 synthesizeLine 内部的失败回写，这里统一兜底
        await db.update(schema.dubLines).set({ status: 'failed', errorMsg: err.message, updatedAt: now() })
          .where(eq(schema.dubLines.id, l.id))
        logTaskError('Dub', 'line-failed', { lineId: l.id, error: err.message })
      }
    }
    logTaskSuccess('Dub', 'episode-synthesize', { episodeId, created, failed, cached: lines.length - created - failed })
  })()
  return lines.length
}

// ===================== 拼接混音 =====================

/**
 * 计算每句配音在成片里的起点：每个镜头从 起点+留白 开始依次排布；
 * 上一镜配音超长时顺延，避免两句重叠。
 */
export async function placeDubLines(episodeId: number, clips: { storyboardId: number; duration: number }[]) {
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId))
  if (!ep || !isDubEnabled(ep.dramaId)) return []
  const lines = (await listLines(episodeId)).filter(l =>
    l.status === 'completed' && l.audioUrl && l.duration && fs.existsSync(toAbsPath(l.audioUrl)))
  const byShot = new Map<number, typeof lines>()
  for (const l of lines) {
    if (!l.storyboardId) continue
    const arr = byShot.get(l.storyboardId) || []
    arr.push(l)
    byShot.set(l.storyboardId, arr)
  }

  const placed: { path: string; start: number }[] = []
  let t = 0
  let dubEnd = -Infinity
  for (const clip of clips) {
    let cursor = Math.max(t + DUB_LINE_LEAD, dubEnd + DUB_LINE_GAP)
    for (const l of byShot.get(clip.storyboardId) || []) {
      placed.push({ path: toAbsPath(l.audioUrl!), start: cursor })
      dubEnd = cursor + (l.duration || 0)
      cursor = dubEnd + DUB_LINE_GAP
    }
    t += clip.duration
  }
  return placed
}
