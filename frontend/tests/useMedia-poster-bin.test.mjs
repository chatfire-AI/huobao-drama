import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const useMedia = read('../app/composables/useMedia.ts')
const storage = read('../../backend/src/utils/storage.ts')

// 海报帧正则必须覆盖 .bin，否则 vendor 返回无扩展名 URL 时
// 缩略图全黑（#135 Bug 2 复现路径）。
test('posterOf regex accepts .bin fallback extension', () => {
  assert.match(useMedia, /posterOf\([\s\S]*?if \(!\/\\\.\(mp4\|webm\|mov\|bin\)\$\/i\.test\(url\)\) return ''/)
})

test('posterOf regex still covers the original mp4/webm/mov', () => {
  assert.match(useMedia, /mp4\|webm\|mov\|bin/)
  assert.match(useMedia, /\\\.\(mp4\|webm\|mov\|bin\)\$\/i/)
})

test('storage.getExtFromUrl falls back to .bin for extensionless URLs', () => {
  // 确认我们匹配的修复链：vendor 无扩展名 → 落盘 .bin → posterOf 必须识别 .bin
  assert.match(storage, /function getExtFromUrl/)
  assert.match(storage, /return '\.bin'/)
})

// 反向断言：之前的 .mp4/.webm/.mov 行为不变（不被错误移除）
test('posterOf function still returns the right shape for the happy path', () => {
  assert.match(useMedia, /export function posterOf\(url: string\): string \{/)
  assert.match(useMedia, /return url\.replace\(\/\\\.\[\^\.\/\]\+\$\/, '_poster\.jpg'\)/)
})

// 反向断言：未被错误地改成"无脑返回空串"或"全转 jpg"
test('posterOf does not regress the static-path guard', () => {
  assert.match(useMedia, /if \(!url \|\| !url\.includes\(['"]\/static\/['"]\)\) return ''/)
  assert.doesNotMatch(useMedia, /posterOf[\s\S]*?return ''\s*\n\s*\}/) // 末尾不应直接 return ''
})
