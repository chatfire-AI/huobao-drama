import type { AIConfig, ImageGenerationRecord, VideoGenerationRecord } from './types'

function request(config: AIConfig, path: string, body?: unknown) {
  return {
    url: `${config.baseUrl.replace(/\/+$/, '')}${path}`,
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body,
  }
}

export class ComfyUIImageAdapter {
  provider = 'comfyui'
  buildGenerateRequest(config: AIConfig, record: ImageGenerationRecord) {
    return request(config, '/v1/images', { ...record, requestKey: `image-${record.id}` })
  }
  parseGenerateResponse(result: any) {
    if (!result.taskId) throw new Error('ComfyUI bridge did not return a task ID')
    return { isAsync: true, taskId: result.taskId }
  }
  buildPollRequest(config: AIConfig, taskId: string) {
    return request(config, `/v1/tasks/${encodeURIComponent(taskId)}`)
  }
  parsePollResponse(result: any) { return result }
  extractImageUrl(result: any) { return result.imageUrl || null }
  extractImageBase64() { return null }
}

export class ComfyUIVideoAdapter {
  provider = 'comfyui'
  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord) {
    return request(config, '/v1/videos', { ...record, requestKey: `video-${record.id}` })
  }
  parseGenerateResponse(result: any) {
    if (!result.taskId) throw new Error('ComfyUI bridge did not return a task ID')
    return { isAsync: true, taskId: result.taskId }
  }
  buildPollRequest(config: AIConfig, taskId: string) {
    return request(config, `/v1/tasks/${encodeURIComponent(taskId)}`)
  }
  parsePollResponse(result: any) { return result }
  extractVideoUrl(result: any) { return result.videoUrl || null }
}
