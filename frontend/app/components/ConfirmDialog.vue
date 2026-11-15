<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="emit('cancel')">
      <div class="dialog confirm-dialog" role="alertdialog" aria-modal="true" :aria-label="effectiveTitle">
        <div class="confirm-icon">
          <Trash2 :size="20" :stroke-width="1.8" />
        </div>
        <h2 class="confirm-title">{{ effectiveTitle }}</h2>
        <p class="confirm-message">{{ message }}</p>
        <div class="confirm-actions">
          <button type="button" class="btn" :disabled="loading" @click="emit('cancel')">{{ t('common.cancel') }}</button>
          <button type="button" class="btn confirm-danger-btn" :disabled="loading" @click="emit('confirm')">
            <Loader2 v-if="loading" :size="13" class="animate-spin" />
            {{ loading ? effectiveLoadingText : effectiveConfirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { Trash2, Loader2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  open: { type: Boolean, default: false },
  // 缺省回退组件内 t()，调用方仍可显式覆盖
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '' },
  loadingText: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])

const effectiveTitle = computed(() => props.title || t('components.confirmDialog.title'))
const effectiveConfirmText = computed(() => props.confirmText || t('common.delete'))
const effectiveLoadingText = computed(() => props.loadingText || t('common.deleteLoading'))

function onKeydown(e) {
  if (e.key === 'Escape') emit('cancel')
  if (e.key === 'Enter') emit('confirm')
}

watch(() => props.open, (v) => {
  if (v) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.confirm-dialog {
  width: 400px;
  max-width: calc(100vw - 48px);
  padding: 28px 24px 20px;
  align-items: center;
  text-align: center;
}
.confirm-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--action-danger-bg);
  color: var(--action-danger);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.confirm-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-0);
}
.confirm-message {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-2);
  max-width: 320px;
  word-break: break-word;
}
.confirm-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 22px;
}
.confirm-actions .btn { flex: 1; }
.confirm-danger-btn {
  background: var(--action-danger);
  color: var(--on-accent);
}
.confirm-danger-btn:hover { background: var(--action-danger-solid-hover); color: var(--on-accent); }
.confirm-danger-btn:disabled { opacity: 0.6; }
</style>
