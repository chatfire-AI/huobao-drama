/**
 * 火山引擎豆包语音合成 Adapter（HTTP Chunked 单向流式 V3）
 * 端点: POST https://openspeech.bytedance.com/api/v3/tts/unidirectional
 * 鉴权:
 *   - 新版控制台：api_key 填 API Key → X-Api-Key
 *   - 旧版控制台：api_key 填 "APP_ID:Access_Token" → X-Api-App-Id + X-Api-Access-Key
 * 资源（配置 model 字段）:
 *   - seed-tts-2.0  豆包语音合成 2.0（官方音色 *_uranus_bigtts）
 *   - 音色 ID 以 S_ 开头（声音复刻音色）时自动改用 seed-icl-2.0
 * 响应: NDJSON，每行 { code, data(base64 音频片段) }，code=20000000 表示结束
 */
import type { AIConfig } from './types'
import { joinProviderUrl } from './url'

export const DEFAULT_TTS_RESOURCE = 'seed-tts-2.0'
const ICL_RESOURCE = 'seed-icl-2.0'

export interface TTSRequest {
  text: string
  voice: string
  /** 自然语言语气指令（2.0 指令遵循），如「压低声音、带着苦涩自嘲地说」 */
  instruction?: string
}

/** 实际使用的资源 ID：复刻音色强制走 ICL，其余用配置的模型（默认 seed-tts-2.0） */
export function resolveTTSResource(config: AIConfig, voice: string): string {
  if (voice.startsWith('S_')) return ICL_RESOURCE
  return config.model || DEFAULT_TTS_RESOURCE
}

export function buildTTSHeaders(apiKey: string, resource: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Api-Resource-Id': resource,
  }
  const sep = apiKey.indexOf(':')
  if (sep > 0) {
    headers['X-Api-App-Id'] = apiKey.slice(0, sep).trim()
    headers['X-Api-Access-Key'] = apiKey.slice(sep + 1).trim()
  } else {
    headers['X-Api-Key'] = apiKey.trim()
  }
  return headers
}

export function ttsUrl(baseUrl: string) {
  return joinProviderUrl(baseUrl || 'https://openspeech.bytedance.com', '/api/v3', '/tts/unidirectional')
}

/** 合成一句，返回 mp3 二进制 */
export async function synthesizeSpeech(config: AIConfig, req: TTSRequest): Promise<Buffer> {
  const resource = resolveTTSResource(config, req.voice)
  const body = {
    user: { uid: 'huobao-drama' },
    req_params: {
      text: req.text,
      speaker: req.voice,
      audio_params: { format: 'mp3', sample_rate: 24000 },
      // additions 必须是 JSON 字符串；context_texts 传语气指令，模型按指令演绎情绪
      additions: JSON.stringify(req.instruction ? { context_texts: [req.instruction] } : {}),
    },
  }

  const resp = await fetch(ttsUrl(config.baseUrl), {
    method: 'POST',
    headers: buildTTSHeaders(config.apiKey, resource),
    body: JSON.stringify(body),
  })
  const raw = await resp.text()
  if (!resp.ok) {
    let msg = raw.slice(0, 300)
    try { msg = JSON.parse(raw)?.header?.message || msg } catch { /* 非 JSON 原样返回 */ }
    if (msg.includes('not granted')) {
      msg = `未开通 ${resource}：请在豆包语音控制台开通对应服务（${msg}）`
    }
    throw new Error(`语音合成失败 HTTP ${resp.status}: ${msg}`)
  }

  const chunks: Buffer[] = []
  for (const line of raw.split('\n')) {
    const s = line.trim()
    if (!s) continue
    let msg: any
    try { msg = JSON.parse(s) } catch { continue }
    const code = msg.code ?? 0
    if (code === 0 && msg.data) chunks.push(Buffer.from(msg.data, 'base64'))
    else if (code !== 0 && code !== 20000000) throw new Error(`语音合成失败 code=${code}: ${msg.message || ''}`)
  }
  if (!chunks.length) throw new Error('语音合成失败：未返回音频')
  return Buffer.concat(chunks)
}
