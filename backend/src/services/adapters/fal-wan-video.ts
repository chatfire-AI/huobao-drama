/**
 * fal.ai Wan 3.0 reference-to-video Adapter.
 *
 * Official contract (queue API, fal's recommended calling style):
 * - POST {base}/alibaba/wan-3.0/reference-to-video                   -> { request_id, status_url, response_url }
 * - GET  {base}/alibaba/wan-3.0/reference-to-video/requests/{id}/status -> { status: IN_QUEUE | IN_PROGRESS | COMPLETED }
 * - GET  {base}/alibaba/wan-3.0/reference-to-video/requests/{id}        -> { video: { url }, seed, duration }
 *
 * Notes:
 * - Auth is fal's own scheme, `Authorization: Key <api_key>`, not `Bearer`.
 * - The model id is the endpoint path, so the URL is fixed and the model name only
 *   selects the endpoint; anything but the reference-to-video id is rejected.
 * - State and result are separate resources here: parsePollResponse only reads the
 *   status, and generation.ts fetches the video URL through buildResultRequest.
 * - `@图片N` prompt markers become positional `Image N` references, the form the model documents.
 */
import type {
  AIConfig,
  ProviderRequest,
  VideoGenerationRecord,
  VideoGenResponse,
  VideoPollResponse,
  VideoProviderAdapter,
} from './types'

const ENDPOINT_ID = 'alibaba/wan-3.0/reference-to-video'
/** The workbench model dropdown keys options as `provider/model` and strips the provider prefix. */
const SUPPORTED_MODEL_IDS = new Set([ENDPOINT_ID, 'wan-3.0/reference-to-video'])
const DEFAULT_BASE_URL = 'https://queue.fal.run'

/** Documented reference limits: images ≤10, videos ≤5, audios ≤5 (video/audio ≤15s in total). */
const REF_LIMITS = { images: 10, videos: 5, audios: 5 } as const
const VALID_RESOLUTIONS = new Set(['480p', '720p', '1080p'])
const VALID_RATIOS = new Set(['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16'])
const MIN_DURATION = 2
const MAX_DURATION = 30
const MAX_SEED = 2_147_483_647

function parseUrlArray(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const value = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value
      .filter((url): url is string => typeof url === 'string')
      .map(url => url.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function booleanValue(value: number | boolean | null | undefined, fallback: boolean): boolean {
  if (value === null || value === undefined) return fallback
  return value !== false && value !== 0
}

function errorMessage(result: any, fallback: string): string {
  const type = result?.error_type ? `${result.error_type}: ` : ''
  const detail = typeof result?.detail === 'string' ? result.detail : ''
  const message = result?.error || detail || result?.message || fallback
  return `${type}${message}`
}

export class FalWanVideoAdapter implements VideoProviderAdapter {
  provider = 'fal-wan-video'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const model = String(record.model || config.model || ENDPOINT_ID).trim()
    if (!SUPPORTED_MODEL_IDS.has(model.toLowerCase())) {
      throw new Error(`fal Wan 3.0 supports only ${ENDPOINT_ID}; configured model: ${model || '(empty)'}`)
    }

    // Internal @图片N markers map to the model's positional `Image N` references.
    const prompt = String(record.prompt || '').trim().replace(/@图片(\d+)/g, 'Image $1')
    const images = parseUrlArray(record.referenceImageUrls)
    const videos = parseUrlArray(record.referenceVideoUrls)
    const audios = parseUrlArray(record.referenceAudioUrls)

    if (images.length > REF_LIMITS.images || videos.length > REF_LIMITS.videos || audios.length > REF_LIMITS.audios) {
      throw new Error(
        `fal Wan 3.0 reference limits exceeded: images≤${REF_LIMITS.images}, videos≤${REF_LIMITS.videos}, audios≤${REF_LIMITS.audios}`,
      )
    }
    if (!prompt && !images.length && !videos.length && !audios.length) {
      throw new Error('fal Wan 3.0 needs a prompt or at least one reference image, video, or audio')
    }

    // Reference media only: a key frame or a file/link reference would be dropped
    // silently, so name it instead of sending a request that ignores it.
    const unsupported = [
      ['firstFrameUrl/imageUrl', record.firstFrameUrl || record.imageUrl],
      ['lastFrameUrl', record.lastFrameUrl],
      ['referenceFileUrl', record.referenceFileUrl],
      ['referenceLinkUrl', record.referenceLinkUrl],
    ].filter(([, value]) => String(value || '').trim()).map(([name]) => String(name))
    if (unsupported.length) {
      throw new Error(
        `fal Wan 3.0 reference-to-video accepts reference media only; unsupported fields: ${unsupported.join(', ')}`,
      )
    }

    const body: Record<string, unknown> = {
      resolution: this.normalizeResolution(record.resolution),
      aspect_ratio: this.normalizeRatio(record.aspectRatio),
      duration: this.normalizeDuration(record.duration),
      audio: booleanValue(record.generateAudio, true),
      enable_prompt_expansion: booleanValue(record.promptExtend, true),
    }
    if (prompt) body.prompt = prompt
    if (images.length) body.reference_image_urls = images
    if (videos.length) body.reference_video_urls = videos
    if (audios.length) body.reference_audio_urls = audios

    if (record.seed !== null && record.seed !== undefined) {
      const seed = Number(record.seed)
      // -1 is this project's "random seed"; fal wants the field omitted instead.
      if (seed !== -1) {
        if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
          throw new Error(`fal Wan 3.0 seed must be an integer between 0 and ${MAX_SEED}`)
        }
        body.seed = seed
      }
    }

    return {
      url: this.endpointUrl(config),
      method: 'POST',
      headers: this.headers(config),
      body,
    }
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    const videoUrl = result?.video?.url
    if (videoUrl) return { isAsync: false, videoUrl }
    const requestId = result?.request_id
    if (requestId) return { isAsync: true, taskId: String(requestId) }
    throw new Error(errorMessage(result, 'fal Wan 3.0 submit response has no request_id'))
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: this.endpointUrl(config, `/requests/${encodeURIComponent(taskId)}/status`),
      method: 'GET',
      headers: this.headers(config),
      body: undefined,
    }
  }

  /** Called by generation.ts once the status is COMPLETED, because the status body carries no video URL. */
  buildResultRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: this.endpointUrl(config, `/requests/${encodeURIComponent(taskId)}`),
      method: 'GET',
      headers: this.headers(config),
      body: undefined,
    }
  }

  parsePollResponse(result: any): VideoPollResponse {
    // A relay may hand back the raw output body instead of a status envelope.
    const videoUrl = result?.video?.url
    if (videoUrl) return { status: 'completed', videoUrl }
    // Queue failures arrive on the COMPLETED status as error / error_type.
    if (result?.error || result?.error_type) {
      return { status: 'failed', error: errorMessage(result, 'fal Wan 3.0 video generation failed') }
    }
    switch (result?.status) {
      case 'IN_QUEUE':
        return { status: 'pending' }
      case 'IN_PROGRESS':
        return { status: 'processing' }
      case 'COMPLETED': {
        const duration = Number(result?.duration)
        return {
          status: 'completed',
          ...(Number.isFinite(duration) ? { duration } : {}),
        }
      }
      default:
        return { status: 'processing' }
    }
  }

  extractVideoUrl(result: any): string | null {
    return result?.video?.url || null
  }

  /** Base URL is host/relay only; a pasted full endpoint URL is accepted and trimmed. */
  private endpointUrl(config: AIConfig, suffix = ''): string {
    const raw = String(config.baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '') || DEFAULT_BASE_URL
    const withEndpoint = `/${ENDPOINT_ID}`
    const base = raw.endsWith(withEndpoint) ? raw.slice(0, -withEndpoint.length) : raw
    return `${base}${withEndpoint}${suffix}`
  }

  private headers(config: AIConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Key ${config.apiKey}`,
    }
  }

  /** -1 is this project's "let the model decide"; fal spells smart duration as null. */
  private normalizeDuration(duration?: number | null): number | null {
    if (duration === null || duration === undefined) return 5
    const value = Math.round(Number(duration))
    if (!Number.isFinite(value)) return 5
    if (value === -1) return null
    return Math.min(MAX_DURATION, Math.max(MIN_DURATION, value))
  }

  private normalizeResolution(resolution?: string | null): string {
    const value = String(resolution || '').trim().toLowerCase()
    // fal rejects the internal 2K alias; fall back to its own default tier.
    return VALID_RESOLUTIONS.has(value) ? value : '1080p'
  }

  private normalizeRatio(ratio?: string | null): string {
    const value = String(ratio || '').trim()
    return VALID_RATIOS.has(value) ? value : 'adaptive'
  }
}
