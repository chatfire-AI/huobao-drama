import { ref, computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import { dramaAPI } from '@/api/drama'
import type { Episode, Character, Scene } from '@/types/drama'

interface EpisodeCache {
  data: Episode
  loading: boolean
  error: string | null
  lastFetch: number
}

interface EpisodeOperations {
  refresh: () => Promise<void>
  set: (params: SetOperationParams) => Promise<void>
  del: (params: DeleteOperationParams) => Promise<void>
  saveScript: (content: string) => Promise<void>
  extractData: () => Promise<void>
  generateImages: (options?: GenerateImageOptions) => Promise<void>
  generateStoryboards: () => Promise<void>
}

interface SetOperationParams {
  type: 'character' | 'scene' | 'storyboard'
  data: any
}

interface DeleteOperationParams {
  type: 'character' | 'scene' | 'storyboard'
  id: string | number
}

interface GenerateImageOptions {
  characterIds?: number[]
  sceneIds?: string[]
}

export interface CachedEpisode {
  value: Episode
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  set: (params: SetOperationParams) => Promise<void>
  del: (params: DeleteOperationParams) => Promise<void>
  saveScript: (content: string) => Promise<void>
  extractData: () => Promise<void>
  generateImages: (options?: GenerateImageOptions) => Promise<void>
  generateStoryboards: () => Promise<void>
}

export const useEpisodeStore = defineStore('episode', () => {
  const caches = reactive<Map<string, EpisodeCache>>(new Map())

  const getCacheByEpisodeId = (episodeId: string): CachedEpisode => {
    if (!caches.has(episodeId)) {
      caches.set(episodeId, {
        data: {} as Episode,
        loading: false,
        error: null,
        lastFetch: 0
      })
      fetchEpisode(episodeId)
    }

    const cache = caches.get(episodeId)!

    const operations: EpisodeOperations = {
      async refresh() {
        await fetchEpisode(episodeId, true)
      },

      async set(params: SetOperationParams) {
        const { type, data } = params
        
        switch (type) {
          case 'character':
            await dramaAPI.saveCharacters(cache.data.drama_id, [data], episodeId)
            await fetchEpisode(episodeId, true)
            break
          case 'scene':
            await dramaAPI.updateScene(data.id, data)
            await fetchEpisode(episodeId, true)
            break
          case 'storyboard':
            await dramaAPI.updateStoryboard(data.id, data)
            await fetchEpisode(episodeId, true)
            break
        }
      },

      async del(params: DeleteOperationParams) {
        const { type, id } = params
        
        switch (type) {
          case 'character':
            const characters = cache.data.characters?.filter(c => c.id !== id) || []
            await dramaAPI.saveCharacters(cache.data.drama_id, characters, episodeId)
            await fetchEpisode(episodeId, true)
            break
          case 'scene':
            break
          case 'storyboard':
            break
        }
      },

      async saveScript(content: string) {
        const parts = episodeId.split('-')
        const dramaId = parts[0]
        const episodeNumber = parseInt(parts.length > 1 ? parts[1] : cache.data.episode_number?.toString() || '1')
        
        await dramaAPI.saveEpisodes(dramaId, [{
          episode_number: episodeNumber,
          script_content: content
        }])
        
        await fetchEpisode(episodeId, true)
      },

      async extractData() {
        await dramaAPI.extractBackgrounds(episodeId)
        await fetchEpisode(episodeId, true)
      },

      async generateImages(options?: GenerateImageOptions) {
        const promises: Promise<any>[] = []
        
        if (options?.characterIds && options.characterIds.length > 0) {
          options.characterIds.forEach(id => {
            const character = cache.data.characters?.find(c => c.id === id)
            if (character) {
              promises.push(
                dramaAPI.generateSceneImage({
                  scene_id: character.id.toString(),
                  prompt: character.appearance || character.description || character.name,
                  model: undefined
                })
              )
            }
          })
        }

        if (options?.sceneIds && options.sceneIds.length > 0) {
          options.sceneIds.forEach(sceneId => {
            promises.push(
              dramaAPI.generateSceneImage({
                scene_id: sceneId,
                model: undefined
              })
            )
          })
        }
        
        if (promises.length > 0) {
          await Promise.allSettled(promises)
        }

        await fetchEpisode(episodeId, true)
      },
      
      async generateStoryboards() {
        await dramaAPI.generateStoryboard(episodeId)
        await fetchEpisode(episodeId, true)
      }
    }

    return {
      get value() {
        return cache.data
      },
      get loading() {
        return cache.loading
      },
      get error() {
        return cache.error
      },
      ...operations
    }
  }

  const fetchEpisode = async (episodeId: string, force = false) => {
    const cache = caches.get(episodeId)
    if (!cache) return

    const now = Date.now()
    if (!force && cache.lastFetch && (now - cache.lastFetch) < 3000) {
      return
    }

    cache.loading = true
    cache.error = null

    try {
      const parts = episodeId.split('-')
      const dramaId = parts[0]
      const episodeNumber = parts.length > 1 ? parseInt(parts[1]) : null
      
      const drama = await dramaAPI.get(dramaId)
      
      let episode: Episode | undefined
      if (episodeNumber !== null) {
        episode = drama.episodes?.find(e => e.episode_number === episodeNumber)
      } else {
        episode = drama.episodes?.find(e => e.id === episodeId)
      }
      
      if (episode) {
        cache.data = episode
        cache.lastFetch = now
      } else {
        cache.error = '未找到章节数据'
      }
    } catch (error: any) {
      cache.error = error.message || '加载章节数据失败'
      console.error('Failed to fetch episode:', error)
    } finally {
      cache.loading = false
    }
  }

  const clearCache = (episodeId?: string) => {
    if (episodeId) {
      caches.delete(episodeId)
    } else {
      caches.clear()
    }
  }

  return {
    getCacheByEpisodeId,
    clearCache
  }
})
