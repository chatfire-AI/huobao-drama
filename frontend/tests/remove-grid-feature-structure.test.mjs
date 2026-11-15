import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (path) => readFileSync(new URL(path, appRoot), 'utf8')

const episodePage = readApp('pages/drama/[id]/episode/[episodeNumber].vue')
const settingsPage = readApp('pages/settings.vue')
const useApi = readApp('composables/useApi.ts')

test('frontend API client no longer exposes grid image endpoints', () => {
  assert.doesNotMatch(useApi, /gridAPI/)
  assert.doesNotMatch(useApi, /\/grid\/prompt/)
  assert.doesNotMatch(useApi, /\/grid\/generate/)
  assert.doesNotMatch(useApi, /\/grid\/split/)
  assert.doesNotMatch(useApi, /\/grid\/status/)
})

test('episode workbench removes the grid image tool and history UI', () => {
  assert.doesNotMatch(episodePage, /宫格图/)
  assert.doesNotMatch(episodePage, /openGridTool/)
  assert.doesNotMatch(episodePage, /gridDialog/)
  assert.doesNotMatch(episodePage, /gridAPI/)
  assert.doesNotMatch(episodePage, /generateGridPrompt/)
  assert.doesNotMatch(episodePage, /startGridGen/)
  assert.doesNotMatch(episodePage, /doGridSplit/)
  assert.doesNotMatch(episodePage, /latest-grid-strip/)
  assert.doesNotMatch(episodePage, /grid-history/)
})

test('settings image prompt agent copy only describes role and scene prompts', () => {
  assert.match(settingsPage, /prompt_generator/)
  assert.doesNotMatch(settingsPage, /宫格图/)
  assert.doesNotMatch(settingsPage, /read_shots_for_grid/)
  assert.doesNotMatch(settingsPage, /generate_grid_prompt/)
  assert.doesNotMatch(settingsPage, /grid_prompt（/)
  assert.doesNotMatch(settingsPage, /cell_prompts/)
})
