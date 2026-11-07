import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const src = read('../app/views/drama/episode.vue')

// #136：资产制作中同时点击多个生成，最后一个一直显示「生成中，没有图片生成」。
// 根因：watchAsyncResult(check, attempts, delay) 轮询耗尽（attempts 用完）后
// 没有任何清理。pendingCharImageIds / pendingSceneImageIds / pendingPropImageIds
// / pendingVideoIds 这 4 个 ref 仍挂着那些 ID，对应的卡片一直显示「生成中」。
// 还顺手发现：原版 await refresh() 没有 try/catch，一次网络错误就让轮询
// 整体跳出（return 即结束），同样会卡 pending。
//
// 修复：watchAsyncResult 加可选 onTimeout 回调；await refresh() 包 try/catch；
// 全部 8 个调用点（视频/角色/场景/道具 × 单个+批量）都传 onTimeout 把本次挂
// 的 ID 移出 pending 列表。

// 1) 函数签名多了第 4 个参数 onTimeout
test('watchAsyncResult signature accepts onTimeout callback', () => {
  assert.match(src, /function watchAsyncResult\(\s*check\s*,\s*attempts\s*=\s*24\s*,\s*delay\s*=\s*2500\s*,\s*onTimeout\s*\)/)
})

// 2) 轮询主体包了 try/catch 在 refresh 上
test('watchAsyncResult swallows refresh errors so polling does not abort', () => {
  // refresh() 前后有 try/catch
  assert.match(src, /try \{\s*await refresh\(\)\s*\} catch\s*\{/)
})

// 3) attempts 用完后调用 onTimeout
test('watchAsyncResult invokes onTimeout after attempts exhausted', () => {
  // 跳出 for 循环后调用 onTimeout?.()
  assert.match(src, /onTimeout\?\.\(\)/)
})

// 4) 8 个 watchAsyncResult 调用点每个都接 onTimeout：以下 4 个 ID ref 都有清理
test('each pending-Id ref is cleared by some onTimeout', () => {
  // pendingCharImageIds 至少 2 处清理（单个 + 批量）
  const charCleanup = (src.match(/pendingCharImageIds\.value = pendingCharImageIds\.value\.filter\(item => item !== id\)/g) || []).length
  const charCleanupBatch = (src.match(/pendingCharImageIds\.value = pendingCharImageIds\.value\.filter\(item => !ids\.includes\(item\)\)/g) || []).length
  assert.ok(charCleanup >= 1, 'pendingCharImageIds 应该有单个清理')
  assert.ok(charCleanupBatch >= 1, 'pendingCharImageIds 应该有批量清理')
  // pendingSceneImageIds / pendingPropImageIds 同理
  assert.ok((src.match(/pendingSceneImageIds\.value = pendingSceneImageIds\.value\.filter\(item => item !== id\)/g) || []).length >= 1)
  assert.ok((src.match(/pendingSceneImageIds\.value = pendingSceneImageIds\.value\.filter\(item => !ids\.includes\(item\)\)/g) || []).length >= 1)
  assert.ok((src.match(/pendingPropImageIds\.value = pendingPropImageIds\.value\.filter\(item => item !== id\)/g) || []).length >= 1)
  assert.ok((src.match(/pendingPropImageIds\.value = pendingPropImageIds\.value\.filter\(item => !ids\.includes\(item\)\)/g) || []).length >= 1)
  // pendingVideoIds 单个 + 批量清理
  assert.ok((src.match(/pendingVideoIds\.value = pendingVideoIds\.value\.filter\(item => item !== storyboardId\)/g) || []).length >= 1)
  assert.ok((src.match(/pendingVideoIds\.value = pendingVideoIds\.value\.filter\(item => item !== sb\.id\)/g) || []).length >= 1)
  assert.ok((src.match(/pendingVideoIds\.value = pendingVideoIds\.value\.filter\(item => !ids\.includes\(item\)\)/g) || []).length >= 1)
})

// 5) 至少 8 个 watchAsyncResult 调用（视频×3、角色×2、场景×2、道具×2）
//    每个都接 onTimeout 4th 参数。直接在源码里统计 "), N, M, () => {"
//    形态的出现次数（多行调用都用这种 attempts/delay/onTimeout 换行写法）
test('all 8 watchAsyncResult call sites have an onTimeout 4th argument', () => {
  // 各 attempts/delay 组合都接 () => {：24/2500、36/2500、60/4000、80/4000
  const patterns = [
    /, 24, 2500, \(\) =>/g,
    /, 36, 2500, \(\) =>/g,
    /, 60, 4000, \(\) =>/g,
    /, 80, 4000, \(\) =>/g,
  ]
  let total = 0
  for (const p of patterns) {
    const matches = src.match(p)
    if (matches) total += matches.length
  }
  assert.equal(total, 8, `期望 8 个 onTimeout callback，实际 ${total}`)
})

// 6) 反向断言：函数定义里有 onTimeout 形参引用
test('onTimeout parameter is actually used in the function body', () => {
  // 函数体内必须调用 onTimeout
  assert.match(src, /onTimeout\?\.\(\)/)
})
