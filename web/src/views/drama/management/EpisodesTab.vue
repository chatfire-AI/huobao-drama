<template>
  <div>
    <TabHeader :title="$t('drama.management.episodeList')">
      <template #actions>
        <el-button
          :icon="Upload"
          @click="$emit('uploadNovel')"
        >{{ $t('drama.management.uploadNovel') }}</el-button>
        <el-button
          type="primary"
          :icon="Plus"
          @click="$emit('createEpisode')"
        >{{ $t('drama.management.createEpisode') }}</el-button>
      </template>
      <template #filter>
        <el-input
          v-model="searchQuery"
          :placeholder="$t('drama.management.searchPlaceholder')"
          :prefix-icon="Search"
          clearable
          style="width: 220px"
        />
        <el-select
          v-model="filterValue"
          :placeholder="$t('drama.management.filterStatus')"
          clearable
          style="width: 150px"
        >
          <el-option :label="$t('message.statusDraft')" value="draft" />
          <el-option :label="$t('message.episodeCreated')" value="created" />
          <el-option :label="$t('message.episodeSplit')" value="split" />
        </el-select>
      </template>
    </TabHeader>

    <ResponsiveGrid v-if="filteredItems.length > 0">
      <ItemCard
        v-for="episode in filteredItems"
        :key="episode.id"
        :title="$t('drama.management.episodePrefix') + episode.episode_number + ' ' + episode.title"
        :description="episode.script_content ? episode.script_content.substring(0, 100) : episode.description"
        :placeholder-icon="DocumentIcon"
        :tag="getEpisodeStatusText(episode)"
        :tag-type="getEpisodeStatusType(episode)"
        :meta="formatDate(episode.created_at) + ' · ' + $t('storyboard.table.operations') + ': ' + (episode.shots?.length || 0)"
        @click="$emit('enterEpisode', episode)"
      >
        <template #actions>
          <el-button size="small" type="primary" @click="$emit('enterEpisode', episode)">{{ $t('drama.management.goToEdit') }}</el-button>
          <el-button size="small" type="danger" @click="$emit('deleteEpisode', episode)">{{ $t('common.delete') }}</el-button>
        </template>
      </ItemCard>
    </ResponsiveGrid>

    <EmptyState
      v-else-if="episodes.length === 0"
      :title="$t('drama.management.noEpisodes')"
      :description="$t('drama.management.emptyTip')"
      :icon="DocumentIcon"
    >
      <el-button type="primary" :icon="Plus" @click="$emit('createEpisode')">{{ $t('drama.management.createEpisode') }}</el-button>
    </EmptyState>

    <EmptyState
      v-else
      :title="$t('common.noData')"
      :description="$t('common.noData')"
      :icon="Search"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Upload, Search, Document as DocumentIcon } from '@element-plus/icons-vue'
import { TabHeader, ItemCard, ResponsiveGrid, EmptyState } from '@/components/common'
import { useFilteredList } from '@/composables/useFilteredList'
import type { Episode } from '@/types/drama'

const { t } = useI18n()

const props = defineProps<{
  episodes: Episode[]
}>()

defineEmits<{
  createEpisode: []
  enterEpisode: [episode: Episode]
  deleteEpisode: [episode: Episode]
  uploadNovel: []
}>()

const sortedEpisodes = computed(() =>
  [...props.episodes].sort((a, b) => a.episode_number - b.episode_number)
)

const getEpisodeStatus = (episode: Episode) => {
  if (episode.shots && episode.shots.length > 0) return 'split'
  if (episode.script_content) return 'created'
  return 'draft'
}

const getEpisodeStatusType = (episode: Episode): 'success' | 'warning' | 'info' => {
  const status = getEpisodeStatus(episode)
  if (status === 'split') return 'success'
  if (status === 'created') return 'warning'
  return 'info'
}

const getEpisodeStatusText = (episode: Episode) => {
  const status = getEpisodeStatus(episode)
  if (status === 'split') return t('message.episodeSplit')
  if (status === 'created') return t('message.episodeCreated')
  return t('message.statusDraft')
}

const { searchQuery, filterValue, filteredItems: filteredSorted } = useFilteredList({
  items: sortedEpisodes,
  searchFields: ['title'] as (keyof Episode)[],
})

// Custom filter since status is computed, not a direct field
const filteredItems = computed(() => {
  if (!filterValue.value) return filteredSorted.value
  return filteredSorted.value.filter(ep => getEpisodeStatus(ep) === filterValue.value)
})

const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}
</script>
