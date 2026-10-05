/**
 * 素材改名 + 全剧同步替换
 *
 * 角色名 / 场景地点 / 道具名会散落在剧本、分镜描述、视频提示词（@名字 映射参考图）、其他素材描述里，
 * 只改素材本身会导致新旧名字对不上（提取去重、@引用映射都会失效）。这里在改名时按需把本剧范围内
 * 的旧名一并替换为新名；dryRun 只统计会替换的处数，不落库。
 */
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { now } from '../utils/response.js'

export type AssetKind = 'character' | 'scene' | 'prop'

const KIND = {
  character: { table: schema.characters, nameKey: 'name' as const },
  scene: { table: schema.scenes, nameKey: 'location' as const },
  prop: { table: schema.props, nameKey: 'name' as const },
}

// 需要同步替换的文本字段
const EPISODE_FIELDS = ['title', 'content', 'scriptContent', 'description'] as const
const STORYBOARD_FIELDS = ['title', 'location', 'description', 'result', 'atmosphere', 'imagePrompt', 'videoPrompt', 'bgmPrompt', 'soundEffect'] as const
const CHARACTER_FIELDS = ['role', 'description', 'appearance', 'styling', 'personality', 'finalPrompt'] as const
const SCENE_FIELDS = ['prompt', 'lighting', 'finalPrompt'] as const
const PROP_FIELDS = ['description', 'prompt', 'finalPrompt'] as const

/** 单字名同步替换误伤太大（如「刀」），只改素材本身 */
export const MIN_CASCADE_LENGTH = 2

function countIn(text: unknown, needle: string) {
  if (typeof text !== 'string' || !text) return 0
  return text.split(needle).length - 1
}

/** 对一组行逐字段替换；返回 { 命中处数, 待写入的更新 } */
function planReplacements<T extends Record<string, any>>(rows: T[], fields: readonly string[], from: string, to: string) {
  let hits = 0
  const updates: { id: number; set: Record<string, string> }[] = []
  for (const row of rows) {
    const set: Record<string, string> = {}
    for (const f of fields) {
      const n = countIn(row[f], from)
      if (n) {
        hits += n
        set[f] = (row[f] as string).split(from).join(to)
      }
    }
    if (Object.keys(set).length) updates.push({ id: row.id, set })
  }
  return { hits, updates }
}

export interface RenameResult {
  oldName: string
  newName: string
  cascaded: boolean
  /** 各处命中次数（dryRun 时为将要替换的处数） */
  hits: { episodes: number; storyboards: number; assets: number; total: number }
}

export async function renameAsset(kind: AssetKind, id: number, newNameRaw: string, opts: { cascade?: boolean; dryRun?: boolean } = {}): Promise<RenameResult> {
  const { table, nameKey } = KIND[kind]
  const newName = String(newNameRaw || '').trim()
  if (!newName) throw new Error('名称不能为空')

  const [asset]: any[] = await db.select().from(table as any).where(eq((table as any).id, id))
  if (!asset || asset.deletedAt) throw new Error('素材不存在')
  const oldName: string = asset[nameKey] || ''
  const dramaId: number = asset.dramaId

  if (newName !== oldName) {
    const siblings: any[] = await db.select().from(table as any)
      .where(and(eq((table as any).dramaId, dramaId), isNull((table as any).deletedAt)))
    if (siblings.some(s => s.id !== id && (s[nameKey] || '').trim() === newName)) {
      throw new Error(`本剧已有同名${kind === 'character' ? '角色' : kind === 'scene' ? '场景' : '道具'}「${newName}」`)
    }
  }

  const cascade = !!opts.cascade && newName !== oldName && oldName.length >= MIN_CASCADE_LENGTH
  const hits = { episodes: 0, storyboards: 0, assets: 0, total: 0 }

  // 本剧范围内的待替换文本
  const episodes = await db.select().from(schema.episodes)
    .where(and(eq(schema.episodes.dramaId, dramaId), isNull(schema.episodes.deletedAt)))
  const epIds = episodes.map(e => e.id)
  const storyboards = epIds.length
    ? await db.select().from(schema.storyboards)
      .where(and(inArray(schema.storyboards.episodeId, epIds), isNull(schema.storyboards.deletedAt)))
    : []
  const [chars, scenes, props] = await Promise.all([
    db.select().from(schema.characters).where(and(eq(schema.characters.dramaId, dramaId), isNull(schema.characters.deletedAt))),
    db.select().from(schema.scenes).where(and(eq(schema.scenes.dramaId, dramaId), isNull(schema.scenes.deletedAt))),
    db.select().from(schema.props).where(and(eq(schema.props.dramaId, dramaId), isNull(schema.props.deletedAt))),
  ])

  const plans = oldName.length >= MIN_CASCADE_LENGTH && newName !== oldName ? {
    episodes: planReplacements(episodes, EPISODE_FIELDS, oldName, newName),
    storyboards: planReplacements(storyboards, STORYBOARD_FIELDS, oldName, newName),
    characters: planReplacements(chars, CHARACTER_FIELDS, oldName, newName),
    scenes: planReplacements(scenes, SCENE_FIELDS, oldName, newName),
    props: planReplacements(props, PROP_FIELDS, oldName, newName),
  } : null

  if (plans) {
    hits.episodes = plans.episodes.hits
    hits.storyboards = plans.storyboards.hits
    hits.assets = plans.characters.hits + plans.scenes.hits + plans.props.hits
    hits.total = hits.episodes + hits.storyboards + hits.assets
  }

  if (opts.dryRun) return { oldName, newName, cascaded: cascade, hits }

  const ts = now()
  db.transaction((tx) => {
    tx.update(table as any).set({ [nameKey]: newName, updatedAt: ts }).where(eq((table as any).id, id)).run()
    if (cascade && plans) {
      const apply = (tbl: any, list: { id: number; set: Record<string, string> }[]) => {
        for (const u of list) tx.update(tbl).set({ ...u.set, updatedAt: ts }).where(eq(tbl.id, u.id)).run()
      }
      apply(schema.episodes, plans.episodes.updates)
      apply(schema.storyboards, plans.storyboards.updates)
      apply(schema.characters, plans.characters.updates)
      apply(schema.scenes, plans.scenes.updates)
      apply(schema.props, plans.props.updates)
    }
  })

  return { oldName, newName, cascaded: cascade, hits }
}
