<template>
  <!-- Theme toggle button for switching between light/dark mode -->
  <!-- 主题切换按钮，用于切换浅色/深色模式 -->
  <button
    class="theme-toggle"
    :aria-label="uiStore.isDark ? t('settings.switchToLight') : t('settings.switchToDark')"
    @click="toggleTheme"
  >
    <transition name="icon-fade" mode="out-in">
      <el-icon v-if="uiStore.isDark" key="moon" :size="18">
        <Moon />
      </el-icon>
      <el-icon v-else key="sun" :size="18">
        <Sunny />
      </el-icon>
    </transition>
  </button>
</template>

<script setup lang="ts">
import { Moon, Sunny } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const uiStore = useUIStore()

const toggleTheme = () => {
  uiStore.applyTheme(uiStore.isDark ? 'light' : 'dark')
}
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: var(--border-secondary);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Icon transition / 图标过渡动画 */
.icon-fade-enter-active,
.icon-fade-leave-active {
  transition: all 0.2s ease;
}

.icon-fade-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.8);
}

.icon-fade-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.8);
}
</style>
