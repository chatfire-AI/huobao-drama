/**
 * Windows 非 ASCII 安装路径兼容。
 *
 * 根因与约束：
 * 1. Electron 默认的 `node:fs` 会将任意 `*.asar` 劫持为虚拟目录（`statSync('.../app.asar').isDirectory() === true`、
 *    `size === 0`），对其调用 `fs.cpSync` 会直接触发底层 C++ `SIGABRT` 导致主进程无提示闪退，调用 `fs.rmSync` 也会报 `ENOTDIR`。
 *    因此资源探测、拷贝、清理必须通过 Electron 内置的 `original-fs` 操作真实文件。
 * 2. 不能依赖 Windows 8.3 短路径（`ShortPath`）：`backend.mjs` 为 ESM 模块，Node ESM 入口加载器会执行
 *    `realpathSync`（Windows `GetFinalPathNameByHandleW`），把 `C:\7F99~1\...` 短路径重新展开回中文原路径，
 *    导致 `import.meta.url` 与 `app.asar.unpacked` 原生模块（`sharp`/`libvips`/`better-sqlite3`）仍落回中文目录。
 *    必须暂存到真实物理 ASCII 目录（首次安装/升级拷贝一次，`runtime-ready.json` 命中后零拷贝复用）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

const READY_FILE = 'runtime-ready.json'
const RESOURCE_ITEMS = ['app.asar', 'app.asar.unpacked', 'frontend', 'workspace-template', 'bin']

declare const require: NodeRequire | undefined

function getRawFs(): typeof fs {
  try {
    const req = typeof require === 'function' ? require : createRequire(import.meta.url)
    return req('original-fs') as typeof fs
  } catch {
    return fs
  }
}

export function isAsciiPath(value: string): boolean {
  return Boolean(value) && !/[^\x00-\x7f]/.test(value)
}

export interface RuntimeOptions {
  version: string
  userDataDir: string
  localAppDataDir?: string
  publicDir?: string
  programDataDir?: string
  log?: (message: string) => void
}

function sourceSignature(rawFs: typeof fs, resourcesPath: string): string {
  const stat = rawFs.statSync(path.join(resourcesPath, 'app.asar'))
  return `${stat.size}:${Math.round(stat.mtimeMs)}`
}

function ready(rawFs: typeof fs, directory: string, signature: string, version: string): boolean {
  try {
    const marker = JSON.parse(rawFs.readFileSync(path.join(directory, READY_FILE), 'utf8'))
    return marker.signature === signature && marker.version === version
      && RESOURCE_ITEMS.every(item => rawFs.existsSync(path.join(directory, item)))
  } catch {
    return false
  }
}

function copyTreeSync(rawFs: typeof fs, source: string, destination: string): void {
  const stat = rawFs.statSync(source)
  if (stat.isDirectory()) {
    rawFs.mkdirSync(destination, { recursive: true })
    for (const entry of rawFs.readdirSync(source)) {
      copyTreeSync(rawFs, path.join(source, entry), path.join(destination, entry))
    }
    return
  }
  rawFs.mkdirSync(path.dirname(destination), { recursive: true })
  rawFs.copyFileSync(source, destination)
}

function copyResources(rawFs: typeof fs, resourcesPath: string, target: string): void {
  for (const item of RESOURCE_ITEMS) {
    const source = path.join(resourcesPath, item)
    const destination = path.join(target, item)
    if (!rawFs.existsSync(source)) throw new Error(`安装资源缺失：${item}`)
    copyTreeSync(rawFs, source, destination)
  }
}

function sleepSync(ms: number): void {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
  } catch {
    const end = Date.now() + ms
    while (Date.now() < end) { /* fallback spin */ }
  }
}

/** Windows Defender 实时扫描刚落盘的 exe/dll/node 时可能短暂占用句柄导致 rename EPERM，退避重试 */
function renameWithRetry(rawFs: typeof fs, from: string, to: string, attempts = 6): void {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      rawFs.rmSync(to, { recursive: true, force: true })
      rawFs.renameSync(from, to)
      return
    } catch (error) {
      lastError = error
      const code = (error as NodeJS.ErrnoException)?.code
      if (code !== 'EPERM' && code !== 'EACCES' && code !== 'EBUSY') throw error
      sleepSync(120 * (i + 1))
    }
  }
  throw lastError
}

function candidateBases(options: RuntimeOptions, shortId: string): string[] {
  const raw = [
    path.join(options.userDataDir, 'runtime'),
    options.localAppDataDir ? path.join(options.localAppDataDir, 'HuobaoDrama', 'runtime') : '',
    // C:\Users\Public 在所有 Windows 版本上均为纯 ASCII 且对普通非管理员账户默认可写
    options.publicDir ? path.join(options.publicDir, `HuobaoDrama-runtime-${shortId}`) : '',
    // ProgramData 按身份哈希分目录，避免管理员与普通账户共用同一父目录引发 ACL 权限冲突
    options.programDataDir ? path.join(options.programDataDir, `HuobaoDrama-runtime-${shortId}`) : '',
  ]
  return [...new Set(raw.filter(isAsciiPath))]
}

/** 将只读运行资源暂存到物理 ASCII 目录；业务数据库与用户媒体仍留在原 userData。 */
export function stageRuntimeResources(resourcesPath: string, options: RuntimeOptions): string {
  const rawFs = getRawFs()
  const signature = sourceSignature(rawFs, resourcesPath)
  const identity = createHash('sha256')
    .update(`${resourcesPath}\0${options.userDataDir}`)
    .digest('hex')
    .slice(0, 16)
  const candidates = candidateBases(options, identity.slice(0, 8))
  let lastError: unknown = null

  for (const base of candidates) {
    const directory = path.join(base, `resources-${identity}`)
    const temporary = `${directory}.tmp-${process.pid}-${Date.now()}`
    try {
      if (ready(rawFs, directory, signature, options.version)) return directory
      rawFs.mkdirSync(base, { recursive: true })
      const probe = path.join(base, `.huobao-write-${process.pid}`)
      rawFs.writeFileSync(probe, 'probe')
      rawFs.rmSync(probe, { force: true })

      rawFs.rmSync(temporary, { recursive: true, force: true })
      rawFs.mkdirSync(temporary, { recursive: true })
      copyResources(rawFs, resourcesPath, temporary)
      rawFs.writeFileSync(path.join(temporary, READY_FILE), JSON.stringify({
        version: options.version,
        signature,
      }))

      if (ready(rawFs, directory, signature, options.version)) return directory
      renameWithRetry(rawFs, temporary, directory)
      return directory
    } catch (error) {
      lastError = error
      options.log?.(`ASCII runtime staging failed at ${base}: ${(error as Error).message}`)
    } finally {
      try { rawFs.rmSync(temporary, { recursive: true, force: true }) } catch { /* ignore */ }
    }
  }

  throw new Error(`中文安装路径兼容资源准备失败，请检查磁盘空间和目录权限：${(lastError as Error)?.message || '无可用 ASCII 目录'}`)
}

export async function resolveRuntimeResources(
  resourcesPath: string,
  options: RuntimeOptions & { platform: string },
): Promise<string> {
  if (options.platform !== 'win32' || isAsciiPath(resourcesPath)) return resourcesPath

  options.log?.(`non-ASCII install path detected (${resourcesPath}), staging ASCII runtime resources`)
  const staged = stageRuntimeResources(resourcesPath, options)
  options.log?.(`non-ASCII install path: using staged ASCII resources ${staged}`)
  return staged
}
