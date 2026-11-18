import type { AIConfig, ProviderRequest, VideoGenerationRecord, VideoProviderAdapter, VideoGenResponse, VideoPollResponse } from './types'
import { joinProviderUrl } from './url'

function urls(raw?: string | null): string[] { return raw ? JSON.parse(raw) : [] }

/** xAI native asynchronous video API, also used by compatible relays. */
export class GrokVideoAdapter implements VideoProviderAdapter {
  provider = 'grok'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const model = record.model || config.model || 'grok-imagine-video-1.5'
    const enhanced = model === 'grok-imagine-video-1.5' || model === 'grok-imagine-video-1.5-preview'
    if (!['grok-imagine-video', 'grok-imagine-video-1.5', 'grok-imagine-video-1.5-preview', 'grok-imagine-video-1.5-lite'].includes(model)) throw new Error(`不支持的 Grok 视频模型：${model}`)
    const refs = urls(record.referenceImageUrls)
    const first = record.firstFrameUrl || record.imageUrl
    const last = record.lastFrameUrl
    if (urls(record.referenceVideoUrls).length || urls(record.referenceAudioUrls).length || record.referenceFileUrl || record.referenceLinkUrl) throw new Error('Grok 当前接入支持图片参考和原生声音生成，不支持参考音视频文件；请移除音色文件引用')
    if (refs.length > (enhanced ? 14 : 7)) throw new Error(`Grok 当前模型参考图片最多 ${enhanced ? 14 : 7} 张`)
    if (model.endsWith('-lite') && (refs.length || last)) throw new Error('Grok lite 请使用文生视频或单首帧图生视频')
    if (!enhanced && (last || (first && refs.length))) throw new Error('尾帧或首帧与参考图混用需要 grok-imagine-video-1.5')
    const referenceMode = refs.length > 0 || !!last
    const maxDuration = model === 'grok-imagine-video' && referenceMode ? 10 : 15
    const duration = record.duration ?? 5
    if (!Number.isInteger(duration) || duration < 1 || duration > maxDuration) throw new Error(`Grok 当前模式时长须为 1–${maxDuration} 秒整数`)
    const resolution = (record.resolution || '720p').toLowerCase()
    if (!['480p', '720p', '1080p'].includes(resolution) || (resolution === '1080p' && (referenceMode || model === 'grok-imagine-video'))) throw new Error('Grok 参考图/尾帧模式及旧版模型最高支持 720p；1080p 请使用 1.5 文生视频或单首帧模式')
    const ratio = record.aspectRatio || '16:9'
    if (!['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '5:2'].includes(ratio)) throw new Error('Grok 不支持该画面比例')
    // Workbench labels references @图片1..., whereas xAI uses zero-based IMAGE tags.
    const prompt = (record.prompt || '').replace(/@图片(\d+)/g, (tag, n) => {
      const index = Number(n) - 1
      return index >= 0 && index < refs.length ? `<IMAGE_${index + (first ? 1 : 0)}>` : tag
    })
    if (!prompt.trim() && !first && !last && !refs.length) throw new Error('Grok 需要提示词或图片')
    const body: Record<string, unknown> = { model, prompt, duration, resolution, generate_audio: record.generateAudio == null ? true : Boolean(record.generateAudio) }
    if (!first || referenceMode) body.aspect_ratio = ratio
    if (first) body.image = { url: first }
    if (last) body.last_frame = { url: last }
    if (refs.length) body.reference_images = refs.map(url => ({ url }))
    return { url: joinProviderUrl(config.baseUrl, '/v1', '/videos/generations'), method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body }
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    if (!result.request_id) throw new Error(result.error?.message || result.error || 'Grok 未返回 request_id，请检查中转站是否支持 xAI 原生视频接口')
    return { isAsync: true, taskId: String(result.request_id) }
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return { url: joinProviderUrl(config.baseUrl, '/v1', `/videos/${encodeURIComponent(taskId)}`), method: 'GET', headers: { Authorization: `Bearer ${config.apiKey}` }, body: undefined }
  }

  parsePollResponse(result: any): VideoPollResponse {
    if (result.status === 'done') {
      if (result.video?.respect_moderation === false || !result.video?.url) return { status: 'failed', error: 'Grok 已结束但未提供可用视频' }
      return { status: 'completed', videoUrl: result.video.url, duration: result.video.duration }
    }
    if (['failed', 'expired', 'cancelled'].includes(result.status)) return { status: 'failed', error: result.error?.message || (typeof result.error === 'string' ? result.error : `Grok 视频任务 ${result.status}`) }
    if (['pending', 'processing', 'queued', 'running'].includes(result.status)) return { status: 'processing' }
    throw new Error(`Grok 返回未知任务状态：${result.status}`)
  }

  extractVideoUrl(result: any): string | null { return result.video?.url || null }
}
