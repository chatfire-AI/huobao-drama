import type { GenerateCharactersRequest, ParseScriptRequest, ParseScriptResult } from '../types/generation'
import request from '../utils/request'

export const generationAPI = {
  generateCharacters(data: GenerateCharactersRequest) {
    return request.post<{ task_id: string; status: string; message: string }>('/generation/characters', data)
  },

  generateStoryboard(episodeId: string, model?: string) {
    return request.post<{ task_id: string; status: string; message: string }>(`/episodes/${episodeId}/storyboards`, { model })
  },

  // Compatibility alias used by old workflow pages.
  generateShots(episodeId: string, model?: string) {
    return request.post<{ task_id: string; status: string; message: string }>(`/episodes/${episodeId}/storyboards`, { model })
  },

  // The backend currently has no dedicated parse endpoint, so we do a local fallback parse.
  parseScript(data: ParseScriptRequest): Promise<ParseScriptResult> {
    const lines = data.script_content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    const scenes = lines.map((line, idx) => ({
      storyboard_number: idx + 1,
      title: line.length > 20 ? `${line.slice(0, 20)}...` : line,
      location: '',
      time: '',
      characters: '',
      dialogue: line
    }))

    return Promise.resolve({
      summary: lines.slice(0, 3).join(' ').slice(0, 200),
      characters: [],
      episodes: [
        {
          episode_number: 1,
          title: '第1集',
          description: '',
          script_content: data.script_content,
          duration: Math.max(60, lines.length * 8),
          scenes
        }
      ]
    })
  },

  getTaskStatus(taskId: string) {
    return request.get<{
      id: string
      type: string
      status: string
      progress: number
      message?: string
      error?: string
      result?: string
      created_at: string
      updated_at: string
      completed_at?: string
    }>(`/tasks/${taskId}`)
  }
}
