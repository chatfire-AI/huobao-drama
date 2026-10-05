<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="cancel">
      <div class="dialog confirm-dialog remove-dialog" role="alertdialog" aria-modal="true">
        <div class="confirm-icon" :class="{ danger: step === 'delete' }">
          <Trash2 v-if="step === 'delete'" :size="20" :stroke-width="1.8" />
          <LogOut v-else :size="20" :stroke-width="1.8" />
        </div>
        <template v-if="step === 'choose'">
          <h2 class="confirm-title">{{ t('assetRemove.title', { type: typeLabel, name }) }}</h2>
          <p class="confirm-message">
            {{ t('assetRemove.unlinkDesc', { type: typeLabel }) }}
            <template v-if="episodeCount > 1"><br />{{ t('assetRemove.shared', { type: typeLabel, n: episodeCount }) }}</template>
          </p>
          <div class="confirm-actions">
            <button type="button" class="btn" :disabled="loading" @click="cancel">{{ t('common.cancel') }}</button>
            <button type="button" class="btn btn-danger" :disabled="loading" @click="step = 'delete'">{{ t('assetRemove.deleteAll') }}</button>
            <button type="button" class="btn btn-primary" :disabled="loading" @click="emit('unlink')">
              <Loader2 v-if="loading" :size="13" class="animate-spin" />
              {{ t('assetRemove.unlink') }}
            </button>
          </div>
        </template>
        <template v-else>
          <h2 class="confirm-title">{{ t('assetRemove.deleteTitle', { type: typeLabel, name }) }}</h2>
          <p class="confirm-message">{{ t('assetRemove.deleteDesc', { type: typeLabel, n: Math.max(episodeCount, 1) }) }}</p>
          <div class="confirm-actions">
            <button type="button" class="btn" :disabled="loading" @click="step = 'choose'">{{ t('assetRemove.back') }}</button>
            <button type="button" class="btn btn-danger" :disabled="loading" @click="emit('delete')">
              <Loader2 v-if="loading" :size="13" class="animate-spin" />
              {{ t('assetRemove.confirmDelete') }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Trash2, LogOut, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  typeLabel: { type: String, default: '' },
  name: { type: String, default: '' },
  episodeCount: { type: Number, default: 1 },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['unlink', 'delete', 'cancel'])
const { t } = useI18n()

// 默认「移出本集」；「从整部剧删除」需二次确认
const step = ref('choose')
watch(() => props.open, (v) => { if (v) step.value = 'choose' })
function cancel() { if (!props.loading) emit('cancel') }
</script>

<style scoped>
.remove-dialog { width: 420px; max-width: calc(100vw - 48px); }
.confirm-icon {
  width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  background: var(--accent-bg); color: var(--accent-text); margin-bottom: 10px;
}
.confirm-icon.danger { background: var(--action-danger-bg); color: var(--action-danger); }
.confirm-title { font-size: 15px; font-weight: 700; margin: 0 0 6px; color: var(--text-1); }
.confirm-message { font-size: 13px; line-height: 1.6; color: var(--text-2); margin: 0 0 16px; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
