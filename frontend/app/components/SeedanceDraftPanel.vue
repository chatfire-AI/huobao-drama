<template>
  <section class="draft-panel" :aria-label="t('draft.title')">
    <strong>{{ t('draft.title') }}</strong>
    <p>{{ t('draft.hint') }}</p>
    <button class="btn btn-sm" :disabled="busy || running || (!prompt.trim() && !referenceImages.length)" @click="generate">
      {{ busy || running ? t('draft.running') : t('draft.generate') }}
    </button>
    <div v-if="draft" class="draft-result">
      <span>{{ t('draft.preview') }}</span>
      <video v-if="localPath" :src="'/' + localPath.replace(/^\/+/, '')" controls preload="metadata" playsinline />
      <p v-if="draft.status === 'failed'">{{ draft.errorMsg || draft.error_msg }}</p>
      <p v-if="child?.status === 'failed'" role="alert">{{ child.errorMsg || child.error_msg }}</p>
      <button v-if="recoverable" class="btn btn-sm" :disabled="busy || running" @click="recover">{{ t('episode.recovery.restoreDownload') }}</button>
      <p>{{ expired ? t('draft.expired') : t('draft.validity') }}</p>
      <button v-if="draft.status === 'completed'" class="btn btn-primary btn-sm"
        :disabled="busy || running || expired || !!child" @click="finalize">
        {{ child ? t('draft.submitted') : t('draft.finalize') }}
      </button>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { taskAPI } from '~/composables/useApi'

const props = defineProps({
  storyboardId: { type: Number, required: true }, dramaId: [Number, String],
  configId: Number, model: String, prompt: { type: String, default: '' },
  referenceImages: { type: Array, default: () => [] }, duration: Number, aspectRatio: String,
})
const emit = defineEmits(['updated'])
const { t } = useI18n()
const rows = ref([]), busy = ref(false), error = ref(''), clock = ref(Date.now())
const params = task => { try { return JSON.parse(task?.params || '{}') } catch { return {} } }
const draft = computed(() => rows.value.filter(task => params(task).draft === true).sort((a, b) => b.id - a.id)[0])
const child = computed(() => draft.value && rows.value.find(task => params(task).draftSourceId === draft.value.id))
const running = computed(() => rows.value.some(task => task.status === 'processing'))
const recoverable = computed(() => [child.value, draft.value].find(task => task?.status === 'failed'
  && (task.errorCode || task.error_code) !== 'generation_failed'
  && (task.taskId || task.task_id || task.resultUrl || task.result_url)))
const localPath = computed(() => draft.value?.localPath || draft.value?.local_path || '')
const expired = computed(() => {
  if (!draft.value) return false
  const created = Date.parse(draft.value.createdAt || draft.value.created_at)
  const days = created >= Date.parse('2026-10-28T10:00:00+08:00') ? 14 : 7
  return !Number.isFinite(created) || clock.value >= created + days * 86400000
})
async function refresh() {
  const id = props.storyboardId
  try {
    const result = await taskAPI.list({ type: 'video', storyboard_id: id })
    if (id !== props.storyboardId) return
    rows.value = result || []
    clock.value = Date.now()
  } catch (e) { if (id === props.storyboardId) error.value = e.message }
}
async function generate() {
  if (busy.value || running.value || !window.confirm(t('draft.confirmPreview'))) return
  busy.value = true; error.value = ''
  try {
    const latest = [...rows.value].sort((a, b) => b.id - a.id)[0]
    await taskAPI.generate({ type: 'video', draft: true, force_new: latest?.status === 'failed', storyboard_id: props.storyboardId,
      drama_id: props.dramaId, config_id: props.configId, model: props.model,
      prompt: props.prompt, reference_image_urls: props.referenceImages,
      duration: props.duration, aspect_ratio: props.aspectRatio, resolution: '480p', generate_audio: true })
    await refresh(); emit('updated')
  } catch (e) { error.value = e.message } finally { busy.value = false }
}
async function finalize() {
  if (!draft.value || busy.value || !window.confirm(t('draft.confirmFinal'))) return
  busy.value = true; error.value = ''
  try {
    await taskAPI.finalize(draft.value.id)
    await refresh(); emit('updated')
  } catch (e) { error.value = e.message } finally { busy.value = false }
}
async function recover() {
  if (!recoverable.value || busy.value) return
  busy.value = true; error.value = ''
  try { await taskAPI.recover(recoverable.value.id); await refresh(); emit('updated') }
  catch (e) { error.value = e.message } finally { busy.value = false }
}
watch(() => props.storyboardId, () => { rows.value = []; error.value = ''; void refresh() }, { immediate: true })
const timer = setInterval(async () => {
  const wasRunning = running.value
  await refresh()
  if (wasRunning && !running.value) emit('updated')
}, 3000)
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.draft-panel { padding: 12px; border: 1px solid var(--border-color, #d8dce3); border-radius: 10px; min-width: 0; }
.draft-panel p { font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; margin: 8px 0; }
.draft-panel button { white-space: normal; height: auto; min-height: 32px; }
.draft-result { display: grid; gap: 8px; margin-top: 12px; }
.draft-result video { width: 100%; max-height: 240px; background: #111; }
</style>
