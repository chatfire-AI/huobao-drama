<template>
  <div class="workflow-card glass-surface">
    <div class="stage-body">
      <!-- 角色图片生成 -->
      <div class="image-gen-section">
        <div class="section-header glass-surface">
          <div class="section-title-row">
            <el-icon class="section-icon"><User /></el-icon>
            <h3>{{ $t("workflow.characterImages") }}</h3>
            <span class="glass-chip glass-chip-info">
              {{ $t("workflow.characterCount", { count: charactersCount }) }}
            </span>
          </div>
          <div class="section-actions">
            <el-checkbox
              v-model="localSelectAllCharacters"
              @change="toggleSelectAllCharacters"
            >
              {{ $t("workflow.selectAll") }}
            </el-checkbox>
            <el-button
              type="primary"
              class="glass-btn-base glass-btn-primary"
              @click="$emit('batchGenerateCharacterImages')"
              :loading="batchGeneratingCharacters"
              :disabled="selectedCharacterIds.length === 0"
            >
              <el-icon><MagicStick /></el-icon>
              {{ $t("workflow.batchGenerate") }} ({{ selectedCharacterIds.length }})
            </el-button>
          </div>
        </div>

        <div class="image-grid">
          <div
            v-for="char in currentEpisode?.characters"
            :key="char.id"
            class="image-card"
          >
            <!-- 卡片头部 -->
            <div class="card-header-row">
              <el-checkbox
                v-model="selectedCharacterIds"
                :value="char.id"
              />
              <div class="card-info">
                <span class="card-name">{{ char.name }}</span>
                <span class="card-role">{{ char.role }}</span>
              </div>
              <el-button
                class="card-delete-btn"
                type="danger"
                :icon="Delete"
                size="small"
                circle
                @click="$emit('deleteCharacter', char.id)"
              />
            </div>

            <!-- 图片区域 -->
            <div class="card-image-area">
              <div v-if="hasImage(char)" class="card-image">
                <el-image :src="getImageUrl(char)" fit="cover" />
                <div class="image-overlay">
                  <el-button
                    type="primary"
                    circle
                    :icon="MagicStick"
                    @click="$emit('generateCharacterImage', char.id)"
                  />
                  <el-button
                    circle
                    :icon="Upload"
                    @click="$emit('uploadCharacterImage', char.id)"
                  />
                </div>
              </div>
              <div
                v-else-if="
                  char.image_generation_status === 'pending' ||
                  char.image_generation_status === 'processing' ||
                  generatingCharacterImages[char.id]
                "
                class="card-placeholder generating"
              >
                <el-icon :size="48" class="rotating"><Loading /></el-icon>
                <span>{{ $t("common.generating") }}</span>
                <span class="status-tag">
                  {{ char.image_generation_status === "pending" ? $t("common.queuing") : $t("common.processing") }}
                </span>
              </div>
              <div
                v-else-if="char.image_generation_status === 'failed'"
                class="card-placeholder failed"
                @click="$emit('generateCharacterImage', char.id)"
              >
                <el-icon :size="48"><WarningFilled /></el-icon>
                <span>{{ $t("common.generateFailed") }}</span>
                <span class="status-tag retry">{{ $t("common.clickToRegenerate") }}</span>
              </div>
              <div v-else class="card-placeholder">
                <el-icon :size="48"><Picture /></el-icon>
                <span>{{ $t("common.notGenerated") }}</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="card-actions-row">
              <el-tooltip :content="$t('tooltip.editPrompt')" placement="top">
                <el-button
                  class="action-btn"
                  :icon="Edit"
                  @click="$emit('openPromptDialog', char, 'character')"
                />
              </el-tooltip>
              <el-tooltip :content="$t('tooltip.aiGenerate')" placement="top">
                <el-button
                  type="primary"
                  class="action-btn"
                  :icon="MagicStick"
                  @click="$emit('generateCharacterImage', char.id)"
                  :loading="generatingCharacterImages[char.id]"
                />
              </el-tooltip>
              <el-tooltip :content="$t('tooltip.uploadImage')" placement="top">
                <el-button
                  class="action-btn"
                  :icon="Upload"
                  @click="$emit('uploadCharacterImage', char.id)"
                />
              </el-tooltip>
              <el-tooltip :content="$t('tooltip.selectFromLibrary')" placement="top">
                <el-button
                  class="action-btn"
                  :icon="Picture"
                  @click="$emit('selectFromLibrary', char.id)"
                />
              </el-tooltip>
              <el-tooltip :content="$t('workflow.addToLibrary')" placement="top">
                <el-button
                  class="action-btn"
                  :icon="FolderAdd"
                  :disabled="!char.image_url"
                  @click="$emit('addToCharacterLibrary', char)"
                />
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-divider" />

      <!-- 场景图片生成 -->
      <div class="image-gen-section">
        <div class="section-header glass-surface">
          <div class="section-title-row">
            <el-icon class="section-icon"><Place /></el-icon>
            <h3>{{ $t("workflow.sceneImages") }}</h3>
            <span class="glass-chip glass-chip-info">
              {{ $t("workflow.sceneCount", { count: currentEpisode?.scenes?.length || 0 }) }}
            </span>
          </div>
          <div class="section-actions">
            <el-checkbox
              v-model="localSelectAllScenes"
              @change="toggleSelectAllScenes"
            >
              {{ $t("workflow.selectAll") }}
            </el-checkbox>
            <el-button
              type="primary"
              class="glass-btn-base glass-btn-primary"
              @click="$emit('batchGenerateSceneImages')"
              :loading="batchGeneratingScenes"
              :disabled="selectedSceneIds.length === 0"
            >
              <el-icon><MagicStick /></el-icon>
              {{ $t("workflow.batchGenerateSelected") }} ({{ selectedSceneIds.length }})
            </el-button>
            <el-button
              class="glass-btn-base glass-btn-secondary"
              @click="$emit('openAddSceneDialog')"
            >
              <el-icon><Plus /></el-icon>
              {{ $t("workflow.addScene") }}
            </el-button>
          </div>
        </div>

        <div class="image-grid">
          <div
            v-for="scene in currentEpisode?.scenes"
            :key="scene.id"
            class="image-card"
          >
            <!-- 卡片头部 -->
            <div class="card-header-row">
              <el-checkbox
                v-model="selectedSceneIds"
                :value="scene.id"
              />
              <div class="card-info">
                <span class="card-name">{{ scene.location }}</span>
                <span class="card-role">{{ scene.time }}</span>
              </div>
            </div>

            <!-- 图片区域 -->
            <div class="card-image-area">
              <div v-if="hasImage(scene)" class="card-image">
                <el-image :src="getImageUrl(scene)" fit="cover" />
                <div class="image-overlay">
                  <el-button
                    type="primary"
                    circle
                    :icon="MagicStick"
                    @click="$emit('generateSceneImage', scene.id)"
                  />
                  <el-button
                    circle
                    :icon="Upload"
                    @click="$emit('uploadSceneImage', scene.id)"
                  />
                </div>
              </div>
              <div
                v-else-if="
                  scene.image_generation_status === 'pending' ||
                  scene.image_generation_status === 'processing' ||
                  generatingSceneImages[scene.id]
                "
                class="card-placeholder generating"
              >
                <el-icon :size="48" class="rotating"><Loading /></el-icon>
                <span>{{ $t("common.generating") }}</span>
                <span class="status-tag">
                  {{ scene.image_generation_status === "pending" ? $t("common.queuing") : $t("common.processing") }}
                </span>
              </div>
              <div
                v-else-if="scene.image_generation_status === 'failed'"
                class="card-placeholder failed"
                @click="$emit('generateSceneImage', scene.id)"
              >
                <el-icon :size="48"><WarningFilled /></el-icon>
                <span>{{ $t("common.generateFailed") }}</span>
                <span class="status-tag retry">{{ $t("common.clickToRegenerate") }}</span>
              </div>
              <div v-else class="card-placeholder">
                <el-icon :size="48"><Place /></el-icon>
                <span>{{ $t("common.notGenerated") }}</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="card-actions-row">
              <el-tooltip :content="$t('tooltip.editPrompt')" placement="top">
                <el-button
                  class="action-btn"
                  :icon="Edit"
                  @click="$emit('openPromptDialog', scene, 'scene')"
                />
              </el-tooltip>
              <el-tooltip :content="$t('tooltip.aiGenerate')" placement="top">
                <el-button
                  type="primary"
                  class="action-btn"
                  :icon="MagicStick"
                  @click="$emit('generateSceneImage', scene.id)"
                  :loading="generatingSceneImages[scene.id]"
                />
              </el-tooltip>
              <el-tooltip :content="$t('tooltip.uploadImage')" placement="top">
                <el-button
                  class="action-btn"
                  :icon="Upload"
                  @click="$emit('uploadSceneImage', scene.id)"
                />
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
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
  overflow-y: auto;
}

.stage-body {
  padding: 16px;
}

.image-gen-section {
  margin-bottom: 32px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 14px 20px;

    .section-title-row {
      display: flex;
      align-items: center;
      gap: 12px;

      .section-icon {
        font-size: 20px;
        color: var(--glass-accent-from);
      }

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--glass-text-primary);
      }
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.image-card {
  display: flex;
  flex-direction: column;
  background: var(--glass-bg-surface);
  border: 1px solid var(--glass-stroke-soft);
  border-radius: var(--glass-radius-lg);
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--glass-stroke-focus);
    box-shadow: var(--glass-shadow-md);
    transform: translateY(-2px);
  }

  .card-header-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: var(--glass-bg-muted);
    border-bottom: 1px solid var(--glass-stroke-soft);

    .card-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;

      .card-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--glass-text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .card-role {
        font-size: 12px;
        color: var(--glass-text-tertiary);
      }
    }

    .card-delete-btn {
      flex-shrink: 0;
    }
  }

  .card-image-area {
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 4;
    background: var(--glass-bg-muted);
    overflow: hidden;

    .card-image {
      width: 100%;
      height: 100%;

      .el-image {
        width: 100%;
        height: 100%;
      }

      .image-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        transition: opacity 0.2s ease;

        .el-button {
          width: 36px;
          height: 36px;
        }
      }

      &:hover .image-overlay {
        opacity: 1;
      }
    }

    .card-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--glass-text-tertiary);

      .el-icon {
        opacity: 0.4;
      }

      span {
        font-size: 12px;
      }

      .status-tag {
        padding: 2px 8px;
        background: var(--glass-tone-warning-bg);
        color: var(--glass-tone-warning-fg);
        border-radius: 4px;
        font-size: 11px;

        &.retry {
          background: var(--glass-tone-danger-bg);
          color: var(--glass-tone-danger-fg);
        }
      }

      &.generating {
        .rotating {
          animation: rotating 2s linear infinite;
        }
      }

      &.failed {
        cursor: pointer;
        &:hover {
          background: var(--glass-tone-danger-bg);
        }
      }
    }
  }

  .card-actions-row {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    background: var(--glass-bg-surface);
    border-top: 1px solid var(--glass-stroke-soft);

    .action-btn {
      width: 32px;
      height: 32px;
      padding: 0;
      border-radius: var(--glass-radius-md);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--glass-bg-surface);
      border: 1px solid var(--glass-stroke-soft);
      color: var(--glass-text-secondary);
      transition: all 0.2s ease;

      &:hover {
        background: var(--glass-bg-surface-strong);
        border-color: var(--glass-accent-from);
        color: var(--glass-accent-from);
      }

      &.is-disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      // 主按钮样式
      &.el-button--primary {
        background: linear-gradient(140deg, var(--glass-accent-from) 0%, var(--glass-accent-to) 100%);
        border: none;
        color: white;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px var(--glass-accent-shadow-soft);
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }

  .image-gen-section .section-header {
    flex-direction: column;
    gap: 12px;

    .section-actions {
      width: 100%;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
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

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: var(--glass-accent-from);
  border-color: var(--glass-accent-from);
}

:deep(.el-button--primary) {
  background: linear-gradient(140deg, var(--glass-accent-from) 0%, var(--glass-accent-to) 100%);
  border: none;
}
</style>
