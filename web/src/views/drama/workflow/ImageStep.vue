<template>
  <el-card class="workflow-card">
    <div class="stage-body">
      <!-- 角色图片生成 -->
      <div class="image-gen-section">
        <div class="section-header">
          <div class="section-title">
            <h3>
              <el-icon><User /></el-icon>
              {{ $t("workflow.characterImages") }}
            </h3>
            <el-alert type="info" :closable="false" style="margin: 0">
              {{
                $t("workflow.characterCount", { count: charactersCount })
              }}
            </el-alert>
          </div>
          <div class="section-actions">
            <el-checkbox
              v-model="localSelectAllCharacters"
              @change="toggleSelectAllCharacters"
              style="margin-right: 12px"
            >
              {{ $t("workflow.selectAll") }}
            </el-checkbox>
            <el-button
              type="primary"
              @click="$emit('batchGenerateCharacterImages')"
              :loading="batchGeneratingCharacters"
              :disabled="selectedCharacterIds.length === 0"
              size="default"
            >
              {{ $t("workflow.batchGenerate") }} ({{
                selectedCharacterIds.length
              }})
            </el-button>
          </div>
        </div>

        <div class="character-image-list">
          <div
            v-for="char in currentEpisode?.characters"
            :key="char.id"
            class="character-item"
          >
            <el-card shadow="hover" class="fixed-card">
              <div class="card-header">
                <el-checkbox
                  v-model="selectedCharacterIds"
                  :value="char.id"
                  style="margin-right: 8px"
                />
                <div class="header-left">
                  <h4>{{ char.name }}</h4>
                  <el-tag size="small">{{ char.role }}</el-tag>
                </div>
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  circle
                  @click="$emit('deleteCharacter', char.id)"
                  :title="$t('workflow.deleteCharacter')"
                />
              </div>

              <div class="card-image-container">
                <div v-if="hasImage(char)" class="char-image">
                  <el-image :src="getImageUrl(char)" fit="cover" />
                </div>
                <div
                  v-else-if="
                    char.image_generation_status === 'pending' ||
                    char.image_generation_status === 'processing' ||
                    generatingCharacterImages[char.id]
                  "
                  class="char-placeholder generating"
                >
                  <el-icon :size="64" class="rotating"><Loading /></el-icon>
                  <span>{{ $t("common.generating") }}</span>
                  <el-tag type="warning" size="small" style="margin-top: 8px">{{
                    char.image_generation_status === "pending"
                      ? $t("common.queuing")
                      : $t("common.processing")
                  }}</el-tag>
                </div>
                <div
                  v-else-if="char.image_generation_status === 'failed'"
                  class="char-placeholder failed"
                >
                  <el-icon :size="64"><WarningFilled /></el-icon>
                  <span>{{ $t("common.generateFailed") }}</span>
                  <el-tag type="danger" size="small" style="margin-top: 8px">{{
                    $t("common.clickToRegenerate")
                  }}</el-tag>
                </div>
                <div v-else class="char-placeholder">
                  <el-icon :size="64"><User /></el-icon>
                  <span>{{ $t("common.notGenerated") }}</span>
                </div>
              </div>

              <div class="card-actions">
                <el-tooltip :content="$t('tooltip.editPrompt')" placement="top">
                  <el-button
                    size="small"
                    @click="$emit('openPromptDialog', char, 'character')"
                    :icon="Edit"
                    circle
                  />
                </el-tooltip>
                <el-tooltip :content="$t('tooltip.aiGenerate')" placement="top">
                  <el-button
                    type="primary"
                    size="small"
                    @click="$emit('generateCharacterImage', char.id)"
                    :loading="generatingCharacterImages[char.id]"
                    :icon="MagicStick"
                    circle
                  />
                </el-tooltip>
                <el-tooltip :content="$t('tooltip.uploadImage')" placement="top">
                  <el-button
                    size="small"
                    @click="$emit('uploadCharacterImage', char.id)"
                    :icon="Upload"
                    circle
                  />
                </el-tooltip>
                <el-tooltip :content="$t('tooltip.selectFromLibrary')" placement="top">
                  <el-button
                    size="small"
                    @click="$emit('selectFromLibrary', char.id)"
                    :icon="Picture"
                    circle
                  />
                </el-tooltip>
                <el-tooltip :content="$t('workflow.addToLibrary')" placement="top">
                  <el-button
                    size="small"
                    @click="$emit('addToCharacterLibrary', char)"
                    :icon="FolderAdd"
                    :disabled="!char.image_url"
                    circle
                  />
                </el-tooltip>
              </div>
            </el-card>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 场景图片生成 -->
      <div class="image-gen-section">
        <div class="section-header">
          <div class="section-title">
            <h3>
              <el-icon><Place /></el-icon>
              {{ $t("workflow.sceneImages") }}
            </h3>
            <el-alert type="info" :closable="false" style="margin: 0">
              {{
                $t("workflow.sceneCount", {
                  count: currentEpisode?.scenes?.length || 0,
                })
              }}
            </el-alert>
          </div>
          <div class="section-actions">
            <el-checkbox
              v-model="localSelectAllScenes"
              @change="toggleSelectAllScenes"
              style="margin-left: 12px; margin-right: 12px"
            >
              {{ $t("workflow.selectAll") }}
            </el-checkbox>
            <el-button
              type="primary"
              @click="$emit('batchGenerateSceneImages')"
              :loading="batchGeneratingScenes"
              :disabled="selectedSceneIds.length === 0"
              size="default"
            >
              {{ $t("workflow.batchGenerateSelected") }} ({{
                selectedSceneIds.length
              }})
            </el-button>

            <el-button
              :icon="Plus"
              @click="$emit('openAddSceneDialog')"
              size="default"
            >
              {{ $t("workflow.addScene") }}
            </el-button>
          </div>
        </div>

        <div class="scene-image-list">
          <div
            v-for="scene in currentEpisode?.scenes"
            :key="scene.id"
            class="scene-item"
          >
            <el-card shadow="hover" class="fixed-card">
              <div class="card-header">
                <el-checkbox
                  v-model="selectedSceneIds"
                  :value="scene.id"
                  style="margin-right: 8px"
                />
                <div class="header-left">
                  <h4>{{ scene.location }}</h4>
                  <el-tag size="small">{{ scene.time }}</el-tag>
                </div>
              </div>

              <div class="card-image-container">
                <div v-if="hasImage(scene)" class="scene-image">
                  <el-image :src="getImageUrl(scene)" fit="cover" />
                </div>
                <div
                  v-else-if="
                    scene.image_generation_status === 'pending' ||
                    scene.image_generation_status === 'processing' ||
                    generatingSceneImages[scene.id]
                  "
                  class="scene-placeholder generating"
                >
                  <el-icon :size="64" class="rotating"><Loading /></el-icon>
                  <span>{{ $t("common.generating") }}</span>
                  <el-tag type="warning" size="small" style="margin-top: 8px">{{
                    scene.image_generation_status === "pending"
                      ? $t("common.queuing")
                      : $t("common.processing")
                  }}</el-tag>
                </div>
                <div
                  v-else-if="scene.image_generation_status === 'failed'"
                  class="scene-placeholder failed"
                  @click="$emit('generateSceneImage', scene.id)"
                  style="cursor: pointer"
                >
                  <el-icon :size="64"><WarningFilled /></el-icon>
                  <span>{{ $t("common.generateFailed") }}</span>
                  <el-tag type="danger" size="small" style="margin-top: 8px">{{
                    $t("common.clickToRegenerate")
                  }}</el-tag>
                </div>
                <div v-else class="scene-placeholder">
                  <el-icon :size="64"><Place /></el-icon>
                  <span>{{ $t("common.notGenerated") }}</span>
                </div>
              </div>

              <div class="card-actions">
                <el-tooltip :content="$t('tooltip.editPrompt')" placement="top">
                  <el-button
                    size="small"
                    @click="$emit('openPromptDialog', scene, 'scene')"
                    :icon="Edit"
                    circle
                  />
                </el-tooltip>
                <el-tooltip :content="$t('tooltip.aiGenerate')" placement="top">
                  <el-button
                    type="primary"
                    size="small"
                    @click="$emit('generateSceneImage', scene.id)"
                    :loading="generatingSceneImages[scene.id]"
                    :icon="MagicStick"
                    circle
                  />
                </el-tooltip>
                <el-tooltip :content="$t('tooltip.uploadImage')" placement="top">
                  <el-button
                    size="small"
                    @click="$emit('uploadSceneImage', scene.id)"
                    :icon="Upload"
                    circle
                  />
                </el-tooltip>
              </div>
            </el-card>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  User, Place, MagicStick, Edit, Upload, Delete,
  FolderAdd, Loading, WarningFilled, Picture, Plus,
} from "@element-plus/icons-vue";
import type { Episode } from "@/types/drama";
import { getImageUrl, hasImage } from "@/utils/image";

const { t: $t } = useI18n();

const props = defineProps<{
  currentEpisode: Episode | null | undefined;
  charactersCount: number;
  selectedCharacterIds: number[];
  selectedSceneIds: any[];
  selectAllCharacters: boolean;
  selectAllScenes: boolean;
  batchGeneratingCharacters: boolean;
  batchGeneratingScenes: boolean;
  generatingCharacterImages: Record<number, boolean>;
  generatingSceneImages: Record<string, boolean>;
}>();

const emit = defineEmits<{
  (e: "update:selectedCharacterIds", val: number[]): void;
  (e: "update:selectedSceneIds", val: any[]): void;
  (e: "update:selectAllCharacters", val: boolean): void;
  (e: "update:selectAllScenes", val: boolean): void;
  (e: "batchGenerateCharacterImages"): void;
  (e: "batchGenerateSceneImages"): void;
  (e: "generateCharacterImage", id: number): void;
  (e: "generateSceneImage", id: string): void;
  (e: "openPromptDialog", item: any, type: "character" | "scene"): void;
  (e: "uploadCharacterImage", id: number): void;
  (e: "uploadSceneImage", id: string): void;
  (e: "selectFromLibrary", id: number): void;
  (e: "addToCharacterLibrary", char: any): void;
  (e: "deleteCharacter", id: number): void;
  (e: "openAddSceneDialog"): void;
}>();

const selectedCharacterIds = ref<number[]>(props.selectedCharacterIds);
const selectedSceneIds = ref<any[]>(props.selectedSceneIds);
const localSelectAllCharacters = ref(props.selectAllCharacters);
const localSelectAllScenes = ref(props.selectAllScenes);

watch(selectedCharacterIds, (val) => {
  emit("update:selectedCharacterIds", val);
});
watch(selectedSceneIds, (val) => {
  emit("update:selectedSceneIds", val);
});
watch(() => props.selectedCharacterIds, (val) => {
  selectedCharacterIds.value = val;
});
watch(() => props.selectedSceneIds, (val) => {
  selectedSceneIds.value = val;
});

const toggleSelectAllCharacters = () => {
  if (localSelectAllCharacters.value) {
    selectedCharacterIds.value =
      props.currentEpisode?.characters?.map((char) => char.id) || [];
  } else {
    selectedCharacterIds.value = [];
  }
  emit("update:selectAllCharacters", localSelectAllCharacters.value);
};

const toggleSelectAllScenes = () => {
  if (localSelectAllScenes.value) {
    selectedSceneIds.value =
      props.currentEpisode?.scenes?.map((scene) => scene.id) || [];
  } else {
    selectedSceneIds.value = [];
  }
  emit("update:selectAllScenes", localSelectAllScenes.value);
};
</script>

<style scoped lang="scss">
.workflow-card {
  height: calc(100% - 24px);
  margin: 12px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-primary);

  :deep(.el-card__body) {
    padding: 0;
  }
}

.stage-body {
  background: var(--bg-card);
}

.image-gen-section {
  margin-bottom: 32px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 16px;
    background: var(--bg-secondary);

    .section-title {
      display: flex;
      align-items: center;
      gap: 16px;

      h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);

        .el-icon {
          color: var(--accent);
          font-size: 18px;
        }
      }

      .el-alert {
        border-radius: 4px;
      }
    }

    .section-actions {
      display: flex;
      align-items: center;
    }
  }
}

.fixed-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-card);
  transition: all 0.2s;

  &:hover {
    box-shadow: var(--shadow-card-hover);
  }

  :deep(.el-card__body) {
    flex: 1;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .card-header {
    padding: 14px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-left {
      flex: 1;
      min-width: 0;

      h4 {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .el-tag {
        margin-top: 0;
      }
    }
  }

  .card-image-container {
    flex: 1;
    width: 100%;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary);

    .char-image,
    .scene-image {
      width: 100%;
      height: 100%;
      position: relative;
      z-index: 1;

      .el-image {
        width: 100%;
        height: 100%;
        border-radius: 0;
      }
    }

    .char-placeholder,
    .scene-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      padding: 20px;

      &.generating {
        color: var(--warning);
        background: var(--warning-light);

        .rotating {
          animation: rotating 2s linear infinite;
        }
      }

      &.failed {
        color: var(--error);
        background: var(--error-light);
      }
      position: relative;
      z-index: 1;

      .el-icon {
        opacity: 0.5;
      }

      span {
        margin-top: 10px;
        font-size: 12px;
      }
    }
  }

  .card-actions {
    padding: 10px;
    background: var(--bg-card);
    border-top: 1px solid var(--border-primary);
    display: flex;
    justify-content: center;
    gap: 8px;

    .el-button {
      margin: 0;
    }
  }
}

.character-image-list,
.scene-image-list {
  padding: 5px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 16px;

  .character-item,
  .scene-item {
    min-height: 360px;
  }
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

:deep(.el-card) {
  background: var(--bg-card);
  border-color: var(--border-primary);
}

:deep(.el-card__header) {
  background: var(--bg-secondary);
  border-color: var(--border-primary);
}
</style>
