type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
}

function colorFor(level: LogLevel) {
  if (level === 'SUCCESS') return C.green
  if (level === 'WARN') return C.yellow
  if (level === 'ERROR') return C.red
  return C.cyan
}

function timeText() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

function safeValue(value: unknown) {
  if (value == null) return value
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function formatMeta(meta?: Record<string, unknown>) {
  if (!meta) return ''
  const entries = Object.entries(meta)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${safeValue(value)}`)
  return entries.length ? ` | ${entries.join(' ')}` : ''
}

export function redactUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    for (const key of ['key', 'api_key', 'apikey', 'token', 'access_token']) {
      if (url.searchParams.has(key)) {
        url.searchParams.set(key, '***')
      }
    }
    return url.toString()
  } catch {
    return rawUrl
      .replace(/([?&](?:key|api_key|apikey|token|access_token)=)[^&]+/gi, '$1***')
  }
}

function sanitizeValue(value: unknown): unknown {
  if (value == null) return value
  if (typeof value === 'string') return truncateString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item))
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      const lower = key.toLowerCase()
      if (['authorization', 'api_key', 'apikey', 'apiKey', 'token', 'access_token'].includes(key) ||
        lower.includes('authorization') || lower.includes('token') || lower.includes('apikey') || lower.includes('api_key')) {
        out[key] = '***'
        continue
      }

      if (typeof raw === 'string' && (lower === 'url' || lower.endsWith('url'))) {
        out[key] = redactUrl(raw)
        continue
      }

      if (typeof raw === 'string' && (
        lower === 'data' ||
        lower === 'b64_json' ||
        lower.includes('base64') ||
        lower.includes('audiohex') ||
        lower.includes('inline') ||
        raw.startsWith('data:image/')
      )) {
        out[key] = truncateString(raw, 48)
        continue
      }

      out[key] = sanitizeValue(raw)
    }
    return out
  }

  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}

function truncateString(value: string, edge = 120) {
  if (value.length <= edge * 2 + 24) return value
  return `${value.slice(0, edge)}...<trimmed ${value.length} chars>...${value.slice(-edge)}`
}

export function logTask(scope: string, action: string, meta?: Record<string, unknown>, level: LogLevel = 'INFO') {
  const color = colorFor(level)
  console.log(`${C.dim}${timeText()}${C.reset} ${color}[${scope}]${C.reset} ${action}${formatMeta(meta)}`)
}

export function logTaskStart(scope: string, action: string, meta?: Record<string, unknown>) {
  logTask(scope, `START ${action}`, meta, 'INFO')
}

export function logTaskProgress(scope: string, action: string, meta?: Record<string, unknown>) {
  logTask(scope, action, meta, 'INFO')
}

export function logTaskSuccess(scope: string, action: string, meta?: Record<string, unknown>) {
  logTask(scope, `DONE ${action}`, meta, 'SUCCESS')
}

export function logTaskWarn(scope: string, action: string, meta?: Record<string, unknown>) {
  logTask(scope, action, meta, 'WARN')
}

export function logTaskError(scope: string, action: string, meta?: Record<string, unknown>) {
  logTask(scope, `ERROR ${action}`, meta, 'ERROR')
}

export function logTaskPayload(scope: string, action: string, payload: unknown) {
  const sanitized = sanitizeValue(payload)
  const serialized = typeof sanitized === 'string'
    ? sanitized
    : JSON.stringify(sanitized, null, 2)
  console.log(`${C.dim}${timeText()}${C.reset} ${C.blue}[${scope}]${C.reset} ${action}\n${serialized}`)
}
