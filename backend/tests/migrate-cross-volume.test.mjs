import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const src = read('../../desktop/src/migrate.ts')

// #138 两处根因 + 一处伴生 bug，PR 修复三处：

// 根因 1: sameVolume 之前用 statfs() 但 statfs() 不含 dev 字段 → undefined===undefined 恒真
// 本机实测：Object.keys(statfs) === ['type','bsize','blocks','bfree','bavail','files','ffree']
//          Object.keys(stat)  === [...,'dev',...]
test('sameVolume uses stat().dev (POSIX st_dev), not statfs()', () => {
  // 不再调用 statfs
  assert.doesNotMatch(src, /await Promise\.all\(\[fsp\.statfs\(/)
  // 改为 stat
  assert.match(src, /await Promise\.all\(\[fsp\.stat\(/)
  // 仍然比较 sa.dev === sb.dev
  assert.match(src, /sa\.dev === sb\.dev/)
})

// 根因 2: collectFileList 直接 readdir，对文件 ENOTDIR（#138 EXDEV 兜底调用）
test('collectFileList handles file input (EXDEV fallback path)', () => {
  // 先 stat，再分支：文件直接 push、目录才 readdir
  assert.match(src, /async function collectFileList\([\s\S]*?const st = await fsp\.stat\(dir\)/)
  assert.match(src, /if \(st\.isFile\(\)\) \{[\s\S]*?out\.push\(\{ rel: path\.relative\(base, dir\), size: st\.size \}\)/)
})

// 伴生 bug: copyAcross 之前用 `done += 1` 当 copiedBytes 上报，进度错位
test('copyAcross reports copiedBytes as accumulated bytes, not file count', () => {
  // 不再有 `let done = 0; ... done += 1; report(... done ...)` 这条旧路径
  // （注意：注释里可能引用旧代码字面量，所以按"行内赋值 + report"组合判断）
  assert.doesNotMatch(src, /let done = 0[\s\S]*?done \+= 1[\s\S]*?report\(\{ phase: 'moving', copiedBytes: done/)
  // 新版累加字节数
  assert.match(src, /copied \+= f\.size/)
  // 累加的 f 来自 entries（FileEntry 包含 rel + size）
  assert.match(src, /const entries: FileEntry\[\] = \[\]/)
  assert.match(src, /entries\.push\(\.\.\.list\)/)
})

// 反向断言：原 statfs 路径没了，且总字节累加没改坏
test('total bytes still accumulated from FileEntry.size', () => {
  assert.match(src, /const total = entries\.reduce\(\(s, f\) => s \+ f\.size, 0\)/)
})

// 反向断言：旧 `files: string[]` 中间变量在 copyAcross 里被 FileEntry 取代
test('copyAcross no longer carries a parallel string[] of relative paths', () => {
  // 新版本用 entries（FileEntry[]），不再有 files.push(...list.map(f => f.rel))
  assert.doesNotMatch(src, /files\.push\(\.\.\.list\.map\(f => f\.rel\)\)/)
})
