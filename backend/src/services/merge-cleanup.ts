/**
 * 清理本集「拼接导出」产生的数据库记录与 static/merged 下的成片文件
 */
import fs from 'fs'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { getAbsolutePath } from '../utils/storage.js'
import { now } from '../utils/response.js'

const MERGED_PREFIX = 'static/merged/'

function normalizeRel(p: string | null | undefined): string | null {
  if (!p || typeof p !== 'string') return null
  const t = p.replace(/^\//, '')
  return t.startsWith(MERGED_PREFIX) ? t : null
}

export function clearEpisodeMergeArtifacts(episodeId: number): {
  removed_files: number
  removed_rows: number
  cleared_episode_video: boolean
} {
  const [ep] = db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId)).all()
  if (!ep) throw new Error('Episode not found')

  const merges = db.select().from(schema.videoMerges).where(eq(schema.videoMerges.episodeId, episodeId)).all()

  const paths = new Set<string>()
  for (const m of merges) {
    const r = normalizeRel(m.mergedUrl)
    if (r) paths.add(r)
  }
  const epVideoRel = normalizeRel(ep.videoUrl)
  if (epVideoRel) paths.add(epVideoRel)

  let removed_files = 0
  for (const p of paths) {
    try {
      const abs = getAbsolutePath(p)
      if (fs.existsSync(abs)) {
        fs.unlinkSync(abs)
        removed_files++
      }
    } catch {
      /* ignore */
    }
  }

  const delResult = db.delete(schema.videoMerges).where(eq(schema.videoMerges.episodeId, episodeId)).run()
  const removed_rows = typeof delResult?.changes === 'number' ? delResult.changes : merges.length

  let cleared_episode_video = false
  if (epVideoRel) {
    db.update(schema.episodes)
      .set({ videoUrl: null, updatedAt: now() })
      .where(eq(schema.episodes.id, episodeId))
      .run()
    cleared_episode_video = true
  }

  return { removed_files, removed_rows, cleared_episode_video }
}
