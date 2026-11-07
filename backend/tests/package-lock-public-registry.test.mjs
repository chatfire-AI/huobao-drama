import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const lock = readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8')

// #120 E401错误：29 个 better-sqlite3 间接依赖（@types/better-sqlite3, bindings, bl, …）
// 在 lock 文件的 "resolved" 字段锁定了 Connor 自己的阿里云 namespace：
//   https://packages.aliyun.com/69c39010f167bac7fd2502e3/npm/npm-registry/<name>/-/<file>
// 任何 clone 仓库后 npm install 都会向该私有 namespace 发请求，无 auth 即 401。
// 修复：把 29 个 URL 重写为 https://registry.npmjs.org/<name>/-/<file>。
// 验证：aliyun 是 npmjs 的 mirror，本地实测 integrity sha512 100% 一致（bit-identical tgz），
//       URL 替换是纯重定向，不改变实际安装的二进制。

// 1) 锁文件里再没有指向任何私有 namespace 的 resolved
test('package-lock.json has no resolved URLs pointing to packages.aliyun.com', () => {
  assert.equal(
    lock.includes('packages.aliyun.com'),
    false,
    '私有 aliyun namespace URL 仍残留，npm install 会 401',
  )
})

// 2) 之前那 29 个 better-sqlite3 间接依赖的 URL 全部来自默认 registry
test('all 29 better-sqlite3 transitive deps now resolve to registry.npmjs.org', () => {
  // 这些是 better-sqlite3 引入的间接包，原 issue 报告里出现过的关键名
  const expectedNames = [
    '@types/better-sqlite3',
    'better-sqlite3',
    'bindings',
    'bl',
    'buffer',
    'chownr',
    'decompress-response',
    'deep-extend',
    'end-of-stream',
    'expand-template',
    'file-uri-to-path',
    'fs-constants',
    'github-from-package',
    'ieee754',
    'ini',
    'mimic-response',
    'minimist',
    'mkdirp-classic',
    'napi-build-utils',
    'node-abi',
    'prebuild-install',
    'pump',
    'rc',
    'simple-concat',
    'simple-get',
    'strip-json-comments',
    'tar-fs',
    'tar-stream',
    'tunnel-agent',
  ]
  for (const name of expectedNames) {
    // scoped 包 URL 形态：https://registry.npmjs.org/@types/better-sqlite3/-/...
    // 非 scoped：https://registry.npmjs.org/bindings/-/...
    const expectedUrl = `https://registry.npmjs.org/${name}/-/`
    assert.ok(
      lock.includes(expectedUrl),
      `${name} 的 resolved 仍不是默认 registry（应在 ${expectedUrl}）`,
    )
  }
})

// 3) 锁文件依然是合法 JSON（隐式保护：替换不破坏结构）
test('package-lock.json remains valid JSON', () => {
  // parse 抛错即失败
  JSON.parse(lock)
})
