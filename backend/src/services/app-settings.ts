/**
 * 应用级全局设置（app_settings key-value 表）
 * AI 内容语言：所有 Agent 产出（剧本/提取/分镜/提示词）统一使用的目标语言
 * 层次约束：本模块只依赖 db，严禁反向 import agents/*（agents/context.ts 会引用本模块）
 *
 * 注意：刻意做成同步 API（better-sqlite3 驱动的 .get()/.run()），
 * 供 agents/context.ts 的同步 buildAgentRequestContext 内部直接调用
 */
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { now } from '../utils/response.js'

export const CONTENT_LANGUAGES = ['zh', 'en', 'ja', 'ko'] as const
export type ContentLanguage = typeof CONTENT_LANGUAGES[number]

const CONTENT_LANGUAGE_KEY = 'content_language'

function isContentLanguage(v: unknown): v is ContentLanguage {
  return typeof v === 'string' && (CONTENT_LANGUAGES as readonly string[]).includes(v)
}

/** 读取全局内容语言；未设置或值非法时回退 'zh'（保持历史默认行为） */
export function getContentLanguage(): ContentLanguage {
  const row = db.select().from(schema.appSettings)
    .where(eq(schema.appSettings.key, CONTENT_LANGUAGE_KEY))
    .get()
  return isContentLanguage(row?.value) ? row.value : 'zh'
}

/** 写入全局内容语言（upsert） */
export function setContentLanguage(lang: ContentLanguage): ContentLanguage {
  if (!isContentLanguage(lang)) throw new Error(`Invalid content language: ${lang}`)
  db.insert(schema.appSettings)
    .values({ key: CONTENT_LANGUAGE_KEY, value: lang, updatedAt: now() })
    .onConflictDoUpdate({
      target: schema.appSettings.key,
      set: { value: lang, updatedAt: now() },
    })
    .run()
  return lang
}

const TOURS_SEEN_KEY = 'tours_seen'
const MAX_TOURS_SEEN = 64

function sanitizeTourIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  return [...new Set(ids.filter(v => typeof v === 'string' && v.length > 0 && v.length <= 100))].slice(0, MAX_TOURS_SEEN)
}

/** 已看过的引导漫游 id 列表（JSON 数组存储）；桌面端端口随启动变化，localStorage 不可靠，故落库 */
export function getToursSeen(): string[] {
  const row = db.select().from(schema.appSettings)
    .where(eq(schema.appSettings.key, TOURS_SEEN_KEY))
    .get()
  try { return sanitizeTourIds(JSON.parse(row?.value || '[]')) } catch { return [] }
}

/** 写入已看过的引导漫游 id 列表（upsert） */
export function setToursSeen(ids: unknown): string[] {
  const clean = sanitizeTourIds(ids)
  const value = JSON.stringify(clean)
  db.insert(schema.appSettings)
    .values({ key: TOURS_SEEN_KEY, value, updatedAt: now() })
    .onConflictDoUpdate({
      target: schema.appSettings.key,
      set: { value, updatedAt: now() },
    })
    .run()
  return clean
}

// ===== AI 改写屏蔽词 =====
// 例如「百家乐」这类容易触发下游生图/生视频内容审核的词；可选替换词，留空则要求 AI 换种说法
const BANNED_WORDS_KEY = 'banned_words'
const MAX_BANNED_WORDS = 500

export interface BannedWord { word: string; replace: string }

function sanitizeBannedWords(input: unknown): BannedWord[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const out: BannedWord[] = []
  for (const it of input) {
    const word = String((it as any)?.word ?? '').trim().slice(0, 50)
    const replace = String((it as any)?.replace ?? '').trim().slice(0, 50)
    // 替换词里不能再含有屏蔽词本身，否则替换后仍命中
    if (!word || seen.has(word) || replace.includes(word)) continue
    seen.add(word)
    out.push({ word, replace })
  }
  return out.slice(0, MAX_BANNED_WORDS)
}

export function getBannedWords(): BannedWord[] {
  const row = db.select().from(schema.appSettings)
    .where(eq(schema.appSettings.key, BANNED_WORDS_KEY))
    .get()
  try { return sanitizeBannedWords(JSON.parse(row?.value || '[]')) } catch { return [] }
}

export function setBannedWords(list: unknown): BannedWord[] {
  const clean = sanitizeBannedWords(list)
  const value = JSON.stringify(clean)
  db.insert(schema.appSettings)
    .values({ key: BANNED_WORDS_KEY, value, updatedAt: now() })
    .onConflictDoUpdate({ target: schema.appSettings.key, set: { value, updatedAt: now() } })
    .run()
  return clean
}

/**
 * 按屏蔽词处理文本：有替换词的直接替换（长词优先，避免短词先替换破坏长词），
 * 返回替换后的文本、已替换项、以及仍残留（无替换词）的屏蔽词
 */
export function applyBannedWords(text: string, list = getBannedWords()) {
  let out = text
  const replaced: { word: string; replace: string; count: number }[] = []
  for (const { word, replace } of [...list].sort((a, b) => b.word.length - a.word.length)) {
    if (!replace) continue
    const count = out.split(word).length - 1
    if (count) {
      out = out.split(word).join(replace)
      replaced.push({ word, replace, count })
    }
  }
  const remaining = list.filter(({ word, replace }) => !replace && out.includes(word)).map(w => w.word)
  return { text: out, replaced, remaining }
}
