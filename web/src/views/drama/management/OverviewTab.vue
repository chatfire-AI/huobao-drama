<template>
  <div>
    <div class="stats-grid">
      <StatCard
        :label="$t('drama.management.episodeStats')"
        :value="episodesCount"
        :icon="Document"
        icon-color="var(--accent)"
        icon-bg="var(--accent-light)"
        value-color="var(--accent)"
        :description="$t('drama.management.episodesCreated')"
      />
      <StatCard
        :label="$t('drama.management.characterStats')"
        :value="charactersCount"
        :icon="User"
        icon-color="var(--success)"
        icon-bg="var(--success-light)"
        value-color="var(--success)"
        :description="$t('drama.management.charactersCreated')"
      />
      <StatCard
        :label="$t('drama.management.sceneStats')"
        :value="scenesCount"
        :icon="Picture"
        icon-color="var(--warning)"
        icon-bg="var(--warning-light)"
        value-color="var(--warning)"
        :description="$t('drama.management.sceneLibraryCount')"
      />
      <StatCard
        :label="$t('drama.management.propStats')"
        :value="propsCount"
        :icon="Box"
        icon-color="var(--primary)"
        icon-bg="var(--primary-light)"
        value-color="var(--primary)"
        :description="$t('drama.management.propsCreated')"
      />
    </div>

    <!-- 引导卡片：无章节时显示 -->
    <EmptyState
      v-if="episodesCount === 0"
      :title="$t('drama.management.startFirstEpisode')"
      :description="$t('drama.management.noEpisodesYet')"
      :icon="Document"
      style="margin-top: 20px"
    >
      <el-button
        type="primary"
        :icon="Plus"
        @click="$emit('createEpisode')"
      >
        {{ $t("drama.management.createFirstEpisode") }}
      </el-button>
    </EmptyState>

    <el-card shadow="never" class="project-info-card">
      <template #header>
        <div class="card-header">
          <h3 class="card-title">
            {{ $t("drama.management.projectInfo") }}
          </h3>
          <el-tag :type="getStatusType(drama?.status)" size="small">{{
            getStatusText(drama?.status)
          }}</el-tag>
        </div>
      </template>
      <el-descriptions :column="2" border class="project-descriptions">
        <el-descriptions-item
          :label="$t('drama.management.projectName')"
        >
          <span class="info-value">{{ drama?.title }}</span>
        </el-descriptions-item>
        <el-descriptions-item :label="$t('common.createdAt')">
          <span class="info-value">{{
            formatDate(drama?.created_at)
          }}</span>
        </el-descriptions-item>
        <el-descriptions-item
          :label="$t('drama.management.projectDesc')"
          :span="2"
        >
          <span class="info-desc">{{
            drama?.description || $t("drama.management.noDescription")
          }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Document, User, Picture, Plus, Box } from '@element-plus/icons-vue'
import { StatCard, EmptyState } from '@/components/common'
import type { Drama } from '@/types/drama'

const { t } = useI18n()

const props = defineProps<{
  drama: Drama | null
  episodesCount: number
  charactersCount: number
  scenesCount: number
  propsCount: number
}>()

defineEmits<{
  createEpisode: []
}>()

const getStatusType = (status?: string) => {
  const map: Record<string, any> = {
    draft: 'info',
    in_progress: 'warning',
    completed: 'success',
  }
  return map[status || 'draft'] || 'info'
}

const getStatusText = (status?: string) => {
  const map: Record<string, string> = {
    draft: t('message.statusDraft'),
    in_progress: t('message.statusInProgress'),
    completed: t('message.statusCompleted'),
  }
  return map[status || 'draft'] || t('message.statusDraft')
}

const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

@media (min-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.project-info-card {
  margin-top: var(--space-5);
  border-radius: var(--radius-lg);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.project-descriptions {
  width: 100%;
}

:deep(.project-descriptions .el-descriptions__label) {
  width: 120px;
  font-weight: 500;
  color: var(--text-secondary);
}

:deep(.project-descriptions .el-descriptions__content) {
  min-width: 150px;
}

.info-value {
  font-weight: 500;
  color: var(--text-primary);
}

.info-desc {
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
