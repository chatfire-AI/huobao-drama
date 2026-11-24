import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ensureCharacterFinalPrompt, ensureSceneFinalPrompt, ensurePropFinalPrompt, type PromptAgentOptions } from './final-prompt.js'

type Kind = 'character' | 'scene' | 'prop'
type Batch = {
  status: 'running' | 'done' | 'error'
  total: number
  completed: number
  failed: number
  errors: { kind: Kind; id: number; message: string }[]
}
const batches = new Map<number, Batch>()
const narrator = /旁白|画外音|narrator|ナレーター|ナレーション|내레이션|해설/i

function missingPrompts(episodeId: number, dramaId: number) {
  const { characters, scenes, props, episodeCharacters, episodeScenes, episodeProps } = schema
  const cast = db.select({ row: characters }).from(episodeCharacters)
    .innerJoin(characters, eq(episodeCharacters.characterId, characters.id))
    .where(and(eq(episodeCharacters.episodeId, episodeId), eq(characters.dramaId, dramaId), isNull(characters.deletedAt))).all()
    .filter(({ row }) => !narrator.test(`${row.name} ${row.role || ''}`))
  const locations = db.select({ row: scenes }).from(episodeScenes)
    .innerJoin(scenes, eq(episodeScenes.sceneId, scenes.id))
    .where(and(eq(episodeScenes.episodeId, episodeId), eq(scenes.dramaId, dramaId), isNull(scenes.deletedAt))).all()
  const objects = db.select({ row: props }).from(episodeProps)
    .innerJoin(props, eq(episodeProps.propId, props.id))
    .where(and(eq(episodeProps.episodeId, episodeId), eq(props.dramaId, dramaId), isNull(props.deletedAt))).all()
  return [
    ...cast.map(({ row }) => ({ kind: 'character' as const, row })),
    ...locations.map(({ row }) => ({ kind: 'scene' as const, row })),
    ...objects.map(({ row }) => ({ kind: 'prop' as const, row })),
  ].filter(({ row }) => !row.finalPrompt?.trim())
}

export function startAssetPromptBatch(episodeId: number, options: PromptAgentOptions) {
  const episode = db.select().from(schema.episodes)
    .where(and(eq(schema.episodes.id, episodeId), isNull(schema.episodes.deletedAt))).get()
  if (!episode) throw new Error('剧集不存在')
  const previous = batches.get(episodeId)
  if (previous?.status === 'running') return { started: false, total: previous.total }
  const pending = missingPrompts(episodeId, episode.dramaId)
  if (!pending.length) {
    batches.delete(episodeId)
    return { started: false, total: 0 }
  }

  const batch: Batch = { status: 'running', total: pending.length, completed: 0, failed: 0, errors: [] }
  batches.set(episodeId, batch)
  const opts = { ...options, onlyMissing: true }
  void (async () => {
    for (const { kind, row } of pending) {
      try {
        const prompt = kind === 'character' ? await ensureCharacterFinalPrompt(row, episodeId, false, opts)
          : kind === 'scene' ? await ensureSceneFinalPrompt(row, episodeId, false, opts)
            : await ensurePropFinalPrompt(row, episodeId, false, opts)
        if (!prompt.trim()) throw new Error('提示词未保存，可重试缺失项')
        batch.completed++
      } catch (error) {
        batch.failed++
        batch.errors.push({ kind, id: row.id, message: error instanceof Error ? error.message : String(error) })
      }
    }
    batch.status = batch.failed ? 'error' : 'done'
  })()
  return { started: true, total: batch.total }
}

export function assetPromptBatchStatus(episodeId: number) {
  return batches.get(episodeId) ?? null
}
