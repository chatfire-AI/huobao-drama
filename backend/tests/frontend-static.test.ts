import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Hono } from 'hono'
import { mountFrontend } from '../src/middleware/frontend.ts'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-frontend-static-'))
const frontend = path.join(temp, 'frontend'), current = path.join(frontend, '.output/public'), previous = path.join(temp, 'tmp/frontend-previous')
fs.mkdirSync(path.join(current, '_nuxt'), { recursive: true })
fs.writeFileSync(path.join(current, 'index.html'), '<!DOCTYPE html><title>Neutral workbench</title>')
fs.writeFileSync(path.join(current, '_nuxt', 'old.js'), 'export const build = "old"')
const { retainPreviousAssets } = await import('../../frontend/scripts/generate.mjs')

test('a tab can load the previous build lazy module while current assets take priority', async () => {
  retainPreviousAssets(frontend)
  fs.unlinkSync(path.join(current, '_nuxt', 'old.js'))
  fs.writeFileSync(path.join(current, '_nuxt', 'current.js'), 'export const build = "current"')
  const app = new Hono(); mountFrontend(app, current, previous)
  const old = await app.request('/_nuxt/old.js')
  assert.equal(old.status, 200); assert.match(old.headers.get('Content-Type')!, /javascript/)
  assert.match(await old.text(), /"old"/)
  fs.writeFileSync(path.join(current, '_nuxt', 'old.js'), 'export const build = "new-current"')
  assert.match(await (await app.request('/_nuxt/old.js')).text(), /new-current/)
  const deepLink = await app.request('/drama/999/episode/1')
  assert.equal(deepLink.status, 200); assert.match(await deepLink.text(), /Neutral workbench/)
  assert.equal(deepLink.headers.get('Cache-Control'), 'no-store')
})
test('missing chunks return 404, not successful HTML; retained assets are limited to one previous build', async () => {
  const app = new Hono()
  app.get('/api/v1/health', c => c.json({ status: 'ok' }))
  mountFrontend(app, current, previous)
  const missing = await app.request('/_nuxt/does-not-exist.js')
  assert.equal(missing.status, 404); assert.doesNotMatch(missing.headers.get('Content-Type')!, /html/)
  assert.equal((await app.request('/api/v1/unknown')).status, 404)
  assert.deepEqual(await (await app.request('/api/v1/health')).json(), { status: 'ok' })
  fs.writeFileSync(path.join(previous, '_nuxt', 'obsolete.js'), 'obsolete')
  retainPreviousAssets(frontend)
  assert.equal(fs.existsSync(path.join(previous, '_nuxt', 'obsolete.js')), false)
  assert.equal(fs.existsSync(path.join(previous, 'index.html')), false)
  assert.equal(fs.existsSync(path.join(previous, '_nuxt', 'current.js')), true)
})
after(() => {
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()))
  assert.ok(path.basename(temp).startsWith('huobao-frontend-static-'))
  fs.rmSync(temp, { recursive: true, force: true })
})
