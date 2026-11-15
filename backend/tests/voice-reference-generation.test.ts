import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { eq } from 'drizzle-orm'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huobao-voice-reference-'))
process.env.SQLITE_PATH = path.join(root, 'test.sqlite3')
process.env.HUOBAO_DATA_DIR = root
process.env.STORAGE_PATH = path.join(root, 'static')
process.env.MYSQL_AUTO_IMPORT = 'false'
delete process.env.PUBLIC_BASE_URL
const { db, schema } = await import('../src/db/index.ts')
const { resolveVoiceMentions } = await import('../src/services/character-voice-references.ts')
const { prepareReferenceAudio, resolveReferenceAudioUrls } = await import('../src/services/reference-audio.ts')
const { ffmpeg } = await import('../src/utils/ffmpeg.ts')
const { logTaskPayload } = await import('../src/utils/task-logger.ts')
const route = (await import('../src/routes/tasks.ts')).default
const received: any[] = []
const server = http.createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  received.push(JSON.parse(Buffer.concat(chunks).toString()))
  // Stop after capturing the submission. No paid generation, polling or remote download.
  res.writeHead(400, { 'Content-Type': 'application/json' }).end('{"error":{"message":"test capture complete"}}')
})
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`
const ts = new Date().toISOString()
const timestamps = { createdAt: ts, updatedAt: ts }
const drama = db.insert(schema.dramas).values({ title: '声音引用测试', ...timestamps }).returning().get()
const episode = db.insert(schema.episodes).values({ dramaId: drama.id, episodeNumber: 1, title: '测试', ...timestamps }).returning().get()
const configs = Object.fromEntries(['volcengine', 'minimax', 'aliyun'].map(provider => [provider,
  db.insert(schema.aiServiceConfigs).values({ serviceType: 'video', provider, name: 'test', baseUrl, apiKey: 'mock-key',
    model: JSON.stringify([provider === 'volcengine' ? 'doubao-seedance-2-0-mini-260615' : provider === 'minimax' ? 'MiniMax-H3' : 'wan3.0-video']), ...timestamps }).returning().get().id,
]))
function wav(seconds: number) {
  const buffer = Buffer.alloc(44 + 16000 * seconds)
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8)
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36); buffer.writeUInt32LE(buffer.length - 44, 40)
  return buffer
}
await fs.mkdir(path.join(root, 'static/uploads'), { recursive: true })
for (const seconds of [1, 3, 9, 16]) await fs.writeFile(path.join(root, `static/uploads/${seconds}.wav`), wav(seconds))
const char = (name: string, url: string | null = 'static/uploads/3.wav', dramaId = drama.id) =>
  db.insert(schema.characters).values({ name, dramaId, voiceAudioUrl: url, ...timestamps }).returning().get()
const shot = (...characters: { id: number }[]) => {
  const sb = db.insert(schema.storyboards).values({ episodeId: episode.id, storyboardNumber: 1, ...timestamps }).returning().get()
  for (const c of characters) db.insert(schema.storyboardCharacters).values({ storyboardId: sb.id, characterId: c.id }).run()
  return sb.id
}
async function submit(storyboardId: number, prompt: string, extra = {}) {
  return route.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    type: 'video', storyboard_id: storyboardId, prompt, config_id: configs.volcengine,
    reference_image_urls: ['https://example.test/portrait.png'], ...extra,
  }) })
}
async function waitForSubmission(id: number) {
  const end = Date.now() + 5000
  while (Date.now() < end) {
    const row = db.select().from(schema.sysTask).where(eq(schema.sysTask.id, id)).get()!
    if (row.status === 'failed') return row
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  assert.fail('mock submission did not complete')
}

test('voice indices follow explicit audio then first appearance; repeats and shared samples are deduplicated', () => {
  const resolved = resolveVoiceMentions('@小雨 使用#小雨姐姐，#小雨，#小雨姐姐', [
    { name: '小雨', voiceAudioUrl: 'a.wav' }, { name: '小雨姐姐', voiceAudioUrl: 'b.wav' },
  ], ['a.wav', 'a.wav'])
  assert.deepEqual(resolved.audioUrls, ['a.wav', 'b.wav'])
  assert.match(resolved.prompt, /小雨姐姐（音色参考音频2）/)
  assert.match(resolved.prompt, /小雨（音色参考音频1）/)
  assert.doesNotMatch(resolved.prompt, /#小雨/)
  assert.match(resolved.prompt, /@小雨/)
  assert.deepEqual(resolveVoiceMentions('@小雨 #01', [{ name: '小雨', voiceAudioUrl: 'a.wav' }]).audioUrls, [])
  assert.equal(resolveVoiceMentions('#A B，C', [{ name: 'A B，C', voiceAudioUrl: 'a.wav' }]).hasVoiceReferences, true)
})

test('missing, ambiguous and unknown voice mentions fail rather than generating without the requested voice', () => {
  assert.throws(() => resolveVoiceMentions('#小雨', [{ name: '小雨', voiceAudioUrl: null }]), /尚未上传/)
  assert.throws(() => resolveVoiceMentions('#未知', []), /无效/)
  assert.throws(() => resolveVoiceMentions('#小雨', [{ name: '小雨', voiceAudioUrl: 'a' }, { name: '小雨', voiceAudioUrl: 'b' }]), /同名/)
})

test('inline dialogue keeps speakers and delivery text in place, including repeated and overlapping names', () => {
  const result = resolveVoiceMentions('0-3秒：@小雨抬头，#小雨轻声说：「早上好。」\n3-6秒：#小雨姐姐笑着说：「你好。」#小雨低声回应。', [
    { name: '小雨', voiceAudioUrl: 'a.wav' }, { name: '小雨姐姐', voiceAudioUrl: 'b.wav' },
  ])
  assert.deepEqual(result.audioUrls, ['a.wav', 'b.wav'])
  assert.equal(result.prompt, '0-3秒：@小雨抬头，小雨（音色参考音频1）轻声说：「早上好。」\n3-6秒：小雨姐姐（音色参考音频2）笑着说：「你好。」小雨（音色参考音频1）低声回应。')
  assert.throws(() => resolveVoiceMentions('#小雨姐姐轻声说：「你好。」', [
    { name: '小雨', voiceAudioUrl: 'a.wav' }, { name: '小雨姐姐', voiceAudioUrl: 'b.wav', bound: false },
  ]), /未绑定/)
})

test('saved suffix references remain compatible and do not attach the same voice twice', () => {
  const result = resolveVoiceMentions('使用#小雨音色，#小雨轻声说：「早上好。」', [{ name: '小雨', voiceAudioUrl: 'a.wav' }])
  assert.deepEqual(result.audioUrls, ['a.wav'])
  assert.equal(result.prompt, '使用小雨（音色参考音频1），小雨（音色参考音频1）轻声说：「早上好。」')
  const namedWithSuffix = resolveVoiceMentions('#小雨音色说话', [
    { name: '小雨', voiceAudioUrl: 'a.wav' }, { name: '小雨音色', voiceAudioUrl: 'b.wav' },
  ])
  assert.deepEqual(namedWithSuffix.audioUrls, ['b.wav'])
})

test('Seedance and MiniMax submissions carry local voice bytes and correct role bindings without a public URL', async () => {
  const c = char('林小雨')
  for (const provider of ['volcengine', 'minimax']) {
    const response = await submit(shot(c), '0-3秒：@图片1林小雨抬头，#林小雨轻声说：「早上好。」', { config_id: configs[provider] })
    assert.equal(response.status, 201, await response.clone().text())
    const { data } = await response.json()
    const task = await waitForSubmission(data.id)
    const request = received.at(-1)
    assert.match(request.content.find((c: any) => c.type === 'text').text, /林小雨.*音频1/)
    const audio = request.content.filter((c: any) => c.type === 'audio_url')
    assert.equal(audio.length, 1)
    assert.equal(audio[0].role, 'reference_audio')
    assert.equal(audio[0].audio_url.url, `data:audio/wav;base64,${wav(3).toString('base64')}`)
    assert.deepEqual(JSON.parse(task.params!).referenceAudioUrls, ['static/uploads/3.wav'])
    if (provider === 'volcengine') assert.equal(request.generate_audio, true)
  }
})

test('image-only prompts never attach the character voice automatically', async () => {
  const response = await submit(shot(char('小雨')), '@图片1小雨走路')
  const { data } = await response.json()
  await waitForSubmission(data.id)
  assert.equal(received.at(-1).content.some((c: any) => c.type === 'audio_url'), false)
})

test('unbound, foreign and deleted roles are rejected before creating a generation task', async () => {
  const otherDrama = db.insert(schema.dramas).values({ title: 'other', ...timestamps }).returning().get()
  const foreign = char('外部角色', 'static/uploads/3.wav', otherDrama.id)
  const deleted = char('已删除')
  db.update(schema.characters).set({ deletedAt: ts }).where(eq(schema.characters.id, deleted.id)).run()
  char('未绑定')
  const before = db.select().from(schema.sysTask).all().length
  for (const [id, prompt] of [[shot(), '#未绑定'], [shot(foreign), '#外部角色'], [shot(deleted), '#已删除']] as const) {
    const response = await submit(id, prompt)
    assert.equal(response.status, 400)
    assert.match(await response.text(), /音色引用/)
  }
  assert.equal(db.select().from(schema.sysTask).all().length, before)
})

test('invalid voices, silent mode, missing visual references and provider count limits fail before submission', async () => {
  const valid = char('有效')
  const before = db.select().from(schema.sysTask).all().length
  for (const [name, url, expected] of [
    ['丢失', 'static/uploads/missing.wav', /不存在/],
    ['太短', 'static/uploads/1.wav', /2–15/], ['太长', 'static/uploads/16.wav', /2–15/],
  ] as const) {
    const response = await submit(shot(char(name, url)), `#${name}`)
    assert.equal(response.status, 400)
    assert.match(await response.text(), expected)
  }
  for (const extra of [{ generate_audio: false }, { reference_image_urls: [] }, { config_id: configs.aliyun }]) {
    const response = await submit(shot(valid), '#有效', extra)
    assert.equal(response.status, 400)
  }
  const roles = [1, 2, 3, 4].map(n => char(`角色${n}`, `https://example.test/${n}.wav`))
  const response = await submit(shot(...roles), roles.map(c => `#${c.name}`).join(' '))
  assert.equal(response.status, 400)
  assert.match(await response.text(), /音频≤3/)
  assert.equal(db.select().from(schema.sysTask).all().length, before)
})

test('sample duration total and traversal are checked, and local M4A is converted and reused', async () => {
  await fs.copyFile(path.join(root, 'static/uploads/9.wav'), path.join(root, 'static/uploads/another.wav'))
  await assert.rejects(prepareReferenceAudio(['static/uploads/9.wav', 'static/uploads/another.wav'], 'volcengine'), /总时长/)
  await assert.rejects(prepareReferenceAudio(['static/../outside.wav'], 'volcengine'), /无效/)
  const m4a = path.join(root, 'static/uploads/sample.m4a')
  await new Promise<void>((resolve, reject) => ffmpeg(path.join(root, 'static/uploads/3.wav')).audioCodec('aac')
    .on('end', () => resolve()).on('error', reject).save(m4a))
  const prepared = await prepareReferenceAudio(['static/uploads/sample.m4a'], 'volcengine')
  assert.match(prepared[0], /^static\/voice-references\/[a-f0-9]+\.wav$/)
  assert.deepEqual(await prepareReferenceAudio(['static/uploads/sample.m4a'], 'volcengine'), prepared)
  assert.match((await resolveReferenceAudioUrls(prepared, 'volcengine'))[0], /^data:audio\/wav;base64,/)
  process.env.PUBLIC_BASE_URL = 'https://assets.example.test/'
  try {
    assert.deepEqual(await resolveReferenceAudioUrls(prepared, 'aliyun'), [`https://assets.example.test/${prepared[0]}`])
  } finally { delete process.env.PUBLIC_BASE_URL }
})

test('task logs omit inline audio bytes', t => {
  const logs: string[] = []
  t.mock.method(console, 'log', (...args: unknown[]) => logs.push(args.join(' ')))
  logTaskPayload('test', 'audio', { content: [{ audio_url: { url: 'data:audio/wav;base64,private-audio' } }] })
  assert.doesNotMatch(logs.join(''), /private-audio/)
})

test.after(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()))
  db.$client.close()
  await fs.rm(root, { recursive: true, force: true })
})
