<template>
  <div class="asset-prompt-batch">
    <button class="btn btn-sm" :disabled="busy || disabled || !missing" @click="start">
      {{ status?.status === 'running'
        ? t('episode.assetPromptBatch.progress', { done: status.completed + status.failed, total: status.total })
        : t('episode.assetPromptBatch.start', { count: missing }) }}
    </button>
    <span v-if="status?.status === 'done'" role="status">{{ t('episode.assetPromptBatch.saved', { count: status.completed }) }}</span>
    <span v-if="error || status?.status === 'error'" role="alert">{{ error || t('episode.assetPromptBatch.retry', { count: status.failed }) }}</span>
  </div>
</template>

<script setup>
import { api } from '~/composables/useApi'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps({ episodeId: Number, missing: Number, disabled: Boolean, model: String, configId: Number })
const emit = defineEmits(['refresh'])
const status = ref(null)
const busy = ref(false)
const error = ref('')
let timer, revision = 0

async function refreshStatus(id, ticket, retry = false) {
  try {
    const response = await api.get(`/episodes/${id}/asset-prompts-status`)
    if (ticket !== revision) return
    const next = response?.status ? response : null
    if (status.value?.completed !== next?.completed && next?.completed > 0) emit('refresh')
    status.value = next
    error.value = ''
    busy.value = next?.status === 'running'
    if (busy.value) timer = setTimeout(() => refreshStatus(id, ticket, true), 2000)
  } catch {
    if (ticket !== revision) return
    error.value = t('episode.assetPromptBatch.unavailable')
    if (retry) timer = setTimeout(() => refreshStatus(id, ticket, true), 2000)
  }
}

async function start() {
  if (busy.value || props.disabled || !props.episodeId) return
  const id = props.episodeId, ticket = ++revision
  clearTimeout(timer)
  busy.value = true
  error.value = ''
  try {
    const result = await api.post(`/episodes/${id}/generate-asset-prompts`, { model: props.model, config_id: props.configId })
    if (ticket !== revision) return
    status.value = null
    if (!result.total) emit('refresh')
    await refreshStatus(id, ticket, true)
  } catch (failure) {
    if (ticket !== revision) return
    error.value = failure.message
    busy.value = false
  }
}

watch(() => props.episodeId, id => {
  clearTimeout(timer)
  const ticket = ++revision
  status.value = null
  busy.value = false
  error.value = ''
  if (id) void refreshStatus(id, ticket)
}, { immediate: true })
onBeforeUnmount(() => { revision++; clearTimeout(timer) })
</script>

<style scoped>
.asset-prompt-batch { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 8px 0; font-size: 12px; }
</style>
