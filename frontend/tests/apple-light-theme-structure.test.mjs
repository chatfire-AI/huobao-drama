import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const studioCss = read('../app/assets/studio.css')
const layout = read('../app/layouts/default.vue')
const surfaces = [
  studioCss,
  layout,
  read('../app/pages/index.vue'),
  read('../app/pages/drama/[id]/index.vue'),
  read('../app/pages/drama/[id]/episode/[episodeNumber].vue'),
  read('../app/pages/settings.vue'),
].join('\n')

test('apple light theme exposes the selected neutral and system-blue tokens', () => {
  assert.match(studioCss, /--surface-base:\s*#f5f5f7/i)
  assert.match(studioCss, /--surface-raised:\s*#ffffff/i)
  assert.match(studioCss, /--accent:\s*#0071e3/i)
  assert.match(studioCss, /--success:\s*#34c759/i)
  assert.match(studioCss, /--font-body:\s*-apple-system,\s*BlinkMacSystemFont,\s*'SF Pro Text'/)
})

test('core surfaces remove the old film-console and graphite decoration', () => {
  assert.doesNotMatch(surfaces, /#d96f27|rgba\(217\s*,\s*111\s*,\s*39/i)
  assert.doesNotMatch(surfaces, /linear-gradient|radial-gradient|repeating-linear-gradient/i)
  assert.doesNotMatch(surfaces, /Noto Serif SC|film-strip|film-frame/i)
  assert.doesNotMatch(surfaces, /#15171a|#1c1f23|#20242a|#30343a/i)
  assert.doesNotMatch(surfaces, /#4c8dff|rgba\(76\s*,\s*141\s*,\s*255/i)
})
