<template>
  <div class="project-flow-header">
    <div class="project-flow-left">
      <h1 class="project-flow-title">{{ title }}</h1>
      <p v-if="description" class="project-flow-desc">{{ description }}</p>
    </div>
    <div class="project-flow-right">
      <div class="project-flow-stats">
        <div class="mini-stat">
          <span class="mini-stat-value" style="color: var(--accent)">{{ episodesCount }}</span>
          <span class="mini-stat-label">{{ $t('drama.management.episodes') }}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value" style="color: var(--success)">{{ charactersCount }}</span>
          <span class="mini-stat-label">{{ $t('drama.management.characters') }}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value" style="color: var(--warning)">{{ scenesCount }}</span>
          <span class="mini-stat-label">{{ $t('drama.management.sceneList') }}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value" style="color: var(--primary)">{{ propsCount }}</span>
          <span class="mini-stat-label">{{ $t('drama.management.propList') }}</span>
        </div>
      </div>
      <el-tag v-if="status" :type="statusType" size="small">{{ statusText }}</el-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  title?: string
  description?: string
  status?: string
  episodesCount: number
  charactersCount: number
  scenesCount: number
  propsCount: number
}>()

const statusType = computed(() => {
  const map: Record<string, any> = { draft: 'info', in_progress: 'warning', completed: 'success' }
  return map[props.status || 'draft'] || 'info'
})

const statusText = computed(() => {
  const map: Record<string, string> = {
    draft: t('drama.status.draft'),
    in_progress: t('drama.status.production'),
    completed: t('drama.status.completed'),
  }
  return map[props.status || 'draft'] || t('drama.status.draft')
})
</script>

<style scoped>
/* Glass Surface base applied via component */
.project-flow-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--glass-space-4);
  padding: var(--glass-space-4) var(--glass-space-5);
  background: var(--glass-bg-surface);
  backdrop-filter: blur(var(--glass-blur-md));
  -webkit-backdrop-filter: blur(var(--glass-blur-md));
  border: 1px solid var(--glass-stroke-base);
  border-radius: var(--glass-radius-lg);
  margin-bottom: var(--glass-space-5);
  box-shadow: var(--glass-shadow-sm);
}

.project-flow-left {
  min-width: 0;
}

.project-flow-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--glass-text-primary);
  letter-spacing: -0.02em;
}

.project-flow-desc {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: var(--glass-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 400px;
}

.project-flow-right {
  display: flex;
  align-items: center;
  gap: var(--glass-space-4);
  flex-shrink: 0;
}

.project-flow-stats {
  display: flex;
  gap: var(--glass-space-4);
}

.mini-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--glass-space-2) var(--glass-space-3);
  background: var(--glass-bg-muted);
  border-radius: var(--glass-radius-sm);
  border: 1px solid var(--glass-stroke-soft);
}

.mini-stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.mini-stat-label {
  font-size: 0.7rem;
  color: var(--glass-text-tertiary);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .project-flow-header {
    flex-direction: column;
    align-items: flex-start;
    padding: var(--glass-space-3) var(--glass-space-4);
  }

  .project-flow-desc {
    max-width: 100%;
  }

  .project-flow-right {
    width: 100%;
    justify-content: space-between;
  }

  .project-flow-stats {
    gap: var(--glass-space-3);
  }
}
</style>
