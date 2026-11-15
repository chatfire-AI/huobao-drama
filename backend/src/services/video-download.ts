import fs from 'node:fs'
import path from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { STORAGE_ROOT } from '../utils/paths.js'

export class VideoDownloadError extends Error {
  constructor(public code: string, message: string, public retryable = false) { super(message) }
}

/** 不把 API key、签名链接带到诊断文本、日志或剪贴板。 */
export function safeTaskError(error: unknown): string {
  return String(error instanceof Error ? error.message : error || 'Unknown failure')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL omitted]')
    .replace(/(Bearer\s+)\S+/gi, '$1[redacted]')
    .replace(/((?:api[_-]?key|signature|token|secret)\s*["']?\s*[:=]\s*["']?)[^\s,"'}&]+/gi, '$1[redacted]')
    .replace(/\bsk-[\w-]+/g, '[redacted]')
    .slice(0, 600)
}

/** 下载到临时文件，校验容器头后原子改名；同任务重复恢复不会新增媒体文件。 */
export async function downloadVideo(url: string, taskId: number, options: {
  root?: string; attempts?: number; timeoutMs?: number; retryDelayMs?: number; maxBytes?: number
} = {}): Promise<string> {
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new VideoDownloadError('download_url', 'Invalid video URL protocol')
  const root = options.root ?? STORAGE_ROOT
  const dir = path.join(root, 'videos')
  await fs.promises.mkdir(dir, { recursive: true })
  const partial = path.join(dir, `task-${taskId}.part`)
  const attempts = options.attempts ?? 3
  const maxBytes = options.maxBytes ?? 512 * 1024 * 1024
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const signal = AbortSignal.timeout(options.timeoutMs ?? 120_000)
      const resp = await fetch(url, { signal })
      if (!resp.ok) {
        await resp.body?.cancel()
        throw new VideoDownloadError('download_http', `Video download HTTP ${resp.status}`, [408, 429].includes(resp.status) || resp.status >= 500)
      }
      if (Number(resp.headers.get('content-length')) > maxBytes) {
        await resp.body?.cancel()
        throw new VideoDownloadError('download_size', 'Video exceeds download size limit')
      }
      if (!resp.body) throw new VideoDownloadError('download_empty', 'Empty video response', true)
      let bytes = 0
      let head = Buffer.alloc(0)
      const validator = new Transform({ transform(chunk, _encoding, callback) {
        bytes += chunk.length
        if (head.length < 16) head = Buffer.concat([head, chunk.subarray(0, 16 - head.length)])
        if (bytes > maxBytes) return callback(new VideoDownloadError('download_size', 'Video exceeds download size limit'))
        callback(null, chunk)
      } })
      await pipeline(Readable.fromWeb(resp.body as any), validator, fs.createWriteStream(partial), { signal })
      const mp4 = head.length >= 12 && head.toString('ascii', 4, 8) === 'ftyp'
      const webm = head.length >= 4 && head.readUInt32BE(0) === 0x1a45dfa3
      if (!mp4 && !webm) throw new VideoDownloadError('download_format', 'Response is not an MP4 or WebM video')
      const name = `task-${taskId}.${webm ? 'webm' : 'mp4'}`
      await fs.promises.rename(partial, path.join(dir, name))
      return `static/videos/${name}`
    } catch (error) {
      await fs.promises.rm(partial, { force: true })
      const retryable = error instanceof VideoDownloadError ? error.retryable
        : error instanceof TypeError || ['TimeoutError', 'AbortError'].includes((error as Error).name)
      if (!retryable || attempt === attempts - 1) throw error
      await new Promise(resolve => setTimeout(resolve, (options.retryDelayMs ?? 1000) * 2 ** attempt))
    }
  }
  throw new VideoDownloadError('download_failed', 'Video download failed')
}
