import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { spawnSync } from 'node:child_process'
import { eq } from 'drizzle-orm'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-draft-'))
process.env.SQLITE_PATH = path.join(root, 'draft.sqlite3')
process.env.HUOBAO_DATA_DIR = root
process.env.STORAGE_PATH = path.join(root, 'static')
process.env.MYSQL_AUTO_IMPORT = 'false'
process.env.FFMPEG_BIN = path.join(root, 'missing-ffmpeg')
process.env.FFPROBE_BIN = path.join(root, 'missing-ffprobe')
const { db, schema } = await import('../src/db/index.ts')
const route = (await import('../src/routes/tasks.ts')).default
const { VolcEngineVideoAdapter } = await import('../src/services/adapters/volcengine-video.ts')
const model = 'doubao-seedance-2-5-260628'
const payloads: any[] = []
const requestIds: (string | string[] | undefined)[] = []
const video = Buffer.concat([Buffer.from([0,0,0,24]), Buffer.from('ftypisom'), Buffer.alloc(32)])
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  if (req.method === 'POST') {
    let raw = ''; for await (const part of req) raw += part
    payloads.push(JSON.parse(raw))
    requestIds.push(req.headers['idempotency-key'])
    return res.end(JSON.stringify({ id: `upstream-${payloads.length}` }))
  }
  if (req.url === '/video') { res.setHeader('Content-Type', 'video/mp4'); return res.end(video) }
  res.end(JSON.stringify({ status: 'succeeded', draft: req.url?.endsWith('upstream-1'),
    draft_expires_at: Math.floor(Date.now() / 1000) + 7 * 86400, content: { video_url: `${base}/video` } }))
})
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${(server.address() as any).port}`
const ts = new Date().toISOString()
const cfg = db.insert(schema.aiServiceConfigs).values({ serviceType: 'video', provider: 'volcengine', name: 'mock only',
  baseUrl: base, apiKey: 'test', model: JSON.stringify([model]), createdAt: ts, updatedAt: ts }).returning().get()
db.$client.prepare('INSERT INTO episodes (id, drama_id, episode_number, title, resolution, created_at, updated_at) VALUES (1, 1, 1, ?, ?, ?, ?)').run('test', '720p', ts, ts)
const sb = db.insert(schema.storyboards).values({ episodeId: 1, storyboardNumber: 1, videoUrl: 'static/original.mp4', createdAt: ts, updatedAt: ts }).returning().get()
const read = (id: number) => db.select().from(schema.sysTask).where(eq(schema.sysTask.id, id)).get()!
async function post(url: string, body?: any) {
  return route.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
}
async function completed(id: number) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const task = read(id)
    if (task.status === 'completed') return task
    if (task.status === 'failed') assert.fail(task.errorMsg || 'failed')
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  assert.fail('Task did not complete')
}
let draftId: number

test('draft is opt-in, model-gated, and does not change legacy request defaults', async () => {
  const adapter = new VolcEngineVideoAdapter()
  const config = { provider: 'volcengine', baseUrl: base, apiKey: 'test', model }
  const legacy = adapter.buildGenerateRequest(config, { id: 1, model: 'doubao-seedance-2-0-mini-260615', prompt: 'cat', resolution: '1080p' }).body
  assert.equal(legacy.resolution, '720p'); assert.equal(legacy.draft, undefined)
  assert.equal(adapter.buildGenerateRequest(config, { id: 1, prompt: 'cat', draft: true, resolution: '480p', duration: 30 }).body.duration, 30)
  assert.throws(() => adapter.buildGenerateRequest(config, { id: 1, prompt: 'cat', draft: true, resolution: '720p' }), /480p/)
  assert.throws(() => adapter.buildGenerateRequest(config, { id: 1, model: 'doubao-seedance-2-0-mini-260615', prompt: 'cat', draft: true }), /2.5/)
  assert.equal((await post('/', { type: 'video', draft: 'true' })).status, 400)
  assert.equal((await post('/', { type: 'video', draft: true, prompt: 'cat', model: 'doubao-seedance-2-0-mini-260615', config_id: cfg.id })).status, 400)
  assert.equal(payloads.length, 0)
})

test('HTTP draft forces 480p despite episode lock, saves locally, preserves main clip', async () => {
  const response = await post('/', { type: 'video', draft: true, storyboard_id: sb.id, config_id: cfg.id, model, prompt: 'cat', duration: 5 })
  assert.equal(response.status, 201)
  draftId = (await response.json() as any).data.id
  const task = await completed(draftId)
  assert.equal(payloads[0].draft, true); assert.equal(payloads[0].resolution, '480p')
  assert.equal(task.taskId, 'upstream-1')
  assert.equal(JSON.parse(task.params!).providerDraft, true)
  assert.ok(JSON.parse(task.params!).providerDraftExpiresAt > Date.now() / 1000)
  assert.equal(JSON.parse(task.params!).requestId, requestIds[0])
  assert.ok(fs.existsSync(path.join(root, task.localPath!)))
  assert.equal(db.select().from(schema.storyboards).where(eq(schema.storyboards.id, sb.id)).get()!.videoUrl, 'static/original.mp4')
})

test('HTTP promotion inherits inputs; repeat and concurrent confirmation create one child', async () => {
  const responses = await Promise.all([post(`/${draftId}/finalize`), post(`/${draftId}/finalize`)])
  const accepted = responses.find(response => response.status === 201)!
  assert.ok(accepted)
  const child = (await accepted.json() as any).data
  const again = await post(`/${draftId}/finalize`)
  assert.equal((await again.json() as any).data.id, child.id)
  const done = await completed(child.id)
  assert.deepEqual(payloads[1], { model, content: [{ type: 'draft_task', draft_task: { id: 'upstream-1' } }], resolution: '1080p', watermark: false })
  assert.equal(JSON.parse(done.params!).draftSourceId, draftId)
  assert.equal(db.select().from(schema.storyboards).where(eq(schema.storyboards.id, sb.id)).get()!.videoUrl, done.localPath)
  assert.equal(payloads.length, 2)
  assert.equal(typeof requestIds[1], 'string')
  assert.notEqual(requestIds[0], requestIds[1])
  // A fresh process reconstructs the persisted link; it must not submit again.
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
    `const {finalizeDraft}=await import('./src/services/generation.ts'); console.log('CHILD='+await finalizeDraft(${draftId}));`],
    { cwd: path.resolve(import.meta.dirname, '..'), env: process.env, encoding: 'utf8', timeout: 20000 })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, new RegExp(`CHILD=${child.id}`))
  assert.equal(payloads.length, 2)
})

test('expired, incomplete, missing-local, and changed-channel drafts cannot be promoted', async () => {
  for (const overrides of [
    { createdAt: '2020-01-01T00:00:00Z' }, { status: 'processing' }, { localPath: null }, { configBaseUrl: 'https://changed.invalid' },
    { params: JSON.stringify({ draft: true, providerDraft: false }) },
    { params: JSON.stringify({ draft: true, providerDraftExpiresAt: Math.floor(Date.now() / 1000) - 1 }) },
  ]) {
    const source = read(draftId)
    const task = db.insert(schema.sysTask).values({ ...source, id: undefined, storyboardId: null,
      params: JSON.stringify({ draft: true, resolution: '480p' }), ...overrides }).returning().get()
    assert.equal((await post(`/${task.id}/finalize`)).status, 400)
  }
  assert.equal(payloads.length, 2)
})

test('restart finishes local draft delivery without replacing the main video or resubmitting', () => {
  const source = read(draftId)
  const currentMain = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, sb.id)).get()!.videoUrl
  const task = db.insert(schema.sysTask).values({ ...source, id: undefined, status: 'processing',
    params: JSON.stringify({ draft: true, resolution: '480p' }) }).returning().get()
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
    `const {resumeInterruptedTasks}=await import('./src/services/generation.ts');
     const {db,schema}=await import('./src/db/index.ts'); const {eq}=await import('drizzle-orm');
     await resumeInterruptedTasks();
     for(let i=0;i<100;i++){const task=db.select().from(schema.sysTask).where(eq(schema.sysTask.id,${task.id})).get();
       if(task.status==='completed'){db.$client.close();process.exit(0)} await new Promise(r=>setTimeout(r,20));} process.exit(1);`],
    { cwd: path.resolve(import.meta.dirname, '..'), env: process.env, encoding: 'utf8', timeout: 20000 })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(read(task.id).status, 'completed')
  assert.equal(db.select().from(schema.storyboards).where(eq(schema.storyboards.id, sb.id)).get()!.videoUrl, currentMain)
  assert.equal(payloads.length, 2)
})

test('deleting a final history row cannot cause a second charged submission', async () => {
  const child = JSON.parse(read(draftId).params!).finalTaskId
  db.delete(schema.sysTask).where(eq(schema.sysTask.id, child)).run()
  assert.equal((await post(`/${draftId}/finalize`)).status, 400)
  assert.equal(payloads.length, 2)
})

after(() => { server.close(); db.$client.close(); fs.rmSync(root, { recursive: true, force: true }) })
