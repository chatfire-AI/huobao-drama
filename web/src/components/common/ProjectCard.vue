<template>
  <!-- Project card component - Compact design with always-visible actions -->
  <!-- 项目卡片组件 - 紧凑设计，操作始终可见 -->
  <article class="project-card glass-surface hover-lift" :style="accentStyle" @click="$emit('click')" tabindex="0" @keydown.enter="$emit('click')">
    <div class="card-accent"></div>
    <div class="card-body">
      <div class="card-top">
        <h3 class="card-title">{{ title }}</h3>
        <div class="card-actions" @click.stop>
          <slot name="actions"></slot>
        </div>
      </div>
      <div v-if="status || styleName" class="card-tags">
        <span v-if="status" :class="['glass-chip', statusChipClass]">{{ $t(`drama.status.${status}`) }}</span>
        <span v-if="styleName" class="glass-chip glass-chip-neutral">{{ $t(`drama.styles.${styleName}`) }}</span>
      </div>
      <p v-if="description" class="card-description">{{ description }}</p>
      <div class="card-footer">
        <span class="meta-time">{{ formattedDate }}</span>
        <span class="footer-right">
          <span class="episode-label">{{ $t('drama.episodeCount', { count: episodeCount }) }}</span>
          <template v-if="formattedDuration">
            <span class="footer-dot">&middot;</span>
            <span class="episode-label">{{ formattedDuration }}</span>
          </template>
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DramaStatus } from '@/types/drama'

/**
 * ProjectCard - Reusable project/drama card component
 * 项目卡片组件 - 可复用的项目展示卡片
 */
const props = withDefaults(defineProps<{
  title: string
  description?: string
  updatedAt: string
  episodeCount?: number
  status?: DramaStatus
  styleName?: string
  totalDuration?: number
}>(), {
  description: '',
  episodeCount: 0,
  totalDuration: 0
})

defineEmits<{
  click: []
}>()

const statusColorMap: Record<string, { chip: string; accent: string }> = {
  draft: { chip: 'glass-chip-neutral', accent: 'var(--glass-tone-neutral-fg)' },
  planning: { chip: 'glass-chip-info', accent: 'var(--glass-tone-info-fg)' },
  generating: { chip: 'glass-chip-info', accent: 'var(--glass-tone-info-fg)' },
  production: { chip: 'glass-chip-warning', accent: 'var(--glass-tone-warning-fg)' },
  completed: { chip: 'glass-chip-success', accent: 'var(--glass-tone-success-fg)' },
  error: { chip: 'glass-chip-danger', accent: 'var(--glass-tone-danger-fg)' },
  archived: { chip: 'glass-chip-neutral', accent: 'var(--glass-tone-neutral-fg)' },
}

const statusChipClass = computed(() => statusColorMap[props.status || '']?.chip || 'glass-chip-neutral')

const accentStyle = computed(() => {
  const accent = statusColorMap[props.status || '']?.accent
  return accent ? { '--accent-color': accent } as Record<string, string> : {}
})

// Format date / 格式化日期
const formattedDate = computed(() => {
  const date = new Date(props.updatedAt)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
})

const formattedDuration = computed(() => {
  const s = props.totalDuration
  if (!s || s <= 0) return ''
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}m${sec}s` : `${m}m`
})
</script>

<style scoped>
/* Card Container / 卡片容器 */
.project-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--glass-stroke-soft);
  border-radius: var(--glass-radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.project-card:hover {
  border-color: var(--glass-stroke-focus);
}

.project-card:focus-visible {
  outline: 2px solid var(--glass-accent-from);
  outline-offset: 2px;
}

/* Accent Bar / 左侧色条 */
.card-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--accent-color, var(--glass-accent-from));
  border-radius: var(--glass-radius-md) 0 0 var(--glass-radius-md);
}

/* Tags / 标签行 */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Top Section / 顶部区域 */
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

/* Actions / 操作区 */
.card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* Body Section / 内容区域 */
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 8px;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-description {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
}

/* Footer Section / 底部区域 */
.card-footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--glass-stroke-base);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.footer-dot {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.meta-time,
.episode-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

:deep(.action-button) {
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  background: var(--glass-bg-muted) !important;
  border: none !important;
}
</style>
