import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { dramaAPI } from '@/api/drama'
import type { Drama, Character, Scene } from '@/types/drama'
import type { Prop } from '@/types/prop'

export const useDramaStore = defineStore('drama', () => {
  const currentDrama = ref<Drama | null>(null)
  const characters = ref<Character[]>([])
  const scenes = ref<Scene[]>([])
  const props = ref<Prop[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const dramaId = computed(() => currentDrama.value?.id || '')
  const episodes = computed(() => currentDrama.value?.episodes || [])

  async function loadDrama(id: string) {
    loading.value = true
    error.value = null
    try {
      currentDrama.value = await dramaAPI.get(id)
      characters.value = currentDrama.value.characters || []
      scenes.value = currentDrama.value.scenes || []
      props.value = currentDrama.value.props || []
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load drama'
      currentDrama.value = null
    } finally {
      loading.value = false
    }
  }

  async function loadScenes(id: string) {
    try {
      const backgrounds = await dramaAPI.getBackgrounds(id)
      if (Array.isArray(backgrounds)) {
        scenes.value = backgrounds
      }
    } catch (err) {
      console.error('Failed to load scenes:', err)
    }
  }

  function reset() {
    currentDrama.value = null
    characters.value = []
    scenes.value = []
    props.value = []
    loading.value = false
    error.value = null
  }

  return {
    currentDrama,
    characters,
    scenes,
    props,
    loading,
    error,
    dramaId,
    episodes,
    loadDrama,
    loadScenes,
    reset
  }
})
