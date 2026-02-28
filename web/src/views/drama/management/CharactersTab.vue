<template>
  <div>
    <TabHeader :title="$t('drama.management.characterList')">
      <template #actions>
        <el-button
          v-if="!isBatchMode"
          size="small"
          @click="isBatchMode = true"
        >{{ $t('common.batchMode') }}</el-button>
        <el-button
          :icon="Document"
          @click="$emit('extractCharacters')"
        >{{ $t('prop.extract') }}</el-button>
        <el-button
          type="primary"
          :icon="Plus"
          @click="$emit('addCharacter')"
        >{{ $t('character.add') }}</el-button>
      </template>
      <template #filter>
        <el-input
          v-model="searchQuery"
          :placeholder="$t('character.searchPlaceholder')"
          :prefix-icon="Search"
          clearable
          style="width: 220px"
        />
        <el-select
          v-model="filterValue"
          :placeholder="$t('character.filterRole')"
          clearable
          style="width: 150px"
        >
          <el-option label="Main" value="main" />
          <el-option label="Supporting" value="supporting" />
          <el-option label="Minor" value="minor" />
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
        @click="$emit('batchDeleteCharacters', selectedItems)"
      >{{ $t('common.batchDelete') }}</el-button>
      <el-button
        size="small"
        :disabled="selectedCount === 0"
        @click="$emit('batchGenerateCharacterImages', selectedItems)"
      >{{ $t('common.batchGenerate') }}</el-button>
      <el-button size="small" @click="clearSelection">{{ $t('common.cancelBatch') }}</el-button>
    </div>

    <ResponsiveGrid v-if="filteredItems.length > 0">
      <ItemCard
        v-for="character in filteredItems"
        :key="character.id"
        :title="character.name"
        :description="character.appearance || character.description"
        :image-url="(character.local_path || character.image_url) ? getImageUrl(character) : undefined"
        :placeholder-icon="User"
        :tag="character.role === 'main' ? 'Main' : character.role === 'supporting' ? 'Supporting' : 'Minor'"
        :tag-type="character.role === 'main' ? 'danger' : 'info'"
        :selectable="isBatchMode"
        :selected="selectedIds.has(character.id)"
        @select="toggleItem(character.id)"
        @click="$emit('editCharacter', character)"
      >
        <template #actions>
          <el-button size="small" @click="$emit('editCharacter', character)">{{ $t('common.edit') }}</el-button>
          <el-button size="small" @click="$emit('generateCharacterImage', character)">{{ $t('prop.generateImage') }}</el-button>
          <el-button size="small" type="danger" @click="$emit('deleteCharacter', character)">{{ $t('common.delete') }}</el-button>
        </template>
      </ItemCard>
    </ResponsiveGrid>

    <EmptyState
      v-else
      :title="$t('drama.management.noCharacters')"
      :description="$t('character.emptyTip')"
      :icon="User"
    >
      <el-button type="primary" :icon="Plus" @click="$emit('addCharacter')">{{ $t('character.add') }}</el-button>
    </EmptyState>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Document, Plus, Search, User } from '@element-plus/icons-vue'
import { TabHeader, ItemCard, ResponsiveGrid, EmptyState } from '@/components/common'
import { getImageUrl } from '@/utils/image'
import { useFilteredList } from '@/composables/useFilteredList'
import { useBatchSelection } from '@/composables/useBatchSelection'
import type { Character } from '@/types/drama'

const { t } = useI18n()

const props = defineProps<{
  characters: Character[]
}>()

defineEmits<{
  extractCharacters: []
  addCharacter: []
  editCharacter: [character: Character]
  generateCharacterImage: [character: Character]
  deleteCharacter: [character: Character]
  batchDeleteCharacters: [characters: Character[]]
  batchGenerateCharacterImages: [characters: Character[]]
}>()

const charactersList = computed(() => props.characters)

const { searchQuery, filterValue, filteredItems } = useFilteredList({
  items: charactersList,
  searchFields: ['name', 'description', 'appearance'] as (keyof Character)[],
  filterField: 'role' as keyof Character,
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
