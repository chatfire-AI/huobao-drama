/**
 * 剧集工作流阶段状态 — 只读取现有数据表，不写库、不触发 Agent。
 * 状态用于前端阶段导航与后续门禁；缺模板时与默认流程配合使用。
 */
import { eq, inArray } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import type { WorkflowStageId } from './templates.js'

export interface StageStatus {
  done: boolean
  detail?: string
}

type CharRow = typeof schema.characters.$inferSelect
type SceneRow = typeof schema.scenes.$inferSelect
type PropRow = typeof schema.props.$inferSelect

export async function getEpisodeWorkflowStatus(episodeId: number): Promise<Record<WorkflowStageId, StageStatus> | null> {
  const [episode] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId))
  if (!episode) return null

  const [epChars, epScenes, epProps] = await Promise.all([
    db.select().from(schema.episodeCharacters).where(eq(schema.episodeCharacters.episodeId, episodeId)),
    db.select().from(schema.episodeScenes).where(eq(schema.episodeScenes.episodeId, episodeId)),
    db.select().from(schema.episodeProps).where(eq(schema.episodeProps.episodeId, episodeId)),
  ])
  const charIds = epChars.map(r => r.characterId)
  const sceneIds = epScenes.map(r => r.sceneId)
  const propIds = epProps.map(r => r.propId)

  const [charRows, sceneRows, propRows] = await Promise.all([
    charIds.length ? db.select().from(schema.characters).where(inArray(schema.characters.id, charIds)) : Promise.resolve<CharRow[]>([]),
    sceneIds.length ? db.select().from(schema.scenes).where(inArray(schema.scenes.id, sceneIds)) : Promise.resolve<SceneRow[]>([]),
    propIds.length ? db.select().from(schema.props).where(inArray(schema.props.id, propIds)) : Promise.resolve<PropRow[]>([]),
  ])
  const alive = (row: { deletedAt?: string | null }) => !row.deletedAt
  const assets = [...charRows, ...sceneRows, ...propRows].filter(alive)
  const assetCount = charIds.length + sceneIds.length + propIds.length

  const storyboards = (await db.select().from(schema.storyboards)
    .where(eq(schema.storyboards.episodeId, episodeId)))
    .filter(sb => !sb.deletedAt)
  const merges = (await db.select().from(schema.videoMerges)
    .where(eq(schema.videoMerges.episodeId, episodeId)))
    .filter(m => !m.deletedAt)

  const isFilled = (v?: string | null) => Boolean((v || '').trim())
  const images = assets.filter(a => isFilled(a.imageUrl)).length
  const prompts = storyboards.filter(sb => isFilled(sb.videoPrompt)).length
  const videos = storyboards.filter(sb => isFilled(sb.videoUrl)).length

  return {
    script: {
      done: isFilled(episode.scriptContent),
      detail: isFilled(episode.scriptContent) ? '已改写' : '待改写',
    },
    extract: {
      done: assetCount > 0,
      detail: `资产 ${assetCount}`,
    },
    storyboard: {
      done: storyboards.length > 0,
      detail: `${storyboards.length} 个分镜`,
    },
    video_prompt: {
      done: storyboards.length > 0 && prompts === storyboards.length,
      detail: `${prompts}/${storyboards.length}`,
    },
    image: {
      done: assets.length > 0 && images === assets.length,
      detail: `${images}/${assets.length}`,
    },
    video: {
      done: storyboards.length > 0 && videos === storyboards.length,
      detail: `${videos}/${storyboards.length}`,
    },
    merge: {
      done: isFilled(episode.videoUrl) || merges.some(m => m.status === 'completed' && isFilled(m.mergedUrl)),
    },
  }
}
