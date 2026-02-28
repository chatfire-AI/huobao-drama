<template>
  <!-- Drama List Page - Glass Design -->
  <!-- 短剧列表页面 - 玻璃态设计 -->
  <div class="animate-fade-in drama-list-container">
    <PageHeader :title="$t('drama.title')" :subtitle="$t('drama.totalProjects', { count: total })">
      <template #actions>
        <el-button type="primary" @click="handleCreate" class="header-btn primary">
          <el-icon><Plus /></el-icon>
          <span class="btn-text">{{ $t('drama.createNew') }}</span>
        </el-button>
      </template>
      <template #extra>
        <div class="filter-bar">
          <div class="glass-segmented filter-segmented">
            <button
              v-for="opt in statusOptions"
              :key="opt.value"
              class="glass-segmented-item"
              :data-active="filterStatus === opt.value"
              @click="onStatusFilter(opt.value)"
            >{{ opt.label }}</button>
          </div>
          <el-input
            v-model="searchKeyword"
            :placeholder="$t('common.search') + '...'"
            clearable
            class="filter-search"
            @input="onSearchInput"
            @clear="onSearchInput"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>
    </PageHeader>

      <!-- Project List / 项目列表 -->
      <div
        v-loading="loading"
        class="projects-list"
        :class="{ 'is-empty': !loading && dramas.length === 0 }"
      >
        <!-- Empty state / 空状态 -->
        <EmptyState
          v-if="!loading && dramas.length === 0"
          :title="$t('drama.empty')"
          :description="$t('drama.emptyHint')"
          :icon="Film"
        >
          <el-button type="primary" @click="handleCreate">
            <el-icon>
              <Plus />
            </el-icon>
            {{ $t("drama.createNew") }}
          </el-button>
        </EmptyState>

        <!-- Project Rows / 项目行列表 -->
        <div
          v-for="drama in dramas"
          :key="drama.id"
          class="drama-row glass-list-row"
          tabindex="0"
          @click="viewDrama(drama.id)"
          @keydown.enter="viewDrama(drama.id)"
        >
          <span class="row-dot" :class="statusDotClass(drama.status)"></span>
          <div class="row-body">
            <div class="row-top">
              <span class="row-title">{{ drama.title }}</span>
              <div class="row-tags">
                <span :class="['glass-chip', statusChipClass(drama.status)]">{{ $t(`drama.status.${drama.status}`) }}</span>
                <span v-if="drama.style" class="glass-chip glass-chip-neutral">{{ $t(`drama.styles.${drama.style}`) }}</span>
              </div>
            </div>
            <div class="row-bottom">
              <span class="row-desc">{{ drama.description || $t('drama.noDescription') }}</span>
              <div class="row-meta">
                <span class="meta-item">{{ $t('drama.episodeCount', { count: drama.total_episodes || 0 }) }}</span>
                <span v-if="formatDuration(drama.total_duration)" class="meta-sep">&middot;</span>
                <span v-if="formatDuration(drama.total_duration)" class="meta-item">{{ formatDuration(drama.total_duration) }}</span>
                <span class="meta-sep">&middot;</span>
                <span class="meta-item">{{ formatDate(drama.updated_at) }}</span>
              </div>
            </div>
          </div>
          <div class="row-actions" @click.stop>
            <ActionButton
              :icon="Edit"
              :tooltip="$t('common.edit')"
              @click="editDrama(drama.id)"
            />
            <el-popconfirm
              :title="$t('drama.deleteConfirm')"
              :confirm-button-text="$t('common.confirm')"
              :cancel-button-text="$t('common.cancel')"
              @confirm="deleteDrama(drama.id)"
            >
              <template #reference>
                <el-button :icon="Delete" class="action-button danger" link />
              </template>
            </el-popconfirm>
          </div>
        </div>
      </div>

      <!-- Edit Dialog / 编辑对话框 -->
      <el-dialog
        v-model="editDialogVisible"
        :title="$t('drama.editProject')"
        width="520px"
        :close-on-click-modal="false"
        class="edit-dialog"
      >
        <el-form
          :model="editForm"
          label-position="top"
          v-loading="editLoading"
          class="edit-form"
        >
          <el-form-item :label="$t('drama.projectName')" required>
            <el-input
              v-model="editForm.title"
              :placeholder="$t('drama.projectNamePlaceholder')"
              size="large"
            />
          </el-form-item>
          <el-form-item :label="$t('drama.projectDesc')">
            <el-input
              v-model="editForm.description"
              type="textarea"
              :rows="4"
              :placeholder="$t('drama.projectDescPlaceholder')"
              resize="none"
            />
          </el-form-item>
          <el-form-item :label="$t('drama.style')" required>
            <el-select
              v-model="editForm.style"
              :placeholder="$t('drama.stylePlaceholder')"
              size="large"
              style="width: 100%"
            >
              <el-option :label="$t('drama.styles.ghibli')" value="ghibli" />
              <el-option :label="$t('drama.styles.guoman')" value="guoman" />
              <el-option
                :label="$t('drama.styles.wasteland')"
                value="wasteland"
              />
              <el-option
                :label="$t('drama.styles.nostalgia')"
                value="nostalgia"
              />
              <el-option :label="$t('drama.styles.pixel')" value="pixel" />
              <el-option :label="$t('drama.styles.voxel')" value="voxel" />
              <el-option :label="$t('drama.styles.urban')" value="urban" />
              <el-option
                :label="$t('drama.styles.guoman3d')"
                value="guoman3d"
              />
              <el-option :label="$t('drama.styles.chibi3d')" value="chibi3d" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="editDialogVisible = false" size="large">{{
              $t("common.cancel")
            }}</el-button>
            <el-button
              type="primary"
              @click="saveEdit"
              :loading="editLoading"
              size="large"
            >
              {{ $t("common.save") }}
            </el-button>
          </div>
        </template>
      </el-dialog>

      <!-- Create Drama Dialog / 创建短剧弹窗 -->
      <CreateDramaDialog v-model="createDialogVisible" @created="resetAndLoad" />

    <!-- Infinite scroll sentinel / 无限滚动哨兵 -->
    <div ref="sentinelRef" class="scroll-sentinel">
      <div v-if="loadingMore" class="loading-more">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>{{ $t('common.loading') }}</span>
      </div>
      <div v-else-if="noMore && dramas.length > 0" class="no-more">
        <span>{{ $t('common.noData') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import {
  Plus,
  Film,
  Edit,
  Delete,
  Loading,
  Search,
} from "@element-plus/icons-vue";
import { dramaAPI } from "@/api/drama";
import type { Drama, DramaListQuery, DramaStatus } from "@/types/drama";
import {
  PageHeader,
  ActionButton,
  CreateDramaDialog,
  EmptyState,
} from "@/components/common";

const { t } = useI18n();
const router = useRouter();
const loading = ref(false);
const loadingMore = ref(false);
const dramas = ref<Drama[]>([]);
const total = ref(0);
const sentinelRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

// Filter state / 筛选状态
const filterStatus = ref<DramaStatus | ''>('');
const searchKeyword = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const statusOptions = computed<Array<{ value: DramaStatus | ''; label: string }>>(() => [
  { value: '', label: t('common.all') },
  { value: 'draft', label: t('drama.status.draft') },
  { value: 'production', label: t('drama.status.production') },
  { value: 'completed', label: t('drama.status.completed') },
]);

const onStatusFilter = (val: DramaStatus | '') => {
  filterStatus.value = val;
  queryParams.value.status = val || undefined;
  resetAndLoad();
};

const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    queryParams.value.keyword = searchKeyword.value || undefined;
    resetAndLoad();
  }, 300);
};

// Status helpers / 状态辅助
const statusColorMap: Record<string, { chip: string; dot: string }> = {
  draft: { chip: 'glass-chip-neutral', dot: 'dot-neutral' },
  planning: { chip: 'glass-chip-info', dot: 'dot-info' },
  generating: { chip: 'glass-chip-info', dot: 'dot-info' },
  production: { chip: 'glass-chip-warning', dot: 'dot-warning' },
  completed: { chip: 'glass-chip-success', dot: 'dot-success' },
  error: { chip: 'glass-chip-danger', dot: 'dot-danger' },
  archived: { chip: 'glass-chip-neutral', dot: 'dot-neutral' },
};

const statusChipClass = (status: DramaStatus) => statusColorMap[status]?.chip || 'glass-chip-neutral';
const statusDotClass = (status: DramaStatus) => statusColorMap[status]?.dot || 'dot-neutral';

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m${s}s` : `${m}m`;
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
};

const queryParams = ref<DramaListQuery>({
  page: 1,
  page_size: 24,
});

const noMore = computed(() => dramas.value.length >= total.value);

// Create dialog state / 创建弹窗状态
const createDialogVisible = ref(false);

// Load drama list / 加载短剧列表
const loadDramas = async () => {
  loading.value = true;
  try {
    const res = await dramaAPI.list(queryParams.value);
    if (queryParams.value.page === 1) {
      dramas.value = res.items || [];
    } else {
      dramas.value.push(...(res.items || []));
    }
    total.value = res.pagination?.total || 0;
  } catch (error: any) {
    ElMessage.error(error.message || "加载失败");
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

// Load next page / 加载下一页
const loadMore = () => {
  if (loadingMore.value || loading.value || noMore.value) return;
  loadingMore.value = true;
  queryParams.value.page = (queryParams.value.page || 1) + 1;
  loadDramas();
};

// Reset and reload / 重置并重新加载
const resetAndLoad = () => {
  queryParams.value.page = 1;
  dramas.value = [];
  loadDramas();
};

// Navigation handlers / 导航处理
const handleCreate = () => (createDialogVisible.value = true);
const viewDrama = (id: string) => router.push(`/dramas/${id}`);

// Edit dialog state / 编辑对话框状态
const editDialogVisible = ref(false);
const editLoading = ref(false);
const editForm = ref({
  id: "",
  title: "",
  description: "",
  style: "ghibli",
});

// Open edit dialog / 打开编辑对话框
const editDrama = async (id: string) => {
  editLoading.value = true;
  editDialogVisible.value = true;
  try {
    const drama = await dramaAPI.get(id);
    editForm.value = {
      id: drama.id,
      title: drama.title,
      description: drama.description || "",
      style: drama.style || "ghibli",
    };
  } catch (error: any) {
    ElMessage.error(error.message || "加载失败");
    editDialogVisible.value = false;
  } finally {
    editLoading.value = false;
  }
};

// Save edit changes / 保存编辑更改
const saveEdit = async () => {
  if (!editForm.value.title) {
    ElMessage.warning("请输入项目名称");
    return;
  }

  editLoading.value = true;
  try {
    await dramaAPI.update(editForm.value.id, {
      title: editForm.value.title,
      description: editForm.value.description,
      style: editForm.value.style,
    });
    ElMessage.success("保存成功");
    editDialogVisible.value = false;
    resetAndLoad();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    editLoading.value = false;
  }
};

// Delete drama / 删除短剧
const deleteDrama = async (id: string) => {
  try {
    await dramaAPI.delete(id);
    ElMessage.success("删除成功");
    resetAndLoad();
  } catch (error: any) {
    ElMessage.error(error.message || "删除失败");
  }
};

onMounted(() => {
  loadDramas();
  // Set up infinite scroll observer
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMore();
    },
    { rootMargin: '200px' }
  );
  if (sentinelRef.value) observer.observe(sentinelRef.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
/* ========================================
   Page Layout / 页面布局 - 玻璃态设计
   ======================================== */
.drama-list-container {
  min-height: 100vh;
  background: var(--glass-bg-canvas);
  padding: var(--glass-space-5);
}

/* ========================================
   Header Buttons / 头部按钮
   ======================================== */

@media (max-width: 640px) {
  .btn-text {
    display: none;
  }

  .header-btn {
    padding: 0.5rem 0.75rem;
  }
}

/* ========================================
   Projects List / 项目列表
   ======================================== */
.projects-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 300px;
}

.projects-list.is-empty {
  align-items: center;
  justify-content: center;
}

/* ========================================
   Drama Row / 项目行 - 双行布局
   ======================================== */
.drama-row {
  padding: 14px 16px;
  cursor: pointer;
  gap: 14px;
  border-radius: var(--glass-radius-md);
  box-shadow: var(--glass-shadow-sm);
  align-items: flex-start;
}

.drama-row:hover {
  box-shadow: var(--glass-shadow-md);
  transform: translateY(-1px);
}

.drama-row:focus-visible {
  outline: 2px solid var(--glass-accent-from);
  outline-offset: 2px;
}

/* Status dot / 状态圆点 */
.row-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 7px;
}

.dot-neutral { background: var(--glass-tone-neutral-fg); }
.dot-info { background: var(--glass-tone-info-fg); }
.dot-success { background: var(--glass-tone-success-fg); }
.dot-warning { background: var(--glass-tone-warning-fg); }
.dot-danger { background: var(--glass-tone-danger-fg); }

/* Body / 内容主体（双行） */
.row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Top line: title + tags */
.row-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.row-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--glass-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* Bottom line: description + meta */
.row-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.row-desc {
  font-size: 0.8125rem;
  color: var(--glass-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.meta-item {
  font-size: 0.75rem;
  color: var(--glass-text-tertiary);
  white-space: nowrap;
}

.meta-sep {
  font-size: 0.75rem;
  color: var(--glass-text-tertiary);
}

/* Actions / 操作区 */
.row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-top: 2px;
}

.row-actions .action-button {
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  background: var(--glass-bg-muted) !important;
  border: none !important;
}

/* Mobile / 移动端适配 */
@media (max-width: 768px) {
  .drama-row {
    flex-wrap: wrap;
    padding: 10px 12px;
    align-items: center;
  }

  .row-body {
    flex-basis: calc(100% - 60px);
  }

  .row-bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .row-actions {
    margin-top: 0;
  }
}

/* ========================================
   Scroll Sentinel / 无限滚动
   ======================================== */
.scroll-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--glass-space-6) 0;
  min-height: 1px;
}

.loading-more {
  display: flex;
  align-items: center;
  gap: var(--glass-space-2);
  color: var(--glass-text-tertiary);
  font-size: 0.875rem;
}

.no-more {
  color: var(--glass-text-tertiary);
  font-size: 0.8125rem;
}

/* ========================================
   Edit Dialog / 编辑对话框 - 玻璃态
   ======================================== */
:deep(.edit-dialog .el-dialog) {
  background: var(--glass-bg-surface-modal);
  backdrop-filter: blur(var(--glass-blur-lg));
  -webkit-backdrop-filter: blur(var(--glass-blur-lg));
  border: 1px solid var(--glass-stroke-base);
  border-radius: var(--glass-radius-xl);
  box-shadow: var(--glass-shadow-modal);
}

:deep(.edit-dialog .el-dialog__header) {
  padding: var(--glass-space-5) var(--glass-space-6);
  border-bottom: 1px solid var(--glass-stroke-soft);
  margin-right: 0;
}

:deep(.edit-dialog .el-dialog__title) {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--glass-text-primary);
}

:deep(.edit-dialog .el-dialog__body) {
  padding: var(--glass-space-6);
}

:deep(.edit-dialog .el-form-item__label) {
  font-weight: 500;
  color: var(--glass-text-primary);
  margin-bottom: var(--glass-space-2);
}

:deep(.edit-dialog .el-input__wrapper),
:deep(.edit-dialog .el-textarea__inner) {
  background: var(--glass-bg-muted);
  border: 1px solid var(--glass-stroke-base);
  border-radius: var(--glass-radius-sm);
  box-shadow: none;
}

:deep(.edit-dialog .el-input__wrapper:hover),
:deep(.edit-dialog .el-textarea__inner:hover) {
  border-color: var(--glass-stroke-strong);
}

:deep(.edit-dialog .el-input__wrapper.is-focus),
:deep(.edit-dialog .el-textarea__inner:focus) {
  border-color: var(--glass-stroke-focus);
  box-shadow: var(--glass-focus-ring);
}

:deep(.edit-dialog .el-select .el-input__wrapper) {
  background: var(--glass-bg-muted);
  border: 1px solid var(--glass-stroke-base);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--glass-space-3);
}

.dialog-footer .el-button {
  border-radius: var(--glass-radius-sm);
}

.dialog-footer .el-button--primary {
  background: linear-gradient(135deg, var(--glass-accent-from) 0%, var(--glass-accent-to) 100%);
  border: none;
  box-shadow: var(--glass-accent-shadow-soft);
}

/* Delete button style */
.action-button.danger {
  padding: 0.5rem;
  color: var(--glass-text-tertiary);
}

.action-button.danger:hover {
  color: #ef4444;
  background: var(--glass-tone-danger-bg);
}

/* ========================================
   Empty State / 空状态
   ======================================== */
:deep(.empty-state) {
  background: var(--glass-bg-surface);
  border: 1px dashed var(--glass-stroke-base);
  border-radius: var(--glass-radius-lg);
  padding: var(--glass-space-8);
}

/* ========================================
   Filter Bar / 筛选栏
   ======================================== */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--glass-space-3);
  flex-wrap: wrap;
}

.filter-segmented {
  border-radius: var(--glass-radius-sm);
}

.filter-segmented .glass-segmented-item {
  padding: 6px 14px;
  font-size: 0.8125rem;
  cursor: pointer;
  border: none;
  background: none;
  border-radius: var(--glass-radius-sm);
}

.filter-search {
  width: 220px;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-search {
    width: 100%;
  }
}
</style>
