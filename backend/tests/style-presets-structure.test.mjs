import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')

test('drama creation no longer pre-creates episodes from total_episodes', () => {
  const dramas = read('src/routes/dramas.ts')

  assert.doesNotMatch(dramas, /total_episodes \|\| 1/)
  assert.doesNotMatch(dramas, /第\$\{i\}集/)
  assert.doesNotMatch(dramas, /Create default episodes/)
})

test('drama creation records a fixed aspect ratio for video generation', () => {
  const dramas = read('src/routes/dramas.ts')

  assert.match(dramas, /aspectRatio: body\.aspect_ratio \|\| '16:9'/)
  assert.match(dramas, /if \(body\.aspect_ratio !== undefined\) updates\.aspectRatio = body\.aspect_ratio/)
})

test('style presets route is mounted and implements CRUD', () => {
  const entry = read('src/index.ts')
  const route = read('src/routes/stylePresets.ts')

  assert.match(entry, /api\.route\('\/style-presets', stylePresets\)/)
  assert.match(route, /app\.get\('\/'/)
  assert.match(route, /app\.post\('\/'/)
  assert.match(route, /app\.put\('\/:id'/)
  assert.match(route, /app\.delete\('\/:id'/)
  // value 唯一约束 + 格式校验 + 查重
  assert.match(route, /VALUE_PATTERN/)
  assert.match(route, /风格 key 已存在/)
  // GET 支持 ?all=1 且默认过滤停用项
  assert.match(route, /query\('all'\)/)
  assert.match(route, /r\.isActive/)
})

test('drama style prompt is injected into image prompt composition', () => {
  const service = read('src/services/style-preset.ts')
  const gridTools = read('src/agents/tools/image-prompt-tools.ts')
  const characters = read('src/routes/characters.ts')
  const scenes = read('src/routes/scenes.ts')

  assert.match(service, /getDramaStylePrompt/)
  assert.match(service, /stylePresets\.value, drama\.style/)
  assert.match(gridTools, /getDramaStylePrompt\(dramaId\)/)
  // 保存最终提示词时由工具拼接项目视觉风格（风格片段置于最前方）
  assert.match(gridTools, /stylePrompt \? `\$\{stylePrompt\}, \$\{prompt\}` : prompt/)
  assert.match(characters, /getDramaStylePrompt/)
  assert.match(characters, /characterImagePrompt\(char, stylePrompt\)/)
  assert.match(scenes, /getDramaStylePrompt\(scene\.dramaId\)/)
})

test('agent default prompts no longer hardcode consistent art style', () => {
  const agents = read('src/agents/index.ts')

  assert.doesNotMatch(agents, /必须包含 "consistent art style"/)
  assert.match(agents, /视觉风格描述会由工具/)
})
