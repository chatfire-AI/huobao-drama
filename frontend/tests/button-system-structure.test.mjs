import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const studioCss = readFileSync(new URL('../app/assets/studio.css', import.meta.url), 'utf8')
const indexPage = readFileSync(new URL('../app/pages/index.vue', import.meta.url), 'utf8')
const defaultLayout = readFileSync(new URL('../app/layouts/default.vue', import.meta.url), 'utf8')
const baseSelect = readFileSync(new URL('../app/components/BaseSelect.vue', import.meta.url), 'utf8')
const dramaDetail = readFileSync(new URL('../app/pages/drama/[id]/index.vue', import.meta.url), 'utf8')
const episodeWorkbench = readFileSync(new URL('../app/pages/drama/[id]/episode/[episodeNumber].vue', import.meta.url), 'utf8')

test('global button system exposes complete button tokens and states', () => {
  assert.match(studioCss, /--button-height:\s*36px/)
  assert.match(studioCss, /--button-height-sm:\s*30px/)
  assert.match(studioCss, /--button-height-icon:\s*36px/)
  assert.match(studioCss, /--button-border:\s*transparent/)
  assert.match(studioCss, /--button-focus:\s*rgba\(0,113,227,0\.18\)/)
  assert.match(studioCss, /--radius-pill:\s*980px/)
  assert.match(studioCss, /\.btn\s*\{[\s\S]*?border-radius:\s*var\(--button-radius\)/)
  assert.match(studioCss, /\.btn:focus-visible\s*\{/)
  assert.match(studioCss, /\.btn-danger\s*\{/)
  assert.match(studioCss, /\.btn-danger:hover\s*\{/)
})

test('button-like controls share focus-visible and active hooks', () => {
  assert.match(indexPage, /\.filter-chip:focus-visible\s*\{/)
  assert.match(indexPage, /\.menu-item:focus-visible\s*\{/)
  assert.match(defaultLayout, /\.nav-link:focus-visible\s*\{/)
  assert.match(defaultLayout, /\.brand:focus-visible\s*\{/)
  assert.match(baseSelect, /\.base-select-trigger:focus-visible\s*\{/)
  assert.match(baseSelect, /\.base-select-option:focus-visible\s*\{/)
})

test('custom return buttons use the unified quiet circular surface', () => {
  assert.match(dramaDetail, /\.back-btn\s*\{[\s\S]*?background:\s*rgba\(0,0,0,0\.05\)/)
  assert.match(dramaDetail, /\.back-btn:focus-visible\s*\{/)
  assert.match(episodeWorkbench, /\.back-btn\s*\{[\s\S]*?background:\s*rgba\(0,0,0,0\.05\)/)
  assert.match(episodeWorkbench, /\.back-btn:focus-visible\s*\{/)
})
