/**
 * 存储迁移引擎（主进程）
 *
 * 序列：validate → stop backend → move → write config → restart backend → done
 * 铁律：copy 校验通过前绝不删旧目录；配置搬完才写；任何失败回滚并以旧目录拉起后端。
 *
 * 进度经 IPC 'huobao:migrate-progress' 推送（80ms 节流，done/error 必发）。
 */
import { app, dialog, ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as fsp from 'fs/promises'
import * as path from 'path'

export interface MigrationDeps {
  getWindow(): BrowserWindow | null
  getDataDir(): string
  setDataDir(dir: string): void
  getPort(): number
  isBackendAlive(): boolean
  /** 停后端并等待退出（内部置 backendRestarting 抑制致命弹窗） */
  stopBackend(): Promise<void>
  startBackend(): void
  waitHealthy(port: number, timeoutMs: number): Promise<void>
  /** 后端生命周期告一段落（已 healthy 或已恢复）时复位标志 */
  markRestartingFalse(): void
  writeConfig(dataDir: string): void
  configPath(): string
  normCase(p: string): string
}

export interface MigrateProgress {
  phase: 'validating' | 'stopping' | 'moving' | 'config' | 'restarting' | 'done' | 'error'
  message?: string
  copiedBytes?: number
  totalBytes?: number
}

export interface MigrateOptions {
  targetDir: string
  migrateFiles: boolean
}

export function registerMigrationIpc(deps: MigrationDeps): void {
  ipcMain.handle('huobao:start-migration', async (_event, opts: MigrateOptions) => {
    await runMigration(deps, opts)
    return { ok: true }
  })
}

// ---- 进度推送（80ms 节流，done/error 必发） ----

function makeReporter(getWindow: () => BrowserWindow | null) {
  let lastSent = 0
  return (progress: MigrateProgress, force = false) => {
    const now = Date.now()
    if (!force && progress.phase !== 'done' && progress.phase !== 'error' && now - lastSent < 80) return
    lastSent = now
    getWindow()?.webContents.send('huobao:migrate-progress', progress)
  }
}

// ---- 校验 ----

async function sameVolume(a: string, b: string): Promise<boolean> {
  try {
    const [sa, sb] = await Promise.all([fsp.statfs(a), fsp.statfs(b)])
    return sa.dev === sb.dev
  } catch {
    return false // 判定不了按跨卷（走逐文件 copy，更稳妥）
  }
}

async function validateTarget(deps: MigrationDeps, target: string, currentDir: string): Promise<number> {
  const targetStat = await fsp.stat(target).catch(() => null)
  if (!targetStat) {
    await fsp.mkdir(target, { recursive: true })
  } else if (!targetStat.isDirectory()) {
    throw new Error('目标路径不是目录')
  } else {
    const children = await fsp.readdir(target)
    if (children.length > 0) throw new Error('目标目录必须为空')
  }

  // 可写探针
  const probe = path.join(target, `.huobao-probe-${Date.now()}`)
  await fsp.writeFile(probe, 'probe')
  await fsp.rm(probe)

  // 路径关系（win32 大小写不敏感）
  const a = deps.normCase(path.resolve(currentDir))
  const b = deps.normCase(path.resolve(target))
  if (b === a) throw new Error('不能选择当前数据目录')
  if (b.startsWith(a + path.sep)) throw new Error('目标目录在当前数据目录内部')
  if (a.startsWith(b + path.sep)) throw new Error('目标目录是当前数据目录的上级目录')
  const userData = deps.normCase(path.resolve(path.dirname(currentDir))) // <userData>
  if (b === userData || a.startsWith(b + path.sep)) throw new Error('不能选择应用数据目录及其上级目录')

  // 待搬总量（跨卷空间校验 + 迁移进度共用）
  let totalBytes = 0
  const collect = async (dir: string): Promise<void> => {
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) await collect(full)
      else if (e.isFile()) {
        const st = await fsp.stat(full).catch(() => null)
        if (st) totalBytes += st.size
      }
    }
  }
  await collect(currentDir)

  // 跨卷空间校验（同卷 rename 不占额外空间，跳过）
  if (!(await sameVolume(currentDir, target))) {
    const st = await fsp.statfs(target)
    const free = st.bavail * st.bsize
    if (free < totalBytes * 1.05) {
      const needGb = ((totalBytes * 1.05) / 1024 ** 3).toFixed(1)
      const freeGb = (free / 1024 ** 3).toFixed(1)
      throw new Error(`目标磁盘空间不足：需要约 ${needGb} GB，剩余 ${freeGb} GB`)
    }
  }
  return totalBytes
}

// ---- 搬移 ----

async function collectFileList(dir: string, base = dir, out: FileEntry[] = []): Promise<FileEntry[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) await collectFileList(full, base, out)
    else if (e.isFile()) {
      const st = await fsp.stat(full)
      out.push({ rel: path.relative(base, full), size: st.size })
    }
  }
  return out
}

interface FileEntry {
  rel: string
  size: number
}

/**
 * 搬移数据目录内容。铁律：复核通过前绝不删旧目录。
 * 同卷：逐顶层条目 rename（EXDEV 兜底转逐文件 copy）；跨卷：清单 copy + 字节复核 + 删旧。
 */
async function moveData(
  oldDir: string,
  newDir: string,
  report: (p: MigrateProgress, force?: boolean) => void,
): Promise<void> {
  await fsp.mkdir(newDir, { recursive: true })
  const topEntries = await fsp.readdir(oldDir, { withFileTypes: true })

  if (await sameVolume(oldDir, newDir)) {
    for (const e of topEntries) {
      const src = path.join(oldDir, e.name)
      const dst = path.join(newDir, e.name)
      try {
        fs.renameSync(src, dst)
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException)?.code === 'EXDEV') {
          await copyAcross([src], oldDir, newDir, report)
        } else throw err
      }
    }
    await fsp.rm(oldDir, { recursive: true, force: true })
    return
  }

  // 跨卷：全量清单 → 逐文件 copy → 字节复核 → 删旧
  const files = await collectFileList(oldDir)
  const totalBytes = files.reduce((s, f) => s + f.size, 0)
  let copied = 0
  for (const f of files) {
    const dst = path.join(newDir, f.rel)
    await fsp.mkdir(path.dirname(dst), { recursive: true })
    await fsp.copyFile(path.join(oldDir, f.rel), dst)
    copied += f.size
    report({ phase: 'moving', copiedBytes: copied, totalBytes })
  }
  // 字节复核
  const copiedFiles = await collectFileList(newDir)
  const copiedTotal = copiedFiles.reduce((s, f) => s + f.size, 0)
  if (copiedFiles.length !== files.length || copiedTotal !== totalBytes) {
    throw new Error(`迁移校验失败：文件数 ${copiedFiles.length}/${files.length}，字节 ${copiedTotal}/${totalBytes}`)
  }
  await fsp.rm(oldDir, { recursive: true, force: true })
}

/** rename 遇 EXDEV 时对个别顶层条目退化为跨卷 copy（少见路径，进度从简） */
async function copyAcross(sources: string[], oldDir: string, newDir: string, report: (p: MigrateProgress, force?: boolean) => void): Promise<void> {
  let total = 0
  const files: string[] = []
  for (const src of sources) {
    const list = await collectFileList(src, oldDir)
    files.push(...list.map(f => f.rel))
    total += list.reduce((s, f) => s + f.size, 0)
  }
  let done = 0
  for (const rel of files) {
    const dst = path.join(newDir, rel)
    await fsp.mkdir(path.dirname(dst), { recursive: true })
    await fsp.copyFile(path.join(oldDir, rel), dst)
    done += 1
    report({ phase: 'moving', copiedBytes: done, totalBytes: total })
  }
}

// ---- 主流程 ----

export async function runMigration(deps: MigrationDeps, opts: MigrateOptions): Promise<void> {
  const report = makeReporter(deps.getWindow)
  const oldDir = path.resolve(deps.getDataDir())
  const target = path.resolve(opts.targetDir)
  const backendWasAlive = deps.isBackendAlive()

  try {
    report({ phase: 'validating' }, true)
    const totalBytes = await validateTarget(deps, target, oldDir)

    if (backendWasAlive) {
      report({ phase: 'stopping' }, true)
      await deps.stopBackend()
    }

    if (opts.migrateFiles) {
      report({ phase: 'moving', copiedBytes: 0, totalBytes }, true)
      await moveData(oldDir, target, report)
    } else {
      await fsp.mkdir(target, { recursive: true })
    }

    // 配置在文件搬完后才写；写失败回滚为旧值（或删除 = 回默认目录）
    report({ phase: 'config' }, true)
    const configExisted = fs.existsSync(deps.configPath())
    const oldConfigRaw = configExisted ? fs.readFileSync(deps.configPath(), 'utf8') : null
    try {
      deps.writeConfig(target)
    } catch (err) {
      if (oldConfigRaw !== null) fs.writeFileSync(deps.configPath(), oldConfigRaw)
      else fs.rmSync(deps.configPath(), { force: true })
      throw err
    }

    report({ phase: 'restarting' }, true)
    deps.setDataDir(target)
    deps.startBackend()
    await deps.waitHealthy(deps.getPort(), 20_000)
    deps.markRestartingFalse()
    report({ phase: 'done' }, true)
  } catch (err) {
    const message = (err as Error)?.message || String(err)
    report({ phase: 'error', message }, true)

    // 恢复：后端应处于运行态；恢复失败则明确退出应用，不留僵尸窗口
    if (backendWasAlive && !deps.isBackendAlive()) {
      deps.setDataDir(oldDir)
      try {
        deps.startBackend()
        await deps.waitHealthy(deps.getPort(), 20_000)
        deps.markRestartingFalse()
      } catch (recoverErr) {
        console.error('[migrate] 恢复后端失败:', recoverErr)
        dialog.showErrorBox('火宝短剧', `存储迁移失败且恢复后台服务失败，应用即将关闭。\n原始错误：${message}`)
        app.quit()
        return
      }
    } else {
      deps.markRestartingFalse()
    }
    throw err
  }
}
