import * as http from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'

/** 每次探测都有独立的硬截止时间，包含连接成功但服务端一直不回包的情况。 */
function probeHealth(port: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port, path: '/api/v1/health', agent: false }, response => {
      response.resume()
      if (response.statusCode === 200) finish()
      else finish(new Error(`Health HTTP ${response.statusCode}`))
    })
    const timer = setTimeout(() => {
      const error = new Error('Health request timed out')
      request.destroy(error)
      finish(error)
    }, timeoutMs)
    let finished = false
    function finish(error?: Error) {
      if (finished) return
      finished = true
      clearTimeout(timer)
      if (error) reject(error)
      else resolve()
    }
    request.on('error', finish)
  })
}

export async function waitForBackend(port: number, timeoutMs = 60_000, shouldStop = () => false): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError = ''
  while (Date.now() < deadline) {
    if (shouldStop()) throw new Error('启动已取消')
    try {
      await probeHealth(port, Math.min(1000, Math.max(1, deadline - Date.now())))
      return
    } catch (error) { lastError = (error as Error).message }
    const remaining = deadline - Date.now()
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, Math.min(300, remaining)))
  }
  throw new Error(`后台服务在 ${Math.round(timeoutMs / 1000)} 秒内未就绪：${lastError}`)
}

export function redactStartupLog(value: unknown): string {
  return String(value instanceof Error ? value.stack || value.message : value)
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL omitted]')
    .replace(/(Bearer\s+)\S+/gi, '$1[redacted]')
    .replace(/((?:api[_-]?key|signature|token|secret)\s*["']?\s*[:=]\s*["']?)[^\s,"'}&]+/gi, '$1[redacted]')
    .replace(/\bsk-[\w-]+/g, '[redacted]')
}

/** 只记录启动和进程状态，不记录业务请求。保留上一份日志，写失败不影响应用。 */
export function createStartupLog(directory: string) {
  const file = path.join(directory, 'startup.log')
  try {
    fs.mkdirSync(directory, { recursive: true })
    if (fs.existsSync(file) && fs.statSync(file).size > 2 * 1024 * 1024) {
      fs.rmSync(`${file}.previous`, { force: true })
      fs.renameSync(file, `${file}.previous`)
    }
  } catch { /* 主进程失败提示仍可提供错误信息 */ }
  return {
    file,
    write(message: unknown) {
      try { fs.appendFileSync(file, `${new Date().toISOString()} ${redactStartupLog(message).slice(0, 16_384)}\n`) } catch { /* best effort */ }
    },
  }
}
