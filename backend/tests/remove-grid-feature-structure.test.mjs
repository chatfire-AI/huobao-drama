import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const exists = (path) => existsSync(new URL(path, root))

test('backend no longer exposes the grid image API or split service', () => {
  const index = read('src/index.ts')

  assert.doesNotMatch(index, /routes\/grid/)
  assert.doesNotMatch(index, /api\.route\('\/grid'/)
  assert.equal(exists('src/routes/grid.ts'), false)
  assert.equal(exists('src/services/grid-split.ts'), false)
})

test('image prompt agent keeps role and scene prompts but removes grid prompt mode', () => {
  const agents = read('src/agents/index.ts')
  const skills = read('src/agents/skills.ts')
  const imagePromptTools = read('src/agents/tools/image-prompt-tools.ts')
  const storyboardTools = read('src/agents/tools/storyboard-tools.ts')
  const skill = read('workspace/skills/prompt-generator/prop-prompt/SKILL.md')

  assert.match(agents, /prompt_generator/)
  assert.match(skills, /prompt_generator/)
  assert.match(imagePromptTools, /save_character_final_prompt/)
  assert.match(imagePromptTools, /save_scene_final_prompt/)
  assert.doesNotMatch(agents, /宫格图/)
  assert.doesNotMatch(agents, /read_shots_for_grid/)
  assert.doesNotMatch(agents, /generate_grid_prompt/)
  assert.doesNotMatch(imagePromptTools, /宫格图/)
  assert.doesNotMatch(imagePromptTools, /read_shots_for_grid/)
  assert.doesNotMatch(imagePromptTools, /generate_grid_prompt/)
  assert.doesNotMatch(storyboardTools, /generate_grid_prompt/)
  assert.doesNotMatch(storyboardTools, /宫格图/)
  assert.doesNotMatch(skill, /宫格图/)
  assert.doesNotMatch(skill, /grid layout/)
})
