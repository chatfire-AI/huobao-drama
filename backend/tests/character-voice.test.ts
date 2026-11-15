import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { eq } from 'drizzle-orm'
import { initSqliteSchema } from '../src/db/sqlite-schema.ts'
import { requestLogger } from '../src/middleware/logger.ts'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huobao-character-voice-'))
process.env.SQLITE_PATH = path.join(root, 'test.sqlite3')
process.env.HUOBAO_DATA_DIR = root
process.env.STORAGE_PATH = path.join(root, 'static')
process.env.MYSQL_AUTO_IMPORT = 'false'
const { db, schema } = await import('../src/db/index.ts')
const app = new Hono()
app.route('/characters', (await import('../src/routes/characters.ts')).default)
app.route('/episodes', (await import('../src/routes/episodes.ts')).default)
app.route('/dramas', (await import('../src/routes/dramas.ts')).default)
app.route('/upload', (await import('../src/routes/upload.ts')).default)
app.use('/static/*', serveStatic({ root }))
const ts = new Date().toISOString()
const drama = db.insert(schema.dramas).values({ title: 'Voice test', createdAt: ts, updatedAt: ts }).returning().get()
const character = () => db.insert(schema.characters).values({ dramaId: drama.id, name: '角色', appearance: '原外貌', imageUrl: 'static/images/portrait.png', createdAt: ts, updatedAt: ts }).returning().get()
const row = (id: number) => db.select().from(schema.characters).where(eq(schema.characters.id, id)).get()!
const sample = Buffer.alloc(48)
sample.write('RIFF'); sample.writeUInt32LE(40, 4); sample.write('WAVEfmt ', 8)
sample.writeUInt32LE(16, 16); sample.writeUInt16LE(1, 20); sample.writeUInt16LE(1, 22)
sample.writeUInt32LE(8000, 24); sample.writeUInt32LE(16000, 28)
sample.writeUInt16LE(2, 32); sample.writeUInt16LE(16, 34); sample.write('data', 36); sample.writeUInt32LE(4, 40)
async function upload(id: number, name = '角色音色.wav', data: Uint8Array = sample, type = 'audio/wav') {
  const body = new FormData()
  body.set('file', new File([data], name, { type }))
  return app.request(`/characters/${id}/voice`, { method: 'POST', body })
}

test('existing SQLite characters gain nullable voice fields without losing assets; migration is idempotent', () => {
  const old = new Database(':memory:')
  try {
    old.exec(`CREATE TABLE characters (id INTEGER PRIMARY KEY AUTOINCREMENT, drama_id INTEGER NOT NULL,
      name TEXT NOT NULL, role TEXT, description TEXT, appearance TEXT, styling TEXT, final_prompt TEXT,
      personality TEXT, image_url TEXT, reference_images TEXT, seed_value TEXT, sort_order INTEGER,
      local_path TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT);
      INSERT INTO characters (drama_id, name, image_url, created_at, updated_at) VALUES (1, '已有角色', 'portrait.png', 'old', 'old')`)
    initSqliteSchema(old)
    initSqliteSchema(old)
    assert.deepEqual(old.prepare('SELECT name, image_url, voice_audio_url, voice_audio_name FROM characters').get(),
      { name: '已有角色', image_url: 'portrait.png', voice_audio_url: null, voice_audio_name: null })
  } finally { old.close() }
})

test('uploaded voice persists, can be served, and is shared by the project and multiple episodes', async () => {
  const char = character()
  const result = await upload(char.id)
  assert.equal(result.status, 200)
  const { data } = await result.json()
  assert.equal(data.voice_audio_name, '角色音色.wav')
  assert.match(data.voice_audio_url, /^static\/uploads\/[\w-]+\.wav$/)
  const disk = new Database(process.env.SQLITE_PATH!, { readonly: true })
  try { assert.equal((disk.prepare('SELECT voice_audio_url FROM characters WHERE id = ?').get(char.id) as any).voice_audio_url, data.voice_audio_url) }
  finally { disk.close() }
  const audio = await app.request(`/${data.voice_audio_url}`)
  assert.equal(audio.status, 200)
  assert.deepEqual(Buffer.from(await audio.arrayBuffer()), sample)
  for (const number of [1, 2]) {
    const episode = db.insert(schema.episodes).values({ dramaId: drama.id, episodeNumber: number, title: '测试集', createdAt: ts, updatedAt: ts }).returning().get()
    db.insert(schema.episodeCharacters).values({ episodeId: episode.id, characterId: char.id, createdAt: ts }).run()
    const response = await app.request(`/episodes/${episode.id}/characters`)
    assert.equal((await response.json()).data[0].voice_audio_url, data.voice_audio_url)
  }
  const project = await app.request(`/dramas/${drama.id}`)
  assert.equal((await project.json()).data.characters.find((c: any) => c.id === char.id).voice_audio_name, '角色音色.wav')
  await app.request(`/characters/${char.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appearance: '新外貌' }) })
  assert.equal(row(char.id).voiceAudioUrl, data.voice_audio_url)
})

test('replacement and removal change only the voice binding', async () => {
  const char = character()
  await upload(char.id)
  const original = row(char.id).voiceAudioUrl
  const replacement = await upload(char.id, '第二段.WAV', sample, 'audio/x-wav')
  assert.equal(replacement.status, 200)
  assert.notEqual(row(char.id).voiceAudioUrl, original)
  assert.equal(row(char.id).voiceAudioName, '第二段.WAV')
  const removed = await app.request(`/characters/${char.id}/voice`, { method: 'DELETE' })
  assert.equal(removed.status, 200)
  assert.deepEqual((await removed.json()).data, { voice_audio_url: null, voice_audio_name: null })
  assert.equal(row(char.id).voiceAudioUrl, null)
  assert.equal(row(char.id).appearance, '原外貌')
  assert.equal(row(char.id).imageUrl, char.imageUrl)
})

test('invalid, missing, empty and oversized uploads retain the current voice', async () => {
  const char = character()
  await upload(char.id)
  const original = row(char.id).voiceAudioUrl
  const cases: [string, Uint8Array, string][] = [
    ['image.png', sample, 'image/png'], ['fake.wav', sample, 'text/html'],
    ['empty.wav', new Uint8Array(), 'audio/wav'],
    ['large.wav', new Uint8Array(20 * 1024 * 1024 + 1), 'audio/wav'],
    ['too-large.wav', new Uint8Array(21 * 1024 * 1024), 'audio/wav'],
  ]
  for (const [name, bytes, type] of cases) {
    assert.equal((await upload(char.id, name, bytes, type)).status, 400, name)
    assert.equal(row(char.id).voiceAudioUrl, original)
  }
  assert.equal((await app.request(`/characters/${char.id}/voice`, { method: 'POST', body: new FormData() })).status, 400)
})

test('missing and deleted characters cannot acquire audio files', async () => {
  const before = await fs.readdir(path.join(root, 'static/uploads'))
  assert.equal((await upload(999999)).status, 404)
  const char = character()
  db.update(schema.characters).set({ deletedAt: ts }).where(eq(schema.characters.id, char.id)).run()
  assert.equal((await upload(char.id)).status, 404)
  assert.equal((await app.request(`/characters/${char.id}/voice`, { method: 'DELETE' })).status, 404)
  assert.deepEqual(await fs.readdir(path.join(root, 'static/uploads')), before)
})

test('generic reference audio uploads still use the shared file contract', async () => {
  const body = new FormData()
  body.set('file', new File([sample], 'reference.wav', { type: 'audio/wav' }))
  const result = await app.request('/upload/audio', { method: 'POST', body })
  assert.equal(result.status, 200)
  const { data } = await result.json()
  assert.equal(data.url, `/${data.path}`)
  assert.equal((await app.request(data.url)).status, 200)
})

test('request logging preserves the upload stream and omits audio contents', async t => {
  const messages: string[] = []
  const logger = t.mock.method(console, 'log', (...args: unknown[]) => messages.push(args.join(' ')))
  try {
    const logged = new Hono()
    logged.use('*', requestLogger)
    logged.route('/', app)
    const char = character()
    const body = new FormData()
    body.set('file', new File([sample], 'private-recording.wav', { type: 'audio/wav' }))
    const result = await logged.request(`/characters/${char.id}/voice`, { method: 'POST', body })
    assert.equal(result.status, 200)
    assert.equal(row(char.id).voiceAudioName, 'private-recording.wav')
    assert.match(messages.join('\n'), /POST/)
    assert.doesNotMatch(messages.join('\n'), /private-recording|RIFF|body:|Content-Disposition/)
  } finally { logger.mock.restore() }
})

test.after(async () => { db.$client.close(); await fs.rm(root, { recursive: true, force: true }) })
