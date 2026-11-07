/**
 * 运行版本唯一解析：
 * 1. 构建/部署注入的 HUOBAO_VERSION（桌面壳、Docker、CI 优先）
 * 2. 仓库根目录 VERSION（本地开发）
 * 3. backend 或根 package.json（兼容旧部署）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const VERSION_CANDIDATES = [
  path.resolve(__dirname, '../../VERSION'),
  path.resolve(__dirname, '../../../VERSION'),
  path.resolve(process.cwd(), 'VERSION'),
]

const PACKAGE_CANDIDATES = [
  path.resolve(__dirname, '../package.json'),
  path.resolve(__dirname, '../../package.json'),
  path.resolve(process.cwd(), 'package.json'),
]

function readVersionFile(file: string): string | null {
  try {
    const raw = fs.readFileSync(file, 'utf8').trim()
    return raw ? raw.replace(/^v/, '') : null
  } catch {
    return null
  }
}

function readPackageVersion(file: string): string | null {
  try {
    const version = JSON.parse(fs.readFileSync(file, 'utf8')).version
    return version ? String(version).replace(/^v/, '') : null
  } catch {
    return null
  }
}

export function getAppVersion(): string {
  const injected = process.env.HUOBAO_VERSION?.trim()
  if (injected) return injected.replace(/^v/, '')

  for (const file of VERSION_CANDIDATES) {
    const version = readVersionFile(file)
    if (version) return version
  }
  for (const file of PACKAGE_CANDIDATES) {
    const version = readPackageVersion(file)
    if (version) return version
  }
  return '0.0.0'
}
