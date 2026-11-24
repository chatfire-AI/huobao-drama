import assert from 'node:assert/strict'
import { test } from 'node:test'
import { eq } from 'drizzle-orm'

process.env.SQLITE_PATH = ':memory:'
process.env.MYSQL_AUTO_IMPORT = 'false'
const { db, schema } = await import('../src/db/index.ts')
const { scriptTools } = await import('../src/agents/tools/script-tools.ts')
const { setBannedWords } = await import('../src/services/app-settings.ts')
const { mastra } = await import('../src/mastra/index.ts')
const { default: route } = await import('../src/routes/agent.ts')
const timestamp = '2026-11-25T00:00:00.000Z'

test('the native rewrite returns success only after completing and saving against the original version', async () => {
  const original = mastra.getAgent
  const project = db.insert(schema.dramas).values({ title: 'Lighthouse', createdAt: timestamp, updatedAt: timestamp }).returning().get()
  setBannedWords([{ word: 'forbidden', replace: '' }, { word: 'notebook', replace: 'logbook' }])
  try {
    for (const mode of ['no-read', 'no-save', 'empty', 'rule-failure', 'length', 'model-error', 'source-edited', 'script-edited', 'success']) {
      const episode = db.insert(schema.episodes).values({ dramaId: project.id, episodeNumber: 1, title: mode,
        content: 'The watchkeeper passed the notebook across the desk.', scriptContent: 'old draft',
        createdAt: timestamp, updatedAt: timestamp }).returning().get()
      const current = () => db.select().from(schema.episodes).where(eq(schema.episodes.id, episode.id)).get()!
      mastra.getAgent = (() => ({
        async generate(_messages: unknown, options: { requestContext: any }) {
          const context = { requestContext: options.requestContext }
          if (mode !== 'no-read') await scriptTools.readEpisodeScript.execute!({}, context)
          const content = mode === 'empty' ? '  ' : mode === 'rule-failure' ? 'forbidden' : 'WATCHKEEPER: Take the notebook.'
          if (mode !== 'no-save') await scriptTools.saveScript.execute!({ content }, context)
          assert.equal(current().scriptContent, 'old draft')
          if (mode === 'source-edited' || mode === 'script-edited') {
            db.update(schema.episodes).set(mode === 'source-edited' ? { content: 'new source' } : { scriptContent: 'new draft' })
              .where(eq(schema.episodes.id, episode.id)).run()
          }
          if (mode === 'model-error') throw new Error('model disconnected')
          return { finishReason: mode === 'length' ? 'length' : 'stop', toolCalls: [], toolResults: [] }
        },
      })) as unknown as typeof original
      const response = await route.request('/script_rewriter/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Rewrite the lighthouse handover', drama_id: project.id, episode_id: episode.id }),
      })
      assert.equal(response.status, mode === 'success' ? 200 : 400, mode)
      assert.equal(current().content, mode === 'source-edited' ? 'new source' : episode.content)
      assert.equal(current().scriptContent, mode === 'success' ? 'WATCHKEEPER: Take the logbook.' : mode === 'script-edited' ? 'new draft' : 'old draft')
      if (mode === 'success') {
        const body = await response.json() as { data: { saved: boolean; episode_id: number } }
        assert.equal(body.data.saved, true)
        assert.equal(body.data.episode_id, episode.id)
      }
    }
  } finally {
    setBannedWords([])
    mastra.getAgent = original
  }
})
