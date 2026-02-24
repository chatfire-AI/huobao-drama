import request from '@/utils/request'

export interface ExtractAudioRequest {
  video_url: string
}

export interface ExtractAudioResponse {
  audio_url: string
  duration: number
}

export interface BatchExtractAudioRequest {
  video_urls: string[]
}

export interface BatchExtractAudioResponse {
  results: ExtractAudioResponse[]
  total: number
}

export const audioAPI = {
  /**
   * 从视频URL提取音频
   */
  extractAudio(videoUrl: string) {
    return request.post<ExtractAudioResponse>('/audio/extract', { video_url: videoUrl })
  },

  /**
   * 批量从视频URL提取音频
   */
  batchExtractAudio(videoUrls: string[]) {
    return request.post<BatchExtractAudioResponse>('/audio/extract/batch', { video_urls: videoUrls })
  }
}
