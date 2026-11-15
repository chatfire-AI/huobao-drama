<template>
  <AppMenu v-model:open="open" placement="bottom-end" :min-width="140">
    <template #trigger>
      <button
        type="button"
        class="locale-trigger"
        :aria-label="t('components.localeSwitcher.label')"
      >
        <Languages :size="15" :stroke-width="1.8" />
        <span class="locale-current">{{ currentLabel }}</span>
      </button>
    </template>

    <AppMenuItem
      v-for="l in UI_LOCALES"
      :key="l.value"
      :selected="l.value === locale"
      @click="select(l.value)"
    >{{ l.label }}</AppMenuItem>
  </AppMenu>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Languages } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { UI_LOCALES } from '~/composables/i18n'
import { confirmUnifiedLanguage } from '~/composables/useUnifiedLanguage'

const { t, locale } = useI18n()

const open = ref(false)

const currentLabel = computed(() => UI_LOCALES.find(l => l.value === locale.value)?.label || locale.value)

function select(l) {
  // UI 语言 = AI 内容语言：确认弹窗 → 统一切换 → 刷新界面
  void confirmUnifiedLanguage(l)
  open.value = false
}
</script>

<style scoped>
.locale-trigger {
  display: flex; align-items: center; gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border: none; border-radius: var(--radius-pill);
  background: transparent;
  font-size: 13px; font-weight: 600;
  color: var(--text-2); cursor: pointer;
  transition: all 0.18s var(--ease-out);
  line-height: 1;
}
.locale-trigger:hover { color: var(--text-0); background: var(--bg-hover); }
.locale-trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3.5px var(--button-focus);
}
.locale-current { max-width: 88px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
</style>
