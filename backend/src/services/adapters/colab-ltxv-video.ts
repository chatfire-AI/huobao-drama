/**
 * Colab LTXV video provider.
 *
 * The Colab runtime exposes:
 *   POST /v1/video/generations
 *   GET  /v1/video/generations/:taskId
 *   GET  /health
 *
 * Huobao sends reference images as data URLs so Colab does not need access to
 * local storage on the Huobao host.
 */
import type {
  AIConfig,
  ProviderRequest,
  VideoGenerationRecord,
  VideoGenResponse,
  VideoPollResponse,
  VideoProviderAdapter,
} from './types'
import { joinProviderUrl } from './url'

const DEFAULT_NEGATIVE_PROMPT = [
  'low quality',
  'worst quality',
  'deformed',
  'distorted',
  'motion smear',
  'motion artifacts',
  'game screenshot',
  'HUD',
  'crosshair',
  'text',
  'subtitle',
  'logo',
  'watermark',
].join(', ')

export class ColabLtxvVideoAdapter implements VideoProviderAdapter {
  readonly provider = 'colab-ltxv'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const resolution = this.normalizeResolution(record.resolution, record.aspectRatio)
    const frames = this.normalizeFrames(record.frames)
    const fps = this.normalizeFps(record.fps)
    const seed = this.normalizeSeed(record.seed)

    const body = {
      model: record.model || config.model || 'ltxv-0.9.7-13b-distilled-q6_k',
      prompt: record.prompt || '',
      negative_prompt: record.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
      reference_mode: record.referenceMode || 'single',
      image: record.imageUrl || record.firstFrameUrl || null,
      first_frame: record.firstFrameUrl || record.imageUrl || null,
      last_frame: record.lastFrameUrl || null,
      reference_images: this.parseReferenceImages(record.referenceImageUrls),
      width: resolution.width,
      height: resolution.height,
      resolution: `${resolution.width}x${resolution.height}`,
      aspect_ratio: record.aspectRatio || '9:16',
      fps,
      frames,
      duration: Number(((frames - 1) / fps).toFixed(3)),
      seed,
      upscale_video: Boolean(record.upscaleVideo),
      motion_level: record.motionLevel ?? null,
      camera_motion: record.cameraMotion || null,
    }

    return {
      url: joinProviderUrl(config.baseUrl, '/v1', '/video/generations'),
      method: 'POST',
      headers: this.headers(config, true),
      body,
    }
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    const taskId = result.id || result.task_id || result.data?.id || result.data?.task_id
    const videoUrl = this.extractVideoUrl(result)
    const status = String(result.status || result.data?.status || '').toLowerCase()

    if (videoUrl && ['completed', 'succeeded', 'success'].includes(status)) {
      return { isAsync: false, videoUrl }
    }
    if (taskId) return { isAsync: true, taskId: String(taskId) }
    if (videoUrl) return { isAsync: false, videoUrl }
    throw new Error(`Unexpected Colab LTXV response: ${JSON.stringify(result).slice(0, 300)}`)
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/v1', `/video/generations/${encodeURIComponent(taskId)}`),
      method: 'GET',
      headers: this.headers(config, false),
      body: undefined,
    }
  }

  parsePollResponse(result: any): VideoPollResponse {
    const payload = result.data || result
    const status = String(payload.status || '').toLowerCase()
    const videoUrl = this.extractVideoUrl(payload)

    if (['completed', 'succeeded', 'success'].includes(status)) {
      if (!videoUrl) return { status: 'failed', error: 'Colab task completed without a video URL' }
      return { status: 'completed', videoUrl }
    }
    if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
      return { status: 'failed', error: payload.error || payload.message || 'Colab LTXV generation failed' }
    }
    if (['running', 'processing'].includes(status)) return { status: 'processing' }
    return { status: 'pending' }
  }

  extractVideoUrl(result: any): string | null {
    return result.video_url
      || result.videoUrl
      || result.output?.video_url
      || result.output?.url
      || result.data?.video_url
      || result.data?.videoUrl
      || null
  }

  private headers(config: AIConfig, withJson: boolean): Record<string, string> {
    const headers: Record<string, string> = {}
    if (withJson) headers['Content-Type'] = 'application/json'
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`
    return headers
  }

  private parseReferenceImages(raw?: string | null): string[] {
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      return []
    }
  }

  private normalizeFps(value?: number | null): number {
    const fps = Math.round(Number(value || 24))
    return Math.min(30, Math.max(8, Number.isFinite(fps) ? fps : 24))
  }

  private normalizeFrames(value?: number | null): number {
    const requested = Math.round(Number(value || 121))
    const bounded = Math.min(257, Math.max(9, Number.isFinite(requested) ? requested : 121))
    return Math.floor((bounded - 1) / 8) * 8 + 1
  }

  private normalizeSeed(value?: number | null): number {
    const seed = Math.round(Number(value))
    if (Number.isFinite(seed) && seed >= 0) return Math.min(2147483647, seed)
    return Math.floor(Math.random() * 2147483647)
  }

  private normalizeResolution(value?: string | null, aspectRatio?: string | null): { width: number; height: number } {
    const match = String(value || '').match(/^(\d+)\s*[x×]\s*(\d+)$/i)
    let width = match ? Number(match[1]) : 0
    let height = match ? Number(match[2]) : 0

    if (!width || !height) {
      if (aspectRatio === '16:9') {
        width = 1024
        height = 576
      } else {
        width = 576
        height = 1024
      }
    }

    width = Math.min(1280, Math.max(256, Math.round(width / 32) * 32))
    height = Math.min(1280, Math.max(256, Math.round(height / 32) * 32))
    return { width, height }
  }
}
