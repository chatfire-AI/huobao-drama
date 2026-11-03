/**
 * 剧本改写 Agent 工具
 * 模块级单例 — episodeId 通过 RequestContext 按请求注入
 */
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { db, schema } from '../../db/index.js'
import { eq } from 'drizzle-orm'
import { now } from '../../utils/response.js'
import { getEpisodeId } from '../context.js'
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
    return { content, word_count: content.length, episode_id: episodeId, ...bannedWordsPayload() }
  },
})

const rewriteToScreenplay = createTool({
  id: 'rewrite_to_screenplay',
  description: 'Read the original content for AI rewriting. Returns the source text with formatting instructions.',
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

    return {
      ...bannedWordsPayload(),
      source_content: source,
      instruction: `请将以下内容改写为格式化剧本。

格式规范：
- 场景头：## S编号 | 内景/外景 · 地点 | 时间段
- 动作描写：自然段落，不包含镜头语言
- 对白：角色名：（状态/表情）台词内容
- 每个场景 30-60 秒内容

${instructions || ''}

【原始内容】
${source}`,
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
    // 屏蔽词兜底：有替换词的自动替换；仍残留无替换词的屏蔽词则拒绝保存，让 Agent 改写后重试
    const checked = applyBannedWords(content)
    if (checked.remaining.length) {
      return {
        error: `剧本中仍包含屏蔽词：${checked.remaining.join('、')}。请把这些词换成不含它们的说法（保持剧情不变）后重新调用 save_script。`,
      }
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

export const scriptTools = { readEpisodeScript, rewriteToScreenplay, saveScript }
