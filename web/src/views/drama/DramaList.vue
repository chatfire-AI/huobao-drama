<template>
  <!-- Drama List Page - Refactored with modern minimalist design -->
  <!-- 短剧列表页面 - 使用现代简约设计重构 -->
  <div class="animate-fade-in">
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
   Page Layout / 页面布局 - 紧凑边距
   ======================================== */

/* ========================================
   Header Buttons / 头部按钮
   ======================================== */
.header-btn {
  border-radius: var(--radius-lg);
  font-weight: 500;
}

.header-btn.primary {
  background: linear-gradient(135deg, var(--accent) 0%, #0284c7 100%);
  border: none;
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);
}

.header-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.45);
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
   Projects Grid / 项目网格 - 紧凑间距
   ======================================== */
.projects-grid {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  min-height: 300px;
}

.projects-grid.is-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ========================================
   Scroll Sentinel / 无限滚动
   ======================================== */
.scroll-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6) 0;
  min-height: 1px;
}

.loading-more {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font-size: 0.875rem;
}

.no-more {
  color: var(--text-muted);
  font-size: 0.8125rem;
}

/* ========================================
   Edit Dialog / 编辑对话框
   ======================================== */
.edit-dialog :deep(.el-dialog) {
  border-radius: var(--radius-xl);
}

.edit-dialog :deep(.el-dialog__header) {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-primary);
  margin-right: 0;
}

.edit-dialog :deep(.el-dialog__title) {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.edit-dialog :deep(.el-dialog__body) {
  padding: 1.5rem;
}

.edit-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Delete button style */
.action-button.danger {
  padding: 0.5rem;
  color: var(--text-muted);
}

.action-button.danger:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}
</style>
