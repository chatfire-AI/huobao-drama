<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="emit('cancel')">
      <div class="dialog lang-switch-dialog" role="alertdialog" aria-modal="true" :aria-label="title">
        <div class="confirm-icon lang-switch-icon">
          <Languages :size="20" :stroke-width="1.8" />
        </div>
        <h2 class="confirm-title">{{ title }}</h2>
        <p class="confirm-message">{{ message }}</p>
        <ul class="lang-switch-effects">
          <li>{{ t('components.langSwitch.effectUi') }}</li>
          <li>{{ t('components.langSwitch.effectAi') }}</li>
          <li>{{ t('components.langSwitch.effectRefresh') }}</li>
        </ul>
        <div class="confirm-actions">
          <button type="button" class="btn" @click="emit('cancel')">{{ t('common.cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="emit('confirm')">
            {{ t('components.langSwitch.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { Languages } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, required: true },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
/* 与 ConfirmDialog 同构的居中弹窗（其为 scoped 样式，这里自带全套） */
.lang-switch-dialog {
  width: 420px;
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
.lang-switch-icon {
  background: var(--accent-bg);
  color: var(--accent-text);
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
  max-width: 340px;
  word-break: break-word;
}
.lang-switch-effects {
  margin: 10px 0 2px;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.5;
  text-align: left;
}
.lang-switch-effects li::marker {
  color: var(--accent);
}
.confirm-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 22px;
}
.confirm-actions .btn { flex: 1; }
</style>
