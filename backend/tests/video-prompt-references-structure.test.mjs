import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')

test('prompt_generator video prompt format uses @name references instead of XML tags', () => {
  const agents = read('src/agents/index.ts')
  const skill = read('workspace/skills/prompt-generator/video-prompt/SKILL.md')
  const settings = read('../frontend/app/pages/settings.vue')

  // 场景/角色用 @名字 引用（名字必须与场景/角色列表完全一致）
  assert.match(agents, /@场景名/)
  assert.match(agents, /@角色名/)
  assert.match(agents, /@志远 → @图片1志远/)
  assert.doesNotMatch(agents, /<location>/)
  assert.doesNotMatch(agents, /<role>/)

  // SKILL.md 同步
  assert.match(skill, /@场景名/)
  assert.match(skill, /@角色名/)
  assert.match(skill, /@小明.*@图片1小明/)
  assert.doesNotMatch(skill, /<location>/)
  assert.doesNotMatch(skill, /<role>/)

  // settings.vue 的「恢复默认」副本同样包含新格式规范
  assert.match(settings, /storyboard_breaker: `/)
  assert.match(settings, /@场景名/)
  assert.match(settings, /@角色名/)
  assert.match(settings, /@志远 → @图片1志远/)
  assert.doesNotMatch(settings, /<location>/)
  assert.doesNotMatch(settings, /<role>/)
})
