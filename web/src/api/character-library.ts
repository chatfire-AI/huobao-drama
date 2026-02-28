import request from '../utils/request'

export interface CharacterLibraryItem {
  id: string
  name: string
  category?: string
  image_url: string
  description?: string
  tags?: string
  source_type: string
  created_at: string
  updated_at: string
}

export interface CreateLibraryItemRequest {
  name: string
  category?: string
  image_url: string
  description?: string
  tags?: string
  source_type?: string
}

export interface CharacterLibraryQuery {
  page?: number
  page_size?: number
  category?: string
  source_type?: string
  keyword?: string
}

export const characterLibraryAPI = {
  // 获取角色库列表
  list(params?: CharacterLibraryQuery) {
    return request.get<{
      items: CharacterLibraryItem[]
      pagination: {
        page: number
        page_size: number
        total: number
        total_pages: number
      }
    }>('/character-library', { params })
  },

  // 创建角色库项
  create(data: CreateLibraryItemRequest) {
    return request.post<CharacterLibraryItem>('/character-library', data)
  },

  // 获取角色库项详情
  get(id: string) {
    return request.get<CharacterLibraryItem>(`/character-library/${id}`)
  },

  // 删除角色库项
  delete(id: string) {
    return request.delete(`/character-library/${id}`)
  },

  // 上传角色图片
  uploadCharacterImage(characterId: string, imageUrl: string) {
    return request.put(`/characters/${characterId}/image`, { image_url: imageUrl })
  },

  // 从角色库应用形象
  applyFromLibrary(characterId: string, libraryItemId: string) {
    return request.put(`/characters/${characterId}/image-from-library`, {
      library_item_id: libraryItemId
    })
  },

  // 将角色添加到角色库
  addCharacterToLibrary(characterId: string, category?: string) {
    return request.post<CharacterLibraryItem>(`/characters/${characterId}/add-to-library`, {
      category
    })
  },

  // AI生成角色形象
  generateCharacterImage(characterId: string, model?: string) {
    return request.post<{ image_url: string }>(`/characters/${characterId}/generate-image`, {
      model
    })
  },

  // 批量生成角色形象
  batchGenerateCharacterImages(characterIds: string[], model?: string) {
    return request.post<{ message: string; count: number }>('/characters/batch-generate-images', {
      character_ids: characterIds,
      model
    })
  },

  // 更新角色信息
  updateCharacter(characterId: number, data: {
    name?: string
    appearance?: string
    personality?: string
    description?: string
    image_url?: string
    local_path?: string
  }) {
    return request.put(`/characters/${characterId}`, data)
  },

  // 删除角色
  deleteCharacter(characterId: number) {
    return request.delete(`/characters/${characterId}`)
  },

  // 从剧本提取角色
  extractFromEpisode(episodeId: number) {
    return request.post<{ task_id: string; message: string }>(`/episodes/${episodeId}/characters/extract`)
  },

  // 批量从剧本提取角色
  batchExtractFromEpisodes(dramaId: string, episodeIds: number[]) {
    return request.post<{ task_id: string; message: string }>(
      `/dramas/${dramaId}/characters/batch-extract`,
      { episode_ids: episodeIds }
    )
  }
}
