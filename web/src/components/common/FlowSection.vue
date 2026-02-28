<template>
  <div class="flow-section">
    <div class="flow-timeline">
      <div class="flow-dot" :style="{ backgroundColor: accentColor }" />
      <div v-if="!isLast" class="flow-line" />
    </div>
    <div class="flow-content">
      <div class="flow-header" @click="toggle">
        <div class="flow-header-left">
          <el-icon class="flow-icon" :size="18"><component :is="icon" /></el-icon>
          <h3 class="flow-title">{{ title }}</h3>
          <el-tag v-if="count !== undefined" size="small" round type="info" class="flow-count">{{ count }}</el-tag>
          <el-icon class="flow-arrow" :class="{ collapsed: !expanded }"><ArrowDown /></el-icon>
        </div>
        <div v-if="$slots.actions" class="flow-header-actions" @click.stop>
          <slot name="actions" />
        </div>
      </div>
      <div class="flow-body" :class="{ 'flow-body--collapsed': !expanded }">
        <div class="flow-body-inner">
          <div v-if="$slots.filter" class="flow-filter">
            <slot name="filter" />
          </div>
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, type Component } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  title: string
  icon: Component
  count?: number
  defaultExpanded?: boolean
  accentColor?: string
  isLast?: boolean
}>(), {
  defaultExpanded: true,
  accentColor: 'var(--accent)',
  isLast: false,
})

const expanded = ref(props.defaultExpanded)

const toggle = () => {
  expanded.value = !expanded.value
}

provide('insideFlowSection', true)
</script>

<style scoped>
.flow-section {
  display: flex;
  gap: var(--space-4);
  min-height: 60px;
}

.flow-timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 20px;
  padding-top: 18px;
}

.flow-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
  z-index: 1;
}

.flow-line {
  width: 2px;
  flex: 1;
  background: var(--border-primary);
  margin-top: 8px;
}

.flow-content {
  flex: 1;
  min-width: 0;
  padding-bottom: var(--space-4);
}

.flow-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  cursor: pointer;
  user-select: none;
  padding: var(--space-2) 0;
}

.flow-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.flow-icon {
  color: var(--text-secondary);
}

.flow-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary);
}

.flow-count {
  font-variant-numeric: tabular-nums;
}

.flow-arrow {
  transition: transform 0.25s ease;
  color: var(--text-tertiary);
  font-size: 14px;
}

.flow-arrow.collapsed {
  transform: rotate(-90deg);
}

.flow-header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.flow-body {
  overflow: hidden;
  max-height: 5000px;
  opacity: 1;
  transition: max-height 0.35s ease, opacity 0.25s ease;
}

.flow-body--collapsed {
  max-height: 0;
  opacity: 0;
}

.flow-body-inner {
  padding-top: var(--space-3);
}

.flow-filter {
  margin-bottom: var(--space-3);
}

@media (max-width: 640px) {
  .flow-section {
    gap: var(--space-2);
  }

  .flow-timeline {
    width: 16px;
    padding-top: 16px;
  }

  .flow-dot {
    width: 10px;
    height: 10px;
  }

  .flow-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .flow-header-actions {
    width: 100%;
  }
}
</style>
