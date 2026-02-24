import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { imageAPI } from '@/api/image'
import { dramaAPI } from '@/api/drama'
import { characterLibraryAPI } from '@/api/character-library'
import { usePolling } from './usePolling'
import type { Character, Scene } from '@/types/drama'

interface GenerationState {
  [id: string]: 'idle' | 'generating' | 'completed' | 'failed'
}

export function useImageGeneration() {
  const { t } = useI18n()
  const { poll, stopAll } = usePolling()

  const characterGenState = ref<GenerationState>({})
  const sceneGenState = ref<GenerationState>({})
  const selectedCharacterIds = ref<number[]>([])
  const selectedSceneIds = ref<string[]>([])

  async function generateCharacterImage(
    character: Character,
    onRefresh: () => Promise<void>
  ) {
    const id = character.id
    characterGenState.value[id] = 'generating'

    try {
      await characterLibraryAPI.generateCharacterImage(String(id))
      ElMessage.success(t('message.characterImageStarted'))

      poll(async () => {
        await onRefresh()
        const updated = characterGenState.value[id]
        return updated === 'completed' || updated === 'failed'
      }, { interval: 6000, maxAttempts: 100 })
    } catch (error: unknown) {
      characterGenState.value[id] = 'failed'
      const message = error instanceof Error ? error.message : t('message.generateFailed')
      ElMessage.error(message)
    }
  }

  async function batchGenerateCharacterImages(
    characters: Character[],
    onRefresh: () => Promise<void>
  ) {
    if (selectedCharacterIds.value.length === 0) {
      ElMessage.warning(t('message.selectCharactersFirst'))
      return
    }

    const selected = characters.filter((c) =>
      selectedCharacterIds.value.includes(c.id)
    )

    for (const character of selected) {
      await generateCharacterImage(character, onRefresh)
    }
  }

  async function generateSceneImage(
    scene: Scene,
    onRefresh: () => Promise<void>
  ) {
    const id = scene.id
    sceneGenState.value[id] = 'generating'

    try {
      await dramaAPI.generateSceneImage({ scene_id: Number(id) })
      ElMessage.info(t('workflow.sceneImageGenerating'))

      poll(async () => {
        await onRefresh()
        const updated = sceneGenState.value[id]
        return updated === 'completed' || updated === 'failed'
      }, { interval: 6000, maxAttempts: 100 })
    } catch (error: unknown) {
      sceneGenState.value[id] = 'failed'
      const message = error instanceof Error ? error.message : t('message.generateFailed')
      ElMessage.error(message)
    }
  }

  async function batchGenerateSceneImages(
    scenes: Scene[],
    onRefresh: () => Promise<void>
  ) {
    if (selectedSceneIds.value.length === 0) {
      ElMessage.warning(t('message.selectScenesFirst'))
      return
    }

    const selected = scenes.filter((s) =>
      selectedSceneIds.value.includes(s.id)
    )

    for (const scene of selected) {
      await generateSceneImage(scene, onRefresh)
    }
  }

  function updateCharacterStatus(characters: Character[]) {
    for (const char of characters) {
      const current = characterGenState.value[char.id]
      if (current === 'generating') {
        if (char.image_generation_status === 'completed' || char.local_path || char.image_url) {
          characterGenState.value[char.id] = 'completed'
        } else if (char.image_generation_status === 'failed') {
          characterGenState.value[char.id] = 'failed'
        }
      }
    }
  }

  function updateSceneStatus(scenes: Scene[]) {
    for (const scene of scenes) {
      const current = sceneGenState.value[scene.id]
      if (current === 'generating') {
        if (scene.image_generation_status === 'completed' || scene.local_path || scene.image_url) {
          sceneGenState.value[scene.id] = 'completed'
        } else if (scene.image_generation_status === 'failed') {
          sceneGenState.value[scene.id] = 'failed'
        }
      }
    }
  }

  return {
    characterGenState,
    sceneGenState,
    selectedCharacterIds,
    selectedSceneIds,
    generateCharacterImage,
    batchGenerateCharacterImages,
    generateSceneImage,
    batchGenerateSceneImages,
    updateCharacterStatus,
    updateSceneStatus,
    stopAll
  }
}
