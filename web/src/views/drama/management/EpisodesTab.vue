<template>
  <div>
    <div class="tab-header">
      <h2>{{ $t("drama.management.episodeList") }}</h2>
      <el-button
        type="primary"
        :icon="Plus"
        @click="$emit('createEpisode')"
      >
        {{ $t("drama.management.createEpisode") }}
      </el-button>
    </div>

    <el-table :data="sortedEpisodes" stripe style="width: 100%">
      <el-table-column type="index" width="60" />
      <el-table-column
        :label="$t('drama.management.episodeNumber')"
        width="100"
      >
        <template #default="{ row }">
          {{ $t("drama.management.episodePrefix") }}{{ row.episode_number }}
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        :label="$t('drama.management.episodeTitle')"
        min-width="200"
      />
      <el-table-column :label="$t('common.status')" width="120">
        <template #default="{ row }">
          <el-tag :type="getEpisodeStatusType(row)">{{
            getEpisodeStatusText(row)
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Shots" width="100">
        <template #default="{ row }">
          {{ row.shots?.length || 0 }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.createdAt')" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('storyboard.table.operations')"
        width="220"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            @click="$emit('enterEpisode', row)"
          >
            {{ $t("drama.management.goToEdit") }}
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="$emit('deleteEpisode', row)"
          >
            {{ $t("common.delete") }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus } from '@element-plus/icons-vue'
import type { Episode } from '@/types/drama'

const { t } = useI18n()

const props = defineProps<{
  episodes: Episode[]
}>()

defineEmits<{
  createEpisode: []
  enterEpisode: [episode: any]
  deleteEpisode: [episode: any]
}>()

const sortedEpisodes = computed(() => {
  return [...props.episodes].sort(
    (a, b) => a.episode_number - b.episode_number,
  )
})

const getEpisodeStatusType = (episode: any) => {
  if (episode.shots && episode.shots.length > 0) return 'success'
  if (episode.script_content) return 'warning'
  return 'info'
}

const getEpisodeStatusText = (episode: any) => {
  if (episode.shots && episode.shots.length > 0) return t('message.episodeSplit')
  if (episode.script_content) return t('message.episodeCreated')
  return t('message.statusDraft')
}

const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.tab-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

@media (min-width: 640px) {
  .tab-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.tab-header h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
</style>
