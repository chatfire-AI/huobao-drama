import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { downloadVideo, safeTaskError } from '../src/services/video-download.ts'
import { MiniMaxVideoAdapter } from '../src/services/adapters/minimax-video.ts'

const video = Buffer.concat([Buffer.from([0,0,0,24]), Buffer.from('ftypisom'), Buffer.alloc(32)])
async function serve(handler: http.RequestListener) {
  const server = http.createServer(handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${(server.address() as any).port}`
  return { url, close: () => new Promise<void>(resolve => server.close(() => resolve())) }
}

test('MiniMax preserves task ID and actual duration for the supplied response contract', () => {
  const adapter = new MiniMaxVideoAdapter()
  const result = { task: { id: '2109166298120097792', status: 'succeeded', duration: 12, content: { url: 'https://files.example/content?signature=test' } } }
  assert.deepEqual(adapter.parseGenerateResponse(result), { isAsync: false, taskId: result.task.id, videoUrl: result.task.content.url, duration: 12 })
  assert.equal(adapter.parsePollResponse(result).duration, 12)
  assert.deepEqual(adapter.parseGenerateResponse({ task: { id: 'stored-task', status: 'running' } }), { isAsync: true, taskId: 'stored-task' })
  assert.equal(adapter.parseGenerateResponse({ task_id: 'stored-task', ...result }).isAsync, false)
})

test('extensionless MP4 downloads atomically and transient HTTP errors retry', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'video-download-'))
  let requests = 0
  const server = await serve((_req, res) => { if (++requests === 1) { res.writeHead(503).end('temporary'); return }; res.end(video) })
  try {
    assert.equal(await downloadVideo(server.url + '/content?signature=test', 2, { root, retryDelayMs: 1 }), 'static/videos/task-2.mp4')
    assert.equal(requests, 2)
    assert.deepEqual(await fs.readFile(path.join(root, 'videos/task-2.mp4')), video)
    assert.deepEqual(await fs.readdir(path.join(root, 'videos')), ['task-2.mp4'])
  } finally { await server.close(); await fs.rm(root, { recursive: true, force: true }) }
})

test('invalid bodies, size limits and permanent HTTP failures leave no partial files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'video-invalid-'))
  const server = await serve((req, res) => {
    if (req.url === '/missing') { res.writeHead(404).end(); return }
    if (req.url === '/large') { res.end(video); return }
    res.end('<html>expired signature</html>')
  })
  try {
    for (const [url, maxBytes] of [['/missing', 1000], ['/html', 1000], ['/large', 16]] as const) {
      await assert.rejects(downloadVideo(server.url + url, 3, { root, maxBytes, retryDelayMs: 1 }))
      assert.deepEqual(await fs.readdir(path.join(root, 'videos')), [])
    }
  } finally { await server.close(); await fs.rm(root, { recursive: true, force: true }) }
})

test('a stalled body times out and does not leave a partial file', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'video-timeout-'))
  const server = await serve((_req, res) => { res.writeHead(200); res.write(video) })
  try {
    await assert.rejects(downloadVideo(server.url, 4, { root, attempts: 1, timeoutMs: 30 }))
    assert.deepEqual(await fs.readdir(path.join(root, 'videos')), [])
  } finally { await server.close(); await fs.rm(root, { recursive: true, force: true }) }
})

test('diagnostics remove signed URLs and credentials', () => {
  const error = safeTaskError('fetch failed https://files.example/content?signature=hidden Bearer secret api_key=secret sk-hidden')
  assert.doesNotMatch(error, /signature=hidden|Bearer secret|api_key=secret|sk-hidden/)
  assert.match(error, /fetch failed/)
})
