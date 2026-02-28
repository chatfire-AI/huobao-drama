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

    <ResponsiveGrid v-if="filteredItems.length > 0">
      <ItemCard
        v-for="prop in filteredItems"
        :key="prop.id"
        :title="prop.name"
        :description="prop.description || prop.prompt"
        :image-url="getImageUrl(prop)"
        :placeholder-icon="Box"
        :tag="prop.type"
        tag-type="info"
        :selectable="isBatchMode"
        :selected="selectedIds.has(prop.id)"
        @select="toggleItem(prop.id)"
        @click="$emit('editProp', prop)"
      >
        <template #actions>
          <el-button size="small" @click="$emit('editProp', prop)">{{ $t('common.edit') }}</el-button>
          <el-button size="small" @click="$emit('generatePropImage', prop)" :disabled="!prop.prompt">{{ $t('prop.generateImage') }}</el-button>
          <el-button size="small" type="danger" @click="$emit('deleteProp', prop)">{{ $t('common.delete') }}</el-button>
        </template>
      </ItemCard>
    </ResponsiveGrid>

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
import { Document, Plus, Search, Box } from '@element-plus/icons-vue'
import { TabHeader, ItemCard, ResponsiveGrid, EmptyState } from '@/components/common'
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
