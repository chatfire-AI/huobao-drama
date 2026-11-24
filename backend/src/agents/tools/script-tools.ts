/**
 * 剧本改写 Agent 工具
 * 模块级单例 — episodeId 通过 RequestContext 按请求注入
 */
import { createTool } from '@mastra/core/tools'
import type { RequestContext } from '@mastra/core/request-context'
import { z } from 'zod'
import { db, schema } from '../../db/index.js'
import { and, eq, isNull } from 'drizzle-orm'
import { now } from '../../utils/response.js'
import { getDramaId, getEpisodeId, getScriptRewriteState, type ScriptRewriteState } from '../context.js'
import { getBannedWords, applyBannedWords } from '../../services/app-settings.js'

/** 屏蔽词规则（随读取工具一起返回给改写 Agent）；没有配置时不返回 */
function bannedWordsPayload() {
  const list = getBannedWords()
  if (!list.length) return {}
  return {
    banned_words: list,
    banned_words_rule: `【屏蔽词规则】剧本中不得出现 banned_words 里的任何词（容易触发后续生图/生视频的内容审核）。
有 replace 的用 replace 代替；没有 replace 的请换一种不含该词的说法表达同样的意思，保持剧情不变。
save_script 会再次检查：有替换词的会被自动替换，无替换词的会被拒绝保存。`,
  }
}

function trackSource(episode: typeof schema.episodes.$inferSelect, context?: RequestContext) {
  const rewrite = getScriptRewriteState(context)
  if (!rewrite) return null
  if (episode.dramaId !== getDramaId(context) || episode.deletedAt) return '剧集不存在或不属于当前项目'
  if (rewrite.source && (rewrite.source.content !== episode.content || rewrite.source.scriptContent !== episode.scriptContent)) {
    return '改写期间原文或剧本已变化，未覆盖'
  }
  rewrite.source ??= { id: episode.id, dramaId: episode.dramaId, content: episode.content, scriptContent: episode.scriptContent }
  return null
}

const readEpisodeScript = createTool({
  id: 'read_episode_script',
  description: 'Read the script content of the current episode.',
  inputSchema: z.object({}),
  execute: async (_input, context) => {
    const episodeId = getEpisodeId(context?.requestContext)
    if (!episodeId) return { error: 'Missing episodeId in request context' }
    const [ep] = await db.select().from(schema.episodes)
      .where(eq(schema.episodes.id, episodeId))
    if (!ep) return { error: `Episode not found (id=${episodeId})` }
    const content = ep.content || ep.scriptContent
    if (!content) return { error: `Episode has no content (id=${episodeId})` }
    const error = trackSource(ep, context?.requestContext)
    if (error) return { error }
    return { content, word_count: content.length, episode_id: episodeId, ...bannedWordsPayload() }
  },
})

const rewriteToScreenplay = createTool({
  id: 'rewrite_to_screenplay',
  description: 'Read the original content with formatting instructions for AI rewriting. Use instead of read_episode_script, not after it. This tool does not perform the rewriting.',
  inputSchema: z.object({
    instructions: z.string().optional().describe('Additional rewrite instructions'),
  }),
  execute: async ({ instructions }, context) => {
    const episodeId = getEpisodeId(context?.requestContext)
    if (!episodeId) return { error: 'Missing episodeId in request context' }
    const [ep] = await db.select().from(schema.episodes)
      .where(eq(schema.episodes.id, episodeId))
    if (!ep) return { error: `Episode not found` }
    const source = ep.content || ep.scriptContent
    if (!source) return { error: `Episode has no content to rewrite` }
    const error = trackSource(ep, context?.requestContext)
    if (error) return { error }

    return {
      ...bannedWordsPayload(),
      source_content: source,
      instruction: `请将 source_content 中的原始内容改写为格式化剧本。

格式规范：
- 场景头：## S编号 | 内景/外景 · 地点 | 时间段
- 动作描写：自然段落，不包含镜头语言
- 对白：角色名：（状态/表情）台词内容
- 每个场景 30-60 秒内容

${instructions || ''}`,
    }
  },
})

const saveScript = createTool({
  id: 'save_script',
  description: 'Save the rewritten screenplay content to the current episode.',
  inputSchema: z.object({
    content: z.string().describe('The formatted screenplay content to save'),
  }),
  execute: async ({ content }, context) => {
    const episodeId = getEpisodeId(context?.requestContext)
    if (!episodeId) return { error: 'Missing episodeId in request context' }
    const rewrite = getScriptRewriteState(context?.requestContext)
    if (rewrite) {
      rewrite.draft = undefined
      if (!rewrite.source) return { error: '请先读取当前剧集原文' }
      if (!content.trim()) return { error: '改写剧本为空，未保存' }
    }
    // 屏蔽词兜底：有替换词的自动替换；仍残留无替换词的屏蔽词则拒绝保存，让 Agent 改写后重试
    const checked = applyBannedWords(content)
    if (checked.remaining.length) {
      return {
        error: `剧本中仍包含屏蔽词：${checked.remaining.join('、')}。请把这些词换成不含它们的说法（保持剧情不变）后重新调用 save_script。`,
      }
    }
    if (rewrite) {
      if (!checked.text.trim()) return { error: '改写剧本为空，未保存' }
      rewrite.draft = { text: checked.text, replaced: checked.replaced }
      return { message: 'Script accepted for saving when the rewrite completes', word_count: checked.text.length }
    }
    await db.update(schema.episodes)
      .set({ scriptContent: checked.text, updatedAt: now() })
      .where(eq(schema.episodes.id, episodeId))

    return {
      message: `Script saved`,
      word_count: checked.text.length,
      ...(checked.replaced.length ? { banned_words_replaced: checked.replaced } : {}),
    }
  },
})

export function commitScriptRewrite(rewrite: ScriptRewriteState, finishReason?: string) {
  const { source, draft } = rewrite
  rewrite.draft = undefined
  if (finishReason === 'length') throw new Error('改写达到输出上限，原文和旧剧本已保留')
  if (!source || !draft || (finishReason !== 'stop' && finishReason !== 'tool-calls')) {
    throw new Error('改写未提交完整剧本，原文和旧剧本已保留')
  }
  // The compare and write are one SQLite statement, so a concurrent edit cannot be overwritten.
  const result = db.update(schema.episodes).set({ scriptContent: draft.text, updatedAt: now() })
    .where(and(eq(schema.episodes.id, source.id), eq(schema.episodes.dramaId, source.dramaId), isNull(schema.episodes.deletedAt),
      source.content === null ? isNull(schema.episodes.content) : eq(schema.episodes.content, source.content),
      source.scriptContent === null ? isNull(schema.episodes.scriptContent) : eq(schema.episodes.scriptContent, source.scriptContent)))
    .run()
  if (result.changes !== 1) throw new Error('改写期间原文或剧本已变化，未覆盖')
  return { saved: true, episode_id: source.id, word_count: draft.text.length,
    ...(draft.replaced.length ? { banned_words_replaced: draft.replaced } : {}) }
}

export const scriptTools = { readEpisodeScript, rewriteToScreenplay, saveScript }
