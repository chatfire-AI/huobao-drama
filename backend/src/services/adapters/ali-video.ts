/**
 * 阿里云百炼（万相）视频生成 Adapter
 * API 文档: https://help.aliyun.com/zh/model-studio/image-to-video-api-reference
 */
import type { VideoProviderAdapter, VideoGenerationRecord } from './types'
import { joinProviderUrl } from './url'

export class AliVideoAdapter implements VideoProviderAdapter {
  readonly provider = 'ali'

  buildGenerateRequest(config: any, record: VideoGenerationRecord): {
    url: string
    method: string
    headers: Record<string, string>
    body: any
  } {
    const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com'
    const url = joinProviderUrl(baseUrl, '/api/v1', '/services/aigc/video-generation/video-synthesis')

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    }

    const body: any = {
      model: record.model || 'wan2.6-i2v-flash',
      input: {
        prompt: record.prompt,
        img_url: record.imageUrl ?? record.firstFrameUrl ?? '',
      },
      parameters: {
        resolution: this.normalizeResolution(record.aspectRatio ?? '16:9'),
        duration: record.duration || 5,
        watermark: false,
        seed: Math.floor(Math.random() * 2147483647),
      },
    }

    // 尾帧模式
    if (record.lastFrameUrl) {
      body.input.last_img_url = record.lastFrameUrl as string
    }

    return { url, method: 'POST', headers, body }
  }

  parseGenerateResponse(result: any): {
    isAsync: boolean
    taskId?: string
    videoUrl?: string
  } {
    if (result.output?.task_status === 'PENDING' && result.output?.task_id) {
      return { isAsync: true, taskId: result.output.task_id }
    }

    if (result.output?.video_url) {
      return { isAsync: false, videoUrl: result.output.video_url }
    }

    throw new Error(`Unexpected Ali video response: ${JSON.stringify(result).slice(0, 200)}`)
  }

  buildPollRequest(config: any, taskId: string): {
    url: string
    method: string
    headers: Record<string, string>
    body: any
  } {
    const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com'
    return {
      url: joinProviderUrl(baseUrl, '/api/v1', `/tasks/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): {
    status: 'pending' | 'processing' | 'completed' | 'failed'
    videoUrl?: string
    error?: string
  } {
    const status = result.output?.task_status

    if (status === 'SUCCEEDED') {
      return { status: 'completed', videoUrl: result.output?.video_url }
    }

    if (status === 'FAILED') {
      return { status: 'failed', error: result.message || 'Video generation failed' }
    }

    if (status === 'PENDING' || status === 'RUNNING') {
      return { status: 'processing' }
    }

    return { status: 'pending' }
  }

  extractVideoUrl(result: any): string | null {
    return result.output?.video_url || null
  }

  private normalizeResolution(aspectRatio?: string): string {
    const ratio = aspectRatio || '16:9'
    if (ratio === '9:16') return '720P'
    if (ratio === '1:1') return '720P'
    return '1080P'
  }
}
