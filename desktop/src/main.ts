/**
 * Electron 主进程 — 桌面壳
 *
 * 职责：显示启动页 → 读存储配置 / 取空闲端口 → 准备数据与 workspace →
 * utilityProcess.fork 拉起后端 → 有截止时间的健康检查 → 窗口切入应用页面。
 * 后端与窗口同源（http://127.0.0.1:<port>），前端全部相对路径，无 CORS 问题。
 *
 * 后端可重启（startBackend）：存储位置迁移 = 停后端 → 搬文件 → 换 currentDataDir →
 * 重启后端（见 migrate.ts）；backendRestarting 期间抑制「异常退出」弹窗。
 */
import { app, BrowserWindow, dialog, ipcMain, shell, utilityProcess } from 'electron'
import type { UtilityProcess } from 'electron'
import * as net from 'net'
import * as fs from 'fs'
import * as fsp from 'fs/promises'
import * as path from 'path'
import { registerMigrationIpc } from './migrate'
import { registerUpdater, markQuitting } from './updater'
import { createStartupLog, redactStartupLog, waitForBackend } from './startup'
import { resolveRuntimeResources } from './runtime-resources'

// 主进程打 CJS 产物，__dirname 天然可用（import.meta.url 在 CJS 下为 undefined）
declare const __dirname: string
// desktop/dist → desktop 根
const DESKTOP_ROOT = path.resolve(__dirname, '..')
// dev 模式下仓库各目录
const REPO_ROOT = path.resolve(DESKTOP_ROOT, '..')
const BACKEND_BUNDLE = path.join(DESKTOP_ROOT, 'build', 'backend.mjs')
let backendBundle = BACKEND_BUNDLE
let runtimeResourcesDir = ''

/** workspace 模板版本：内置模板更新时递增，触发向用户目录补缺失文件 */
const TEMPLATE_VERSION = '4'
const STORAGE_CONFIG_FILE = 'storage-config.json'

let mainWindow: BrowserWindow | null = null
let backend: UtilityProcess | null = null
let quitting = false
let backendRestarting = false
let backendPort = 0
let currentDataDir = ''
let backendReady = false
let fatalReported = false
let backendStartupTail = ''

// userData 显式按模式区分：打包版 / dev 版互不干扰（数据库、上传文件、单实例锁均隔离），
// 不依赖 package.json 命名（打包后与 dev 同名会导致单实例锁误杀）
const userDataDir = path.join(
  app.getPath('appData'),
  app.isPackaged ? 'HuobaoDrama' : 'HuobaoDrama-Dev',
)
try {
  fs.mkdirSync(userDataDir, { recursive: true })
  app.setPath('userData', userDataDir)
} catch (error) {
  dialog.showErrorBox('火宝短剧启动失败', `无法准备用户目录：${userDataDir}\n${(error as Error).message}`)
  app.exit(1)
}

const startupLog = createStartupLog(path.join(app.getPath('userData'), 'logs'))
startupLog.write(`launch version=${app.getVersion()} platform=${process.platform} arch=${process.arch} electron=${process.versions.electron} pid=${process.pid}`)

function failStartup(error: unknown) {
  if (fatalReported || quitting) return
  fatalReported = true
  const message = redactStartupLog(error instanceof Error ? error.message : error)
  startupLog.write(`fatal: ${error instanceof Error ? error.stack : error}`)
  showMainWindow()
  dialog.showErrorBox('火宝短剧启动失败', `${message}\n\n启动日志：${startupLog.file}\n请将此日志发给技术支持，无需删除项目数据。`)
  app.quit()
}
process.on('uncaughtException', failStartup)
process.on('unhandledRejection', failStartup)
app.on('child-process-gone', (_event, details) => {
  startupLog.write(`child-process-gone: ${JSON.stringify(details)}`)
})

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

// 从终端启动时若父进程管道关闭（如 `| head` 退出/终端关闭），转发后端日志会写出
// EPIPE 且属于异步回调抛出，try/catch 拦不住，会弹 "write EPIPE" 未捕获异常框
process.stdout.on('error', () => {})
process.stderr.on('error', () => {})

if (!app.requestSingleInstanceLock()) {
  // 双开会抢 SQLite 写锁；让已有实例聚焦窗口即可
  startupLog.write('second launch: handing off to existing instance')
  app.quit()
} else {
  app.on('second-instance', () => {
    startupLog.write('second-instance: showing existing window')
    showMainWindow()
  })
  app.on('activate', showMainWindow)
  // utilityProcess 要求 app ready 之后才能创建
  app.whenReady().then(bootstrap).catch(failStartup)
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address() as net.AddressInfo
      srv.close(() => resolve(addr.port))
    })
    srv.on('error', reject)
  })
}

async function waitHealthy(port: number, timeoutMs = 60_000): Promise<void> {
  await waitForBackend(port, timeoutMs, () => quitting || fatalReported)
  backendReady = true
}

// ---- 存储配置（userData/storage-config.json，必须在数据目录之外） ----

function storageConfigPath(): string {
  return path.join(app.getPath('userData'), STORAGE_CONFIG_FILE)
}

/**
 * 读存储配置，返回当前数据目录。容错链：文件不存在→默认；解析失败/非法→warn+默认
 * （不改写坏文件，保留现场）；目录创建失败（盘不在/权限）→warn+默认。永不阻断启动。
 */
function loadStorageConfig(): string {
  const fallback = path.join(app.getPath('userData'), 'data')
  const file = storageConfigPath()
  if (!fs.existsSync(file)) return fallback
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    const dir = parsed?.dataDir
    if (typeof dir !== 'string' || !path.isAbsolute(dir)) throw new Error('dataDir 非绝对路径')
    fs.mkdirSync(dir, { recursive: true })
    return dir
  } catch (err) {
    console.warn(`[main] ${STORAGE_CONFIG_FILE} 读取失败，回退默认数据目录: ${(err as Error).message}`)
    return fallback
  }
}

/** 原子写存储配置（tmp + rename）；仅迁移成功路径调用 */
export function writeStorageConfig(dataDir: string): void {
  const file = storageConfigPath()
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, dataDir }, null, 2))
  fs.renameSync(tmp, file)
}

/** win32 路径比较统一小写 */
export function normCase(p: string): string {
  return process.platform === 'win32' ? p.toLowerCase() : p
}

// ---- workspace 模板 ----

/**
 * workspace 模板拷贝（copy-once + 版本标记）：
 * - 目标无版本标记（首启动）或版本较旧 → 只补缺失文件，永不覆盖用户编辑
 * - 版本一致 → 跳过
 * 例外：prompts/ 随版本升级强制覆盖——prompt 与代码内 DEFAULT_PROMPTS 同源迭代
 * （设置页有「恢复默认」，且编辑场景少）；skills/ 保持只增不覆盖（可能有用户新建）
 */
function syncWorkspaceTemplate(templateDir: string, destDir: string) {
  const marker = path.join(destDir, '.template-version')
  if (fs.existsSync(marker) && fs.readFileSync(marker, 'utf8').trim() === TEMPLATE_VERSION) return
  fs.cpSync(templateDir, destDir, { recursive: true, force: false, errorOnExist: false })
  fs.cpSync(path.join(templateDir, 'prompts'), path.join(destDir, 'prompts'), { recursive: true, force: true })
  fs.writeFileSync(marker, TEMPLATE_VERSION)
}

function resolveResourceDir(): string {
  // 打包后在 resources/（extraResources）；dev 直指仓库目录
  return app.isPackaged ? process.resourcesPath : REPO_ROOT
}

// ---- 后端进程（可重启） ----

/** 停后端并等待退出（kill 后等 exit 事件，5s 超时补刀）；置 backendRestarting 抑制致命弹窗 */
function stopBackend(): Promise<void> {
  return new Promise((resolve) => {
    const cur = backend
    if (!cur) return resolve()
    backendRestarting = true
    const timer = setTimeout(() => cur.kill(), 5000)
    cur.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
    cur.kill()
  })
}

function startBackend(): void {
  backendReady = false
  backendStartupTail = ''
  const resources = runtimeResourcesDir || resolveResourceDir()
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(backendPort),
    HUOBAO_DESKTOP: '1',
    // 数据目录单一来源：重启/迁移后只需改 currentDataDir
    HUOBAO_DATA_DIR: currentDataDir,
    SQLITE_PATH: path.join(currentDataDir, 'huobao.sqlite3'),
    WORKSPACE_PATH: currentWorkspaceDir,
    FRONTEND_DIST: currentFrontendDist,
  }
  if (app.isPackaged) {
    const exe = process.platform === 'win32' ? '.exe' : ''
    env.FFMPEG_BIN = path.join(resources, 'bin', `ffmpeg${exe}`)
    env.FFPROBE_BIN = path.join(resources, 'bin', `ffprobe${exe}`)
  }

  backend = utilityProcess.fork(backendBundle, [], {
    env,
    serviceName: 'huobao-backend',
    stdio: 'pipe',
    cwd: currentDataDir,
  })
  const child = backend
  startupLog.write(`backend forked from ${backendBundle}`)
  child.on('spawn', () => startupLog.write(`backend spawned pid=${child.pid}`))
  child.stdout?.on('data', chunk => {
    process.stdout.write(`[backend] ${chunk}`)
    if (!backendReady) startupLog.write(`[backend] ${chunk}`)
  })
  child.stderr?.on('data', chunk => {
    process.stderr.write(`[backend] ${chunk}`)
    if (!backendReady) {
      const safe = redactStartupLog(String(chunk))
      backendStartupTail = (backendStartupTail + safe).slice(-3000)
      startupLog.write(`[backend stderr] ${safe}`)
    }
  })
  child.on('exit', code => {
    if (backend === child) backend = null
    startupLog.write(`backend exited code=${code} restarting=${backendRestarting}`)
    // 迁移/重启期间的退出是预期行为，由调用方接管
    if (!quitting && !backendRestarting) {
      failStartup(new Error(`后台服务异常退出（code ${code}）。${backendStartupTail ? '\n' + backendStartupTail : ''}`))
    }
  })
}

// ---- 窗口 ----

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: '火宝短剧',
    show: true,
    backgroundColor: '#f6f7fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })
  mainWindow.once('ready-to-show', showMainWindow)
  mainWindow.webContents.on('render-process-gone', (_event, details) => failStartup(new Error(`界面进程退出：${details.reason} (${details.exitCode})`)))
  mainWindow.webContents.on('unresponsive', () => startupLog.write('renderer unresponsive'))
  // 页面标题自带产品名，避免文件路径兜底标题
  mainWindow.on('page-title-updated', e => e.preventDefault())
  mainWindow.on('closed', () => { mainWindow = null })
  // 外链一律交给系统浏览器：应用内不弹新窗（如设置页「前往 api.firemux.cn 获取 Key」）
  const isAppUrl = (url: string) => {
    try { return new URL(url).origin === `http://127.0.0.1:${backendPort}` } catch { return false }
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url) && !isAppUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  // 主窗口意外导航到外部地址时同样拦下并转浏览器
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (isAppUrl(url)) return
    e.preventDefault()
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
  })
  return mainWindow.loadFile(path.join(__dirname, 'starting.html'))
}

// ---- 启动 ----

let currentWorkspaceDir = ''
let currentFrontendDist = ''

async function bootstrap() {
  try {
    await createWindow()
    if (quitting) return
    backendPort = await getFreePort()
    const userData = app.getPath('userData')
    startupLog.write(`port=${backendPort} userData=${userData}`)

    // 存储配置最先读（决定数据目录）；配置损坏时回退默认且不阻断启动
    currentDataDir = loadStorageConfig()
    fs.mkdirSync(currentDataDir, { recursive: true })

    const resources = resolveResourceDir()
    runtimeResourcesDir = app.isPackaged
      ? await resolveRuntimeResources(resources, {
        platform: process.platform,
        version: app.getVersion(),
        userDataDir: userData,
        programDataDir: process.env.ProgramData,
        log: message => startupLog.write(message),
      })
      : resources
    if (app.isPackaged) backendBundle = path.join(runtimeResourcesDir, 'app.asar', 'build', 'backend.mjs')
    const templateDir = app.isPackaged
      ? path.join(runtimeResourcesDir, 'workspace-template')
      : path.join(REPO_ROOT, 'backend', 'workspace')
    currentWorkspaceDir = app.isPackaged
      ? path.join(userData, 'workspace')
      : templateDir
    startupLog.write('preparing workspace')
    if (app.isPackaged) syncWorkspaceTemplate(templateDir, currentWorkspaceDir)

    currentFrontendDist = app.isPackaged
      ? path.join(runtimeResourcesDir, 'frontend')
      : path.join(REPO_ROOT, 'frontend', '.output', 'public')

    if (!fs.existsSync(backendBundle)) throw new Error('安装资源缺失：build/backend.mjs')
    if (!fs.existsSync(path.join(currentFrontendDist, 'index.html'))) throw new Error('安装资源缺失：frontend/index.html')
    if (quitting) return
    startBackend()
    await waitHealthy(backendPort)
    if (quitting || fatalReported || !mainWindow || mainWindow.isDestroyed()) return
    backendReady = true
    startupLog.write('backend healthy, loading application')
    await mainWindow.loadURL(`http://127.0.0.1:${backendPort}`)
    showMainWindow()
    startupLog.write('application loaded')
  } catch (err) {
    failStartup(err)
  }
}

// ---- IPC：存储位置 ----

/** 可写探针 */
async function assertWritable(dir: string): Promise<void> {
  const probe = path.join(dir, `.huobao-probe-${Date.now()}`)
  await fsp.writeFile(probe, 'probe')
  await fsp.rm(probe)
}

ipcMain.handle('huobao:pick-directory', async () => {
  if (!mainWindow) return { ok: false, error: '窗口未就绪' }
  const res = await dialog.showOpenDialog(mainWindow, {
    title: '选择数据存储目录',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true }
  const target = path.resolve(res.filePaths[0])

  // 轻校验（完整校验在迁移引擎 start-migration 时重新执行）
  const a = normCase(path.resolve(currentDataDir))
  const b = normCase(target)
  if (b === a) return { ok: false, error: '不能选择当前数据目录' }
  if (b.startsWith(a + path.sep)) return { ok: false, error: '目标目录在当前数据目录内部' }
  if (a.startsWith(b + path.sep)) return { ok: false, error: '目标目录是当前数据目录的上级目录' }
  try {
    await assertWritable(target)
  } catch {
    return { ok: false, error: '目标目录不可写' }
  }

  let freeBytes: number | null = null
  try {
    const st = await fsp.statfs(target)
    freeBytes = st.bavail * st.bsize
  } catch { /* statfs 不可用时跳过剩余空间展示 */ }
  return { ok: true, path: target, freeBytes }
})

// 存储迁移 IPC（校验/搬移/重启序列见 migrate.ts）
const migrationDeps = {
  getWindow: () => mainWindow,
  getDataDir: () => currentDataDir,
  setDataDir: (d: string) => { currentDataDir = d },
  getPort: () => backendPort,
  isBackendAlive: () => backend !== null,
  stopBackend,
  startBackend,
  waitHealthy,
  markRestartingFalse: () => { backendRestarting = false },
  writeConfig: writeStorageConfig,
  configPath: storageConfigPath,
  normCase,
}
registerMigrationIpc(migrationDeps)
registerUpdater(() => mainWindow)

app.on('before-quit', () => {
  quitting = true
  markQuitting()
  backend?.kill()
})

app.on('window-all-closed', () => {
  app.quit()
})
