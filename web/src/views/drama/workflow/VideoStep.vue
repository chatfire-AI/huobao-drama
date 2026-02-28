<template>
  <div class="video-step-container">
    <!-- 统一头部区域 -->
    <div class="page-header glass-surface">
      <div class="header-left">
        <el-icon class="header-icon"><Film /></el-icon>
        <h2 class="header-title">{{ $t("workflow.shotList") }}</h2>
        <span class="shot-count glass-chip glass-chip-info">
          {{ currentEpisode?.storyboards?.length || 0 }} {{ $t("workflow.shots") }}
        </span>
      </div>
      <div class="header-right">
        <el-button
          type="primary"
          class="glass-btn-base glass-btn-primary"
          @click="$emit('generateShots')"
          :loading="generatingShots"
        >
          <el-icon><MagicStick /></el-icon>
          {{
            generatingShots
              ? $t("workflow.aiSplitting")
              : $t("workflow.aiAutoSplit")
          }}
        </el-button>
      </div>
    </div>

    <!-- 任务进度显示 -->
    <div v-if="generatingShots" class="task-progress-wrapper glass-surface">
      <el-progress
        :percentage="taskProgress"
        :status="taskProgress === 100 ? 'success' : undefined"
        class="glass-progress"
      >
        <template #default="{ percentage }">
          <span>{{ percentage }}%</span>
        </template>
      </el-progress>
      <div class="task-message">{{ taskMessage }}</div>
    </div>

    <!-- 分镜列表 -->
    <div
      v-if="
        currentEpisode?.storyboards &&
        currentEpisode.storyboards.length > 0
      "
      class="shots-list glass-surface"
    >
      <el-table
        :data="currentEpisode.storyboards"
        stripe
        class="glass-table"
      >
        <el-table-column
          type="index"
          label="#"
          width="50"
          align="center"
        />
        <el-table-column
          label="标题"
          width="150"
        >
          <template #default="{ row }">
            <el-input
              v-model="row.title"
              size="small"
              class="cell-input"
              @change="$emit('updateShot', row)"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="镜头类型"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-select
              v-model="row.shot_type"
              size="small"
              class="cell-select"
              @change="$emit('updateShot', row)"
            >
              <el-option label="全景" value="全景" />
              <el-option label="远景" value="远景" />
              <el-option label="中景" value="中景" />
              <el-option label="近景" value="近景" />
              <el-option label="特写" value="特写" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column
          label="运镜"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-select
              v-model="row.movement"
              size="small"
              class="cell-select"
              @change="$emit('updateShot', row)"
            >
              <el-option label="固定" value="固定" />
              <el-option label="推" value="推" />
              <el-option label="拉" value="拉" />
              <el-option label="摇" value="摇" />
              <el-option label="移" value="移" />
              <el-option label="跟" value="跟" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column
          label="角色"
          width="140"
        >
          <template #default="{ row }">
            <div class="character-cell">
              <!-- 显示角色头像 - 直接使用 row.characters -->
              <div v-if="row.characters && row.characters.length > 0" class="avatar-stack">
                <el-popover
                  v-for="(char, idx) in row.characters.slice(0, 3)"
                  :key="idx"
                  placement="top"
                  :width="120"
                  trigger="hover"
                >
                  <template #reference>
                    <div class="avatar-item">
                      <img
                        :src="char.reference_images?.[0] || char.image_url"
                        :alt="char.name"
                        class="avatar-img"
                      />
                    </div>
                  </template>
                  <div class="avatar-tooltip">
                    <div class="tooltip-name">{{ char.name }}</div>
                    <img
                      :src="char.reference_images?.[0] || char.image_url"
                      alt="角色"
                      class="tooltip-img"
                    />
                  </div>
                </el-popover>
                <span v-if="row.characters.length > 3" class="more-count">
                  +{{ row.characters.length - 3 }}
                </span>
              </div>
              <!-- 选择角色 -->
              <el-select
                v-model="row.characterIds"
                multiple
                size="small"
                class="cell-select"
                placeholder="选择角色"
                @change="handleCharacterChange(row)"
              >
                <el-option
                  v-for="char in currentEpisode?.characters"
                  :key="char.id"
                  :label="char.name"
                  :value="Number(char.id)"
                />
              </el-select>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="场景"
          width="140"
        >
          <template #default="{ row }">
            <div class="scene-cell">
              <!-- 显示场景图片和名称 - 直接使用 row.background -->
              <div v-if="row.background" class="scene-display">
                <div v-if="row.background.image_url" class="scene-thumbs">
                  <el-popover
                    placement="top"
                    :width="160"
                    trigger="hover"
                  >
                    <template #reference>
                      <div class="scene-thumb">
                        <img :src="row.background.image_url" alt="场景" class="scene-img" />
                      </div>
                    </template>
                    <div class="scene-tooltip">
                      <div class="tooltip-name">{{ row.background.location }}</div>
                      <img :src="row.background.image_url" alt="场景" class="tooltip-img" />
                    </div>
                  </el-popover>
                </div>
                <span class="scene-name">{{ row.background.location }}</span>
              </div>
              <span v-else class="scene-empty">-</span>
              <!-- 选择场景 -->
              <el-select
                v-model="row.scene_id"
                size="small"
                class="cell-select"
                placeholder="选择场景"
                @change="handleSceneChange(row)"
              >
                <el-option
                  v-for="scene in currentEpisode?.scenes"
                  :key="scene.id"
                  :label="scene.title || scene.location"
                  :value="Number(scene.id)"
                />
              </el-select>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('storyboard.table.action')"
          min-width="140"
        >
          <template #default="{ row }">
            <el-input
              v-model="row.action"
              type="textarea"
              :rows="1"
              size="small"
              class="cell-input"
              placeholder="动作描述"
              @change="$emit('updateShot', row)"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="时长"
          width="80"
          align="center"
        >
          <template #default="{ row }">
            <el-input
              v-model.number="row.duration"
              type="number"
              min="1"
              max="300"
              size="small"
              class="duration-input"
              @change="$emit('updateShot', row)"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="100"
          fixed="right"
          align="center"
        >
          <template #default="{ row, $index }">
            <div class="operation-buttons">
              <el-tooltip :content="$t('common.edit')" placement="top">
                <el-button
                  type="primary"
                  size="small"
                  :icon="Edit"
                  circle
                  @click="$emit('editShot', row, $index)"
                />
              </el-tooltip>
              <el-tooltip :content="$t('common.delete')" placement="top">
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  circle
                  @click="$emit('deleteShot', row.id, $index)"
                />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 未拆分时显示 -->
    <div v-else class="empty-shots">
      <div class="empty-content glass-surface hover-lift">
        <div class="empty-icon-wrapper">
          <el-icon :size="56"><Film /></el-icon>
        </div>
        <h3 class="empty-title">{{ $t("workflow.splitStoryboardFirst") }}</h3>
        <p class="empty-description">
          {{ $t("workflow.splitStoryboardHint") }}
        </p>

        <el-button
          type="primary"
          class="glass-btn-base glass-btn-primary glass-btn-lg"
          @click="$emit('generateShots')"
          :loading="generatingShots"
        >
          <el-icon><MagicStick /></el-icon>
          {{
            generatingShots
              ? $t("workflow.aiSplitting")
              : $t("workflow.aiAutoSplit")
          }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { MagicStick, Film, Edit, Delete } from "@element-plus/icons-vue";
import type { Episode, Storyboard, Character, Scene } from "@/types/drama";

const { t: $t } = useI18n();

const props = defineProps<{
  currentEpisode: Episode | null | undefined;
  generatingShots: boolean;
  taskProgress: number;
  taskMessage: string;
}>();

const emit = defineEmits<{
  (e: "generateShots"): void;
  (e: "editShot", shot: Storyboard, index: number): void;
  (e: "updateShot", shot: Storyboard): void;
  (e: "deleteShot", shotId: string, index: number): void;
}>();

// 获取选中角色的头像图片
const getSelectedCharacterImages = (row: Storyboard) => {
  if (!row.characters || !row.characters.length) return [];
  return row.characters
    .map((c: string | Character) => {
      if (typeof c === "object" && c?.reference_images && c.reference_images.length > 0) {
        return c.reference_images[0];
      }
      return typeof c === "object" ? c?.image_url || null : null;
    })
    .filter(Boolean);
};

// 获取选中角色的名称
const getSelectedCharacterNames = (row: Storyboard) => {
  if (!row.characters || !row.characters.length) return [];
  return row.characters
    .map((c: string | Character) => (typeof c === "object" ? c?.name : null))
    .filter(Boolean);
};

// 获取选中场景的图片
const getSelectedSceneImages = (row: Storyboard) => {
  const images: string[] = [];
  if (row.background?.image_url) {
    images.push(row.background.image_url);
  }
  return images;
};

// 获取选中场景的名称
const getSelectedSceneName = (row: Storyboard) => {
  if (row.background?.location) {
    return row.background.location;
  }
  return null;
};

// 处理角色变更
const handleCharacterChange = (row: Storyboard) => {
  const updatedCharacters = (row.characterIds || []).map((id: number) => {
    const char = props.currentEpisode?.characters?.find((c) => c.id === id);
    return char || String(id);
  });

  const updatedShot: Storyboard = {
    ...row,
    characters: updatedCharacters,
  };

  emit("updateShot", updatedShot);
};

// 处理场景变更
const handleSceneChange = (row: Storyboard) => {
  const selectedScene = props.currentEpisode?.scenes?.find(
    (s) => Number(s.id) === Number(row.scene_id)
  );

  const updatedShot: Storyboard = {
    ...row,
    scene_id: row.scene_id,
    background: selectedScene ? {
      ...selectedScene,
      id: String(selectedScene.id),
    } : undefined,
  };

  emit("updateShot", updatedShot);
};

// 初始化 characterIds 和 scene_id
const initializeIds = () => {
  if (props.currentEpisode?.storyboards) {
    props.currentEpisode.storyboards.forEach((shot: Storyboard) => {
      if (!shot.characterIds) {
        shot.characterIds = shot.characters?.map((c: string | Character) => {
          const id = typeof c === 'object' ? c.id : c;
          return typeof id === 'string' ? parseInt(id, 10) : Number(id);
        }) || [];
      }
      if (shot.scene_id && typeof shot.scene_id === 'string') {
        (shot as any).scene_id = parseInt(shot.scene_id, 10);
      }
    });
  }
};

// 监听 episode 变化时初始化
onMounted(() => {
  initializeIds();
});

// 监听 currentEpisode 变化
watch(() => props.currentEpisode, () => {
  initializeIds();
}, { deep: true });
</script>

<style scoped lang="scss">
.video-step-container {
  margin: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// 统一头部区域
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  margin: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .header-icon {
      font-size: 24px;
      color: var(--glass-accent-from);
    }

    .header-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--glass-text-primary);
    }

    .shot-count {
      font-size: 12px;
    }
  }

  .header-right {
    .glass-btn-primary {
      padding: 10px 20px;
    }
  }
}

// 任务进度条
.task-progress-wrapper {
  padding: 16px 24px;
  margin: 0;

  .glass-progress {
    :deep(.el-progress-bar__outer) {
      background: var(--glass-bg-muted);
      border-radius: 10px;
    }

    :deep(.el-progress-bar__inner) {
      background: linear-gradient(140deg, var(--glass-accent-from) 0%, var(--glass-accent-to) 100%);
      border-radius: 10px;
    }

    :deep(.el-progress__text) {
      color: var(--glass-text-primary);
      font-weight: 600;
    }
  }

  .task-message {
    margin-top: 8px;
    font-size: 13px;
    color: var(--glass-text-secondary);
    text-align: center;
  }
}

// 表格区域
.shots-list {
  padding: 0;
  margin: 0;
  overflow: hidden;

  :deep(.el-table) {
    --el-table-bg-color: transparent;
    --el-table-header-bg-color: var(--glass-bg-muted);
    --el-table-tr-bg-color: transparent;
    --el-table-row-hover-bg-color: var(--glass-bg-surface-strong);
    --el-table-border-color: var(--glass-stroke-base);
    --el-table-text-color: var(--glass-text-primary);
    --el-table-header-text-color: var(--glass-text-secondary);
    font-size: 13px;
  }

  :deep(.el-table th.el-table__cell) {
    background: var(--glass-bg-muted) !important;
    color: var(--glass-text-secondary);
    font-weight: 600;
    padding: 12px 0;
  }

  :deep(.el-table td.el-table__cell) {
    padding: 8px 0;
    border-color: var(--glass-stroke-base);
  }

  :deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
    background: var(--glass-bg-muted);
  }

  :deep(.el-table__empty-block) {
    background: transparent;
  }
}

// 表格单元格样式
.cell-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.mini-tag {
  display: inline-block;
  padding: 2px 6px;
  background: var(--glass-tone-neutral-bg);
  color: var(--glass-tone-neutral-fg);
  border-radius: 4px;
  font-size: 11px;
}

.more-tag {
  color: var(--glass-text-tertiary);
  font-size: 11px;
}

// 输入框样式
.cell-input {
  width: 100%;

  :deep(.el-input__wrapper) {
    background: var(--glass-bg-surface);
    box-shadow: none;
    border: 1px solid var(--glass-stroke-base);
  }
}

.cell-select {
  width: 100%;

  :deep(.el-select__wrapper) {
    background: var(--glass-bg-surface);
    box-shadow: none;
    border: 1px solid var(--glass-stroke-base);
  }
}

// 角色头像相关样式
.character-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.avatar-stack {
  display: flex;
  align-items: center;
  gap: 2px;
}

.avatar-item {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--glass-stroke-soft);
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
    border-color: var(--glass-accent-from);
  }
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-tooltip {
  .tooltip-name {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--glass-text-primary);
  }
  .tooltip-img {
    width: 100%;
    height: auto;
    border-radius: 4px;
  }
}

.more-count {
  font-size: 10px;
  color: var(--glass-text-tertiary);
  margin-left: 2px;
}

// 场景缩略图相关样式
.scene-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scene-display {
  display: flex;
  align-items: center;
  gap: 6px;
}

.scene-name {
  font-size: 12px;
  color: var(--glass-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.scene-empty {
  color: var(--glass-text-tertiary);
  font-size: 12px;
}

.scene-thumbs {
  display: flex;
  gap: 4px;
}

.scene-thumb {
  width: 36px;
  height: 24px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--glass-stroke-soft);
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
    border-color: var(--glass-accent-from);
  }
}

.scene-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scene-tooltip {
  .tooltip-name {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--glass-text-primary);
  }
  .tooltip-img {
    width: 100%;
    height: auto;
    border-radius: 4px;
  }
}

// 时长输入样式
.duration-input {
  width: 100%;

  :deep(.el-input__wrapper) {
    background: var(--glass-bg-surface);
    box-shadow: none;
    border: 1px solid var(--glass-stroke-base);
    padding: 0 4px;
  }

  :deep(.el-input__inner) {
    text-align: center;
    font-size: 12px;
  }

  // 隐藏number输入框的上下箭头
  :deep(::-webkit-outer-spin-button),
  :deep(::-webkit-inner-spin-button) {
    -webkit-appearance: none;
    margin: 0;
  }
}

.overflow-tooltip {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  cursor: pointer;

  &:hover {
    color: var(--glass-accent-from);
  }
}

// 操作按钮
.glass-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: var(--glass-radius-md);
  background: var(--glass-bg-surface);
  border: 1px solid var(--glass-stroke-soft);
  color: var(--glass-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--glass-bg-surface-strong);
    border-color: var(--glass-accent-from);
    color: var(--glass-accent-from);
    transform: translateY(-1px);
  }
}

// 空状态
.empty-shots {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 320px);
  padding: 20px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 64px;
  text-align: center;
  max-width: 420px;

  .empty-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 100px;
    margin-bottom: 20px;
    background: linear-gradient(140deg, var(--glass-accent-from) 0%, var(--glass-accent-to) 100%);
    border-radius: 50%;
    color: white;
  }

  .empty-title {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 600;
    color: var(--glass-text-primary);
  }

  .empty-description {
    margin: 0 0 28px;
    font-size: 14px;
    color: var(--glass-text-secondary);
    line-height: 1.6;
  }
}

// 响应式
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;

    .header-left {
      flex-wrap: wrap;
      justify-content: center;
    }

    .header-right {
      width: 100%;

      .glass-btn-primary {
        width: 100%;
      }
    }
  }
}
</style>
