<template>
  <router-link :to="to" class="sidebar-item" :class="{ active: isActive }">
    <el-icon :size="20"><component :is="icon" /></el-icon>
    <span v-if="!collapsed" class="sidebar-item-label">{{ label }}</span>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Component } from 'vue'

interface Props {
  icon: Component
  label: string
  to: string
  collapsed: boolean
}

const props = defineProps<Props>()
const route = useRoute()

const isActive = computed(() => {
  if (props.to === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(props.to)
})
</script>

<style scoped>
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 14px;
  transition: all 150ms;
  cursor: pointer;
}

.sidebar-item:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.sidebar-item.active {
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}

.sidebar-item-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
