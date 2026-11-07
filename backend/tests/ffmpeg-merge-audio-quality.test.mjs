import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const src = read('../src/services/ffmpeg-merge.ts')

// #121：拼接导出时「变声 + 音画逐渐不同步」。
// 根因：原实现用 concat demuxer（-f concat）拼接，各段音频采样率/声道
// /时间戳不归一化，编码器收到非连续流时出现变声 + PTS 漂移。
// 修复：改用 concat filter（complexFilter），每段音频先 aformat 归一化到
// 48kHz 双声道 + asetpts=PTS-STARTPTS 重置时间戳，再 concat。

// 1) 不再生成 concat 列表文件 / 不再走 demuxer
test('doMerge no longer writes a concat list file or uses concat demuxer', () => {
  // 删掉了 listPath / listContent 写盘
  assert.doesNotMatch(src, /const listPath = path\.join\(listDir/)
  assert.doesNotMatch(src, /const listContent = videos[\s\S]*?\.join\('\\n'\)[\s\S]*?fs\.writeFileSync/)
  // 不再用 demuxer
  assert.doesNotMatch(src, /inputOptions\(\['-f', 'concat'/)
  assert.doesNotMatch(src, /fs\.unlinkSync\(listPath\)/)
})

// 2) 改用 complexFilter + concat filter
test('doMerge uses complexFilter concat with per-input audio normalization', () => {
  // 调用了 complexFilter
  assert.match(src, /\.complexFilter\(filterChain\)/)
  // filterChain 引用了 aformat + asetpts
  assert.match(src, /aformat=sample_rates=48000:channel_layouts=stereo/)
  assert.match(src, /asetpts=PTS-STARTPTS/)
  // 拼接 filter 节点
  assert.match(src, /concat=n=\$\{N\}:v=1:a=1\[outv\]\[outa\]/)
})

// 3) 每段视频独立 input()（demuxer 模式下没有这个）
test('doMerge feeds each video as a separate ffmpeg input', () => {
  assert.match(src, /videos\.forEach\(\(v\) => cmd\.input\(toAbsPath\(v\)\)\)/)
})

// 4) 输出 map 显式指向 [outv]/[outa]
test('outputOptions maps the concat filter outputs explicitly', () => {
  assert.match(src, /'-map', '\[outv\]'/)
  assert.match(src, /'-map', '\[outa\]'/)
})

// 5) 旧的输出采样率 -ar 48000 没了（现在由每段 aformat 强制，不再需要）
test('legacy concat-demuxer output options are gone', () => {
  assert.doesNotMatch(src, /'-ar', '48000'/)
  assert.doesNotMatch(src, /'-fflags', '\+genpts'/) // 原靠 -fflags +genpts 兜底，现由 asetpts 替代
})
