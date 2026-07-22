/**
 * Atlas Cloud Media API image adapter
 * Endpoint: /api/v1/model/generateImage -> /api/v1/model/result/{request_id}
 */
import type {
  AIConfig,
  ImageGenResponse,
  ImageGenerationRecord,
  ImagePollResponse,
  ImageProviderAdapter,
  ProviderRequest,
} from './types'
import { joinProviderUrl } from './url'

export class AtlasCloudImageAdapter implements ImageProviderAdapter {
  provider = 'atlascloud'

  buildGenerateRequest(config: AIConfig, record: ImageGenerationRecord): ProviderRequest {
    const body = {
      model: record.model || config.model || 'bytedance/seedream-v5.0-lite',
      prompt: record.prompt || '',
      size: this.normalizeSize(record.size || '1920x1080'),
      output_format: 'png',
      enable_base64_output: false,
    }

    return {
      url: joinProviderUrl(config.baseUrl, '/api/v1', '/model/generateImage'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    }
  }

  parseGenerateResponse(result: any): ImageGenResponse {
    const data = unwrapData(result)
    const taskId = data.id || data.request_id
    if (taskId) return { isAsync: true, taskId }

    const imageUrl = extractFirstOutput(data)
    if (imageUrl) return { isAsync: false, imageUrl }

    throw new Error(`Unexpected Atlas Cloud image response: ${JSON.stringify(result).slice(0, 200)}`)
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/api/v1', `/model/result/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): ImagePollResponse {
    const data = unwrapData(result)
    const status = String(data.status || '').toLowerCase()

    if (['completed', 'succeeded', 'success'].includes(status)) {
      const imageUrl = extractFirstOutput(data)
      return imageUrl ? { status: 'completed', imageUrl } : { status: 'completed' }
    }

    if (['failed', 'canceled', 'cancelled'].includes(status)) {
      return {
        status: 'failed',
        error: data.error || data.message || 'Atlas Cloud image generation failed',
      }
    }

    return { status: status === 'pending' ? 'pending' : 'processing' }
  }

  extractImageUrl(result: any): string | null {
    return extractFirstOutput(unwrapData(result))
  }

  extractImageBase64(result: any): { data: string; mimeType: string } | null {
    const output = extractFirstOutput(unwrapData(result))
    if (!output?.startsWith('data:image/')) return null
    const [meta, data] = output.split(',', 2)
    const mimeType = meta.match(/^data:([^;]+)/)?.[1] || 'image/png'
    return data ? { data, mimeType } : null
  }

  private normalizeSize(size: string): string {
    const normalized = String(size || '').trim().replace('x', '*')
    const [w, h] = normalized.split('*').map(Number)
    if (!w || !h) return '2048*2048'
    const aspect = w / h
    if (aspect > 1.25) return '2304*1728'
    if (aspect < 0.8) return '1728*2304'
    return '2048*2048'
  }
}

function unwrapData(result: any) {
  return result?.data && typeof result.data === 'object' ? result.data : result
}

function extractFirstOutput(data: any): string | null {
  const outputs = data?.outputs || data?.output || data?.images || data?.data
  if (Array.isArray(outputs)) {
    const first = outputs[0]
    if (typeof first === 'string') return first
    return first?.url || first?.image_url || first?.image || null
  }
  if (typeof outputs === 'string') return outputs
  return data?.image_url || data?.url || null
}
