import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTextModelSelection } from '../../frontend/app/utils/text-model-selection.js'

const options = [
  { key: 'gemini/gemini-flash', model: 'gemini-flash', configId: 7 },
  { key: 'openai/gemini-flash', model: 'gemini-flash', configId: 12 },
  { key: 'openai/vendor/model', model: 'vendor/model', configId: 12 },
]

test('default chat selection sends the displayed model and its configuration in JSON', () => {
  const selected = resolveTextModelSelection(options, '')
  const request = JSON.parse(JSON.stringify({ model: selected.model, config_id: selected.configId }))
  assert.deepEqual(request, { model: 'gemini-flash', config_id: 7 })
})
test('explicit selection keeps the provider/configuration and model names containing slashes', () => {
  assert.deepEqual(resolveTextModelSelection(options, 'openai/gemini-flash'), { model: 'gemini-flash', configId: 12 })
  assert.deepEqual(resolveTextModelSelection(options, 'openai/vendor/model'), { model: 'vendor/model', configId: 12 })
})
test('default follows updated options; stale selections fall back as the picker does', () => {
  assert.deepEqual(resolveTextModelSelection(options.slice(1), ''), { model: 'gemini-flash', configId: 12 })
  assert.deepEqual(resolveTextModelSelection(options, 'removed/model'), { model: 'gemini-flash', configId: 7 })
  assert.deepEqual(resolveTextModelSelection(options, 'vendor/model'), { model: 'vendor/model', configId: 12 })
  assert.deepEqual(resolveTextModelSelection([], ''), { model: undefined, configId: undefined })
})
