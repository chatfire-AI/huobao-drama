/**
 * Atlas Cloud Media API video adapter
 * Endpoint: /api/v1/model/generateVideo -> /api/v1/model/prediction/{request_id}
 */
import type {
  AIConfig,
  ProviderRequest,
  VideoGenResponse,
  VideoGenerationRecord,
  VideoPollResponse,
  VideoProviderAdapter,
} from './types'
import { joinProviderUrl } from './url'

export class AtlasCloudVideoAdapter implements VideoProviderAdapter {
  provider = 'atlascloud'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const model = this.resolveModel(record, config)
    const body: Record<string, any> = {
      model,
      prompt: record.prompt || '',
      duration: this.normalizeDuration(record.duration),
      resolution: '720p',
      ratio: record.aspectRatio || '16:9',
      generate_audio: true,
      watermark: false,
    }

    if (record.referenceMode === 'single' && record.imageUrl) {
      body.image = record.imageUrl
    } else if (record.referenceMode === 'first_last') {
      if (record.firstFrameUrl) body.image = record.firstFrameUrl
      if (record.lastFrameUrl) body.last_image = record.lastFrameUrl
    } else if (record.referenceMode === 'multiple' && record.referenceImageUrls) {
      try {
        const refs = JSON.parse(record.referenceImageUrls)
        body.reference_images = Array.isArray(refs) ? refs : []
      } catch {
        body.reference_images = []
      }
    }

    return {
      url: joinProviderUrl(config.baseUrl, '/api/v1', '/model/generateVideo'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    }
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    const data = unwrapData(result)
    const taskId = data.id || data.request_id
    if (taskId) return { isAsync: true, taskId }

    const videoUrl = extractFirstOutput(data)
    if (videoUrl) return { isAsync: false, videoUrl }

    throw new Error(`Unexpected Atlas Cloud video response: ${JSON.stringify(result).slice(0, 200)}`)
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/api/v1', `/model/prediction/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): VideoPollResponse {
    const data = unwrapData(result)
    const status = String(data.status || '').toLowerCase()

    if (['completed', 'succeeded', 'success'].includes(status)) {
      const videoUrl = extractFirstOutput(data)
      return videoUrl ? { status: 'completed', videoUrl } : { status: 'completed' }
    }

    if (['failed', 'canceled', 'cancelled'].includes(status)) {
      return {
        status: 'failed',
        error: data.error || data.message || 'Atlas Cloud video generation failed',
      }
    }

    return { status: status === 'pending' ? 'pending' : 'processing' }
  }

  extractVideoUrl(result: any): string | null {
    return extractFirstOutput(unwrapData(result))
  }

  private resolveModel(record: VideoGenerationRecord, config: AIConfig): string {
    const configured = record.model || config.model || 'bytedance/seedance-2.0-fast/text-to-video'
    if (record.referenceMode === 'multiple') {
      return configured.replace(/\/(text|image)-to-video$/, '/reference-to-video')
    }
    if (record.imageUrl || record.firstFrameUrl || record.lastFrameUrl) {
      return configured.replace('/text-to-video', '/image-to-video')
    }
    return configured
  }

  private normalizeDuration(duration?: number | null): number {
    const parsed = Math.round(Number(duration || 5))
    if (!Number.isFinite(parsed)) return 5
    return Math.min(15, Math.max(4, parsed))
  }
}

function unwrapData(result: any) {
  return result?.data && typeof result.data === 'object' ? result.data : result
}

function extractFirstOutput(data: any): string | null {
  const outputs = data?.outputs || data?.output || data?.videos || data?.data
  if (Array.isArray(outputs)) {
    const first = outputs[0]
    if (typeof first === 'string') return first
    return first?.url || first?.video_url || first?.video || null
  }
  if (typeof outputs === 'string') return outputs
  return data?.video_url || data?.url || null
}
