<template>
  <div>
    <TabHeader :title="$t('drama.management.sceneList')">
      <template #actions>
        <el-button
          v-if="!isBatchMode"
          size="small"
          @click="isBatchMode = true"
        >{{ $t('common.batchMode') }}</el-button>
        <el-button
          :icon="Document"
          @click="$emit('extractScenes')"
        >{{ $t('scene.extractTitle') }}</el-button>
        <el-button
          type="primary"
          :icon="Plus"
          @click="$emit('addScene')"
        >{{ $t('scene.addScene') }}</el-button>
      </template>
      <template #filter>
        <el-input
          v-model="searchQuery"
          :placeholder="$t('scene.searchPlaceholder')"
          :prefix-icon="Search"
          clearable
          style="width: 220px"
        />
      </template>
    </TabHeader>

    <!-- 批量操作栏 -->
    <div v-if="isBatchMode" class="batch-bar">
      <el-checkbox
        :model-value="isAllSelected"
        :indeterminate="isIndeterminate"
        @change="toggleAll"
      >{{ $t('common.selectAll') }}</el-checkbox>
      <span class="batch-bar__count">{{ $t('common.selectedCount', { count: selectedCount }) }}</span>
      <el-button
        size="small"
        type="danger"
        :disabled="selectedCount === 0"
        @click="$emit('batchDeleteScenes', selectedItems)"
      >{{ $t('common.batchDelete') }}</el-button>
      <el-button
        size="small"
        :disabled="selectedCount === 0"
        @click="$emit('batchGenerateSceneImages', selectedItems)"
      >{{ $t('common.batchGenerate') }}</el-button>
      <el-button size="small" @click="clearSelection">{{ $t('common.cancelBatch') }}</el-button>
    </div>

    <ResponsiveGrid v-if="filteredItems.length > 0">
      <ItemCard
        v-for="scene in filteredItems"
        :key="scene.id"
        :title="scene.title || scene.location"
        :description="scene.description"
        :image-url="getImageUrl(scene)"
        :placeholder-icon="Picture"
        :tag="scene.time"
        tag-type="info"
        :selectable="isBatchMode"
        :selected="selectedIds.has(scene.id)"
        @select="toggleItem(scene.id)"
        @click="$emit('editScene', scene)"
      >
        <template #actions>
          <el-button size="small" @click="$emit('editScene', scene)">{{ $t('common.edit') }}</el-button>
          <el-button size="small" @click="$emit('generateSceneImage', scene)">{{ $t('prop.generateImage') }}</el-button>
          <el-button size="small" type="danger" @click="$emit('deleteScene', scene)">{{ $t('common.delete') }}</el-button>
        </template>
      </ItemCard>
    </ResponsiveGrid>

    <EmptyState
      v-else-if="scenes.length === 0"
      :title="$t('drama.management.noScenes')"
      :description="$t('scene.emptyTip')"
      :icon="Picture"
    >
      <el-button type="primary" :icon="Plus" @click="$emit('addScene')">{{ $t('scene.addScene') }}</el-button>
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
import { Document, Plus, Search, Picture } from '@element-plus/icons-vue'
import { TabHeader, ItemCard, ResponsiveGrid, EmptyState } from '@/components/common'
import { getImageUrl } from '@/utils/image'
import { useFilteredList } from '@/composables/useFilteredList'
import { useBatchSelection } from '@/composables/useBatchSelection'
import type { Scene } from '@/types/drama'

const { t } = useI18n()

const props = defineProps<{
  scenes: Scene[]
}>()

defineEmits<{
  extractScenes: []
  addScene: []
  editScene: [scene: Scene]
  generateSceneImage: [scene: Scene]
  deleteScene: [scene: Scene]
  batchDeleteScenes: [scenes: Scene[]]
  batchGenerateSceneImages: [scenes: Scene[]]
}>()

const scenesList = computed(() => props.scenes)

const { searchQuery, filteredItems } = useFilteredList({
  items: scenesList,
  searchFields: ['title', 'location', 'description'] as (keyof Scene)[],
})

const {
  selectedIds, isBatchMode, isAllSelected, isIndeterminate,
  selectedItems, selectedCount, toggleItem, toggleAll, clearSelection,
} = useBatchSelection(filteredItems)
</script>

<style scoped>
.batch-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  background: var(--bg-card-hover);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
}

.batch-bar__count {
  font-size: 0.875rem;
  color: var(--text-secondary);
}
</style>
