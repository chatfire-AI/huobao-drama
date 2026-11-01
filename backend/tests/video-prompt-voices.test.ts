import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { eq } from 'drizzle-orm'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huobao-prompt-voices-'))
process.env.SQLITE_PATH = path.join(root, 'test.sqlite3')
process.env.HUOBAO_DATA_DIR = root
process.env.STORAGE_PATH = path.join(root, 'static')
process.env.WORKSPACE_PATH = path.join(root, 'workspace')
process.env.MYSQL_AUTO_IMPORT = 'false'
await fs.cp(new URL('../workspace/', import.meta.url), process.env.WORKSPACE_PATH, { recursive: true })
const { db, schema } = await import('../src/db/index.ts')
const { storyboardTools } = await import('../src/agents/tools/storyboard-tools.ts')
const { buildAgentRequestContext } = await import('../src/agents/context.ts')
const { agentRegistry } = await import('../src/agents/index.ts')
const { resolveStoryboardVoiceReferences } = await import('../src/services/character-voice-references.ts')
const ts = '2026-01-01T00:00:00.000Z'
const timestamps = { createdAt: ts, updatedAt: ts }
const drama = db.insert(schema.dramas).values({ title: 'Prompt voices', ...timestamps }).returning().get()
const ep = db.insert(schema.episodes).values({ dramaId: drama.id, episodeNumber: 1, title: 'Test', scriptContent: '林小雨说：「早上好。」陈默点头。', ...timestamps }).returning().get()
const createCharacter = (name: string, voice = true) => {
  const c = db.insert(schema.characters).values({ name, dramaId: drama.id, voiceAudioUrl: voice ? `static/uploads/private-${name}.wav` : null, ...timestamps }).returning().get()
  db.insert(schema.episodeCharacters).values({ episodeId: ep.id, characterId: c.id, createdAt: ts }).run()
  return c
}
const speaker = createCharacter('林小雨')
const silent = createCharacter('陈默')
const noVoice = createCharacter('小白', false)
const unbound = createCharacter('未出场')
const deleted = createCharacter('已删除')
db.update(schema.characters).set({ deletedAt: ts }).where(eq(schema.characters.id, deleted.id)).run()
const sb = db.insert(schema.storyboards).values({ episodeId: ep.id, storyboardNumber: 1,
  description: '【镜头1】林小雨说：「早上好。」陈默点头。', atmosphere: '晨光', duration: 6, videoPrompt: '原提示词', ...timestamps }).returning().get()
for (const c of [speaker, silent, noVoice, deleted]) db.insert(schema.storyboardCharacters).values({ storyboardId: sb.id, characterId: c.id }).run()
const requestContext = buildAgentRequestContext({ dramaId: drama.id, episodeId: ep.id })
const call = (name: keyof typeof storyboardTools, input: any) => (storyboardTools[name].execute as any)(input, { requestContext })
const row = () => db.select().from(schema.storyboards).where(eq(schema.storyboards.id, sb.id)).get()!

test('prompt context exposes exact voice tokens and scopes each shot to bound, live characters', async () => {
  const context = await call('readStoryboardContext', {})
  assert.equal(context.characters.find((c: any) => c.id === speaker.id).voice_reference, '#林小雨')
  assert.equal(context.characters.find((c: any) => c.id === noVoice.id).has_voice, false)
  assert.equal(context.characters.find((c: any) => c.id === noVoice.id).voice_reference, null)
  assert.equal(context.characters.some((c: any) => c.id === deleted.id), false)
  assert.equal(context.characters.some((c: any) => c.id === unbound.id), true)
  const voices = context.existing_storyboards[0].available_voice_references
  assert.deepEqual(voices, [
    { character_id: speaker.id, name: speaker.name, voice_reference: '#林小雨' },
    { character_id: silent.id, name: silent.name, voice_reference: '#陈默' },
  ])
  assert.doesNotMatch(JSON.stringify(context), /static\/uploads|private-/)
})

test('single, batch and initial-breakdown agents get voice rules in every content language', async () => {
  for (const language of ['zh', 'en', 'ja', 'ko'] as const) {
    const rc = buildAgentRequestContext({ dramaId: drama.id, episodeId: ep.id, language })
    for (const type of ['prompt_generator', 'storyboard_breaker']) {
      const instructions = String(await agentRegistry[type].getInstructions({ requestContext: rc }))
      assert.match(instructions, /available_voice_references/)
      assert.match(instructions, /voice_reference/)
      assert.match(instructions, /#(?:林小雨|Alex|太郎|민수)/)
      if (language !== 'zh') assert.match(instructions, /copy the complete voice_reference value exactly/)
    }
  }
  const extractor = String(await agentRegistry.extractor.getInstructions({ requestContext }))
  assert.doesNotMatch(extractor, /available_voice_references/)
})

test('custom and missing prompt templates retain the runtime voice rules', async () => {
  const file = path.join(process.env.WORKSPACE_PATH!, 'prompts/prompt_generator.md')
  const original = await fs.readFile(file, 'utf8')
  try {
    await fs.writeFile(file, '---\nname: Custom\nmodel: ""\n---\nCustom prompt sentinel.')
    const custom = String(await agentRegistry.prompt_generator.getInstructions({ requestContext }))
    assert.match(custom, /Custom prompt sentinel/)
    assert.match(custom, /available_voice_references/)
    await fs.rm(file)
    const fallback = String(await agentRegistry.prompt_generator.getInstructions({ requestContext }))
    assert.match(fallback, /available_voice_references/)
  } finally { await fs.writeFile(file, original) }
})

test('a generated voice binding saves editable tokens and resolves to the corresponding video audio', async () => {
  const prompt = '0-3秒：@林小雨抬头，#林小雨轻声说：「早上好。」\n3-6秒：@陈默点头。'
  await call('updateStoryboard', { storyboard_id: sb.id, video_prompt: prompt })
  assert.equal(row().videoPrompt, prompt)
  assert.equal(row().description, sb.description)
  assert.equal(row().atmosphere, sb.atmosphere)
  assert.equal(row().duration, sb.duration)
  const resolved = await resolveStoryboardVoiceReferences(row().videoPrompt!, sb.id, [])
  assert.deepEqual(resolved.audioUrls, [speaker.voiceAudioUrl])
  assert.equal(resolved.prompt, '0-3秒：@林小雨抬头，林小雨（音色参考音频1）轻声说：「早上好。」\n3-6秒：@陈默点头。')
  assert.doesNotMatch(resolved.prompt, /#林小雨/)
})

test('invented, unbound, removed and missing voice references cannot replace a saved prompt', async () => {
  const before = row().videoPrompt
  for (const name of ['虚构角色', unbound.name, noVoice.name, deleted.name]) {
    await assert.rejects(call('updateStoryboard', { storyboard_id: sb.id, video_prompt: `音色：#${name}` }), /音色/)
    assert.equal(row().videoPrompt, before)
  }
  db.update(schema.characters).set({ voiceAudioUrl: null }).where(eq(schema.characters.id, speaker.id)).run()
  try {
    const context = await call('readStoryboardContext', {})
    assert.equal(context.existing_storyboards[0].available_voice_references.some((v: any) => v.character_id === speaker.id), false)
    await assert.rejects(call('updateStoryboard', { storyboard_id: sb.id, video_prompt: '#林小雨' }), /尚未上传/)
    assert.equal(row().videoPrompt, before)
  } finally { db.update(schema.characters).set({ voiceAudioUrl: speaker.voiceAudioUrl }).where(eq(schema.characters.id, speaker.id)).run() }
})

test('initial breakdown validates voices before replacement and persists valid bindings', async () => {
  const before = row().videoPrompt
  await assert.rejects(call('saveStoryboards', { replace_existing: true, storyboards: [
    { shot_number: 1, character_ids: [speaker.id], video_prompt: '#虚构角色' },
  ] }), /音色/)
  assert.equal(row().videoPrompt, before)
  await call('saveStoryboards', { storyboards: [
    { shot_number: 2, character_ids: [speaker.id], description: '林小雨说：「再见。」', video_prompt: '0-3秒：@林小雨挥手，#林小雨说：「再见。」' },
    { shot_number: 3, character_ids: [noVoice.id], description: '小白走路，无对白。', video_prompt: '@小白走路。' },
  ] })
  const shots = db.select().from(schema.storyboards).where(eq(schema.storyboards.episodeId, ep.id)).all()
  const second = shots.find(s => s.storyboardNumber === 2)!
  assert.deepEqual((await resolveStoryboardVoiceReferences(second.videoPrompt!, second.id, [])).audioUrls, [speaker.voiceAudioUrl])
  assert.equal(shots.find(s => s.storyboardNumber === 3)!.videoPrompt, '@小白走路。')
})

test.after(async () => { db.$client.close(); await fs.rm(root, { recursive: true, force: true }) })
