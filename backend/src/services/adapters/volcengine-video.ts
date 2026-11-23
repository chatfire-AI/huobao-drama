/**
 * 火山引擎 / BytePlus Seedance 视频生成 Adapter
 * 端点: /api/v3/contents/generations/tasks (注意 /api/v3 前缀)
 * 响应: { id: "task-xxx" } -> 轮询获取状态
 *
 * 支持 Doubao Seedance 2.0 与 BytePlus Dreamina Seedance 2.0 / 2.5，生成模式只保留多模态参考:
 * - reference   多模态参考（≤9 reference_image + ≤3 reference_video + ≤3 reference_audio + 可选文本）
 *   有参考音频时至少包含 1 个参考图片或视频
 */
import type {
  VideoProviderAdapter,
  ProviderRequest,
  AIConfig,
  VideoGenerationRecord,
  VideoGenResponse,
  VideoPollResponse,
} from './types'
import { joinProviderUrl } from './url'

// Keep model families explicit so unrelated models are rejected before submission.
const SEEDANCE_MODEL_PATTERN = /^(?:doubao-seedance-2-0|dreamina-seedance-2-(?:0|5))(?:-|$)/
const DEFAULT_MODEL = 'doubao-seedance-2-0-mini-260615'

/** 多模态参考素材上限：图片 9、视频 3、音频 3 */
const REF_LIMITS = { images: 9, videos: 3, audios: 3 } as const

function parseUrlArray(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((u) => typeof u === 'string' && u.trim()) : []
  } catch {
    return []
  }
}

export class VolcEngineVideoAdapter implements VideoProviderAdapter {
  provider = 'volcengine'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const model = record.model || config.model || DEFAULT_MODEL
    if (!SEEDANCE_MODEL_PATTERN.test(model)) {
      throw new Error(`仅支持 Doubao Seedance 2.0 或 BytePlus Dreamina Seedance 2.0 / 2.5，当前: ${model}`)
    }

    const prompt = (record.prompt || '').trim()
    const refImages = parseUrlArray(record.referenceImageUrls)
    const refVideos = parseUrlArray(record.referenceVideoUrls)
    const refAudios = parseUrlArray(record.referenceAudioUrls)

    if (refImages.length > REF_LIMITS.images || refVideos.length > REF_LIMITS.videos || refAudios.length > REF_LIMITS.audios) {
      throw new Error(`参考素材超限：图片≤${REF_LIMITS.images}、视频≤${REF_LIMITS.videos}、音频≤${REF_LIMITS.audios}`)
    }
    if (refAudios.length > 0 && refImages.length + refVideos.length === 0) {
      throw new Error('参考音频需要至少 1 个参考图片或视频')
    }
    if (!prompt && !refImages.length && !refVideos.length && !refAudios.length) {
      throw new Error('多模态参考模式需要至少一个参考素材或 prompt')
    }

    const content: any[] = []
    if (prompt) content.push({ type: 'text', text: prompt })
    for (const url of refImages) {
      content.push({ type: 'image_url', image_url: { url }, role: 'reference_image' })
    }
    for (const url of refVideos) {
      content.push({ type: 'video_url', video_url: { url }, role: 'reference_video' })
    }
    for (const url of refAudios) {
      content.push({ type: 'audio_url', audio_url: { url }, role: 'reference_audio' })
    }

    const body: any = {
      model,
      content,
      generate_audio: record.generateAudio !== 0 && record.generateAudio !== false,
      ratio: record.aspectRatio || 'adaptive',
      duration: this.normalizeDuration(record.duration, model),
      resolution: record.resolution === '1080p' && /^dreamina-seedance-2-5-\d/.test(model)
        ? '1080p'
        : record.resolution === '480p' ? '480p' : '720p',
      watermark: false,
    }

    return {
      url: joinProviderUrl(config.baseUrl, '/api/v3', '/contents/generations/tasks'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    }
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    if (result.id) {
      return { isAsync: true, taskId: result.id }
    }
    // 同步返回
    const videoUrl = result.video_url || result.content?.video_url || result.data?.video_url
    if (videoUrl) {
      return { isAsync: false, videoUrl }
    }
    throw new Error('No task_id or video_url in response')
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/api/v3', `/contents/generations/tasks/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): VideoPollResponse {
    const status = result.status
    if (status === 'succeeded') {
      const videoUrl = result.video_url || result.content?.video_url || result.data?.video_url
      return {
        status: 'completed',
        videoUrl,
      }
    }
    if (status === 'failed') {
      // 上游 error 可能是对象 { code, message }（如 OutputVideoSensitiveContentDetected），规范成字符串
      const err = result.error
      const msg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err) || 'Video generation failed')
      const code = err && typeof err === 'object' && err.code ? `[${err.code}] ` : ''
      return { status: 'failed', error: `${code}${msg}` }
    }
    return { status: status || 'processing' }
  }

  extractVideoUrl(result: any): string | null {
    return result.video_url || result.content?.video_url || result.data?.video_url || null
  }

  private normalizeDuration(duration: number | null | undefined, model: string): number {
    const parsed = Math.round(Number(duration || 5))
    if (!Number.isFinite(parsed)) return 5
    // BytePlus 2.5 supports up to 30s; preserve the existing 2.0 range.
    const max = model.startsWith('dreamina-seedance-2-5-') ? 30 : 15
    return Math.min(max, Math.max(4, parsed))
  }
}
