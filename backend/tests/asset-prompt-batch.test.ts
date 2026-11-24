import assert from 'node:assert/strict'
import { test } from 'node:test'
import { eq } from 'drizzle-orm'
import { setTimeout as delay } from 'node:timers/promises'

process.env.SQLITE_PATH = ':memory:'
process.env.MYSQL_AUTO_IMPORT = 'false'
const { db, schema } = await import('../src/db/index.ts')
const { getAssetPromptTarget } = await import('../src/agents/context.ts')
const { imagePromptTools } = await import('../src/agents/tools/image-prompt-tools.ts')
const { mastra } = await import('../src/mastra/index.ts')
const { default: episodes } = await import('../src/routes/episodes.ts')
const timestamp = '2026-11-25T00:00:00.000Z'

test('episode batch fills missing prompts, scopes writes and retries only unfinished assets', async () => {
  const project = db.insert(schema.dramas).values({ title: 'Lighthouse', createdAt: timestamp, updatedAt: timestamp }).returning().get()
  const common = { dramaId: project.id, createdAt: timestamp, updatedAt: timestamp }
  const episode = db.insert(schema.episodes).values({ ...common, episodeNumber: 1, title: 'Shift', content: 'A quiet shift.' }).returning().get()
  const character = db.insert(schema.characters).values({ ...common, name: 'Watchkeeper' }).returning().get()
  const narrator = db.insert(schema.characters).values({ ...common, name: 'Narrator' }).returning().get()
  const existing = db.insert(schema.characters).values({ ...common, name: 'Assistant', finalPrompt: 'Saved before batch' }).returning().get()
  const other = db.insert(schema.characters).values({ ...common, name: 'Not in this episode' }).returning().get()
  for (const row of [character, narrator, existing]) {
    db.insert(schema.episodeCharacters).values({ episodeId: episode.id, characterId: row.id, createdAt: timestamp }).run()
  }
  const scene = db.insert(schema.scenes).values({ ...common, location: 'Lamp room', time: 'Dusk', prompt: 'A quiet lighthouse', finalPrompt: ' ' }).returning().get()
  db.insert(schema.episodeScenes).values({ episodeId: episode.id, sceneId: scene.id, createdAt: timestamp }).run()
  const prop = db.insert(schema.props).values({ ...common, name: 'Logbook' }).returning().get()
  db.insert(schema.episodeProps).values({ episodeId: episode.id, propId: prop.id, createdAt: timestamp }).run()
  const oldGetAgent = mastra.getAgent
  const calls: string[] = []
  let failProp = true
  let release = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  mastra.getAgent = (() => ({
    async generate(_messages: unknown, options: { requestContext: any }) {
      const target = getAssetPromptTarget(options.requestContext)!
      const context = { requestContext: options.requestContext }
      calls.push(target.kind)
      if (target.kind === 'character') {
        await gate
        const wrong = await imagePromptTools.saveCharacterFinalPrompt.execute!({ character_id: other.id, prompt: 'Wrong asset' }, context)
        assert.ok('error' in wrong!)
        db.update(schema.characters).set({ finalPrompt: 'Manual update during generation' }).where(eq(schema.characters.id, character.id)).run()
        const stale = await imagePromptTools.saveCharacterFinalPrompt.execute!({ character_id: character.id, prompt: 'A portrait' }, context)
        assert.ok('error' in stale!)
      } else if (target.kind === 'scene') {
        await imagePromptTools.saveSceneFinalPrompt.execute!({ scene_id: scene.id, prompt: 'An empty lamp room at dusk' }, context)
      } else if (!failProp) {
        await imagePromptTools.savePropFinalPrompt.execute!({ prop_id: prop.id, prompt: 'A tan logbook on white' }, context)
      }
    },
  })) as unknown as typeof oldGetAgent

  async function start() {
    const reply = await episodes.request(`/${episode.id}/generate-asset-prompts`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    })
    assert.equal(reply.status, 200)
    return (await reply.json() as any).data
  }
  async function result() {
    for (let i = 0; i < 50; i++) {
      const reply = await episodes.request(`/${episode.id}/asset-prompts-status`)
      const status = (await reply.json() as any).data
      if (status && status.status !== 'running') return status
      await delay(10)
    }
    assert.fail('Batch still running')
  }
  try {
    assert.deepEqual(await start(), { started: true, total: 3 })
    assert.deepEqual(await start(), { started: false, total: 3 })
    release()
    const first = await result()
    assert.equal(first.status, 'error')
    assert.equal(first.completed, 2)
    assert.equal(first.failed, 1)
    failProp = false
    assert.deepEqual(await start(), { started: true, total: 1 })
    assert.equal((await result()).status, 'done')
    assert.deepEqual(calls, ['character', 'scene', 'prop', 'prop'])
    const saved = new Map(db.select().from(schema.characters).all().map(row => [row.id, row.finalPrompt]))
    assert.equal(saved.get(character.id), 'Manual update during generation')
    assert.equal(saved.get(existing.id), 'Saved before batch')
    assert.equal(saved.get(narrator.id), null)
    assert.equal(saved.get(other.id), null)
    assert.match(db.select().from(schema.scenes).get()!.finalPrompt!, /empty lamp room/)
    assert.match(db.select().from(schema.props).get()!.finalPrompt!, /tan logbook/)
    assert.equal(db.select().from(schema.sysTask).all().length, 0)
  } finally {
    release()
    mastra.getAgent = oldGetAgent
  }
})
