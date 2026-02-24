<template>
  <div class="app-header-wrapper">
    <header class="app-header" :class="{ 'header-fixed': fixed }">
      <div class="header-content">
        <!-- Left section -->
        <div class="header-left">
          <slot name="left" />
        </div>

        <!-- Center section -->
        <div class="header-center">
          <slot name="center" />
        </div>

        <!-- Right section -->
        <div class="header-right">
          <slot name="right" />
        </div>
      </div>
    </header>
  </div>
</template>

<script setup lang="ts">
/**
 * AppHeader - Simplified header for fullscreen pages
 * 全屏页面专用简化头部组件
 *
 * Slots:
 * - left: Left content
 * - center: Center content
 * - right: Right content
 */

interface Props {
  /** Fixed position at top | 是否固定在顶部 */
  fixed?: boolean
}

withDefaults(defineProps<Props>(), {
  fixed: false
})
</script>

<style scoped>
.app-header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-primary);
  backdrop-filter: blur(8px);
  z-index: 1000;
}

.app-header.header-fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  height: 48px;
  max-width: 100%;
  margin: 0 auto;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-shrink: 0;
}

.header-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

/* Dark mode adjustments | 深色模式适配 */
.dark .app-header {
  background: var(--bg-card);
}

/* ========================================
   Common Slot Styles / 插槽通用样式
   ======================================== */

/* Back Button | 返回按钮 */
:deep(.back-btn) {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

:deep(.back-btn:hover) {
  color: var(--text-primary);
  background: var(--bg-hover);
}

:deep(.back-btn .el-icon) {
  font-size: 1rem;
}

/* Page Title | 页面标题 */
:deep(.page-title) {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

:deep(.page-title h1),
:deep(.header-title),
:deep(.drama-title) {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

:deep(.page-title .subtitle) {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* Episode Title | 章节标题 */
:deep(.episode-title) {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* Responsive | 响应式 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 var(--space-3);
  }

  :deep(.page-title h1),
  :deep(.header-title),
  :deep(.drama-title) {
    font-size: 1rem;
  }

  :deep(.back-btn span) {
    display: none;
  }
}
</style>
