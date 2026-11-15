import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const asar = require('@electron/asar')
const { getAbi } = require('node-abi')

export function assertWindowsX64(file) {
  const bytes = fs.readFileSync(file)
  const offset = bytes.length >= 64 ? bytes.readUInt32LE(60) : 0
  if (bytes.toString('ascii', 0, 2) !== 'MZ' || offset < 64 || offset + 6 > bytes.length
      || bytes.toString('ascii', offset, offset + 4) !== 'PE\0\0' || bytes.readUInt16LE(offset + 4) !== 0x8664) {
    throw new Error(`不是 Windows x64 PE 二进制：${file}`)
  }
  return bytes
}

export function validateWindowsPackage(resourcesDir, electronVersion) {
  const archive = path.join(resourcesDir, 'app.asar')
  for (const file of ['dist/main.js', 'dist/preload.js', 'dist/starting.html', 'build/backend.mjs']) {
    if (!asar.extractFile(archive, file).length) throw new Error(`安装包内容为空：${file}`)
  }
  for (const file of ['frontend/index.html', 'workspace-template/prompts/storyboard_breaker.md']) {
    if (!fs.statSync(path.join(resourcesDir, file)).isFile()) throw new Error(`安装包资源缺失：${file}`)
  }
  const nativeRoot = path.join(resourcesDir, 'app.asar.unpacked/node_modules')
  const sqlite = assertWindowsX64(path.join(nativeRoot, 'better-sqlite3/build/Release/better_sqlite3.node'))
  const abi = getAbi(electronVersion, 'electron')
  if (!sqlite.includes(Buffer.from(`node_register_module_v${abi}\0`))) {
    throw new Error(`Windows SQLite 原生模块与 Electron ${electronVersion} (ABI ${abi}) 不匹配`)
  }
  for (const file of ['sharp-win32-x64.node', 'libvips-42.dll', 'libvips-cpp-8.17.3.dll']) {
    assertWindowsX64(path.join(nativeRoot, '@img/sharp-win32-x64/lib', file))
  }
  for (const file of ['ffmpeg.exe', 'ffprobe.exe']) assertWindowsX64(path.join(resourcesDir, 'bin', file))
  console.log(`[package-check] Windows x64 启动资源完整；SQLite ABI ${abi} ✓`)
}
