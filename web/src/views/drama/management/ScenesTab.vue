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

    <div v-if="filteredItems.length > 0" class="list-container">
      <div
        v-for="scene in filteredItems"
        :key="scene.id"
        class="list-row glass-list-row"
        @click="$emit('editScene', scene)"
      >
        <el-checkbox
          v-if="isBatchMode"
          :model-value="selectedIds.has(scene.id)"
          @change="toggleItem(scene.id)"
          @click.stop
        />
        <div class="row-thumb" :class="{ 'row-thumb-icon': !hasImage(scene) }">
          <img v-if="hasImage(scene)" :src="getImageUrl(scene)" :alt="scene.title || scene.location" />
          <el-icon v-else :size="20"><Picture /></el-icon>
        </div>
        <div class="row-body">
          <div class="row-top">
            <span class="row-title">{{ scene.title || scene.location }}</span>
            <span v-if="scene.time" class="glass-chip glass-chip-info">{{ scene.time }}</span>
          </div>
          <div class="row-bottom">
            <span class="row-desc">{{ scene.description || '-' }}</span>
          </div>
        </div>
        <div class="row-actions" @click.stop>
          <ActionButton :icon="Edit" :tooltip="$t('common.edit')" variant="primary" @click="$emit('editScene', scene)" />
          <ActionButton :icon="PictureFilled" :tooltip="$t('prop.generateImage')" @click="$emit('generateSceneImage', scene)" />
          <ActionButton :icon="Delete" :tooltip="$t('common.delete')" variant="danger" @click="$emit('deleteScene', scene)" />
        </div>
      </div>
    </div>

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
import { Document, Plus, Search, Picture, Edit, Delete, PictureFilled } from '@element-plus/icons-vue'
import { TabHeader, ActionButton, EmptyState } from '@/components/common'
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

const hasImage = (scene: Scene) => !!(scene.local_path || scene.image_url)

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
