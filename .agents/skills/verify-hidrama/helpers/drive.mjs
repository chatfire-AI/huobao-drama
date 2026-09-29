#!/usr/bin/env node
/**
 * Minimal Chrome DevTools Protocol driver for this repo's verification skill.
 *
 * Launches an isolated headless Chrome, runs a steps module against the real app,
 * captures screenshots, then always closes the browser (also on a failed step).
 *
 *   node .agents/skills/verify-hidrama/helpers/drive.mjs <steps.mjs> [stepArgs...]
 *
 * Environment:
 *   BASE      frontend origin            (default http://localhost:3013)
 *   EVIDENCE  screenshot directory       (default .verification/evidence)
 *   RUN       scratch directory          (default .verification/run)
 *   CHROME    Chrome binary              (default the macOS install)
 *
 * A steps module default-exports `async ({ page, shot, log, base, evidence }) => {...}`.
 * `page` exposes: goto, waitFor, waitForGone, waitForText, click, domClick, type,
 * pick, key, text, count, evaluate, errors, sleep. `shot(name)` writes a PNG.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE || 'http://localhost:3013'
const EVIDENCE = path.resolve(process.env.EVIDENCE || '.verification/evidence')
const RUN = path.resolve(process.env.RUN || '.verification/run')
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = Number(process.env.CHROME_PORT || 9333)
const VIEWPORT = { width: 1440, height: 900 }

const stepsFile = process.argv[2]
if (!stepsFile) {
  console.error('usage: drive.mjs <steps.mjs> [stepArgs...]')
  process.exit(2)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------- Chrome ---------- */

async function launchChrome() {
  if (!fs.existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME} (set CHROME=...)`)
  const profile = path.join(RUN, 'chrome-profile')
  fs.mkdirSync(profile, { recursive: true })
  const child = spawn(
    CHROME,
    [
      '--headless',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      '--hide-scrollbars',
      'about:blank',
    ],
    { stdio: 'ignore', detached: true },
  )
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return child
    } catch { /* not up yet */ }
    await sleep(150)
  }
  throw new Error(`Chrome did not open a debug port on ${PORT}`)
}

async function openTarget() {
  const url = `http://127.0.0.1:${PORT}/json/new?about:blank`
  let res = await fetch(url, { method: 'PUT' })
  if (!res.ok) res = await fetch(url) // older Chrome allows GET
  if (!res.ok) throw new Error(`cannot open a tab: ${res.status}`)
  return (await res.json()).webSocketDebuggerUrl
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let nextId = 0
  const pending = new Map()
  const listeners = new Map()
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve())
    ws.addEventListener('error', (e) => reject(new Error(`websocket error: ${e.message || 'unknown'}`)))
  })
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id !== undefined) {
      const p = pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      msg.error ? p.reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? '')})`)) : p.resolve(msg.result)
      return
    }
    for (const fn of listeners.get(msg.method) || []) fn(msg.params)
  })
  return {
    ready,
    send(method, params = {}) {
      const id = ++nextId
      ws.send(JSON.stringify({ id, method, params }))
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
    },
    on(method, fn) {
      listeners.set(method, [...(listeners.get(method) || []), fn])
    },
    close: () => ws.close(),
  }
}

/* ---------- Page ---------- */

function makePage(cdp) {
  const problems = []

  async function evaluate(expression) {
    const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
      expression: `(() => { ${expression} })()`,
      returnByValue: true,
      awaitPromise: true,
    })
    if (exceptionDetails) throw new Error(`page error: ${exceptionDetails.exception?.description || exceptionDetails.text}`)
    return result.value
  }

  const boxOf = (sel) => evaluate(`
    const el = document.querySelector(${JSON.stringify(sel)})
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (!r.width && !r.height) return null
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  `)

  const page = {
    evaluate,
    sleep,

    async goto(url, sel) {
      await cdp.send('Page.navigate', { url: url.startsWith('http') ? url : BASE + url })
      if (sel) await page.waitFor(sel)
      else await sleep(600)
    },

    async waitFor(sel, timeout = 20000) {
      const until = Date.now() + timeout
      while (Date.now() < until) {
        if (await evaluate(`return !!document.querySelector(${JSON.stringify(sel)})`)) return true
        await sleep(200)
      }
      throw new Error(`timed out waiting for ${sel}\n  url: ${await evaluate('return location.href')}`)
    },

    async waitForGone(sel, timeout = 20000) {
      const until = Date.now() + timeout
      while (Date.now() < until) {
        if (!(await evaluate(`return !!document.querySelector(${JSON.stringify(sel)})`))) return true
        await sleep(200)
      }
      throw new Error(`timed out waiting for ${sel} to disappear`)
    },

    async waitForText(sel, text, timeout = 15000) {
      const until = Date.now() + timeout
      while (Date.now() < until) {
        const found = await evaluate(`
          return [...document.querySelectorAll(${JSON.stringify(sel)})]
            .some(el => (el.textContent || '').includes(${JSON.stringify(text)}))
        `)
        if (found) return true
        await sleep(200)
      }
      throw new Error(`timed out waiting for ${text} inside ${sel}`)
    },

    /** Real mouse click at the element's centre, through the same input path a user hits. */
    async click(sel, timeout = 15000) {
      const until = Date.now() + timeout
      let box = null
      while (Date.now() < until) {
        box = await boxOf(sel)
        if (box) break
        await sleep(200)
      }
      if (!box) throw new Error(`no visible element for ${sel}`)
      for (const type of ['mousePressed', 'mouseReleased']) {
        await cdp.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 })
      }
      await sleep(150)
    },

    /** Escape hatch: DOM click. Bypasses pointer interception, so not proof of a user path. */
    domClick(sel) {
      return evaluate(`
        const el = document.querySelector(${JSON.stringify(sel)})
        if (!el) throw new Error('no element: ' + ${JSON.stringify(sel)})
        el.click()
      `)
    },

    /** Click the first element matching `sel` whose trimmed text equals `text`. */
    async clickText(sel, text) {
      const ok = await evaluate(`
        const el = [...document.querySelectorAll(${JSON.stringify(sel)})]
          .find(e => (e.textContent || '').trim() === ${JSON.stringify(text)})
        if (!el) return false
        el.setAttribute('data-verify-hit', '')
        return true
      `)
      if (!ok) throw new Error(`no ${sel} with text "${text}"`)
      await page.click('[data-verify-hit]')
      await evaluate(`document.querySelector('[data-verify-hit]')?.removeAttribute('data-verify-hit')`)
    },

    /** Fill a v-model input the way typing does: set the value, then fire `input`. */
    async type(sel, text) {
      await page.waitFor(sel)
      await evaluate(`
        const el = document.querySelector(${JSON.stringify(sel)})
        el.focus()
        el.value = ${JSON.stringify(text)}
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      `)
      await sleep(120)
    },

    /** Open a BaseSelect trigger and click the option with this label. */
    async pick(triggerSel, optionText) {
      await page.click(triggerSel)
      await page.waitFor('.app-menu-item')
      await page.clickText('.app-menu-item', optionText)
      await sleep(200)
    },

    async key(keyName) {
      for (const type of ['keyDown', 'keyUp']) {
        await cdp.send('Input.dispatchKeyEvent', { type, key: keyName, code: keyName, windowsVirtualKeyCode: keyName === 'Escape' ? 27 : 0 })
      }
      await sleep(300)
    },

    text: (sel) => evaluate(`
      const el = document.querySelector(${JSON.stringify(sel)})
      return el ? (el.textContent || '').trim() : null
    `),

    count: (sel) => evaluate(`return document.querySelectorAll(${JSON.stringify(sel)}).length`),

    body: () => evaluate(`return document.body.innerText`),

    /** Page-level failures seen so far: uncaught exceptions and console errors. */
    errors: () => problems,
    clearErrors: () => { problems.length = 0 },
  }

  cdp.on('Runtime.exceptionThrown', (p) => {
    problems.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'exception')
  })
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (p.type !== 'error') return
    problems.push((p.args || []).map((a) => a.value ?? a.description ?? a.type).join(' '))
  })

  return page
}

/* ---------- run ---------- */

let chrome
try {
  fs.mkdirSync(EVIDENCE, { recursive: true })
  chrome = await launchChrome()
  const cdp = connect(await openTarget())
  await cdp.ready
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 2, mobile: false })

  const page = makePage(cdp)
  const shots = []
  const shot = async (name) => {
    const file = path.join(EVIDENCE, name.endsWith('.png') ? name : `${name}.png`)
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    shots.push(file)
    console.log(`  shot  ${path.relative(process.cwd(), file)}`)
    return file
  }
  const log = (msg) => console.log(`  ${msg}`)

  const steps = (await import(path.resolve(stepsFile))).default
  await steps({ page, shot, log, base: BASE, evidence: EVIDENCE, args: process.argv.slice(3) })

  const problems = page.errors()
  if (problems.length) {
    console.log(`\n  page errors (${problems.length}):`)
    for (const p of problems.slice(0, 10)) console.log(`    - ${p.split('\n')[0]}`)
  }
  console.log(`\n  PASS  ${shots.length} screenshot(s) in ${path.relative(process.cwd(), EVIDENCE)}`)
} catch (err) {
  console.error(`\n  FAIL  ${err.message}`)
  process.exitCode = 1
} finally {
  if (chrome?.pid) {
    try { process.kill(-chrome.pid, 'SIGTERM') } catch { try { chrome.kill('SIGTERM') } catch { /* gone */ } }
  }
}
