<template>
  <div>
    <div class="tab-header">
      <h2>{{ $t("drama.management.propList") }}</h2>
      <div style="display: flex; gap: 10px">
        <el-button :icon="Document" @click="$emit('extractProps')">{{
          $t("prop.extract")
        }}</el-button>
        <el-button
          type="primary"
          :icon="Plus"
          @click="$emit('addProp')"
          >{{ $t("common.add") }}</el-button
        >
      </div>
    </div>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="6" v-for="prop in props.propsList" :key="prop.id">
        <el-card shadow="hover" class="scene-card">
          <div class="scene-preview">
            <ImagePreview
              :image-url="getImageUrl(prop)"
              :alt="prop.name"
              :size="120"
              :show-placeholder-text="false"
            />
          </div>

          <div class="scene-info">
            <h4>{{ prop.name }}</h4>
            <el-tag size="small" v-if="prop.type">{{
              prop.type
            }}</el-tag>
            <p class="desc">{{ prop.description || prop.prompt }}</p>
          </div>

          <div class="scene-actions">
            <el-button size="small" @click="$emit('editProp', prop)">{{
              $t("common.edit")
            }}</el-button>
            <el-button
              size="small"
              @click="$emit('generatePropImage', prop)"
              :disabled="!prop.prompt"
              >{{ $t("prop.generateImage") }}</el-button
            >
            <el-button
              size="small"
              type="danger"
              @click="$emit('deleteProp', prop)"
              >{{ $t("common.delete") }}</el-button
            >
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty
      v-if="!propsList || propsList.length === 0"
      :description="$t('drama.management.noProps')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Document, Plus } from '@element-plus/icons-vue'
import { ImagePreview } from '@/components/common'
import { getImageUrl } from '@/utils/image'
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

.scene-card {
  margin-bottom: var(--space-4);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all var(--transition-normal);
}

.scene-card:hover {
  border-color: var(--border-secondary);
  box-shadow: var(--shadow-card-hover);
}

.scene-card :deep(.el-card__body) {
  padding: 0;
}

.scene-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 160px;
  background: linear-gradient(135deg, var(--accent) 0%, #06b6d4 100%);
  overflow: hidden;
}

.scene-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-normal);
}

.scene-card:hover .scene-preview img {
  transform: scale(1.05);
}

.scene-info {
  text-align: center;
  padding: var(--space-4);
}

.scene-info h4 {
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

.scene-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  padding: 0 var(--space-4) var(--space-4);
}
</style>
