import type {
  CreateDramaRequest,
  Drama,
  DramaListQuery,
  DramaStats,
  UpdateDramaRequest
} from '../types/drama'
import request from '../utils/request'

export const dramaAPI = {
  list(params?: DramaListQuery) {
    return request.get<{
      items: Drama[]
      pagination: {
        page: number
        page_size: number
        total: number
        total_pages: number
      }
    }>('/dramas', { params })
  },

  create(data: CreateDramaRequest) {
    return request.post<Drama>('/dramas', data)
  },

  get(id: string) {
    return request.get<Drama>(`/dramas/${id}`)
  },

  update(id: string, data: UpdateDramaRequest) {
    return request.put<Drama>(`/dramas/${id}`, data)
  },

  delete(id: string) {
    return request.delete(`/dramas/${id}`)
  },

  getStats() {
    return request.get<DramaStats>('/dramas/stats')
  },

  saveOutline(id: string, data: { title: string; summary: string; genre?: string; tags?: string[] }) {
    return request.put(`/dramas/${id}/outline`, data)
  },

  getCharacters(dramaId: string) {
    return request.get(`/dramas/${dramaId}/characters`)
  },

  saveCharacters(id: string, data: any[], episodeId?: string) {
    return request.put(`/dramas/${id}/characters`, {
      characters: data,
      episode_id: episodeId ? parseInt(episodeId) : undefined
    })
  },

  updateCharacter(id: number, data: any) {
    return request.put(`/characters/${id}`, data)
  },

  saveEpisodes(id: string, data: any[]) {
    return request.put(`/dramas/${id}/episodes`, { episodes: data })
  },

  saveProgress(id: string, data: { current_step: string; step_data?: any }) {
    return request.put(`/dramas/${id}/progress`, data)
  },

  generateStoryboard(episodeId: string) {
    return request.post(`/episodes/${episodeId}/storyboards`)
  },

  getBackgrounds(episodeId: string) {
    return request.get(`/images/episode/${episodeId}/backgrounds`)
  },

  extractBackgrounds(episodeId: string, model?: string) {
    return request.post<{ task_id: string; status: string; message: string }>(`/images/episode/${episodeId}/backgrounds/extract`, { model })
  },

  batchGenerateBackgrounds(episodeId: string) {
    return request.post(`/images/episode/${episodeId}/batch`)
  },

  generateSingleBackground(backgroundId: number, dramaId: string, prompt: string) {
    return request.post('/images', {
      background_id: backgroundId,
      drama_id: dramaId,
      prompt: prompt
    })
  },

  getStoryboards(episodeId: string) {
    return request.get(`/episodes/${episodeId}/storyboards`)
  },

  updateStoryboard(storyboardId: string, data: any) {
    return request.put(`/storyboards/${storyboardId}`, data)
  },

  updateScene(sceneId: string, data: {
    background_id?: string;
    characters?: string[];
    location?: string;
    time?: string;
    action?: string;
    dialogue?: string;
    description?: string;
    duration?: number;
    image_url?: string;
  }) {
    return request.put(`/scenes/${sceneId}`, data)
  },

  createScene(data: {
    drama_id: number;
    location: string;
    prompt?: string;
    description?: string;
    image_url?: string;
  }) {
    return request.post('/scenes', data)
  },

  generateSceneImage(data: { scene_id: number; prompt?: string; model?: string }) {
    return request.post<{ image_generation: { id: number } }>('/scenes/generate-image', data)
  },

  updateScenePrompt(sceneId: string, prompt: string) {
    return request.put(`/scenes/${sceneId}/prompt`, { prompt })
  },

  deleteScene(sceneId: string) {
    return request.delete(`/scenes/${sceneId}`)
  },

  // 完成集数制作（触发视频合成）
  finalizeEpisode(episodeId: string, timelineData?: any) {
    return request.post(`/episodes/${episodeId}/finalize`, timelineData || {})
  },

  createStoryboard(data: {
    episode_id: number;
    storyboard_number: number;
    title?: string;
    description?: string;
    action?: string;
    dialogue?: string;
    scene_id?: number;
    duration: number;
  }) {
    return request.post('/storyboards', data)
  },

  deleteStoryboard(storyboardId: number) {
    return request.delete(`/storyboards/${storyboardId}`)
  },

  // 获取镜头的所有帧提示词
  getFramePrompts(storyboardId: number) {
    return request.get<{ frame_prompts: any[] }>(`/storyboards/${storyboardId}/frame-prompts`);
  }
}
