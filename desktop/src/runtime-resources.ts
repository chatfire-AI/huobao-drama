/**
 * Windows 非 ASCII 安装路径兼容。
 *
 * 后端 bundle、ASAR 原生模块和 FFmpeg 必须统一使用转换后的 resources 路径，
 * 否则只转换其中一个，createRequire / asarUnpack 仍可能回到原始中文目录。
 * 优先使用 NTFS 短路径（零拷贝）；系统未启用短文件名时，把只读运行资源
 * 暂存到 ASCII 目录。业务数据库和用户媒体仍留在原 userData，不参与拷贝。
 */
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const READY_FILE = 'runtime-ready.json'
const RESOURCE_ITEMS = ['app.asar', 'app.asar.unpacked', 'frontend', 'workspace-template', 'bin']

export function isAsciiPath(value: string): boolean {
  return !/[^\x00-\x7f]/.test(value)
}

interface RuntimeOptions {
  version: string
  userDataDir: string
  programDataDir?: string
  log?: (message: string) => void
}

function sourceSignature(resourcesPath: string): string {
  const stat = fs.statSync(path.join(resourcesPath, 'app.asar'))
  return `${stat.size}:${Math.round(stat.mtimeMs)}`
}

function ready(directory: string, signature: string, version: string): boolean {
  try {
    const marker = JSON.parse(fs.readFileSync(path.join(directory, READY_FILE), 'utf8'))
    return marker.signature === signature && marker.version === version
      && RESOURCE_ITEMS.every(item => fs.existsSync(path.join(directory, item)))
  } catch {
    return false
  }
}

function copyResources(resourcesPath: string, target: string): void {
  for (const item of RESOURCE_ITEMS) {
    const source = path.join(resourcesPath, item)
    const destination = path.join(target, item)
    if (!fs.existsSync(source)) throw new Error(`安装资源缺失：${item}`)
    if (fs.statSync(source).isDirectory()) {
      fs.cpSync(source, destination, { recursive: true })
    } else {
      fs.mkdirSync(path.dirname(destination), { recursive: true })
      fs.copyFileSync(source, destination)
    }
  }
}

/** 短路径不可用时的零配置回退；导出以便独立验证资源暂存和缓存更新。 */
export function stageRuntimeResources(resourcesPath: string, options: RuntimeOptions): string {
  const signature = sourceSignature(resourcesPath)
  const identity = createHash('sha256')
    .update(`${resourcesPath}\0${options.userDataDir}`)
    .digest('hex')
    .slice(0, 16)
  const candidates = [
    path.join(options.userDataDir, 'runtime'),
    ...(options.programDataDir ? [path.join(options.programDataDir, 'HuobaoDrama')] : []),
  ].filter(isAsciiPath)
  let lastError: unknown = null

  for (const base of candidates) {
    const directory = path.join(base, `resources-${identity}`)
    const temporary = `${directory}.tmp-${process.pid}-${Date.now()}`
    try {
      if (ready(directory, signature, options.version)) return directory
      fs.mkdirSync(base, { recursive: true })
      const probe = path.join(base, `.huobao-write-${process.pid}`)
      fs.writeFileSync(probe, 'probe')
      fs.rmSync(probe, { force: true })

      fs.rmSync(temporary, { recursive: true, force: true })
      fs.mkdirSync(temporary, { recursive: true })
      copyResources(resourcesPath, temporary)
      fs.writeFileSync(path.join(temporary, READY_FILE), JSON.stringify({
        version: options.version,
        signature,
      }))

      // 同用户单实例锁正常会串行化这里；另一会话恰好先完成时直接复用。
      if (ready(directory, signature, options.version)) return directory
      fs.rmSync(directory, { recursive: true, force: true })
      fs.renameSync(temporary, directory)
      return directory
    } catch (error) {
      lastError = error
      options.log?.(`ASCII runtime staging failed at ${base}: ${(error as Error).message}`)
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true })
    }
  }

  throw new Error(`中文安装路径兼容资源准备失败，请检查磁盘空间和目录权限：${(lastError as Error)?.message || '无可用 ASCII 目录'}`)
}

function windowsShortPath(directory: string): Promise<string | null> {
  const escaped = directory.replace(/'/g, "''")
  const script = [
    "$ErrorActionPreference='Stop'",
    '$fso=New-Object -ComObject Scripting.FileSystemObject',
    `$short=$fso.GetFolder('${escaped}').ShortPath`,
    'if([string]::IsNullOrWhiteSpace($short)){exit 2}',
    '[Console]::Write($short)',
  ].join(';')
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  const powershell = process.env.SystemRoot
    ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    : 'powershell.exe'

  return new Promise(resolve => {
    execFile(powershell, [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', encoded,
    ], { timeout: 5000, windowsHide: true, encoding: 'utf8', maxBuffer: 64 * 1024 }, (error, stdout) => {
      if (error) { resolve(null); return }
      const short = String(stdout).trim()
      resolve(isAsciiPath(short) && fs.existsSync(path.join(short, 'app.asar')) ? short : null)
    })
  })
}

export async function resolveRuntimeResources(
  resourcesPath: string,
  options: RuntimeOptions & { platform: string },
): Promise<string> {
  if (options.platform !== 'win32' || isAsciiPath(resourcesPath)) return resourcesPath

  const short = await windowsShortPath(resourcesPath)
  if (short) {
    options.log?.(`non-ASCII install path: using Windows short resources path ${short}`)
    return short
  }

  options.log?.('non-ASCII install path: short path unavailable, staging runtime resources')
  const staged = stageRuntimeResources(resourcesPath, options)
  options.log?.(`non-ASCII install path: using staged resources ${staged}`)
  return staged
}
