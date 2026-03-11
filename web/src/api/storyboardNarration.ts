import request from '../utils/request'

export interface StoryboardNarrationResult {
  storyboard_id: number
  storyboard_number: number
  narration?: string
  updated: boolean
  skipped?: boolean
  error?: string
}

export interface BatchGenerateNarrationResponse {
  results: StoryboardNarrationResult[]
  total: number
  success_count: number
  failed_count: number
  skipped_count: number
}

export const storyboardNarrationAPI = {
  generateNovelNarrations(data: {
    storyboard_ids: number[]
    overwrite?: boolean
    model?: string
  }) {
    return request.post<BatchGenerateNarrationResponse>('/storyboards/narrations/generate', data)
  }
}
