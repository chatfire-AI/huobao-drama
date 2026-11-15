/**
 * 应用内更新器（无 Apple 签名方案，同 Tauri updater 思路）
 *
 * - 清单：HUOBAO_UPDATE_FEED；未设置时双源 —— 国内 COS 优先，GitHub Releases 兜底
 *   （两个源返回同一份清单结构，仅下载 URL 域名不同，见 desktop/scripts/publish-release.mjs）
 * - macOS：下载 zip（.app 归档）→ sha256 校验 → 解压 → 旧包改名 .old 备胎 → 新包就位
 *   → `open` 拉起新应用 → 当前实例退出；下次启动清理 .old
 * - Windows：下载 Setup.exe → sha256 校验 → detached 静默安装（/S）→ 当前实例退出
 * - 未打包（dev）模式整体禁用
 */
import { app, ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as fsp from 'fs/promises'
import * as path from 'path'
import crypto from 'crypto'
import { spawn, execFile } from 'child_process'

// 双源：COS（国内直连）优先，GitHub（海外）兜底；HUOBAO_UPDATE_FEED 可整体覆盖
const FEED_URLS = process.env.HUOBAO_UPDATE_FEED
  ? [process.env.HUOBAO_UPDATE_FEED]
  : [
    'https://installer.firemux.site/huobao-drama/latest.json',
    'https://github.com/chatfire-AI/huobao-drama/releases/latest/download/latest.json',
  ]

export interface UpdateState {
  status: 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'downloaded' | 'error'
  currentVersion: string
  latestVersion?: string
  notes?: string
  error?: string
  downloadProgress?: number
  downloadedFile?: string
}

let state: UpdateState = { status: 'idle', currentVersion: '' }
let mainWindow: () => BrowserWindow | null

function sendProgress(percent: number) {
  state.downloadProgress = percent
  mainWindow()?.webContents.send('huobao:update-progress', percent)
}

function setState(patch: Partial<UpdateState>) {
  state = { ...state, ...patch }
}

// ---- 工具 ----

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
  const pb = b.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0)
  }
  return 0
}

async function sha256(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    fs.createReadStream(file)
      .on('data', chunk => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject)
  })
}

/** 当前运行的是哪个架构键（与 latest.json 的 platforms 键一致） */
function platformKey(): string {
  return `${process.platform}-${process.arch}`
}

/** 已安装 app 的 .app 路径（仅 macOS、打包态有效） */
function installedAppBundle(): string {
  // process.execPath = .../HuobaoDrama.app/Contents/MacOS/HuobaoDrama
  return path.resolve(path.dirname(process.execPath), '..', '..')
}

async function fetchFeed(): Promise<{ version: string, notes?: string, platforms: Record<string, { url: string, sha256: string, size?: number }> }> {
  let lastError: unknown
  for (const url of FEED_URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const feed = await res.json()
      if (!feed?.version || !feed?.platforms) throw new Error('版本清单格式不正确')
      return feed
    } catch (err) {
      lastError = err
    }
  }
  throw new Error(`版本清单请求失败（已尝试 ${FEED_URLS.length} 个源）：${(lastError as Error)?.message ?? ''}`)
}

// ---- 检查 ----

async function doCheck(): Promise<UpdateState> {
  if (!app.isPackaged) {
    setState({ status: 'error', error: '开发模式不支持更新' })
    return state
  }
  setState({ status: 'checking', error: undefined })
  try {
    const feed = await fetchFeed()
    const latestVersion = feed.version.replace(/^v/, '')
    setState({
      status: compareVersions(latestVersion, app.getVersion()) > 0 ? 'available' : 'up-to-date',
      latestVersion,
      notes: feed.notes,
      error: undefined,
    })
  } catch (err) {
    setState({ status: 'error', error: (err as Error).message })
  }
  return state
}

// ---- 下载 ----

async function doDownload(): Promise<UpdateState> {
  if (state.status !== 'available' && state.status !== 'downloaded') {
    throw new Error('当前没有可下载的更新')
  }
  const feed = await fetchFeed()
  const asset = feed.platforms[platformKey()]
  if (!asset) throw new Error(`暂未提供 ${platformKey()} 平台的更新包`)

  setState({ status: 'downloading', downloadProgress: 0 })
  // 大文件下载不设整体超时（progress 由流驱动）；网络中断会触发 fetch 异常走 error
  const res = await fetch(asset.url)
  if (!res.ok || !res.body) throw new Error(`更新包下载失败（HTTP ${res.status}）`)

  const total = asset.size || Number(res.headers.get('content-length')) || 0
  const dir = path.join(app.getPath('temp'), 'huobao-update')
  await fsp.mkdir(dir, { recursive: true })
  const fileName = decodeURIComponent(asset.url.split('/').pop() || `update-${Date.now()}`)
  const dest = path.join(dir, fileName)

  let received = 0
  let lastReport = 0
  const out = fs.createWriteStream(dest)
  const reader = res.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    if (!out.write(Buffer.from(value))) {
      await new Promise<void>(r => out.once('drain', r))
    }
    const now = Date.now()
    if (total && now - lastReport > 200) {
      lastReport = now
      sendProgress(Math.min(99, Math.round((received / total) * 100)))
    }
  }
  out.end()
  await new Promise<void>((resolve, reject) => {
    out.on('finish', resolve)
    out.on('error', reject)
  })

  // 完整性校验
  const actual = await sha256(dest)
  if (asset.sha256 && actual !== asset.sha256) {
    await fsp.rm(dest, { force: true })
    throw new Error('更新包校验失败（sha256 不匹配），已取消安装')
  }

  setState({ status: 'downloaded', downloadProgress: 100, downloadedFile: dest })
  sendProgress(100)
  return state
}

// ---- 安装（成功后当前实例退出，不会返回） ----

/** 把换包阶段的原始错误转成可行动的中文提示（EPERM 是最常见：macOS「App 管理」隐私权限） */
function describeApplyError(err: unknown): string {
  const e = err as NodeJS.ErrnoException
  if (e?.code === 'EPERM' || e?.code === 'EACCES') {
    return `系统权限不足（${e.code}）：请在 系统设置 → 隐私与安全性 → App 管理 中允许 HuobaoDrama 后重试；或下载最新 dmg 覆盖安装（数据不受影响）`
  }
  if (e?.code === 'EROFS') {
    return '应用正运行在只读位置（可能直接在 dmg 挂载卷里），请先把 HuobaoDrama 拖入「应用程序」再更新'
  }
  return e?.message || String(err)
}

async function doApply(): Promise<void> {
  if (state.status !== 'downloaded' || !state.downloadedFile) {
    // 兜底：直接查询 temp 里的最新产物
    throw new Error('请先下载更新')
  }
  const downloaded = state.downloadedFile

  if (process.platform === 'darwin') {
    const bundle = installedAppBundle()
    const tmpExtract = path.join(app.getPath('temp'), `huobao-update-extract-${Date.now()}`)
    try {
      await new Promise<void>((resolve, reject) => {
        execFile('unzip', ['-q', '-o', downloaded, '-d', tmpExtract], err => (err ? reject(err) : resolve()))
      })
      const newApp = path.join(tmpExtract, 'HuobaoDrama.app')
      if (!fs.existsSync(newApp)) throw new Error('更新包内容异常（未找到 HuobaoDrama.app）')

      const oldBundle = `${bundle}.old`
      fs.rmSync(oldBundle, { recursive: true, force: true })
      fs.renameSync(bundle, oldBundle)
      try {
        fs.renameSync(newApp, bundle)
      } catch (err) {
        // 就位失败：旧包回滚
        fs.renameSync(oldBundle, bundle)
        throw err
      }
      // detached 拉起新应用后当前实例退出；下次启动清理 .old 备胎
      spawn('open', [bundle], { detached: true, stdio: 'ignore' }).unref()
      app.quit()
      return
    } catch (err) {
      throw new Error(describeApplyError(err))
    } finally {
      // 任何失败路径都不能留解压残留（旧实现 rename 失败时会泄漏整个 .app）
      fs.rmSync(tmpExtract, { recursive: true, force: true })
    }
  }

  if (process.platform === 'win32') {
    // NSIS 静默安装：detached 拉起安装器后退出当前实例
    spawn(downloaded, ['/S'], { detached: true, stdio: 'ignore' }).unref()
    app.quit()
    return
  }

  throw new Error(`不支持的平台: ${process.platform}`)
}

// ---- 注册 ----

export function registerUpdater(getWindow: () => BrowserWindow | null): void {
  mainWindow = getWindow
  state.currentVersion = app.getVersion()

  ipcMain.handle('huobao:update-state', () => state)
  ipcMain.handle('huobao:update-check', () => doCheck())
  ipcMain.handle('huobao:update-download', async () => {
    try {
      return await doDownload()
    } catch (err) {
      setState({ status: 'error', error: (err as Error).message })
      throw err
    }
  })
  ipcMain.handle('huobao:update-apply', async () => {
    try {
      await doApply()
    } catch (err) {
      // 写入状态让渲染层错误行显示具体原因（否则用户只看到笼统的「安装失败」toast）
      setState({ status: 'error', error: (err as Error).message })
      throw err
    }
  })

  // 启动后静默检查一次（发现新版时渲染层经 update-state 轮询/toast 提示）
  setTimeout(() => { if (!quittingApp()) void doCheck() }, 20_000).unref?.()

  // 清理上次更新留下的旧包备胎。延后 3s：更新后首次启动时旧实例可能仍在退出，
  // 立即删除可能与其收尾写入竞争；失败不阻断（下次启动会再试）
  if (app.isPackaged && process.platform === 'darwin') {
    setTimeout(() => {
      const oldBundle = `${installedAppBundle()}.old`
      try {
        if (fs.existsSync(oldBundle)) fs.rmSync(oldBundle, { recursive: true, force: true })
      } catch { /* 残留留给下次启动重试 */ }
    }, 3000).unref?.()
  }
}

function quittingApp(): boolean {
  // updater 自身无 quitting 状态，避免循环依赖：main 设置 global 注入
  return (globalThis as { __huobaoQuitting?: boolean }).__huobaoQuitting === true
}

/** main.ts 在 before-quit 时调用 */
export function markQuitting(): void {
  ;(globalThis as { __huobaoQuitting?: boolean }).__huobaoQuitting = true
}
