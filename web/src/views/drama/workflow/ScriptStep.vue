<template>
  <div class="script-step-container">
    <!-- 统一头部区域 -->
    <div class="page-header glass-surface">
      <div class="header-left">
        <el-icon class="header-icon"><Document /></el-icon>
        <h2 class="header-title">
          {{ $t("workflow.chapterContent", { number: episodeNumber }) }}
        </h2>
        <span v-if="hasScript" class="glass-chip glass-chip-success">
          <el-icon><Check /></el-icon>
          {{ $t("workflow.saved") }}
        </span>
      </div>
      <div class="header-right">
        <button
          v-if="hasScript && !isEditing"
          class="glass-btn-base glass-btn-secondary"
          @click="isEditing = true"
        >
          <el-icon><Edit /></el-icon>
          <span>{{ $t("common.edit") }}</span>
        </button>
        <button
          v-if="!hasScript || isEditing"
          class="glass-btn-base glass-btn-primary"
          @click="$emit('saveScript', localScriptContent)"
          :disabled="!localScriptContent.trim() || generatingScript"
        >
          <el-icon><Check /></el-icon>
          <span>{{ $t("workflow.saveChapter") }}</span>
        </button>
      </div>
    </div>

    <!-- 文本编辑区域 -->
    <div v-if="!hasScript || isEditing" class="content-area glass-surface">
      <textarea
        v-model="localScriptContent"
        :placeholder="$t('workflow.scriptPlaceholder')"
        class="script-textarea"
      />
    </div>

    <!-- 已保存内容显示 -->
    <div v-if="hasScript && !isEditing" class="content-area glass-surface">
      <textarea
        v-model="currentEpisode!.script_content"
        readonly
        class="script-textarea script-display"
      />
    </div>

    <!-- 提取的数据信息 -->
    <div class="extracted-section glass-surface">
      <div class="extracted-header">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ $t("workflow.extractedData") }}</span>
        <template v-if="hasExtractedData">
          <span v-if="hasCharacters" class="glass-chip glass-chip-success">
            {{ $t("workflow.characters") }}: {{ charactersCount }}
          </span>
          <span v-if="currentEpisode?.scenes" class="glass-chip glass-chip-warning">
            {{ $t("workflow.scenes") }}: {{ currentEpisode.scenes.length }}
          </span>
        </template>
      </div>

      <!-- 有数据时显示列表 -->
      <template v-if="hasExtractedData">
        <!-- 角色列表 -->
        <div v-if="hasCharacters" class="extracted-list">
          <h4 class="extracted-title">
            {{ $t("workflow.extractedCharacters") }}:
          </h4>
          <div class="tags-list">
            <span
              v-for="char in currentEpisode?.characters"
              :key="char.id"
              class="glass-chip glass-chip-neutral"
            >
              {{ char.name }}
              <span v-if="char.role" class="secondary-text">({{ char.role }})</span>
            </span>
          </div>
        </div>

        <!-- 场景列表 -->
        <div v-if="currentEpisode?.scenes && currentEpisode.scenes.length > 0" class="extracted-list">
          <h4 class="extracted-title">
            {{ $t("workflow.extractedScenes") }}:
          </h4>
          <div class="tags-list">
            <span
              v-for="scene in currentEpisode.scenes"
              :key="scene.id"
              class="glass-chip glass-chip-warning"
            >
              {{ scene.location }}
              <span class="secondary-text">· {{ scene.time }}</span>
            </span>
          </div>
        </div>
      </template>

      <!-- 无数据时显示提示 -->
      <div v-else class="extracted-empty">
        <el-icon><Warning /></el-icon>
        <span>{{ $t("workflow.extractHint") || "请先保存章节内容，然后点击下方按钮提取角色和场景" }}</span>
      </div>
    </div>

    <!-- 提取角色和场景按钮 -->
    <div class="extract-actions glass-surface">
      <el-button
        type="primary"
        size="large"
        @click="$emit('extractCharactersAndScenes')"
        :loading="extractingCharactersAndBackgrounds"
        :disabled="!hasScript"
      >
        <el-icon><MagicStick /></el-icon>
        {{
          hasExtractedData
            ? $t("workflow.reExtract")
            : $t("workflow.extractCharactersAndScenes")
        }}
      </el-button>
      <el-button
        type="success"
        size="large"
        @click="$emit('nextStep')"
        :disabled="!hasExtractedData"
      >
        {{ $t("workflow.nextStepGenerateImages") }}
        <el-icon><ArrowRight /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Check, Edit, Document, InfoFilled, Warning, MagicStick, ArrowRight } from "@element-plus/icons-vue";
import type { Episode } from "@/types/drama";

const { t: $t } = useI18n();

const props = defineProps<{
  currentEpisode: Episode | null | undefined;
  episodeNumber: number;
  hasScript: boolean;
  hasCharacters: boolean;
  hasExtractedData: boolean;
  charactersCount: number;
  scriptContent: string;
  generatingScript: boolean;
  extractingCharactersAndBackgrounds: boolean;
}>();

const emit = defineEmits<{
  (e: "saveScript", content: string): void;
  (e: "extractCharactersAndScenes"): void;
  (e: "nextStep"): void;
}>();

const localScriptContent = ref(props.scriptContent);
const isEditing = ref(!props.hasScript);

watch(
  () => props.scriptContent,
  (val) => {
    localScriptContent.value = val;
  },
);
</script>

<style scoped lang="scss">
.script-step-container {
  margin: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// 头部区域
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .header-icon {
      font-size: 22px;
      color: var(--glass-accent-from);
    }

    .header-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--glass-text-primary);
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
}

// 内容区域
.content-area {
  padding: 0;
  overflow: hidden;

  .script-textarea {
    width: 100%;
    min-height: 350px;
    height: 350px;
    padding: 20px;
    resize: none;
    font-size: 14px;
    line-height: 1.8;
    border: none;
    background: transparent;
    color: var(--glass-text-primary);
    outline: none;
    border-radius: 0;

    &::placeholder {
      color: var(--glass-text-tertiary);
    }

    &:focus {
      background: var(--glass-bg-surface);
    }

    &.script-display {
      background: var(--glass-bg-muted);
      color: var(--glass-text-secondary);
    }
  }
}

// 提取信息区域
.extracted-section {
  padding: 16px 24px;

  .extracted-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--glass-stroke-soft);
    color: var(--glass-text-primary);
    font-weight: 600;

    .el-icon {
      color: var(--glass-accent-from);
    }
  }

  .extracted-list {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .extracted-title {
    margin-bottom: 10px;
    color: var(--glass-text-primary);
    font-weight: 600;
    font-size: 14px;
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .secondary-text {
    color: var(--glass-text-tertiary);
    margin-left: 4px;
  }

  .extracted-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    background: var(--glass-bg-muted);
    border-radius: var(--glass-radius-md);
    color: var(--glass-text-secondary);
    font-size: 14px;

    .el-icon {
      color: var(--glass-tone-warning-fg);
      font-size: 18px;
    }
  }
}

// 提取按钮区域
.extract-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  margin-top: 8px;
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
      text-align: center;
    }

    .header-right {
      width: 100%;
      justify-content: center;
    }
  }

  .content-area .script-textarea {
    min-height: 280px;
    height: 280px;
  }
}
</style>
