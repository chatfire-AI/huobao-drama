/**
 * Vidu 视频生成 Adapter
 * 端点: /ent/v2/img2video
 * 认证: Authorization: Token {apiKey} (不是 Bearer!)
 * 特点: Vidu 不提供轮询接口，依赖 Webhook 回调通知结果
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

export class ViduVideoAdapter implements VideoProviderAdapter {
  provider = 'vidu'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const model = record.model || config.model || 'viduq3-turbo'

    const body: any = {
      model,
      images: [], // 将由调用方填充
      prompt: record.prompt,
    }

    // 添加参考图
    if (record.referenceMode === 'single' && record.imageUrl) {
      body.images.push(record.imageUrl)
    } else if (record.referenceMode === 'first_last') {
      if (record.firstFrameUrl) body.images.push(record.firstFrameUrl)
      if (record.lastFrameUrl) body.images.push(record.lastFrameUrl)
    } else if (record.referenceMode === 'multiple' && record.referenceImageUrls) {
      try {
        const refs = JSON.parse(record.referenceImageUrls)
        body.images.push(...refs)
      } catch {}
    }

    // 可选参数
    if (record.duration) body.duration = record.duration
    if (record.aspectRatio) {
      // Vidu 使用 resolution 参数而非 aspect ratio
      const ratioMap: Record<string, string> = {
        '16:9': '720p',
        '9:16': '720p',
        '1:1': '720p',
      }
      body.resolution = ratioMap[record.aspectRatio] || '720p'
    }

    return {
      url: joinProviderUrl(config.baseUrl, '', '/ent/v2/img2video'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${config.apiKey}`, // 注意: 不是 Bearer!
      },
      body,
    }
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    if (result.task_id) {
      return { isAsync: true, taskId: result.task_id }
    }
    // 同步返回（不太可能发生）
    if (result.video_url) {
      return { isAsync: false, videoUrl: result.video_url }
    }
    throw new Error('No task_id in Vidu response')
  }

  /**
   * Vidu 不提供轮询接口！
   * 这个方法不会被调用，轮询通过 Webhook 回调实现
   * 这里返回一个无效的请求，让轮询立即结束并依赖 Webhook
   */
  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    // Vidu 没有轮询端点，返回一个不可达的 URL
    // 轮询会超时，最终依赖 Webhook 回调更新状态
    return {
      url: 'vidu://no-polling-endpoint',
      method: 'GET',
      headers: {},
      body: undefined,
    }
  }

  /**
   * Vidu 轮询永远返回 processing，因为没有轮询端点
   * 实际状态通过 Webhook 更新
   */
  parsePollResponse(result: any): VideoPollResponse {
    return { status: 'processing' }
  }

  extractVideoUrl(result: any): string | null {
    return result.video_url || null
  }

  /**
   * Vidu 回调状态映射
   * Webhook 路由使用此方法解析回调
   */
  static parseCallbackState(body: any): { status: 'completed' | 'failed'; videoUrl?: string; error?: string } {
    const state = body.state
    if (state === 'success') {
      return { status: 'completed', videoUrl: body.video_url }
    }
    if (state === 'failed') {
      return { status: 'failed', error: body.error || 'Vidu generation failed' }
    }
    return { status: 'failed', error: `Unknown state: ${state}` }
  }
}
