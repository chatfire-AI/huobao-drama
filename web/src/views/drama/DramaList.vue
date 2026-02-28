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
    </PageHeader>

      <!-- Project Grid / 项目网格 -->
      <div
        v-loading="loading"
        class="projects-grid"
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

        <!-- Project Cards / 项目卡片列表 -->
        <ProjectCard
          v-for="drama in dramas"
          :key="drama.id"
          :title="drama.title"
          :description="drama.description"
          :updated-at="drama.updated_at"
          :episode-count="drama.total_episodes || 0"
          @click="viewDrama(drama.id)"
        >
          <template #actions>
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
          </template>
        </ProjectCard>
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
import { ElMessage } from "element-plus";
import {
  Plus,
  Film,
  Setting,
  Edit,
  View,
  Delete,
  InfoFilled,
  Loading,
} from "@element-plus/icons-vue";
import { dramaAPI } from "@/api/drama";
import type { Drama, DramaListQuery } from "@/types/drama";
import {
  PageHeader,
  ProjectCard,
  ActionButton,
  CreateDramaDialog,
  EmptyState,
} from "@/components/common";

const router = useRouter();
const loading = ref(false);
const loadingMore = ref(false);
const dramas = ref<Drama[]>([]);
const total = ref(0);
const sentinelRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

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
   Header / 头部区域
   ======================================== */
.page-header-wrapper {
  background: var(--glass-bg-surface);
  backdrop-filter: blur(var(--glass-blur-md));
  -webkit-backdrop-filter: blur(var(--glass-blur-md));
  border: 1px solid var(--glass-stroke-base);
  border-radius: var(--glass-radius-lg);
  padding: var(--glass-space-5) var(--glass-space-6);
  margin-bottom: var(--glass-space-5);
  box-shadow: var(--glass-shadow-sm);
}

.page-title {
  margin: 0 0 var(--glass-space-1) 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--glass-text-primary);
  letter-spacing: -0.02em;
}

.page-subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--glass-text-tertiary);
}

/* ========================================
   Header Buttons / 头部按钮
   ======================================== */
.glass-btn-primary {
  background: linear-gradient(135deg, var(--glass-accent-from) 0%, var(--glass-accent-to) 100%);
  border: none;
  color: var(--glass-text-on-accent);
  font-weight: 500;
  border-radius: var(--glass-radius-sm);
  box-shadow: var(--glass-accent-shadow-soft);
  transition: all 0.2s ease;
}

.glass-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--glass-accent-shadow-strong);
}

@media (max-width: 640px) {
  .btn-text {
    display: none;
  }

  .header-btn {
    padding: 0.5rem 0.75rem;
  }
}

/* ========================================
   Projects Grid / 项目网格 - 玻璃态卡片
   ======================================== */
.projects-grid {
  padding: var(--glass-space-3);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--glass-space-4);
  min-height: 300px;
}

.projects-grid.is-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ========================================
   Glass Card / 玻璃态卡片样式
   ======================================== */
:deep(.project-card) {
  background: var(--glass-bg-surface);
  backdrop-filter: blur(var(--glass-blur-sm));
  -webkit-backdrop-filter: blur(var(--glass-blur-sm));
  border: 1px solid var(--glass-stroke-base);
  border-radius: var(--glass-radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: var(--glass-shadow-sm);
}

:deep(.project-card:hover) {
  border-color: var(--glass-stroke-focus);
  box-shadow: var(--glass-shadow-md);
  transform: translateY(-2px);
}

:deep(.project-card .card-accent) {
  background: linear-gradient(180deg, var(--glass-accent-from) 0%, var(--glass-accent-to) 100%);
}

:deep(.project-card .card-footer) {
  border-color: var(--glass-stroke-soft);
}

:deep(.project-card .card-title) {
  color: var(--glass-text-primary);
}

:deep(.project-card .card-description) {
  color: var(--glass-text-tertiary);
}

:deep(.project-card .meta-time),
:deep(.project-card .episode-label) {
  color: var(--glass-text-tertiary);
}

:deep(.project-card .action-button) {
  background: var(--glass-bg-muted) !important;
  border: 1px solid var(--glass-stroke-soft) !important;
}

:deep(.project-card .action-button:hover) {
  background: var(--glass-accent-from) !important;
  color: white !important;
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
</style>
