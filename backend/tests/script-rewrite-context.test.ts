import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RequestContext } from '@mastra/core/request-context'

// Import the tools only after selecting an isolated database.
process.env.SQLITE_PATH = ':memory:'
process.env.MYSQL_AUTO_IMPORT = 'false'
const { db, schema } = await import('../src/db/index.ts')
const { scriptTools } = await import('../src/agents/tools/script-tools.ts')

const timestamp = new Date().toISOString()
const drama = db.insert(schema.dramas).values({
  title: 'Rewrite context regression', createdAt: timestamp, updatedAt: timestamp,
}).returning().get()

function episode(content: string | null, scriptContent: string | null = null) {
  const ep = db.insert(schema.episodes).values({
    dramaId: drama.id, episodeNumber: 1, title: 'Library opening', content, scriptContent,
    createdAt: timestamp, updatedAt: timestamp,
  }).returning().get()
  const requestContext = new RequestContext()
  requestContext.set('episodeId', ep.id)
  return { ep, context: { requestContext } }
}

test('rewrite helper returns the complete source once and keeps custom instructions', async () => {
  const source = '清晨，林禾推开图书馆的门。她把归还的书放在柜台上。\n陈明说：“请先登记。”'
  const { context } = episode(source, 'An earlier screenplay')
  const result = await scriptTools.rewriteToScreenplay.execute!({ instructions: '保留登记这一情节。' }, context)
  assert.ok('source_content' in result)
  assert.equal(result.source_content, source)
  assert.equal(JSON.stringify(result).split(JSON.stringify(source).slice(1, -1)).length - 1, 1)
  assert.match(result.instruction, /保留登记这一情节/)
})

test('rewrite helper still supports screenplay fallback and missing content errors', async () => {
  const { context } = episode(null, '## S01 | 内景 · 图书馆 | 清晨\n林禾整理书架。')
  const result = await scriptTools.rewriteToScreenplay.execute!({}, context)
  assert.ok('source_content' in result)
  assert.equal(result.source_content, '## S01 | 内景 · 图书馆 | 清晨\n林禾整理书架。')

  const empty = episode(null)
  assert.deepEqual(await scriptTools.rewriteToScreenplay.execute!({}, empty.context), {
    error: 'Episode has no content to rewrite',
  })
  assert.deepEqual(await scriptTools.rewriteToScreenplay.execute!({}, { requestContext: new RequestContext() }), {
    error: 'Missing episodeId in request context',
  })
})

test('the native read/save path preserves the original and saves the supplied screenplay', async () => {
  const source = '林禾担心错过开馆时间，加快脚步。'
  const { ep, context } = episode(source)
  const original = await scriptTools.readEpisodeScript.execute!({}, context)
  assert.ok('content' in original)
  assert.equal(original.content, source)
  const screenplay = '## S01 | 外景 · 图书馆门口 | 清晨\n林禾看了一眼手表，快步走向大门。'
  await scriptTools.saveScript.execute!({ content: screenplay }, context)
  const saved = db.select().from(schema.episodes).all().find(row => row.id === ep.id)!
  assert.equal(saved.content, source)
  assert.equal(saved.scriptContent, screenplay)
})

test('all localized skills use read, model rewrite, save without requesting a second source tool', () => {
  for (const file of ['SKILL.md', 'SKILL.en.md', 'SKILL.ja.md', 'SKILL.ko.md']) {
    const skill = readFileSync(new URL(`../workspace/skills/script-rewriter/${file}`, import.meta.url), 'utf8')
    assert.match(skill, /read_episode_script/, file)
    assert.match(skill, /save_script/, file)
    assert.doesNotMatch(skill, /rewrite_to_screenplay/, file)
    assert.ok(skill.indexOf('read_episode_script') < skill.indexOf('save_script'), file)
  }
})
