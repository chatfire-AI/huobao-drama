import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')

test('project creation dialog only asks for title and visual style', () => {
  const page = read('app/pages/index.vue')

  assert.match(page, /新建项目/)
  assert.match(page, /视觉风格/)
  assert.doesNotMatch(page, /total_episodes/)
  assert.doesNotMatch(page, /计划集数/)
  // 硬编码风格列表已移除，预设来自 API
  assert.doesNotMatch(page, /\['realistic', 'anime'/)
  assert.match(page, /stylePresetAPI/)
  assert.match(page, /stylePresetAPI\.list\(\)/)
  assert.match(page, /styleLabel\(d\.style\)/)
  assert.match(page, /stylePresets\.length \}\} 种视觉风格/)
})

test('useApi exposes style preset endpoints', () => {
  const useApi = read('app/composables/useApi.ts')

  assert.match(useApi, /stylePresetAPI/)
  assert.match(useApi, /\/style-presets/)
  assert.match(useApi, /\?all=1/)
})

test('settings page manages style presets in a base tab', () => {
  const settings = read('app/pages/settings.vue')

  assert.match(settings, /风格预设/)
  assert.match(settings, /Palette/)
  assert.match(settings, /stylePresetAPI/)
  assert.match(settings, /\{ id: 'styles', label: '风格预设'/)
  assert.match(settings, /startAddStyle/)
  assert.match(settings, /startEditStyle/)
  assert.match(settings, /toggleStyle/)
  assert.match(settings, /confirmDelStyle/)
  assert.match(settings, /styleToDelete/)
  assert.match(settings, /<ConfirmDialog/)
  assert.match(settings, /loadStylePresets/)
  // 关闭高级开关时只重置高级 tab，不影响基础 tab
  assert.match(settings, /advancedTabs\.some/)
  assert.doesNotMatch(settings, /if \(!v && tab\.value !== 'ai'\)/)
  // 风格 key 编辑时不可修改
  assert.match(settings, /:disabled="!!styleEditId"/)
  // image_prompt_generator 默认提示词副本同步更新
  assert.doesNotMatch(settings, /必须包含 "consistent art style"/)
})
