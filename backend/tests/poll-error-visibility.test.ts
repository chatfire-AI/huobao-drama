import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { eq } from 'drizzle-orm'

// Isolated DB/storage; never read or modify user tasks/configurations.
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huobao-poll-error-'))
process.env.SQLITE_PATH = path.join(root, 'tasks.sqlite3')
process.env.HUOBAO_DATA_DIR = root
process.env.STORAGE_PATH = path.join(root, 'static')
process.env.MYSQL_AUTO_IMPORT = 'false'
process.env.FFMPEG_BIN = '/usr/bin/false'
process.env.FFPROBE_BIN = '/usr/bin/false'
const { db, schema } = await import('../src/db/index.ts')
const { generateImage, POLL_PROFILES } = await import('../src/services/generation.ts')

// 测试用短轮询节奏：只验证行为，不验证真实等待时长
POLL_PROFILES.image = { attempts: 3, intervalMs: 25, maxDurationMs: null }

// 1x1 PNG
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

// 场景开关：前 N 次轮询返回上游错误响应，之后返回 completed
let failFirst = 0
let failStatus = 401
let failBody = JSON.stringify({ error: { message: 'Invalid API key provided' } })

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url?.startsWith('/v1/images/generations')) {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ task_id: 't-poll' }))
    })
    return
  }
  if (req.method === 'GET' && req.url?.startsWith('/v1/images/task/')) {
    if (failFirst > 0) {
      failFirst--
      res.writeHead(failStatus, { 'Content-Type': 'application/json' })
      res.end(failBody)
      return
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ status: 'completed', image_url: `${base}/image-ok.png` }))
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

const row = (id: number) => db.select().from(schema.sysTask).where(eq(schema.sysTask.id, id)).get()!
async function waitFor(id: number, status: string) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (row(id).status === status) return row(id)
    await new Promise(r => setTimeout(r, 10))
  }
  assert.fail(`Task ${id} did not reach ${status}: ${JSON.stringify(row(id))}`)
}

test('terminal error of an exhausted poll carries the last upstream HTTP error', async () => {
  // 轮询期间上游持续 401：任务最终失败的 errorMsg 必须带上真实原因，
  // 而不是只给笼统的 "Timeout: polling attempts exhausted"
  failFirst = 999
  failStatus = 401
  failBody = JSON.stringify({ error: { message: 'Invalid API key provided' } })

  const id = await generateImage({ characterId: character.id, dramaId: 1, prompt: 'poll fail', configId: config.id })
  const failed = await waitFor(id, 'failed')
  assert.match(failed.errorMsg || '', /HTTP 401/)
  assert.match(failed.errorMsg || '', /Invalid API key provided/)
})

test('a transient poll error still retries to completion (semantics unchanged)', async () => {
  // 观测性修复不得改变重试语义：第一次轮询 401，下一次照常成功并回写资产
  failFirst = 1
  failStatus = 401
  failBody = JSON.stringify({ error: { message: 'task not visible yet' } })

  const id = await generateImage({ characterId: character.id, dramaId: 1, prompt: 'poll retry', configId: config.id })
  const done = await waitFor(id, 'completed')
  assert.ok(done.localPath)

  const saved = db.select().from(schema.characters).where(eq(schema.characters.id, character.id)).get()!
  assert.equal(saved.imageUrl, done.localPath)
})

test.after(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()))
  await fs.rm(root, { recursive: true, force: true })
})
