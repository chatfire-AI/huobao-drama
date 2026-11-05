import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const script = read('../../desktop/scripts/prepare-resources.mjs')
const ffmpegTs = read('../src/utils/ffmpeg.ts')

// #135 Bug 1 根因：ffprobe-static v3.1.0 的 bin/darwin/arm64/ffprobe
// 实际是 x86_64，导致 Apple Silicon（无 Rosetta）桌面版拼接失败。
// 修复：在打包阶段用 `file` 命令读 ffmpeg/ffprobe 架构，失败时报错。
test('prepare-resources imports execFileSync from child_process for arch detection', () => {
  assert.match(script, /import \{ execFileSync \} from 'child_process'/)
})

test('prepare-resources defines readArchOf using the file command', () => {
  assert.match(script, /function readArchOf\(binPath/)
  assert.match(script, /execFileSync\(['"]file['"]/)
  assert.match(script, /arm64\|aarch64/i)
  assert.match(script, /x86\[_\-]64\|amd64/i)
})

test('prepare-resources defines detectArchMismatch and exits on mismatch', () => {
  assert.match(script, /function detectArchMismatch\(nameA, pathA, nameB, pathB\)/)
  assert.match(script, /archA !== archB/)
  assert.match(script, /process\.exit\(1\)/)
})

test('detectArchMismatch runs on each bin-mac-<arch> ffmpeg/ffprobe pair after prepareMacMedia', () => {
  // master 已改为 prepare-mac-media 按架构下载（lipo 逐个校验）；自检需
  // 覆盖最终产物 resources/bin-mac-arm64 与 bin-mac-x64 两个目录。
  assert.match(script, /prepareMacMedia\(DESKTOP, RES\)[\s\S]*?for \(const macArch of \['arm64', 'x64'\]\)/)
  assert.match(
    script,
    /detectArchMismatch\(['"]ffmpeg['"], path\.join\(binMac, ['"]ffmpeg['"]\), ['"]ffprobe['"], path\.join\(binMac, ['"]ffprobe['"]\)\)/,
  )
})

test('error message references the #135 issue and gives actionable hints', () => {
  assert.match(script, /#135/)
  assert.match(script, /Rosetta|softwareupdate/)
  assert.match(script, /rm -rf node_modules/)
})

// 反向断言：mac 二进制缺失时不能静默放过
test('missing mac binary fails the packaging run', () => {
  assert.match(script, /缺少 macOS/)
  assert.match(script, /process\.exit\(1\)/)
})

// 运行时错误：ffmpeg.ts checkFfmpegSuite 失败时给出 Rosetta + issue 链接提示
test('ffmpeg.ts surfaces Rosetta hint and #135 link when checkFfmpegSuite fails', () => {
  assert.match(ffmpegTs, /softwareupdate --install-rosetta/)
  assert.match(ffmpegTs, /issues\/135/)
})

// 反向断言：warned 单次打印的逻辑未被打断
test('ffmpeg.ts still gates the warn on a one-time warned flag', () => {
  assert.match(ffmpegTs, /if \(!warned\)/)
  assert.match(ffmpegTs, /warned = true/)
})
