import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { aiAPI } from '@/api/ai'
import type { AIServiceConfig, AIServiceType } from '@/types/ai'

interface ModelOption {
  label: string
  value: string
  provider: string
  priority: number
}

export const useAIConfigStore = defineStore('aiConfig', () => {
  const textConfigs = ref<AIServiceConfig[]>([])
  const imageConfigs = ref<AIServiceConfig[]>([])
  const videoConfigs = ref<AIServiceConfig[]>([])
  const audioConfigs = ref<AIServiceConfig[]>([])
  const lipsyncConfigs = ref<AIServiceConfig[]>([])
  const loading = ref(false)

  const selectedTextModel = ref('')
  const selectedImageModel = ref('')
  const selectedVideoModel = ref('')
  const selectedAudioModel = ref('')
  const selectedLipsyncModel = ref('')

  function extractModelOptions(configs: AIServiceConfig[]): ModelOption[] {
    const options: ModelOption[] = []
    const active = configs.filter((c) => c.is_active)

    for (const config of active) {
      const models = Array.isArray(config.model) ? config.model : [config.model]
      for (const model of models) {
        if (model && !options.some((o) => o.value === model)) {
          options.push({
            label: `${model} (${config.name})`,
            value: model,
            provider: config.provider || '',
            priority: config.priority || 0
          })
        }
      }
    }

    return options.sort((a, b) => b.priority - a.priority)
  }

  const textModelOptions = computed(() => extractModelOptions(textConfigs.value))
  const imageModelOptions = computed(() => extractModelOptions(imageConfigs.value))
  const videoModelOptions = computed(() => extractModelOptions(videoConfigs.value))
  const audioModelOptions = computed(() => extractModelOptions(audioConfigs.value))
  const lipsyncModelOptions = computed(() => extractModelOptions(lipsyncConfigs.value))

  const hasTextConfig = computed(() => textConfigs.value.some((c) => c.is_active))
  const hasImageConfig = computed(() => imageConfigs.value.some((c) => c.is_active))
  const hasVideoConfig = computed(() => videoConfigs.value.some((c) => c.is_active))
  const hasAudioConfig = computed(() => audioConfigs.value.some((c) => c.is_active))
  const hasLipsyncConfig = computed(() => lipsyncConfigs.value.some((c) => c.is_active))

  async function loadConfigs(type?: AIServiceType) {
    loading.value = true
    try {
      if (!type || type === 'text') {
        textConfigs.value = await aiAPI.list('text')
      }
      if (!type || type === 'image') {
        imageConfigs.value = await aiAPI.list('image')
      }
      if (!type || type === 'video') {
        videoConfigs.value = await aiAPI.list('video')
      }
      if (!type || type === 'audio') {
        audioConfigs.value = await aiAPI.list('audio')
      }
      if (!type || type === 'lipsync') {
        lipsyncConfigs.value = await aiAPI.list('lipsync')
      }
    } catch (error) {
      console.error('Failed to load AI configs:', error)
    } finally {
      loading.value = false
    }
  }

  function loadSavedSelections(storageKey = 'ai-model-selections') {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.textModel) selectedTextModel.value = parsed.textModel
        if (parsed.imageModel) selectedImageModel.value = parsed.imageModel
        if (parsed.videoModel) selectedVideoModel.value = parsed.videoModel
        if (parsed.audioModel) selectedAudioModel.value = parsed.audioModel
        if (parsed.lipsyncModel) selectedLipsyncModel.value = parsed.lipsyncModel
      }
    } catch {
      // ignore
    }
  }

  function saveSelections(storageKey = 'ai-model-selections') {
    localStorage.setItem(storageKey, JSON.stringify({
      textModel: selectedTextModel.value,
      imageModel: selectedImageModel.value,
      videoModel: selectedVideoModel.value,
      audioModel: selectedAudioModel.value,
      lipsyncModel: selectedLipsyncModel.value
    }))
  }

  return {
    textConfigs,
    imageConfigs,
    videoConfigs,
    audioConfigs,
    lipsyncConfigs,
    loading,
    selectedTextModel,
    selectedImageModel,
    selectedVideoModel,
    selectedAudioModel,
    selectedLipsyncModel,
    textModelOptions,
    imageModelOptions,
    videoModelOptions,
    audioModelOptions,
    lipsyncModelOptions,
    hasTextConfig,
    hasImageConfig,
    hasVideoConfig,
    hasAudioConfig,
    hasLipsyncConfig,
    loadConfigs,
    loadSavedSelections,
    saveSelections
  }
})