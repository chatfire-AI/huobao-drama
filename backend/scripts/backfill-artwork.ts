/**
 * 存量文件回填脚本 — 为历史生成的图片/视频补生成缩略图和海报帧
 *
 * 用法：cd backend && npx tsx scripts/backfill-artwork.ts
 *
 * 扫描 data/static 下：
 *   images/  → 为缺少 *_thumb.webp 的图片生成缩略图（宽 400 WebP）
 *   videos/、merged/ → 为缺少 *_poster.jpg 的视频抽取海报帧
 * 已存在的跳过，可重复执行。
 */
import fs from 'fs'
import path from 'path'
import { generateImageThumb, thumbPathFor, getAbsolutePath } from '../src/utils/storage.js'
import { extractVideoPoster, posterPathFor } from '../src/utils/video-poster.js'
import { STORAGE_ROOT } from '../src/utils/paths.js'

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov'])

function listFiles(subDir: string): string[] {
  const dir = path.join(STORAGE_ROOT, subDir)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile())
}

async function backfillImages(subDir: string) {
  let done = 0, skipped = 0, failed = 0
  for (const file of listFiles(subDir)) {
    const ext = path.extname(file).toLowerCase()
    if (!IMAGE_EXTS.has(ext) || file.endsWith('_thumb.webp')) continue
    const rel = `static/${subDir}/${file}`
    if (fs.existsSync(getAbsolutePath(thumbPathFor(rel)))) { skipped++; continue }
    const ok = await generateImageThumb(rel)
    ok ? done++ : failed++
    if (ok) console.log(`  thumb ✓ ${rel}`)
    else console.warn(`  thumb ✗ ${rel}`)
  }
  console.log(`[${subDir}] 缩略图：新生成 ${done}，已存在 ${skipped}，失败 ${failed}`)
}

async function backfillVideos(subDir: string) {
  let done = 0, skipped = 0, failed = 0
  for (const file of listFiles(subDir)) {
    const ext = path.extname(file).toLowerCase()
    if (!VIDEO_EXTS.has(ext)) continue
    const rel = `static/${subDir}/${file}`
    if (fs.existsSync(getAbsolutePath(posterPathFor(rel)))) { skipped++; continue }
    const ok = await extractVideoPoster(rel)
    ok ? done++ : failed++
    if (ok) console.log(`  poster ✓ ${rel}`)
    else console.warn(`  poster ✗ ${rel}`)
  }
  console.log(`[${subDir}] 海报帧：新生成 ${done}，已存在 ${skipped}，失败 ${failed}`)
}

console.log(`回填目录：${STORAGE_ROOT}`)
await backfillImages('images')
await backfillVideos('videos')
await backfillVideos('merged')
console.log('回填完成')
