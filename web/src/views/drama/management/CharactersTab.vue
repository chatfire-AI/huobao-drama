<template>
  <div>
    <div class="tab-header">
      <h2>{{ $t("drama.management.characterList") }}</h2>
      <div style="display: flex; gap: 10px">
        <el-button
          :icon="Document"
          @click="$emit('extractCharacters')"
          >{{ $t("prop.extract") }}</el-button
        >
        <el-button
          type="primary"
          :icon="Plus"
          @click="$emit('addCharacter')"
          >{{ $t("character.add") }}</el-button
        >
      </div>
    </div>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col
        :span="6"
        v-for="character in characters"
        :key="character.id"
      >
        <el-card shadow="hover" class="character-card">
          <div class="character-preview">
            <ImagePreview
              v-if="character.local_path || character.image_url"
              :image-url="getImageUrl(character)"
              :alt="character.name"
              :size="120"
            />
            <el-avatar v-else :size="120">{{
              character.name[0]
            }}</el-avatar>
          </div>

          <div class="character-info">
            <div class="character-name">
              <h4>{{ character.name }}</h4>
              <el-tag
                :type="character.role === 'main' ? 'danger' : 'info'"
                size="small"
              >
                {{
                  character.role === "main"
                    ? "Main"
                    : character.role === "supporting"
                      ? "Supporting"
                      : "Minor"
                }}
              </el-tag>
            </div>
            <p class="desc">
              {{ character.appearance || character.description }}
            </p>
          </div>

          <div class="character-actions">
            <el-button size="small" @click="$emit('editCharacter', character)">{{
              $t("common.edit")
            }}</el-button>
            <el-button
              size="small"
              @click="$emit('generateCharacterImage', character)"
              >{{ $t("prop.generateImage") }}</el-button
            >
            <el-button
              size="small"
              type="danger"
              @click="$emit('deleteCharacter', character)"
              >{{ $t("common.delete") }}</el-button
            >
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty
      v-if="!characters || characters.length === 0"
      :description="$t('drama.management.noCharacters')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Document, Plus } from '@element-plus/icons-vue'
import { ImagePreview } from '@/components/common'
import { getImageUrl } from '@/utils/image'
import type { Character } from '@/types/drama'

const { t } = useI18n()

defineProps<{
  characters: Character[]
}>()

defineEmits<{
  extractCharacters: []
  addCharacter: []
  editCharacter: [character: Character]
  generateCharacterImage: [character: Character]
  deleteCharacter: [character: Character]
}>()
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
.character-card {
  margin-bottom: var(--space-4);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all var(--transition-normal);
}

.character-card:hover {
  border-color: var(--border-secondary);
  box-shadow: var(--shadow-card-hover);
}

.character-card :deep(.el-card__body) {
  padding: 0;
}

.character-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 160px;
  background: linear-gradient(135deg, var(--accent) 0%, #06b6d4 100%);
  overflow: hidden;
}

.character-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-normal);
}

.character-card:hover .character-preview img {
  transform: scale(1.05);
}

.character-info {
  text-align: center;
  padding: var(--space-4);
}

.character-name {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-2);
}

.character-info h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.desc {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: var(--space-2) 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.character-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  padding: 0 var(--space-4) var(--space-4);
}
</style>
