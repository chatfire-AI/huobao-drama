import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = new URL('../..', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const exists = (path) => existsSync(new URL(path, root))

test('MiniMax image and video provider surfaces are removed', () => {
  const ai = read('backend/src/services/ai.ts')
  const route = read('backend/src/routes/aiConfigs.ts')
  const registry = read('backend/src/services/adapters/registry.ts')
  const settings = read('frontend/app/pages/settings.vue')
  const readme = read('README.md')

  assert.doesNotMatch(ai, /minimax/i)
  assert.doesNotMatch(route, /p === 'minimax'/i)
  assert.doesNotMatch(registry, /minimax/i)
  assert.doesNotMatch(settings, /minimax/i)
  assert.doesNotMatch(readme, /minimax/i)
  assert.equal(exists('backend/src/services/adapters/minimax-image.ts'), false)
  assert.equal(exists('backend/src/services/adapters/minimax-video.ts'), false)
})

test('MySQL startup removes all saved MiniMax configurations including audio', () => {
  const mysqlSchema = read('backend/src/db/mysql-schema.ts')
  const detachImage = 'UPDATE `episodes` e JOIN `ai_service_configs` c ON e.`image_config_id` = c.`id` SET e.`image_config_id` = NULL WHERE c.`provider` = ?'
  const detachVideo = 'UPDATE `episodes` e JOIN `ai_service_configs` c ON e.`video_config_id` = c.`id` SET e.`video_config_id` = NULL WHERE c.`provider` = ?'
  const deleteConfigs = 'DELETE FROM `ai_service_configs` WHERE `provider` = ?'

  assert.match(mysqlSchema, /mysqlDataCleanupStatements/)
  assert.match(mysqlSchema, /DELETE FROM `ai_service_configs` WHERE `provider` = \?/)
  assert.match(mysqlSchema, /DELETE FROM `ai_service_providers` WHERE `provider` = \?/)
  assert.ok(mysqlSchema.includes(detachImage))
  assert.ok(mysqlSchema.includes(detachVideo))
  assert.ok(mysqlSchema.indexOf(detachImage) < mysqlSchema.indexOf(deleteConfigs))
  assert.ok(mysqlSchema.indexOf(detachVideo) < mysqlSchema.indexOf(deleteConfigs))
  assert.equal((mysqlSchema.match(/params:\s*\['minimax'\]/g) || []).length, 4)
  assert.doesNotMatch(mysqlSchema, /params:\s*\['minimax', 'image', 'video'\]/)
  assert.match(mysqlSchema, /pool\.query\(cleanup\.sql, cleanup\.params\)/)
})
