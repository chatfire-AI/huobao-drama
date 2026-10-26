/**
 * 剧本改写 Agent 工具
 * 模块级单例 — episodeId 通过 RequestContext 按请求注入
 */
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { db, schema } from '../../db/index.js'
import { and, eq, isNull } from 'drizzle-orm'
import { now } from '../../utils/response.js'
import { getDramaId, getEpisodeId } from '../context.js'

/**
 * 本剧已有素材（角色/场景/道具），供改写时沿用同名以便后续提取阶段按名去重、复用形象图。
 * 只放改写需要的最少信息，避免占用过多上下文。
 */
async function projectAssets(dramaId: number | null) {
  if (!dramaId) return null
  const [chars, scenes, props] = await Promise.all([
    db.select().from(schema.characters).where(and(eq(schema.characters.dramaId, dramaId), isNull(schema.characters.deletedAt))),
    db.select().from(schema.scenes).where(and(eq(schema.scenes.dramaId, dramaId), isNull(schema.scenes.deletedAt))),
    db.select().from(schema.props).where(and(eq(schema.props.dramaId, dramaId), isNull(schema.props.deletedAt))),
  ])
  if (!chars.length && !scenes.length && !props.length) return null
  const brief = (v?: string | null) => (v || '').replace(/\s+/g, ' ').slice(0, 60)
  return {
    characters: chars.map(c => ({ name: c.name, role: c.role || '', brief: brief(c.description || c.appearance), has_image: !!c.imageUrl })),
    scenes: scenes.map(sc => ({ location: sc.location, time: sc.time || '', has_image: !!sc.imageUrl })),
    props: props.map(pr => ({ name: pr.name, has_image: !!pr.imageUrl })),
  }
}

const ASSET_REUSE_GUIDE = `【已有素材复用规则】existing_assets 是本剧已经建好的角色/场景/道具（多数已生成形象图）。
- 原文中的人物、地点、物品如果就是已有素材中的同一个，剧本里必须使用与素材完全相同的名称（角色名、场景地点名、道具名），不要换称呼、不要加修饰，例如已有「刀哥」就不要写成「刀老大」。
- 新出现的场景如果与已有场景本质相同（同一个地方），场景头的地点直接沿用已有场景名。
- 不要为了复用而改动剧情；确实是新角色/新地点/新物品时正常命名即可。
（Reuse rule: when a person/place/object in the source is the same as an existing asset, use exactly the existing name so later extraction reuses its image; never alter the plot just to reuse assets.）`

async function withAssets(episode: { dramaId: number }, requestContext: any) {
  const assets = await projectAssets(getDramaId(requestContext) ?? episode.dramaId)
  return assets ? { existing_assets: assets, asset_reuse_guide: ASSET_REUSE_GUIDE } : {}
}

const readEpisodeScript = createTool({
  id: 'read_episode_script',
  description: 'Read the script content of the current episode, plus the existing characters/scenes/props of this drama (existing_assets) that should be reused by exact name.',
  inputSchema: z.object({}),
  execute: async (_input, context) => {
    const episodeId = getEpisodeId(context?.requestContext)
    if (!episodeId) return { error: 'Missing episodeId in request context' }
    const [ep] = await db.select().from(schema.episodes)
      .where(eq(schema.episodes.id, episodeId))
    if (!ep) return { error: `Episode not found (id=${episodeId})` }
    const content = ep.content || ep.scriptContent
    if (!content) return { error: `Episode has no content (id=${episodeId})` }
    return { content, word_count: content.length, episode_id: episodeId, ...(await withAssets(ep, context?.requestContext)) }
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
      ...(await withAssets(ep, context?.requestContext)),
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
    await db.update(schema.episodes)
      .set({ scriptContent: content, updatedAt: now() })
      .where(eq(schema.episodes.id, episodeId))

    return { message: `Script saved`, word_count: content.length }
  },
})

export const scriptTools = { readEpisodeScript, rewriteToScreenplay, saveScript }
