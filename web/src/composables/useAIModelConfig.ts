import { ref, computed } from 'vue'
import { aiAPI } from '@/api/ai'
import type { AIServiceConfig, AIServiceType } from '@/types/ai'

interface ModelOption {
  label: string
  value: string
  provider: string
  priority: number
}

export function useAIModelConfig() {
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

  const textModelOptions = computed<ModelOption[]>(() =>
    extractModelOptions(textConfigs.value)
  )

  const imageModelOptions = computed<ModelOption[]>(() =>
    extractModelOptions(imageConfigs.value)
  )

  const videoModelOptions = computed<ModelOption[]>(() =>
    extractModelOptions(videoConfigs.value)
  )

  const audioModelOptions = computed<ModelOption[]>(() =>
    extractModelOptions(audioConfigs.value)
  )

  const lipsyncModelOptions = computed<ModelOption[]>(() =>
    extractModelOptions(lipsyncConfigs.value)
  )

  function extractModelOptions(configs: AIServiceConfig[]): ModelOption[] {
    const options: ModelOption[] = []
    const active = configs.filter((c) => c.is_active)

    for (const config of active) {
      const models = (Array.isArray(config.model) ? config.model : [config.model]).filter((m): m is string => !!m)
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

  function loadSavedSelections(storageKey: string) {
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
      // ignore parse errors
    }
  }

  function saveSelections(storageKey: string) {
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
    loadConfigs,
    loadSavedSelections,
    saveSelections
  }
}
