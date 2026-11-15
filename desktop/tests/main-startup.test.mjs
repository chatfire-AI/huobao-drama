import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const code = fs.readFileSync(new URL('../dist/main.js', import.meta.url), 'utf8')

async function boot(mode = 'pending', options = {}) {
  const windows = [], errors = [], logs = [], timers = new Map()
  let requests = 0, forks = 0, now = 0, timerId = 0, forkArgs = null
  const app = new EventEmitter()
  Object.assign(app, { isPackaged: true, getPath: () => '/mock/user', setPath() {}, getVersion: () => 'test', requestSingleInstanceLock: () => true, whenReady: () => Promise.resolve(), quit() { app.emit('before-quit') } })
  class Window extends EventEmitter {
    constructor(options) {
      super(); this.visible = options.show !== false; this.options = options; this.destroyed = false
      this.webContents = new EventEmitter(); this.webContents.setWindowOpenHandler = () => {}; windows.push(this)
    }
    show() { this.visible = true }
    focus() { this.focused = true }
    isMinimized() { return false }
    isDestroyed() { return this.destroyed }
    loadFile(file) { this.loadedFile = file; return Promise.resolve() }
    loadURL(url) { this.loadedURL = url; return mode === 'page-failure' ? Promise.reject(new Error('ERR_CONNECTION_RESET')) : Promise.resolve() }
  }
  const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.kill = () => {}
  const electron = { app, BrowserWindow: Window, dialog: { showErrorBox: (...args) => errors.push(args) }, ipcMain: { handle() {} }, shell: {}, utilityProcess: { fork(...args) { forks++; forkArgs = args; return child } } }
  const childProcess = { execFile(_file, _args, _options, callback) {
    queueMicrotask(() => options.shortPath
      ? callback(null, options.shortPath, '')
      : callback(new Error('short path unavailable'), '', ''))
  } }
  const filesystem = { existsSync: p => !/storage-config|template-version|startup.log/.test(p), mkdirSync() {}, cpSync() {}, writeFileSync() {}, appendFileSync: (_p, s) => logs.push(s) }
  const fakeProcess = new EventEmitter()
  Object.assign(fakeProcess, { platform: 'win32', arch: 'x64', env: {}, versions: { electron: '37.10.3' }, pid: 123, resourcesPath: options.resourcesPath || '/mock/resources', stdout: new EventEmitter(), stderr: new EventEmitter() })
  fakeProcess.stdout.write = fakeProcess.stderr.write = () => true
  const net = { createServer() { const s = new EventEmitter(); s.listen = (_p, _h, fn) => fn(); s.address = () => ({port: 43210}); s.close = fn => fn(); return s } }
  const http = { get(_opts, callback) {
    requests++
    const request = new EventEmitter(); request.destroy = err => request.emit('error', err)
    if (mode !== 'pending') queueMicrotask(() => callback({ statusCode: 200, resume() {} }))
    return request
  } }
  const context = vm.createContext({ require: name => name === 'electron' ? electron : name === 'node:child_process' ? childProcess : /^(node:)?fs$/.test(name) ? filesystem : /^(node:)?net$/.test(name) ? net : name === 'node:http' ? http : require(name),
    process: fakeProcess, __dirname: '/mock/resources/app.asar/dist', module: {exports:{}}, exports: {}, console: {log(){},warn(){},error(){}}, Buffer, URL,
    Date: class extends Date { static now() { return now } },
    setTimeout: (fn, ms) => { const t = { id: ++timerId, at: now + ms, fn, unref() {} }; timers.set(t.id,t); return t },
    clearTimeout: t => timers.delete(t?.id),
  })
  vm.runInContext(code, context)
  async function flush() { for(let i=0;i<50;i++) await Promise.resolve() }
  await flush()
  return { windows, errors, logs, app, child, requests: () => requests, forks: () => forks, forkArgs: () => forkArgs, flush,
    async expireHealth() { now=60_001; for(const t of [...timers.values()]) if(t.at <= now && t.at <= 1000) {timers.delete(t.id);t.fn()} await flush() } }
}

test('startup window is visible while health check hangs; deadline yields one actionable error', async () => {
  const p=await boot(); assert.equal(p.forks(),1); assert.equal(p.requests(),1)
  assert.equal(p.windows.length,1); assert.equal(p.windows[0].visible,true)
  assert.match(p.windows[0].loadedFile,/starting.html$/)
  await p.expireHealth()
  assert.equal(p.errors.length,1); assert.match(p.errors[0][1],/startup.log/)
})
test('successful page load shows window without ready-to-show and a second launch unhides it', async () => {
  const p=await boot('healthy'); assert.match(p.windows[0].loadedURL,/127.0.0.1:43210/)
  assert.equal(p.windows[0].visible,true)
  p.windows[0].visible=false; p.app.emit('second-instance')
  assert.equal(p.windows[0].visible,true); assert.equal(p.windows[0].focused,true); assert.equal(p.errors.length,0)
})
test('backend early exit reports once and includes startup stderr and log location', async () => {
  const p=await boot(); p.child.stderr.emit('data',Buffer.from('Cannot load native module'))
  p.child.emit('exit',1); await p.expireHealth()
  assert.equal(p.errors.length,1); assert.match(p.errors[0][1],/Cannot load native module/)
  assert.ok(p.logs.some(s=>s.includes('backend exited')))
})
test('page load failure reports a visible error instead of leaving a hidden window', async () => {
  const p=await boot('page-failure'); assert.equal(p.errors.length,1)
  assert.match(p.errors[0][1],/ERR_CONNECTION_RESET/)
})
test('non-ASCII Windows install resources use one short path for backend and media tools', async () => {
  const shortPath = 'C:\\HUOBAO~1\\resources'
  const p = await boot('healthy', {
    resourcesPath: 'C:\\用户\\HuobaoDrama\\resources',
    shortPath,
  })
  assert.ok(p.forkArgs()[0].startsWith(shortPath))
  assert.ok(p.forkArgs()[2].env.FFMPEG_BIN.startsWith(shortPath))
  assert.ok(p.forkArgs()[2].env.FFPROBE_BIN.startsWith(shortPath))
  assert.ok(p.forkArgs()[2].env.FRONTEND_DIST.startsWith(shortPath))
  assert.equal(p.errors.length, 0)
})
test('closing while backend starts cancels silently', async () => {
  const p=await boot(); p.app.quit(); await p.expireHealth(); assert.equal(p.errors.length,0)
})
