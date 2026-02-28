<template>
  <!-- Page header component with title, subtitle and action buttons -->
  <!-- 页面头部组件，包含标题、副标题和操作按钮 -->
  <header :class="['page-header', 'glass-surface', { 'with-border': showBorder }]">
    <div class="header-content">
      <!-- Title section / 标题区域 -->
      <div class="header-text">
        <div class="title-row">
          <div v-if="$slots.icon" class="title-icon">
            <slot name="icon"></slot>
          </div>
          <h1 class="header-title">{{ title }}

            <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
          </h1>
          <slot name="badge"></slot>
        </div>
      </div>

      <!-- Actions section / 操作区域 -->
      <div class="header-actions">
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- Extra content / 额外内容 -->
    <div v-if="$slots.extra" class="header-extra">
      <slot name="extra"></slot>
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * PageHeader - Reusable page header component
 * 页面头部组件 - 可复用的页面头部
 */
withDefaults(defineProps<{
  title: string
  subtitle?: string
  showBorder?: boolean
}>(), {
  showBorder: true
})
</script>

<style scoped>
/* Glass Surface base already applied via class */

.page-header {
  margin-bottom: var(--glass-space-5);
  padding: var(--glass-space-4) var(--glass-space-5);
}

.page-header.with-border {
  padding-bottom: var(--glass-space-5);
  border-bottom: 1px solid var(--glass-stroke-base);
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: var(--glass-space-2);
}

@media (min-width: 768px) {
  .header-content {
    flex-direction: row;
    align-items: center;
  }
}

/* Title / 标题 */
.header-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: var(--glass-space-3);
}

.title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: linear-gradient(135deg, var(--glass-accent-from) 0%, var(--glass-accent-to) 100%);
  border-radius: var(--glass-radius-lg);
  color: var(--glass-text-on-accent);
  flex-shrink: 0;
}

.header-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--glass-text-primary);
  letter-spacing: -0.025em;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

@media (min-width: 768px) {
  .header-title {
    font-size: 1.75rem;
  }
}

.header-subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--glass-text-tertiary);
  font-weight: 500;
  max-width: 480px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Actions / 操作 */
.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--glass-space-2);
  align-items: center;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .header-actions {
    margin-left: auto;
  }
}

/* Extra / 额外内容 */
.header-extra {
  margin-top: var(--glass-space-4);
  padding-top: var(--glass-space-4);
  border-top: 1px solid var(--glass-stroke-base);
}
</style>
