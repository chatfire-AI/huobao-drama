<template>
  <el-card
    shadow="never"
    class="stage-card stage-card-fullscreen"
  >
    <div class="stage-body stage-body-fullscreen">
      <!-- 未保存时显示输入框 -->
      <div v-if="!hasScript" class="generation-form">
        <el-input
          v-model="localScriptContent"
          type="textarea"
          :placeholder="$t('workflow.scriptPlaceholder')"
          class="script-textarea script-textarea-fullscreen"
        />

        <div class="action-buttons-inline">
          <el-button
            type="primary"
            size="default"
            @click="$emit('saveScript', localScriptContent)"
            :disabled="!localScriptContent.trim() || generatingScript"
          >
            <el-icon><Check /></el-icon>
            <span>{{ $t("workflow.saveChapter") }}</span>
          </el-button>
        </div>
      </div>

      <!-- 已保存时显示内容 -->
      <div v-if="hasScript" class="overview-section">
        <div class="episode-info">
          <h3>
            {{ $t("workflow.chapterContent", { number: episodeNumber }) }}
          </h3>
          <el-tag type="success" size="large">{{
            $t("workflow.saved")
          }}</el-tag>
        </div>
        <div class="overview-content">
          <el-input
            v-model="currentEpisode!.script_content"
            type="textarea"
            :rows="15"
            readonly
            class="script-display"
          />
        </div>

        <el-divider />

        <!-- 显示已提取的角色和场景 -->
        <div v-if="hasExtractedData" class="extracted-info">
          <el-alert
            type="success"
            :closable="false"
            style="margin-bottom: 16px"
          >
            <template #title>
              <div style="display: flex; align-items: center; gap: 16px">
                <span>✅ {{ $t("workflow.extractedData") }}</span>
                <el-tag v-if="hasCharacters" type="success"
                  >{{ $t("workflow.characters") }}:
                  {{ charactersCount }}</el-tag
                >
                <el-tag v-if="currentEpisode?.scenes" type="success"
                  >{{ $t("workflow.scenes") }}:
                  {{ currentEpisode.scenes.length }}</el-tag
                >
              </div>
            </template>
          </el-alert>

          <!-- 角色列表 -->
          <div v-if="hasCharacters" style="margin-bottom: 16px">
            <h4 class="extracted-title">
              {{ $t("workflow.extractedCharacters") }}：
            </h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px">
              <el-tag
                v-for="char in currentEpisode?.characters"
                :key="char.id"
                type="info"
              >
                {{ char.name }}
                <span v-if="char.role" class="secondary-text"
                  >({{ char.role }})</span
                >
              </el-tag>
            </div>
          </div>

          <!-- 场景列表 -->
          <div
            v-if="
              currentEpisode?.scenes && currentEpisode.scenes.length > 0
            "
          >
            <h4 class="extracted-title">
              {{ $t("workflow.extractedScenes") }}：
            </h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px">
              <el-tag
                v-for="scene in currentEpisode.scenes"
                :key="scene.id"
                type="warning"
              >
                {{ scene.location }}
                <span class="secondary-text">· {{ scene.time }}</span>
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Check } from "@element-plus/icons-vue";
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
}>();

defineEmits<{
  (e: "saveScript", content: string): void;
}>();

const localScriptContent = ref(props.scriptContent);

watch(
  () => props.scriptContent,
  (val) => {
    localScriptContent.value = val;
  },
);
</script>

<style scoped lang="scss">
.stage-card {
  margin: 12px;

  &.stage-card-fullscreen {
    .stage-body-fullscreen {
      min-height: calc(100vh - 200px);
    }
  }
}

.stage-body {
  background: var(--bg-card);
}

.action-buttons-inline {
  display: flex;
  gap: 12px;
}

.script-textarea {
  margin: 16px 0;

  &.script-textarea-fullscreen {
    :deep(textarea) {
      min-height: 500px;
      font-size: 14px;
      line-height: 1.8;
    }
  }
}

.extracted-title {
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.secondary-text {
  color: var(--text-muted);
  margin-left: 4px;
}

:deep(.el-card) {
  background: var(--bg-card);
  border-color: var(--border-primary);
}

:deep(.el-card__header) {
  background: var(--bg-secondary);
  border-color: var(--border-primary);
}

:deep(.el-textarea__inner) {
  background: var(--bg-secondary);
  color: var(--text-primary);
  box-shadow: 0 0 0 1px var(--border-primary) inset;
}
</style>
