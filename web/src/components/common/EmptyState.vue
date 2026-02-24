<template>
  <!-- Empty State Component - Display when no data available -->
  <!-- 空状态组件 - 无数据时的展示 -->
  <div :class="['empty-state', `size-${size}`]">
    <div class="empty-icon" :class="{ 'has-animation': animated }">
      <el-icon :size="iconSize">
        <component :is="icon" />
      </el-icon>
    </div>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <div v-if="$slots.default" class="empty-actions">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { FolderOpened } from '@element-plus/icons-vue'

/**
 * EmptyState - Display when no data is available
 * 空状态组件 - 无数据时的占位展示
 */
const props = withDefaults(defineProps<{
  title: string
  description?: string
  icon?: Component
  size?: 'small' | 'medium' | 'large'
  animated?: boolean
}>(), {
  icon: FolderOpened,
  size: 'medium',
  animated: true
})

// Icon size based on component size / 根据组件尺寸设置图标大小
const iconSize = computed(() => {
  const sizes = {
    small: 32,
    medium: 48,
    large: 64
  }
  return sizes[props.size]
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-8) var(--space-4);
}

/* Size variants / 尺寸变体 */
.size-small {
  padding: var(--space-6) var(--space-4);
}

.size-small .empty-title {
  font-size: 0.9375rem;
}

.size-small .empty-description {
  font-size: 0.8125rem;
}

.size-large {
  padding: var(--space-12) var(--space-6);
}

.size-large .empty-title {
  font-size: 1.25rem;
}

/* Icon / 图标 */
.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  margin-bottom: var(--space-4);
  background: var(--bg-card-hover);
  border-radius: 50%;
  color: var(--text-muted);
}

.empty-icon.has-animation {
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.1);
  }
  50% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
  }
}

/* Title / 标题 */
.empty-title {
  margin: 0 0 var(--space-2) 0;
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

/* Description / 描述 */
.empty-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-muted);
  max-width: 320px;
  line-height: 1.5;
}

/* Actions / 操作区 */
.empty-actions {
  margin-top: var(--space-5);
  display: flex;
  gap: var(--space-3);
}
</style>
