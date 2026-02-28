<template>
  <div>
    <TabHeader :title="$t('drama.management.propList')">
      <template #actions>
        <el-button
          v-if="!isBatchMode"
          size="small"
          @click="isBatchMode = true"
        >{{ $t('common.batchMode') }}</el-button>
        <el-button
          :icon="Document"
          @click="$emit('extractProps')"
        >{{ $t('prop.extract') }}</el-button>
        <el-button
          type="primary"
          :icon="Plus"
          @click="$emit('addProp')"
        >{{ $t('common.add') }}</el-button>
      </template>
      <template #filter>
        <el-input
          v-model="searchQuery"
          :placeholder="$t('prop.searchPlaceholder')"
          :prefix-icon="Search"
          clearable
          style="width: 220px"
        />
        <el-select
          v-model="filterValue"
          :placeholder="$t('prop.filterType')"
          clearable
          style="width: 150px"
        >
          <el-option
            v-for="propType in propTypes"
            :key="propType"
            :label="propType"
            :value="propType"
          />
        </el-select>
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
        @click="$emit('batchDeleteProps', selectedItems)"
      >{{ $t('common.batchDelete') }}</el-button>
      <el-button
        size="small"
        :disabled="selectedCount === 0"
        @click="$emit('batchGeneratePropImages', selectedItems)"
      >{{ $t('common.batchGenerate') }}</el-button>
      <el-button size="small" @click="clearSelection">{{ $t('common.cancelBatch') }}</el-button>
    </div>

    <div v-if="filteredItems.length > 0" class="list-container">
      <div
        v-for="prop in filteredItems"
        :key="prop.id"
        class="list-row glass-list-row"
        @click="$emit('editProp', prop)"
      >
        <el-checkbox
          v-if="isBatchMode"
          :model-value="selectedIds.has(prop.id)"
          @change="toggleItem(prop.id)"
          @click.stop
        />
        <div class="row-thumb" :class="{ 'row-thumb-icon': !hasImage(prop) }">
          <img v-if="hasImage(prop)" :src="getImageUrl(prop)" :alt="prop.name" />
          <el-icon v-else :size="20"><Box /></el-icon>
        </div>
        <div class="row-body">
          <div class="row-top">
            <span class="row-title">{{ prop.name }}</span>
            <span v-if="prop.type" class="glass-chip glass-chip-info">{{ prop.type }}</span>
          </div>
          <div class="row-bottom">
            <span class="row-desc">{{ prop.description || prop.prompt || '-' }}</span>
          </div>
        </div>
        <div class="row-actions" @click.stop>
          <ActionButton :icon="Edit" :tooltip="$t('common.edit')" variant="primary" @click="$emit('editProp', prop)" />
          <ActionButton :icon="PictureFilled" :tooltip="$t('prop.generateImage')" :disabled="!prop.prompt" @click="$emit('generatePropImage', prop)" />
          <ActionButton :icon="Delete" :tooltip="$t('common.delete')" variant="danger" @click="$emit('deleteProp', prop)" />
        </div>
      </div>
    </div>

    <EmptyState
      v-else-if="propsList.length === 0"
      :title="$t('drama.management.noProps')"
      :description="$t('prop.emptyTip')"
      :icon="Box"
    >
      <el-button type="primary" :icon="Plus" @click="$emit('addProp')">{{ $t('common.add') }}</el-button>
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
import { Document, Plus, Search, Box, Edit, Delete, PictureFilled } from '@element-plus/icons-vue'
import { TabHeader, ActionButton, EmptyState } from '@/components/common'
import { getImageUrl } from '@/utils/image'
import { useFilteredList } from '@/composables/useFilteredList'
import { useBatchSelection } from '@/composables/useBatchSelection'
import type { Prop } from '@/types/prop'

const { t } = useI18n()

const props = defineProps<{
  propsList: Prop[]
}>()

defineEmits<{
  extractProps: []
  addProp: []
  editProp: [prop: Prop]
  generatePropImage: [prop: Prop]
  deleteProp: [prop: Prop]
  batchDeleteProps: [props: Prop[]]
  batchGeneratePropImages: [props: Prop[]]
}>()

const propsListRef = computed(() => props.propsList)

const hasImage = (prop: Prop) => !!prop.image_url

const propTypes = computed(() => {
  const types = new Set(props.propsList.map(p => p.type).filter(Boolean))
  return Array.from(types)
})

const { searchQuery, filterValue, filteredItems } = useFilteredList({
  items: propsListRef,
  searchFields: ['name', 'description'] as (keyof Prop)[],
  filterField: 'type' as keyof Prop,
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
