import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')

test('episode card exposes a delete action', () => {
  const page = read('app/pages/drama/[id]/index.vue')
  const useApi = read('app/composables/useApi.ts')

  assert.match(useApi, /episodeAPI = \{[\s\S]*?del: \(id: number\) => api\.del\(`\/episodes\/\$\{id\}`\)/)
  assert.match(page, /class="btn btn-icon btn-sm ep-delete"/)
  assert.match(page, /@click\.stop="episodeToDelete = ep"/)
  assert.match(page, /<ConfirmDialog/)
  assert.match(page, /确定删除「/)
  assert.match(page, /await episodeAPI\.del\(ep\.id\)/)
  // 不使用浏览器原生确认弹窗
  assert.doesNotMatch(page, /[^D]confirm\(/)
})

test('drama detail header links to the asset library page', () => {
  const page = read('app/pages/drama/[id]/index.vue')

  assert.match(page, /素材库/)
  assert.match(page, /navigateTo\(`\/drama\/\$\{drama\.id\}\/assets`\)/)
})

test('episode status is manually marked, not derived from script content', () => {
  const page = read('app/pages/drama/[id]/index.vue')

  // 手动状态：选项 + 下拉标记 + 持久化到 episodes.status
  assert.match(page, /const epStatusOptions = \[/)
  assert.match(page, /function epStatus\(ep\) \{ return ep\.status \|\| 'draft' \}/)
  assert.match(page, /function setEpisodeStatus/)
  assert.match(page, /episodeAPI\.update\(ep\.id, \{ status \}\)/)
  assert.match(page, /epStatusMenuId/)
  // 自动推算已移除
  assert.doesNotMatch(page, /hasScript/)
  assert.doesNotMatch(page, /已完成剧本/)
  assert.doesNotMatch(page, /待编写/)
})

test('asset library page lists character and scene images', () => {
  const page = read('app/pages/drama/[id]/assets.vue')

  // 数据源：项目全部图片生成记录 + 项目详情（名称解析）
  assert.match(page, /taskAPI\.list\(\{ type: 'image', drama_id: dramaId \}\)/)
  assert.match(page, /dramaAPI\.get\(dramaId\)/)
  // 只收录完成的角色/场景图
  assert.match(page, /r\.status === 'completed' && \(r\.characterId \|\| r\.sceneId\)/)
  // 全部 / 角色 / 场景 筛选
  assert.match(page, /\{ label: '全部', value: 'all' \}/)
  assert.match(page, /\{ label: '角色', value: 'character' \}/)
  assert.match(page, /\{ label: '场景', value: 'scene' \}/)
  assert.match(page, /characterAssets/)
  assert.match(page, /sceneAssets/)
  // 网格 + 预览
  assert.match(page, /class="card asset-card"/)
  assert.match(page, /openViewer\(asset\)/)
  assert.match(page, /viewer-overlay/)
  // 空态引导
  assert.match(page, /暂无/)
  assert.match(page, /会自动收录到这里/)
})
