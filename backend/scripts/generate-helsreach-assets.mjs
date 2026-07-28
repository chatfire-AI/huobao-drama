import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.resolve(here, '../../data/huobao_drama.db')
const apiBase = 'http://localhost:5679/api/v1'
const db = new Database(dbPath)

async function post(pathname, payload = {}) {
  const response = await fetch(`${apiBase}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  })
  const result = await response.json()
  if (!response.ok || result.code >= 400) {
    throw new Error(result.message || `${response.status} ${response.statusText}`)
  }
  return result.data
}

function hasActiveGeneration(column, id, frameType = null) {
  const frameClause = frameType ? ' AND frame_type = ?' : ''
  const args = frameType ? [id, frameType] : [id]
  return db.prepare(`
    SELECT id FROM image_generations
    WHERE ${column} = ?${frameClause} AND status IN ('processing', 'completed')
    ORDER BY id DESC LIMIT 1
  `).get(...args)
}

const character = db.prepare('SELECT * FROM characters WHERE drama_id = 1 AND deleted_at IS NULL ORDER BY id LIMIT 1').get()
const scene = db.prepare('SELECT * FROM scenes WHERE drama_id = 1 AND deleted_at IS NULL ORDER BY id LIMIT 1').get()
const storyboards = db.prepare('SELECT * FROM storyboards WHERE episode_id = 1 AND deleted_at IS NULL ORDER BY storyboard_number').all()

if (!character || !scene || storyboards.length !== 3) {
  throw new Error('Expected one character, one scene, and three storyboards. Run seed-helsreach-test.mjs first.')
}

const submitted = []
const failures = []

if (!character.image_url && !hasActiveGeneration('character_id', character.id)) {
  const prompt = `Vertical 9:16 full-body character reference for Chaplain Grimaldus from Helsreach, imposing massive black power armor, bone-white skull mask, sacred chains and relics, torn black tabard, armor covered in ash and dried blood, standing with heavy believable posture, three-quarter view, dark neutral gothic stone background, one hard crimson rim light, photoreal live-action film costume and material detail, asymmetric composition, no text, no logo, no watermark`
  try {
    const result = await post('/images', {
      drama_id: 1,
      character_id: character.id,
      prompt,
      size: '1024x1792',
    })
    submitted.push({ type: 'character', id: result.id })
  } catch (error) {
    failures.push({ type: 'character', error: error.message })
  }
}

if (!scene.image_url && !hasActiveGeneration('scene_id', scene.id)) {
  try {
    const result = await post('/images', {
      drama_id: 1,
      scene_id: scene.id,
      prompt: scene.prompt,
      size: '1024x1792',
    })
    submitted.push({ type: 'scene', id: result.id })
  } catch (error) {
    failures.push({ type: 'scene', error: error.message })
  }
}

for (const storyboard of storyboards) {
  if (storyboard.first_frame_image || hasActiveGeneration('storyboard_id', storyboard.id, 'first_frame')) continue
  try {
    const result = await post('/images', {
      drama_id: 1,
      storyboard_id: storyboard.id,
      frame_type: 'first_frame',
      prompt: storyboard.image_prompt,
      size: '1024x1792',
    })
    submitted.push({ type: `shot-${storyboard.storyboard_number}`, id: result.id })
  } catch (error) {
    failures.push({ type: `shot-${storyboard.storyboard_number}`, error: error.message })
  }
}

const dialogueShot = storyboards.find(item => item.storyboard_number === 3)
if (dialogueShot && !dialogueShot.tts_audio_url) {
  try {
    await post(`/storyboards/${dialogueShot.id}/generate-tts`)
  } catch (error) {
    failures.push({ type: 'shot-3-tts', error: error.message })
  }
}

console.log(JSON.stringify({ submitted, failures }))

const started = Date.now()
while (Date.now() - started < 8 * 60 * 1000) {
  const ids = submitted.map(item => item.id)
  if (!ids.length) break
  const placeholders = ids.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT id, status, error_msg
    FROM image_generations
    WHERE id IN (${placeholders})
    ORDER BY id
  `).all(...ids)
  const pending = rows.filter(row => row.status === 'processing')
  console.log(JSON.stringify({
    elapsed_seconds: Math.round((Date.now() - started) / 1000),
    images: rows,
  }))
  if (!pending.length) break
  await new Promise(resolve => setTimeout(resolve, 5000))
}

const finalStoryboards = db.prepare(`
  SELECT storyboard_number, first_frame_image, tts_audio_url
  FROM storyboards WHERE episode_id = 1 ORDER BY storyboard_number
`).all()
console.log(JSON.stringify({
  character_image: db.prepare('SELECT image_url FROM characters WHERE id = ?').get(character.id)?.image_url || null,
  scene_image: db.prepare('SELECT image_url FROM scenes WHERE id = ?').get(scene.id)?.image_url || null,
  storyboards: finalStoryboards,
}))

db.close()
