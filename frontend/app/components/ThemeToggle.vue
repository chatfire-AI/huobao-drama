<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="t('layout.theme.label')"
    :title="modeLabel"
    @click="cycleThemeMode()"
  >
    <component :is="modeIcon" :size="15" :stroke-width="1.8" />
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { Sun, Moon, Monitor } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useTheme } from '~/composables/useTheme'

const { t } = useI18n()
const { themeMode, cycleThemeMode } = useTheme()

// 图标显示当前模式（system 显示显示器图标，而非 resolved 结果）
const modeIcon = computed(() => ({ light: Sun, dark: Moon, system: Monitor })[themeMode.value])
const modeLabel = computed(() => t(`layout.theme.${themeMode.value}`))
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.18s var(--ease-out);
  line-height: 1;
}
.theme-toggle:hover { color: var(--text-0); background: var(--bg-hover); }
.theme-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3.5px var(--button-focus);
}
</style>
