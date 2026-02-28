<template>
  <div
    class="item-card glass-surface hover-lift"
    :class="{ 'item-card--selected': selected, 'item-card--selectable': selectable }"
    @click="$emit('click')"
  >
    <el-checkbox
      v-if="selectable"
      class="item-card__checkbox"
      :model-value="selected"
      @change="(val: boolean) => $emit('select', val)"
      @click.stop
    />

    <div class="item-card__image">
      <slot name="image-overlay" />
      <img v-if="imageUrl" :src="imageUrl" :alt="imageAlt || title" />
      <div v-else class="item-card__placeholder">
        <el-icon :size="40">
          <component :is="placeholderIcon" />
        </el-icon>
      </div>
    </div>

    <div class="item-card__body">
      <div class="item-card__title-row">
        <h4 class="item-card__title">{{ title }}</h4>
        <el-tag v-if="tag" :type="tagType" size="small">{{ tag }}</el-tag>
      </div>

      <slot name="extra-info" />

      <p v-if="description" class="item-card__desc">{{ description }}</p>

      <span v-if="meta" class="item-card__meta">{{ meta }}</span>
    </div>

    <div v-if="$slots.actions" class="item-card__actions" @click.stop>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { FolderOpened } from '@element-plus/icons-vue'

withDefaults(defineProps<{
  title: string
  description?: string
  imageUrl?: string
  imageAlt?: string
  placeholderIcon?: Component
  tag?: string
  tagType?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  meta?: string
  selectable?: boolean
  selected?: boolean
}>(), {
  placeholderIcon: FolderOpened,
  tagType: 'info',
  selectable: false,
  selected: false,
})

defineEmits<{
  select: [value: boolean]
  click: []
}>()
</script>

<style scoped>
.item-card {
  position: relative;
  border: 1px solid var(--glass-stroke-soft);
  border-radius: var(--glass-radius-xl);
  overflow: hidden;
  transition: all var(--transition-normal);
}

.item-card:hover {
  border-color: var(--glass-stroke-focus);
}

.item-card--selected {
  border-color: var(--glass-accent-from);
  box-shadow: var(--glass-shadow-md);
}

.item-card__checkbox {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  z-index: 2;
}

.item-card__image {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 160px;
  background: linear-gradient(135deg, var(--glass-accent-from) 0%, var(--glass-accent-to) 100%);
  overflow: hidden;
}

.item-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-normal);
}

.item-card:hover .item-card__image img {
  transform: scale(1.05);
}

.item-card__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(255, 255, 255, 0.7);
}

.item-card__body {
  text-align: center;
  padding: var(--space-4);
}

.item-card__title-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-2);
}

.item-card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-card__desc {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: var(--space-2) 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-card__meta {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: var(--space-1);
}

.item-card__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  padding: 0 var(--space-4) var(--space-4);
  flex-wrap: wrap;
}
</style>
