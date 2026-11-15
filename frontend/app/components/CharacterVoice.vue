<template>
  <section class="character-voice" :aria-label="t('characterVoice.forCharacter', { name: character.name })" @click.stop @keydown.stop>
    <div class="voice-heading">
      <div class="voice-label"><AudioLines :size="14" /><span>{{ t('characterVoice.title') }}</span></div>
      <button type="button" class="btn btn-sm" :disabled="busy" @click="fileInput?.click()">
        <Loader2 v-if="busy" :size="12" class="animate-spin" />
        <Upload v-else :size="12" />
        {{ busy ? t('characterVoice.saving') : voiceUrl ? t('characterVoice.replace') : t('characterVoice.upload') }}
      </button>
      <input ref="fileInput" class="voice-file-input" type="file" accept=".mp3,.wav,.m4a,.aac,audio/mpeg,audio/wav,audio/mp4,audio/aac" :disabled="busy" :aria-label="t('characterVoice.upload')" @change="upload" />
    </div>
    <template v-if="voiceUrl">
      <div class="voice-file-row">
        <span class="voice-filename" :title="voiceName">{{ voiceName }}</span>
        <button type="button" class="voice-remove" :disabled="busy" @click="remove">{{ t('characterVoice.remove') }}</button>
      </div>
      <audio :key="voiceUrl" :src="voiceUrl" controls preload="none" data-character-voice :aria-label="t('characterVoice.preview', { name: character.name })" @play="onPlay" @error="playbackError = true" />
      <p v-if="playbackError" class="voice-error" role="alert">{{ t('characterVoice.playbackError') }}</p>
    </template>
    <p v-else class="voice-hint">{{ t('characterVoice.empty') }}</p>
    <p class="voice-formats">{{ t('characterVoice.formats') }}</p>
  </section>
</template>

<script setup lang="ts">
import { AudioLines, Loader2, Upload } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { characterAPI, type CharacterVoice } from '~/composables/useApi'
import { toastError } from '~/composables/useToast'

const props = defineProps<{
  character: {
    id: number
    name?: string
    voice_audio_url?: string | null
    voice_audio_name?: string | null
    voiceAudioUrl?: string | null
    voiceAudioName?: string | null
  }
}>()
const emit = defineEmits<{ updated: [id: number, voice: CharacterVoice] }>()
const { t } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
// 卡片与详情弹窗共用同一个角色的上传锁。
const busyIds = useState<number[]>('character-voice-busy', () => [])
const busy = computed(() => busyIds.value.includes(props.character.id))
const playbackError = ref(false)
const voiceUrl = computed(() => {
  const value = props.character.voice_audio_url ?? props.character.voiceAudioUrl ?? ''
  return value && !value.startsWith('/') && !/^https?:\/\//i.test(value) ? `/${value}` : value
})
const voiceName = computed(() => props.character.voice_audio_name || props.character.voiceAudioName || t('characterVoice.sample'))
watch(voiceUrl, () => { playbackError.value = false })

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || busy.value) return
  if (!/\.(mp3|wav|m4a|aac)$/i.test(file.name)) { toast.error(t('characterVoice.invalidFormat')); return }
  if (!file.size) { toast.error(t('characterVoice.emptyFile')); return }
  if (file.size > 20 * 1024 * 1024) { toast.error(t('characterVoice.tooLarge')); return }
  const id = props.character.id
  busyIds.value = [...busyIds.value, id]
  try {
    const voice = await characterAPI.uploadVoice(id, file)
    emit('updated', id, voice)
    toast.success(t('characterVoice.saved'))
  } catch (error) {
    toastError(error)
  } finally {
    busyIds.value = busyIds.value.filter(value => value !== id)
  }
}

async function remove() {
  if (busy.value) return
  const id = props.character.id
  busyIds.value = [...busyIds.value, id]
  try {
    const voice = await characterAPI.removeVoice(id)
    emit('updated', id, voice)
    toast.success(t('characterVoice.removed'))
  } catch (error) {
    toastError(error)
  } finally {
    busyIds.value = busyIds.value.filter(value => value !== id)
  }
}

function onPlay(event: Event) {
  playbackError.value = false
  document.querySelectorAll<HTMLAudioElement>('audio[data-character-voice]').forEach(audio => {
    if (audio !== event.target) audio.pause()
  })
}
</script>

<style scoped>
.character-voice { min-width: 0; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--border); padding-top: 12px; margin-top: 4px; cursor: default; }
.voice-heading, .voice-label, .voice-file-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.voice-heading, .voice-file-row { justify-content: space-between; }
.voice-label { color: var(--text-1); font-size: 12px; font-weight: 600; }
.voice-label svg { color: var(--text-3); flex-shrink: 0; }
.voice-heading .btn { flex-shrink: 0; }
.voice-file-input { display: none; }
.voice-filename { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--text-2); }
.voice-remove { flex-shrink: 0; background: none; border: none; padding: 4px; color: var(--text-3); font: inherit; font-size: 12px; cursor: pointer; transition: color 0.15s; }
.voice-remove:hover { color: var(--action-danger); }
.voice-remove:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
.voice-remove:disabled { opacity: 0.5; cursor: default; }
.character-voice audio { display: block; width: 100%; min-width: 0; height: 36px; }
.voice-hint, .voice-formats, .voice-error { margin: 0; font-size: 11px; line-height: 1.6; }
.voice-hint { color: var(--text-2); }
.voice-formats { color: var(--text-3); }
.voice-error { color: var(--action-danger); }
</style>
