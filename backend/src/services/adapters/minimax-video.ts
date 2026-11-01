/**
 * MiniMax H3 视频生成 Adapter
 * 端点: POST /v2/video_generation -> { task_id }
 * 轮询: GET  /v2/query/video_generation/{task_id} -> { task: { status, content.url, error } }
 *
 * 仅支持 MiniMax-H3 系列模型。content[] 多模态结构:
 * - text           提示词（必填，≤7000 字符）
 * - image_url      role: first_frame / last_frame / reference_image（参考图 ≤9）
 * - video_url      role: reference_video（≤3）
 * - audio_url      参考音频（≤3），混合总数 ≤12
 *
 * 注意:
 * - 文生视频 ratio 必填且不能为 adaptive；有首帧图（图生视频）时恒为 adaptive，省略 ratio
 * - H3 原生音画同步生成，官方文档无独立 generate_audio 开关，该字段忽略
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

/** 仅支持 MiniMax-H3 系列（前缀匹配，兼容未来 H3.x 变体） */
const H3_MODEL_PREFIX = 'minimax-h3'
const DEFAULT_MODEL = 'MiniMax-H3'

/** 多模态参考素材上限：图片 9、视频 3、音频 3，混合总数 12 */
const REF_LIMITS = { images: 9, videos: 3, audios: 3, total: 12 } as const

const PROMPT_MAX_CHARS = 7000

/** MiniMax 支持的宽高比 */
const VALID_RATIOS = new Set(['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'])

function parseUrlArray(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((u) => typeof u === 'string' && u.trim()) : []
  } catch {
    return []
  }
}

export class MiniMaxVideoAdapter implements VideoProviderAdapter {
  provider = 'minimax'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const model = record.model || config.model || DEFAULT_MODEL
    if (!model.toLowerCase().startsWith(H3_MODEL_PREFIX)) {
      throw new Error(`仅支持 MiniMax H3 系列模型（MiniMax-H3*），当前: ${model}`)
    }

    const prompt = (record.prompt || '').trim()
    const refImages = parseUrlArray(record.referenceImageUrls)
    const refVideos = parseUrlArray(record.referenceVideoUrls)
    const refAudios = parseUrlArray(record.referenceAudioUrls)
    const firstFrame = (record.firstFrameUrl || record.imageUrl || '').trim()
    const lastFrame = (record.lastFrameUrl || '').trim()

    if (!prompt) throw new Error('MiniMax H3 要求必须提供提示词（text content）')
    if (prompt.length > PROMPT_MAX_CHARS) {
      throw new Error(`提示词超长：MiniMax H3 上限 ${PROMPT_MAX_CHARS} 字符，当前 ${prompt.length}`)
    }

    const totalRefs = refImages.length + refVideos.length + refAudios.length + (firstFrame ? 1 : 0) + (lastFrame ? 1 : 0)
    if (refImages.length > REF_LIMITS.images || refVideos.length > REF_LIMITS.videos || refAudios.length > REF_LIMITS.audios || totalRefs > REF_LIMITS.total) {
      throw new Error(`参考素材超限：图片≤${REF_LIMITS.images}、视频≤${REF_LIMITS.videos}、音频≤${REF_LIMITS.audios}、总数≤${REF_LIMITS.total}`)
    }

    const content: any[] = [{ type: 'text', text: prompt }]
    if (firstFrame) content.push({ type: 'image_url', image_url: { url: firstFrame }, role: 'first_frame' })
    if (lastFrame) content.push({ type: 'image_url', image_url: { url: lastFrame }, role: 'last_frame' })
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
      duration: this.normalizeDuration(record.duration),
      resolution: this.normalizeResolution(record.resolution),
    }

    // 图生视频（有首帧）ratio 恒为 adaptive，省略；文生视频 ratio 必填
    if (!firstFrame) {
      const ratio = (record.aspectRatio || '').trim()
      body.ratio = VALID_RATIOS.has(ratio) ? ratio : '16:9'
    }

    return {
      url: joinProviderUrl(config.baseUrl, '/v2', '/video_generation'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    }
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    const taskId = result.task_id ?? result.task?.id
    const state = result.task?.status ?? result.status
    const videoUrl = result.task?.content?.url || result.content?.url || result.video_url
    if (videoUrl && (!state || state === 'succeeded')) {
      return { isAsync: false, videoUrl, taskId: taskId == null ? undefined : String(taskId), duration: result.task?.duration ?? result.duration }
    }
    if (taskId != null) return { isAsync: true, taskId: String(taskId) }
    throw new Error('No task_id or video url in response')
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/v2', `/query/video_generation/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): VideoPollResponse {
    // 官方响应为 { task: { status, content: { url }, error } }，兼容顶层平铺
    const task = result.task && typeof result.task === 'object' ? result.task : result
    const status = task.status

    if (status === 'succeeded') {
      return {
        status: 'completed',
        videoUrl: task.content?.url || task.video_url,
        duration: task.duration,
      }
    }
    if (status === 'failed' || status === 'cancelled') {
      const err = task.error
      const msg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err) || 'Video generation failed')
      const code = err && typeof err === 'object' && err.code ? `[${err.code}] ` : ''
      return { status: 'failed', error: `${code}${msg}` }
    }
    return { status: 'processing', stage: task.delivery?.status === 'transferring' ? 'transferring' : undefined }
  }

  extractVideoUrl(result: any): string | null {
    const task = result.task && typeof result.task === 'object' ? result.task : result
    return task.content?.url || task.video_url || null
  }

  private normalizeDuration(duration?: number | null): number {
    const parsed = Math.round(Number(duration || 5))
    if (!Number.isFinite(parsed)) return 5
    // MiniMax H3 支持 4-15 秒
    return Math.min(15, Math.max(4, parsed))
  }

  /** MiniMax 仅 768P / 2K 两档；项目侧 480p/720p 统一归到 768P，1080p/2K 归到 2K */
  private normalizeResolution(resolution?: string | null): string {
    const r = (resolution || '').toLowerCase()
    if (r === '2k' || r === '1080p') return '2K'
    return '768P'
  }
}
