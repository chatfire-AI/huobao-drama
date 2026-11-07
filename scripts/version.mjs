#!/usr/bin/env node
/**
 * 版本单一来源：根目录 VERSION 文件。
 *
 * 用法：
 *   node scripts/version.mjs check
 *   node scripts/version.mjs check --health http://localhost:5679/api/v1/health
 *   node scripts/version.mjs sync            # 把 VERSION 同步到所有 package.json
 *   node scripts/version.mjs sync 4.1.0      # 写入新版本并同步
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VERSION_FILE = path.join(ROOT, 'VERSION')
const PACKAGE_FILES = [
  'package.json',
  'backend/package.json',
  'frontend/package.json',
  'desktop/package.json',
]
const LOCK_FILES = [
  'backend/package-lock.json',
  'frontend/package-lock.json',
  'desktop/package-lock.json',
]
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

function fail(message) {
  console.error(`[version] ${message}`)
  process.exit(1)
}

function readVersion() {
  if (!fs.existsSync(VERSION_FILE)) fail('缺少根目录 VERSION 文件')
  const version = fs.readFileSync(VERSION_FILE, 'utf8').trim().replace(/^v/, '')
  if (!SEMVER.test(version)) fail(`VERSION 不是合法语义化版本：${version}`)
  return version
}

function readPackage(rel) {
  const file = path.join(ROOT, rel)
  if (!fs.existsSync(file)) fail(`缺少 ${rel}`)
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    fail(`${rel} 不是合法 JSON：${err.message}`)
  }
}

function writePackage(rel, pkg, version) {
  const file = path.join(ROOT, rel)
  const next = {}
  let versionWritten = false
  const hasVersion = Object.hasOwn(pkg, 'version')
  for (const [key, value] of Object.entries(pkg)) {
    if (key === 'version') {
      next.version = version
      versionWritten = true
      continue
    }
    next[key] = value
    // 没有 version 字段时，按惯例放在 name 之后
    if (key === 'name' && !hasVersion) {
      next.version = version
      versionWritten = true
    }
  }
  if (!versionWritten) next.version = version
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`)
}

function readLock(rel) {
  const file = path.join(ROOT, rel)
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    fail(`${rel} 不是合法 JSON：${err.message}`)
  }
}

function writeLock(rel, lock, version) {
  const next = {}
  let versionWritten = false
  const hasVersion = Object.hasOwn(lock, 'version')
  for (const [key, value] of Object.entries(lock)) {
    if (key === 'version') {
      next.version = version
      versionWritten = true
      continue
    }
    next[key] = value
    if (key === 'name' && !hasVersion) {
      next.version = version
      versionWritten = true
    }
  }
  if (!versionWritten) next.version = version

  const rootPkg = next.packages?.['']
  if (rootPkg && typeof rootPkg === 'object') {
    const rootNext = {}
    let rootVersionWritten = false
    const rootHasVersion = Object.hasOwn(rootPkg, 'version')
    for (const [key, value] of Object.entries(rootPkg)) {
      if (key === 'version') {
        rootNext.version = version
        rootVersionWritten = true
        continue
      }
      rootNext[key] = value
      if (key === 'name' && !rootHasVersion) {
        rootNext.version = version
        rootVersionWritten = true
      }
    }
    if (!rootVersionWritten) rootNext.version = version
    next.packages[''] = rootNext
  }

  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(next, null, 2)}\n`)
}

function checkPackages(version) {
  const rows = []
  let ok = true
  for (const rel of PACKAGE_FILES) {
    const pkg = readPackage(rel)
    const actual = pkg.version ? String(pkg.version).replace(/^v/, '') : '(缺失)'
    const match = actual === version
    rows.push({ file: rel, version: actual, match })
    if (!match) ok = false
  }
  console.log(`[version] VERSION = ${version}`)
  for (const row of rows) {
    console.log(`  ${row.match ? 'OK  ' : 'FAIL'} ${row.file.padEnd(24)} ${row.version}`)
  }
  for (const rel of LOCK_FILES) {
    const lock = readLock(rel)
    if (!lock) continue
    const rootPkgVersion = lock.packages?.['']?.version
    const topVersion = lock.version
    const actual = topVersion || rootPkgVersion || '(缺失)'
    const match = actual === version && (!rootPkgVersion || rootPkgVersion === version)
    console.log(`  ${match ? 'OK  ' : 'FAIL'} ${rel.padEnd(24)} ${actual}`)
    if (!match) ok = false
  }
  return ok
}

async function checkHealth(version, url) {
  const target = url.replace(/\/+$/, '')
  let res
  try {
    res = await fetch(target, { signal: AbortSignal.timeout(5000) })
  } catch (err) {
    console.error(`[version] 健康检查失败：${err.message}`)
    return false
  }
  if (!res.ok) {
    console.error(`[version] 健康检查 HTTP ${res.status}`)
    return false
  }
  const body = await res.json().catch(() => ({}))
  const actual = body.version ? String(body.version).replace(/^v/, '') : '(缺失)'
  const match = actual === version
  console.log(`  ${match ? 'OK  ' : 'FAIL'} health ${target.padEnd(32)} ${actual}`)
  return match
}

async function main() {
  const [command = 'check', ...rest] = process.argv.slice(2)
  const healthIndex = rest.indexOf('--health')
  const healthUrl = healthIndex >= 0 ? rest[healthIndex + 1] : null

  if (command === 'sync') {
    const nextVersion = (rest.find(arg => !arg.startsWith('--') && arg !== healthUrl) || '').replace(/^v/, '')
    const version = nextVersion || readVersion()
    if (!SEMVER.test(version)) fail(`不是合法语义化版本：${version}`)
    fs.writeFileSync(VERSION_FILE, `${version}\n`)
    for (const rel of PACKAGE_FILES) {
      writePackage(rel, readPackage(rel), version)
    }
    for (const rel of LOCK_FILES) {
      const lock = readLock(rel)
      if (lock) writeLock(rel, lock, version)
    }
    console.log(`[version] 已同步 ${version} 到 ${PACKAGE_FILES.length} 个 package.json 与 ${LOCK_FILES.length} 个 lockfile`)
    return
  }

  if (command !== 'check') fail(`未知命令：${command}`)

  const version = readVersion()
  let ok = checkPackages(version)
  if (healthUrl) ok = await checkHealth(version, healthUrl) && ok
  if (!ok) process.exit(1)
  console.log('[version] 全部一致')
}

main()
