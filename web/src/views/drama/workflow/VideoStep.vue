<template>
  <el-card shadow="never" class="stage-card">
    <div class="stage-body">
      <!-- 分镜列表 -->
      <div
        v-if="
          currentEpisode?.storyboards &&
          currentEpisode.storyboards.length > 0
        "
        class="shots-list"
      >
        <div class="shots-header">
          <h3>{{ $t("workflow.shotList") }}</h3>
        </div>

        <el-table
          :data="currentEpisode.storyboards"
          border
          stripe
          style="margin-top: 16px"
        >
          <el-table-column
            type="index"
            :label="$t('storyboard.table.number')"
            width="60"
          />
          <el-table-column
            :label="$t('storyboard.table.title')"
            width="120"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.title || "-" }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('storyboard.table.shotType')"
            width="80"
          >
            <template #default="{ row }">
              {{ row.shot_type || "-" }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('storyboard.table.angle')"
            width="80"
          >
            <template #default="{ row }">
              {{ row.angle || "-" }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('storyboard.table.movement')"
            width="100"
          >
            <template #default="{ row }">
              {{ row.movement || "-" }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('storyboard.table.location')"
            width="150"
          >
            <template #default="{ row }">
              <el-popover
                placement="right"
                :width="300"
                trigger="hover"
                :content="row.action || '-'"
              >
                <template #reference>
                  <span class="overflow-tooltip">{{
                    row.location || "-"
                  }}</span>
                </template>
              </el-popover>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('storyboard.table.character')"
            width="100"
          >
            <template #default="{ row }">
              <span v-if="row.characters && row.characters.length > 0">
                {{ row.characters.map((c: any) => c.name || c).join(", ") }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('storyboard.table.action')">
            <template #default="{ row }">
              <el-popover
                placement="right"
                :width="300"
                trigger="hover"
                :content="row.action || '-'"
              >
                <template #reference>
                  <span class="overflow-tooltip">{{
                    row.action || "-"
                  }}</span>
                </template>
              </el-popover>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('storyboard.table.duration')"
            width="80"
          >
            <template #default="{ row }">
              {{ row.duration || "-" }}秒
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('storyboard.table.operations')"
            width="100"
            fixed="right"
          >
            <template #default="{ row, $index }">
              <el-button
                type="primary"
                size="small"
                @click="$emit('editShot', row, $index)"
              >
                {{ $t("common.edit") }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 未拆分时显示 -->
      <div v-else class="empty-shots">
        <el-empty :description="$t('workflow.splitStoryboardFirst')">
          <el-button
            type="primary"
            @click="$emit('generateShots')"
            :loading="generatingShots"
            :icon="MagicStick"
          >
            {{
              generatingShots
                ? $t("workflow.aiSplitting")
                : $t("workflow.aiAutoSplit")
            }}
          </el-button>

          <!-- 任务进度显示 -->
          <div
            v-if="generatingShots"
            style="
              margin-top: 24px;
              max-width: 400px;
              margin-left: auto;
              margin-right: auto;
            "
          >
            <el-progress
              :percentage="taskProgress"
              :status="taskProgress === 100 ? 'success' : undefined"
            >
              <template #default="{ percentage }">
                <span style="font-size: 12px">{{ percentage }}%</span>
              </template>
            </el-progress>
            <div class="task-message">
              {{ taskMessage }}
            </div>
          </div>
        </el-empty>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { MagicStick } from "@element-plus/icons-vue";
import type { Episode } from "@/types/drama";

const { t: $t } = useI18n();

defineProps<{
  currentEpisode: Episode | null | undefined;
  generatingShots: boolean;
  taskProgress: number;
  taskMessage: string;
}>();

defineEmits<{
  (e: "generateShots"): void;
  (e: "editShot", shot: any, index: number): void;
}>();
</script>

<style scoped lang="scss">
.stage-card {
  margin: 12px;
}

.stage-body {
  background: var(--bg-card);
}

.empty-shots {
  padding: 60px 0;
  text-align: center;
}

.task-message {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.overflow-tooltip {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

:deep(.el-card) {
  background: var(--bg-card);
  border-color: var(--border-primary);
}

:deep(.el-table) {
  --el-table-bg-color: var(--bg-card);
  --el-table-header-bg-color: var(--bg-secondary);
  --el-table-tr-bg-color: var(--bg-card);
  --el-table-row-hover-bg-color: var(--bg-card-hover);
  --el-table-border-color: var(--border-primary);
  --el-table-text-color: var(--text-primary);
  background: var(--bg-card);
}

:deep(.el-table th.el-table__cell),
:deep(.el-table td.el-table__cell) {
  background: var(--bg-card);
  border-color: var(--border-primary);
}

:deep(
  .el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell
) {
  background: var(--bg-secondary);
}

:deep(.el-table__header-wrapper th) {
  background: var(--bg-secondary) !important;
  color: var(--text-secondary);
}
</style>
