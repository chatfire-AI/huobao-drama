import { Hono } from 'hono'
import { and, eq, isNull } from 'drizzle-orm'
import { db, getInsertId, schema } from '../db/index.js'
import { success, notFound, badRequest, now } from '../utils/response.js'
import { toSnakeCaseArray, toSnakeCase } from '../utils/transform.js'
import { getActiveConfigId } from '../services/ai.js'
import { EXTRACT_TARGETS, getExtractionStatus, startExtraction, type ExtractTarget } from '../services/extraction.js'
import { getVideoPromptBatchStatus, startVideoPromptBatch } from '../services/video-prompts.js'

const app = new Hono()

// POST /episodes — Create a new episode
app.post('/', async (c) => {
  const body = await c.req.json()
  if (!body.drama_id) return badRequest(c, 'drama_id 必填')

  // 图片/视频配置：显式传入优先，缺省时自动锁定当前启用的最高优先级官方配置
  const imageConfigId = body.image_config_id ?? await getActiveConfigId('image')
  const videoConfigId = body.video_config_id ?? await getActiveConfigId('video')
  if (!imageConfigId) return badRequest(c, '未找到启用的图片生成配置，请先在设置中心添加')
  if (!videoConfigId) return badRequest(c, '未找到启用的视频生成配置，请先在设置中心添加')
  const ts = now()

  // Get next episode number（忽略已软删的集，删除中间集后新集号可复用空位之后的最大值）
  const existing = await db.select().from(schema.episodes)
    .where(and(eq(schema.episodes.dramaId, body.drama_id), isNull(schema.episodes.deletedAt)))
    .orderBy(schema.episodes.episodeNumber)
  const nextNum = existing.length ? Math.max(...existing.map(e => e.episodeNumber)) + 1 : 1

  const res = await db.insert(schema.episodes).values({
    dramaId: body.drama_id,
    episodeNumber: nextNum,
    title: body.title || `第${nextNum}集`,
    imageConfigId,
    videoConfigId,
    // 视频分辨率在创建集时固定（480p/720p/1080p），后续可通过 PUT 修改；各视频适配器再映射为厂商档位
    resolution: ['480p', '720p', '1080p'].includes(body.resolution) ? body.resolution : '720p',
    createdAt: ts,
    updatedAt: ts,
  })

  const [ep] = await db.select().from(schema.episodes)
    .where(eq(schema.episodes.id, getInsertId(res)))
  return success(c, {
    id: ep.id,
    episode_number: ep.episodeNumber,
    title: ep.title,
    image_config_id: ep.imageConfigId,
    video_config_id: ep.videoConfigId,
    resolution: ep.resolution,
  })
})

// PUT /episodes/:id - Update episode fields
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()

  const allowed = ['content', 'script_content', 'title', 'description', 'status', 'resolution']
  const updates: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) return badRequest(c, '没有可更新的字段')
  if ('resolution' in updates && !['480p', '720p', '1080p'].includes(updates.resolution)) {
    return badRequest(c, 'resolution 只支持 480p / 720p / 1080p')
  }

  // Map snake_case to camelCase for drizzle
  const drizzleUpdates: Record<string, any> = { updatedAt: now() }
  if ('content' in updates) drizzleUpdates.content = updates.content
  if ('script_content' in updates) drizzleUpdates.scriptContent = updates.script_content
  if ('title' in updates) drizzleUpdates.title = updates.title
  if ('description' in updates) drizzleUpdates.description = updates.description
  if ('status' in updates) drizzleUpdates.status = updates.status
  if ('resolution' in updates) drizzleUpdates.resolution = updates.resolution

  await db.update(schema.episodes).set(drizzleUpdates).where(eq(schema.episodes.id, id))
  return success(c)
})

// DELETE /episodes/:id - Soft delete episode（其分镜/生成记录保留但不可达）
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, id))
  if (!ep) return notFound(c, '剧集不存在')
  await db.update(schema.episodes).set({ deletedAt: now(), updatedAt: now() })
    .where(eq(schema.episodes.id, id))
  return success(c)
})

// ===== 资产复用：项目（剧）级素材库 ↔ 集 =====
// 角色/场景/道具属于整部剧，集通过 episode_* 关联表引用；同一素材可被多集复用（形象图不重复生成）
const ASSET_KINDS = {
  character: { table: schema.characters, link: schema.episodeCharacters, fk: schema.episodeCharacters.characterId, fkKey: 'characterId' },
  scene: { table: schema.scenes, link: schema.episodeScenes, fk: schema.episodeScenes.sceneId, fkKey: 'sceneId' },
  prop: { table: schema.props, link: schema.episodeProps, fk: schema.episodeProps.propId, fkKey: 'propId' },
} as const
type AssetKind = keyof typeof ASSET_KINDS
const isAssetKind = (k: string): k is AssetKind => k in ASSET_KINDS

/** 素材 id → 被多少集引用（只统计本剧未删除的集） */
async function assetEpisodeCounts(kind: AssetKind, dramaId: number) {
  const { link, fkKey } = ASSET_KINDS[kind]
  const eps = await db.select({ id: schema.episodes.id }).from(schema.episodes)
    .where(and(eq(schema.episodes.dramaId, dramaId), isNull(schema.episodes.deletedAt)))
  const epIds = new Set(eps.map(e => e.id))
  const rows: any[] = await db.select().from(link as any)
  const counts = new Map<number, number>()
  for (const r of rows) {
    if (!epIds.has(r.episodeId)) continue
    counts.set(r[fkKey], (counts.get(r[fkKey]) || 0) + 1)
  }
  return counts
}

/** 某集引用的素材（附 episode_count 供前端标注「共用 N 集」） */
async function episodeAssets(kind: AssetKind, episodeId: number) {
  const { table, link, fkKey } = ASSET_KINDS[kind]
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId))
  if (!ep) return []
  const links: any[] = await db.select().from(link as any).where(eq((link as any).episodeId, episodeId))
  const ids = new Set(links.map(l => l[fkKey]))
  if (!ids.size) return []
  const all: any[] = await db.select().from(table as any)
  const counts = await assetEpisodeCounts(kind, ep.dramaId)
  return all
    .filter(a => ids.has(a.id) && !a.deletedAt)
    .map(a => ({ ...toSnakeCase(a), episode_count: counts.get(a.id) || 1 }))
}

// GET /episodes/:id/characters | scenes | props — 本集引用的素材
app.get('/:id/characters', async (c) => success(c, await episodeAssets('character', Number(c.req.param('id')))))
app.get('/:id/scenes', async (c) => success(c, await episodeAssets('scene', Number(c.req.param('id')))))
app.get('/:id/props', async (c) => success(c, await episodeAssets('prop', Number(c.req.param('id')))))

// GET /episodes/:id/asset-library?type=character|scene|prop — 本剧素材库（标注是否已在本集、共用集数）
app.get('/:id/asset-library', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const kind = c.req.query('type') || ''
  if (!isAssetKind(kind)) return badRequest(c, 'type 须为 character / scene / prop')
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId))
  if (!ep) return notFound(c, '剧集不存在')
  const { table, link, fkKey } = ASSET_KINDS[kind]
  const all: any[] = await db.select().from(table as any).where(eq((table as any).dramaId, ep.dramaId))
  const linked = new Set((await db.select().from(link as any).where(eq((link as any).episodeId, episodeId)) as any[]).map(l => l[fkKey]))
  const counts = await assetEpisodeCounts(kind, ep.dramaId)
  return success(c, all
    .filter(a => !a.deletedAt)
    .map(a => ({ ...toSnakeCase(a), episode_count: counts.get(a.id) || 0, linked: linked.has(a.id) })))
})

// POST /episodes/:id/asset-links — { type, ids }：把素材库中的素材加入本集（已在本集的跳过）
app.post('/:id/asset-links', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const kind = String(body.type || '')
  if (!isAssetKind(kind)) return badRequest(c, 'type 须为 character / scene / prop')
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId))
  if (!ep) return notFound(c, '剧集不存在')
  const { table, link, fkKey } = ASSET_KINDS[kind]
  const ids: number[] = (Array.isArray(body.ids) ? body.ids : []).map(Number).filter(Boolean)
  // 只允许引用同一部剧、未删除的素材
  const valid = new Set((await db.select().from(table as any).where(eq((table as any).dramaId, ep.dramaId)) as any[])
    .filter(a => !a.deletedAt).map(a => a.id))
  const linked = new Set((await db.select().from(link as any).where(eq((link as any).episodeId, episodeId)) as any[]).map(l => l[fkKey]))
  const toAdd = ids.filter(id => valid.has(id) && !linked.has(id))
  if (toAdd.length) {
    const ts = now()
    await db.insert(link as any).values(toAdd.map(id => ({ episodeId, [fkKey]: id, createdAt: ts })))
  }
  return success(c, { added: toAdd.length })
})

// DELETE /episodes/:id/asset-links/:type/:assetId — 移出本集（只解除关联，素材本身与其他集不受影响）
app.delete('/:id/asset-links/:type/:assetId', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const kind = c.req.param('type')
  if (!isAssetKind(kind)) return badRequest(c, 'type 须为 character / scene / prop')
  const { link, fk } = ASSET_KINDS[kind]
  await db.delete(link as any).where(and(eq((link as any).episodeId, episodeId), eq(fk as any, Number(c.req.param('assetId')))))
  return success(c)
})

// POST /episodes/:id/extract — 异步提取资产（target: characters | scenes | props），立即返回，前端轮询状态
app.post('/:id/extract', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const target = body.target as ExtractTarget
  if (!EXTRACT_TARGETS.includes(target)) return badRequest(c, 'target 必须是 characters / scenes / props')
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, id))
  if (!ep) return notFound(c, '剧集不存在')
  const started = startExtraction(ep.id, ep.dramaId, target, { model: body.model || undefined, configId: body.config_id ?? undefined })
  return success(c, { target, status: 'running', already_running: !started })
})

// GET /episodes/:id/extract-status — 查询三类资产提取任务状态
app.get('/:id/extract-status', async (c) => {
  const id = Number(c.req.param('id'))
  return success(c, getExtractionStatus(id))
})

// POST /episodes/:id/generate-video-prompts — 异步批量为缺少视频提示词的分镜生成（立即返回，前端轮询状态）
app.post('/:id/generate-video-prompts', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, id))
  if (!ep) return notFound(c, '剧集不存在')
  const storyboardIds = Array.isArray(body.storyboard_ids)
    ? body.storyboard_ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
    : undefined
  const result = await startVideoPromptBatch(ep.id, ep.dramaId, { model: body.model || undefined, configId: body.config_id ?? undefined }, storyboardIds)
  if (result.total === -1) return success(c, { status: 'running', already_running: true })
  if (!result.started) return success(c, { status: 'idle', total: 0 })
  return success(c, { status: 'running', total: result.total })
})

// GET /episodes/:id/video-prompts-status — 查询批量视频提示词任务状态
app.get('/:id/video-prompts-status', async (c) => {
  const id = Number(c.req.param('id'))
  return success(c, getVideoPromptBatchStatus(id))
})

// GET /episodes/:episode_id/storyboards
app.get('/:episode_id/storyboards', async (c) => {
  const episodeId = Number(c.req.param('episode_id'))
  const rows = await db.select().from(schema.storyboards)
    .where(eq(schema.storyboards.episodeId, episodeId))
    .orderBy(schema.storyboards.storyboardNumber)

  const links = await db.select().from(schema.storyboardCharacters)
  const charIdsByStoryboard = new Map<number, number[]>()
  for (const link of links) {
    const arr = charIdsByStoryboard.get(link.storyboardId) || []
    arr.push(link.characterId)
    charIdsByStoryboard.set(link.storyboardId, arr)
  }

  const propLinks = await db.select().from(schema.storyboardProps)
  const propIdsByStoryboard = new Map<number, number[]>()
  for (const link of propLinks) {
    const arr = propIdsByStoryboard.get(link.storyboardId) || []
    arr.push(link.propId)
    propIdsByStoryboard.set(link.storyboardId, arr)
  }

  const episodeCharLinks = await db.select().from(schema.episodeCharacters)
    .where(eq(schema.episodeCharacters.episodeId, episodeId))
  const episodeCharIds = episodeCharLinks.map(link => link.characterId)
  const allChars = (await db.select().from(schema.characters))
    .filter(ch => episodeCharIds.includes(ch.id) && !ch.deletedAt)

  const episodePropLinks = await db.select().from(schema.episodeProps)
    .where(eq(schema.episodeProps.episodeId, episodeId))
  const episodePropIds = episodePropLinks.map(link => link.propId)
  const allProps = (await db.select().from(schema.props))
    .filter(p => episodePropIds.includes(p.id) && !p.deletedAt)

  return success(c, rows.map((row) => ({
    ...toSnakeCase(row),
    character_ids: charIdsByStoryboard.get(row.id) || [],
    prop_ids: propIdsByStoryboard.get(row.id) || [],
    characters: allChars
      .filter(ch => (charIdsByStoryboard.get(row.id) || []).includes(ch.id))
      .map(ch => toSnakeCase(ch)),
    props: allProps
      .filter(p => (propIdsByStoryboard.get(row.id) || []).includes(p.id))
      .map(p => toSnakeCase(p)),
  })))
})

// GET /episodes/:id/pipeline-status — 流水线进度
// GET /episodes/:id/generation-tasks — 按集聚合 sys_task + video_merges
// sys_task 无 episode_id,通过 storyboard/scene/character/prop 关联键归属到当前集
app.get('/:id/generation-tasks', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId))
  if (!ep) return notFound(c, '剧集不存在')

  const sbs = await db.select().from(schema.storyboards).where(eq(schema.storyboards.episodeId, episodeId))
  const storyboardIds = new Set(sbs.map(s => s.id))

  const epScenes = await db.select().from(schema.episodeScenes).where(eq(schema.episodeScenes.episodeId, episodeId))
  const sceneIds = new Set(epScenes.map(r => r.sceneId))
  // 兼容 scenes.episodeId 直挂的旧数据
  const directScenes = await db.select().from(schema.scenes).where(eq(schema.scenes.episodeId, episodeId))
  directScenes.forEach(s => sceneIds.add(s.id))

  const epChars = await db.select().from(schema.episodeCharacters).where(eq(schema.episodeCharacters.episodeId, episodeId))
  const characterIds = new Set(epChars.map(r => r.characterId))

  const dramaProps = await db.select().from(schema.props).where(eq(schema.props.dramaId, ep.dramaId))
  const propIds = new Set(dramaProps.map(p => p.id))

  const allTasks = await db.select().from(schema.sysTask).where(eq(schema.sysTask.dramaId, ep.dramaId))
  const tasks = allTasks
    .filter(t =>
      (t.storyboardId && storyboardIds.has(t.storyboardId)) ||
      (t.sceneId && sceneIds.has(t.sceneId)) ||
      (t.characterId && characterIds.has(t.characterId)) ||
      (t.propId && propIds.has(t.propId))
    )
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  const merges = (await db.select().from(schema.videoMerges)
    .where(and(eq(schema.videoMerges.episodeId, episodeId), isNull(schema.videoMerges.deletedAt))))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 20)

  return success(c, {
    tasks: toSnakeCaseArray(tasks),
    merges: toSnakeCaseArray(merges),
  })
})

app.get('/:id/pipeline-status', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId))
  if (!ep) return notFound(c, '剧集不存在')

  const chars = await db.select().from(schema.characters).where(eq(schema.characters.dramaId, ep.dramaId))
  const scenes = await db.select().from(schema.scenes).where(eq(schema.scenes.dramaId, ep.dramaId))
  const sbs = await db.select().from(schema.storyboards).where(eq(schema.storyboards.episodeId, episodeId))
  const merges = await db.select().from(schema.videoMerges).where(eq(schema.videoMerges.episodeId, episodeId))

  const sbsWithImage = sbs.filter(s => s.composedImage)
  const sbsWithVideo = sbs.filter(s => s.videoUrl)
  const latestMerge = merges[merges.length - 1]

  function stepStatus(done: boolean, partial?: boolean) {
    if (done) return 'done'
    if (partial) return 'partial'
    return 'pending'
  }

  return success(c, {
    episode_id: episodeId,
    steps: {
      script_rewrite: { status: ep.scriptContent ? 'done' : (ep.content ? 'ready' : 'pending') },
      extract_characters: { status: stepStatus(chars.length > 0), count: chars.length },
      extract_scenes: { status: stepStatus(scenes.length > 0), count: scenes.length },
      extract_storyboards: { status: stepStatus(sbs.length > 0), count: sbs.length },
      generate_images: { status: stepStatus(sbsWithImage.length === sbs.length && sbs.length > 0, sbsWithImage.length > 0), completed: sbsWithImage.length, total: sbs.length },
      generate_videos: { status: stepStatus(sbsWithVideo.length === sbs.length && sbs.length > 0, sbsWithVideo.length > 0), completed: sbsWithVideo.length, total: sbs.length },
      merge_episode: { status: latestMerge?.status === 'completed' ? 'done' : (latestMerge ? latestMerge.status : 'pending'), merged_url: latestMerge?.mergedUrl },
    },
  })
})

export default app
