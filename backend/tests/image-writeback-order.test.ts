import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { eq } from 'drizzle-orm'

// Isolated DB/storage; never read or modify user tasks/configurations.
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huobao-image-writeback-'))
process.env.SQLITE_PATH = path.join(root, 'tasks.sqlite3')
process.env.HUOBAO_DATA_DIR = root
process.env.STORAGE_PATH = path.join(root, 'static')
process.env.MYSQL_AUTO_IMPORT = 'false'
process.env.FFMPEG_BIN = '/usr/bin/false'
process.env.FFPROBE_BIN = '/usr/bin/false'
const { db, schema } = await import('../src/db/index.ts')
const { generateImage } = await import('../src/services/generation.ts')

// 1x1 PNG
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

// prompt 含 older 的任务延迟返回，确保「旧任务后完成」这一竞态顺序稳定复现
const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      let prompt = ''
      try { prompt = JSON.parse(body || '{}').prompt || '' } catch {}
      const name = prompt.includes('older') ? 'older' : 'newer'
      const reply = () => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ data: [{ url: `${base}/image-${name}.png` }] }))
      }
      if (name === 'older') setTimeout(reply, 400)
      else reply()
    })
    return
  }
  if (req.url?.startsWith('/image-')) {
    res.setHeader('Content-Type', 'image/png')
    res.end(png)
    return
  }
  res.writeHead(404).end()
})
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${(server.address() as any).port}`

const ts = new Date().toISOString()
const config = db.insert(schema.aiServiceConfigs).values({
  serviceType: 'image', provider: 'openai', name: 'test', baseUrl: base,
  apiKey: 'test-secret', model: '["gpt-image-2"]', createdAt: ts, updatedAt: ts,
}).returning().get()
const character = db.insert(schema.characters).values({
  dramaId: 1, name: '测试角色', createdAt: ts, updatedAt: ts,
}).returning().get()
const storyboard = db.insert(schema.storyboards).values({
  episodeId: 1, storyboardNumber: 1, createdAt: ts, updatedAt: ts,
}).returning().get()

const row = (id: number) => db.select().from(schema.sysTask).where(eq(schema.sysTask.id, id)).get()!
async function waitFor(id: number, status: string) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (row(id).status === status) return row(id)
    await new Promise(r => setTimeout(r, 10))
  }
  assert.fail(`Task ${id} did not reach ${status}: ${JSON.stringify(row(id))}`)
}

test('a stale image task does not overwrite the newer result on the same character', async () => {
  const older = await generateImage({ characterId: character.id, dramaId: 1, prompt: 'older', configId: config.id })
  const newer = await generateImage({ characterId: character.id, dramaId: 1, prompt: 'newer', configId: config.id })
  const olderRow = await waitFor(older, 'completed')
  const newerRow = await waitFor(newer, 'completed')
  assert.ok(olderRow.localPath && newerRow.localPath)
  assert.notEqual(olderRow.localPath, newerRow.localPath)

  const saved = db.select().from(schema.characters).where(eq(schema.characters.id, character.id)).get()!
  // 旧任务虽然后完成，但不得覆盖用户后来生成的那张图
  assert.equal(saved.imageUrl, newerRow.localPath)
  assert.notEqual(saved.imageUrl, olderRow.localPath)
})

test('different frame slots of the same storyboard are written independently', async () => {
  const firstFrame = await generateImage({
    storyboardId: storyboard.id, dramaId: 1, prompt: 'older first frame',
    frameType: 'first_frame', configId: config.id,
  })
  const lastFrame = await generateImage({
    storyboardId: storyboard.id, dramaId: 1, prompt: 'newer last frame',
    frameType: 'last_frame', configId: config.id,
  })
  const firstRow = await waitFor(firstFrame, 'completed')
  const lastRow = await waitFor(lastFrame, 'completed')

  const sb = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, storyboard.id)).get()!
  // 首帧与尾帧写不同列，互不覆盖
  assert.equal(sb.firstFrameImage, firstRow.localPath)
  assert.equal(sb.lastFrameImage, lastRow.localPath)
})

test('a stale image task does not overwrite the newer composed image of the same storyboard', async () => {
  const composed = db.insert(schema.storyboards).values({
    episodeId: 1, storyboardNumber: 2, createdAt: ts, updatedAt: ts,
  }).returning().get()
  const older = await generateImage({ storyboardId: composed.id, dramaId: 1, prompt: 'older composed', configId: config.id })
  const newer = await generateImage({ storyboardId: composed.id, dramaId: 1, prompt: 'newer composed', configId: config.id })
  const olderRow = await waitFor(older, 'completed')
  const newerRow = await waitFor(newer, 'completed')

  const sb = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, composed.id)).get()!
  assert.equal(sb.composedImage, newerRow.localPath)
  assert.notEqual(sb.composedImage, olderRow.localPath)
})

test.after(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()))
  await fs.rm(root, { recursive: true, force: true })
})
