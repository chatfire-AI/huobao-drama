/**
 * MiniMax 图片生成 Adapter
 * API 风格与 OpenAI 兼容，零改动
 */
import type {
  ImageProviderAdapter,
  ProviderRequest,
  AIConfig,
  ImageGenerationRecord,
  ImageGenResponse,
  ImagePollResponse,
} from './types'
import { joinProviderUrl } from './url'

export class MiniMaxImageAdapter implements ImageProviderAdapter {
  provider = 'minimax'

  buildGenerateRequest(config: AIConfig, record: ImageGenerationRecord): ProviderRequest {
    const body: any = {
      model: record.model || config.model,
      prompt: record.prompt,
      size: record.size || '1920x1080',
      n: 1,
    }

    // MiniMax 支持 reference_images（参考图）
    if (record.referenceImages) {
      try {
        const refs = JSON.parse(record.referenceImages)
        if (refs.length > 0) {
          body.image = refs // 支持多张参考图
        }
      } catch {}
    }

    // aspect_ratio 参数（MiniMax 支持）
    if (record.size) {
      const [w, h] = record.size.split('x')
      if (w && h) {
        const ratio = `${w}/${h}`
        body.aspect_ratio = ratio
      }
    }

    return {
      url: joinProviderUrl(config.baseUrl, '/v1', '/image_generation'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    }
  }

  parseGenerateResponse(result: any): ImageGenResponse {
    // 异步模式：返回 task_id
    if (result.task_id || result.id) {
      return { isAsync: true, taskId: result.task_id || result.id }
    }
    // 同步模式：直接返回图片 URL
    const imageUrl = result.data?.[0]?.url || result.url
    if (imageUrl) {
      return { isAsync: false, imageUrl }
    }
    throw new Error('No image URL or task_id in response')
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/v1', `/image_generation/task/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): ImagePollResponse {
    const status = result.status || result.state
    if (status === 'completed' || status === 'succeeded') {
      return { status: 'completed', imageUrl: result.image_url || result.data?.image_url || result.url || result.data?.url }
    }
    if (status === 'failed' || status === 'error') {
      return { status: 'failed', error: result.error_msg || result.error || 'Generation failed' }
    }
    return { status: status || 'processing' }
  }

  extractImageUrl(result: any): string | null {
    return result.image_url || result.data?.image_url || result.url || result.data?.url || null
  }

  extractImageBase64(result: any): { data: string; mimeType: string } | null {
    // MiniMax 通常返回 URL，不返回 base64
    return null
  }
}
