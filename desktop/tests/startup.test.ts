import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { waitForBackend, createStartupLog } from '../src/startup.js'

async function withServer(handler: http.RequestListener, fn: (port: number) => Promise<void>) {
  const server = http.createServer(handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try { await fn((server.address() as import('node:net').AddressInfo).port) }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
}
test('a health server that accepts connections but never responds hits the overall deadline', async () => {
  await withServer(() => {}, async port => {
    const started = Date.now()
    await assert.rejects(waitForBackend(port, 80), /未就绪/)
    assert.ok(Date.now() - started < 1000, 'must not wait for fetch/OS default timeout')
  })
})
test('health failures are retried and a subsequent successful response finishes startup', async () => {
  let count = 0
  await withServer((_request, response) => { response.writeHead(++count === 1 ? 503 : 200).end() }, async port => {
    await waitForBackend(port, 1000)
    assert.equal(count, 2)
  })
})
test('quitting prevents more health requests', async () => {
  await assert.rejects(waitForBackend(1, 1000, () => true), /取消/)
})
test('startup log preserves errors but removes signed URLs and credentials and rotates', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-startup-log-'))
  try {
    fs.writeFileSync(path.join(dir, 'startup.log'), 'x'.repeat(2 * 1024 * 1024 + 1))
    const log = createStartupLog(dir)
    log.write('failure https://example.com/file?signature=private-signature Bearer private-token api_key=private-key')
    const text = fs.readFileSync(log.file, 'utf8')
    assert.match(text, /failure/)
    assert.doesNotMatch(text, /private-|https:/)
    assert.ok(fs.existsSync(log.file + '.previous'))
    assert.ok(text.length < 500)
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})
