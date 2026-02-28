<template>
  <!-- Base Card Component - Reusable card with modern design -->
  <!-- 基础卡片组件 - 现代设计的可复用卡片 -->
  <div
    :class="[
      'base-card',
      'glass-surface',
      'hover-lift',
      `variant-${variant}`,
      { 'is-hoverable': hoverable, 'is-clickable': clickable }
    ]"
    @click="clickable ? $emit('click') : undefined"
    :tabindex="clickable ? 0 : undefined"
    @keydown.enter="clickable ? $emit('click') : undefined"
  >
    <!-- Card Header / 卡片头部 -->
    <div v-if="$slots.header || title" class="card-header">
      <slot name="header">
        <div class="header-content">
          <div v-if="icon" class="header-icon">
            <el-icon :size="iconSize" :color="iconColor">
              <component :is="icon" />
            </el-icon>
          </div>
          <div class="header-text">
            <h3 class="card-title">{{ title }}</h3>
            <p v-if="subtitle" class="card-subtitle">{{ subtitle }}</p>
          </div>
        </div>
        <div v-if="$slots.headerActions" class="header-actions">
          <slot name="headerActions"></slot>
        </div>
      </slot>
    </div>

    <!-- Card Body / 卡片内容 -->
    <div :class="['card-body', { 'no-padding': noPadding }]">
      <slot></slot>
    </div>

    <!-- Card Footer / 卡片底部 -->
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

/**
 * BaseCard - Reusable card component with modern design
 * 基础卡片组件 - 现代设计的可复用卡片
 */
withDefaults(defineProps<{
  title?: string
  subtitle?: string
  icon?: Component
  iconSize?: number
  iconColor?: string
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost'
  hoverable?: boolean
  clickable?: boolean
  noPadding?: boolean
}>(), {
  variant: 'default',
  iconSize: 20,
  hoverable: false,
  clickable: false,
  noPadding: false
})

defineEmits<{
  click: []
}>()
</script>

<style scoped>
/* Card Container / 卡片容器 */
.base-card {
  display: flex;
  flex-direction: column;
  border-radius: var(--glass-radius-lg);
  transition: all var(--transition-normal);
  overflow: hidden;
}

/* Variants / 变体样式 */
.variant-default {
  border: 1px solid var(--glass-stroke-soft);
}

.variant-elevated {
  border: none;
  box-shadow: var(--glass-shadow-lg);
}

.variant-outlined {
  border: 1px solid var(--glass-stroke-soft);
}

.variant-ghost {
  background: transparent;
  border: none;
  box-shadow: none;
}

/* Hover & Clickable States / 悬停和可点击状态 */
.is-hoverable:hover {
  border-color: var(--glass-stroke-focus);
}

.is-clickable {
  cursor: pointer;
}

.is-clickable:hover {
  border-color: var(--glass-accent-from);
  box-shadow: var(--glass-shadow-md);
}

.is-clickable:focus-visible {
  outline: 2px solid var(--glass-accent-from);
  outline-offset: 2px;
}

.is-clickable:active {
  transform: scale(0.995);
}

/* Card Header / 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: var(--glass-accent-from);
  border-radius: var(--glass-radius-lg);
  color: var(--glass-text-on-accent);
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.card-subtitle {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Card Body / 卡片内容 */
.card-body {
  padding: var(--space-5);
  flex: 1;
}

.card-body.no-padding {
  padding: 0;
}

/* Card Footer / 卡片底部 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--glass-stroke-base);
  background: var(--glass-bg-muted);
}

</style>
