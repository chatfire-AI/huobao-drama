import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../app/pages/settings.vue', import.meta.url), 'utf8')
const presets = source.slice(source.indexOf('const providerPresets = {'), source.indexOf('const huobaoQuickConfigs'))
const functions = source.slice(source.indexOf('function presetsByType('), source.indexOf('async function loadCfgs('))

test('BytePlus template applies its regional URL with the existing volcengine adapter', () => {
  const context = { cfgForm: {} }
  runInNewContext(`${presets}\n${functions}\napplyProviderPreset('video', 'byteplus')`, context)
  assert.equal(context.cfgForm.provider, 'volcengine')
  assert.equal(context.cfgForm.base_url, 'https://ark.ap-southeast.bytepluses.com')
  assert.equal(context.cfgForm.models[0], 'dreamina-seedance-2-5-260628')
})

test('template keys distinguish BytePlus and mainland presets sharing an adapter', () => {
  const context = { cfgForm: {} }
  runInNewContext(`${presets}\n${functions}\nvar options = presetsByType('video')`, context)
  const options = context.options
  assert.equal(new Set(options.map(o => o.key)).size, options.length)
  assert.equal(options.find(o => o.key === 'byteplus').provider, 'volcengine')
  runInNewContext(`applyProviderPreset('video', 'volcengine')`, context)
  assert.equal(context.cfgForm.base_url, 'https://ark.cn-beijing.volces.com')
  assert.equal(context.cfgForm.models[0], 'doubao-seedance-2-0-mini-260615')
  // Editing the form's model list must not mutate the preset used by the next dialog.
  context.cfgForm.models.push('custom-model')
  runInNewContext(`applyProviderPreset('video', 'volcengine')`, context)
  assert.equal(context.cfgForm.models.includes('custom-model'), false)
})
