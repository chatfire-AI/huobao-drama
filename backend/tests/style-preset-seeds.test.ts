/**
 * Style preset seeds ship English display names, and every seed keeps its earlier Chinese
 * name in LEGACY_SEED_NAMES so the content-addressed rename reaches existing installs.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LEGACY_SEED_NAMES, stylePresetSeeds } from '../src/db/sqlite-schema'

const CJK = /[\u4e00-\u9fff]/

test('seeded presets carry English names and descriptions', () => {
  for (const seed of stylePresetSeeds) {
    assert.doesNotMatch(seed.name, CJK, `name is not English: ${seed.name}`)
    assert.doesNotMatch(seed.description, CJK, `description is not English: ${seed.description}`)
  }
})

test('every seed value maps to the Chinese name it replaced', () => {
  for (const seed of stylePresetSeeds) {
    const legacy = LEGACY_SEED_NAMES[seed.value]
    assert.ok(legacy, `no legacy name for seed value: ${seed.value}`)
    assert.match(legacy, CJK, `legacy name is not the old Chinese name: ${legacy}`)
    assert.notEqual(legacy, seed.name)
  }
})
