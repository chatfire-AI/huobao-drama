<template>
  <!-- Drama List Page - Refactored with modern minimalist design -->
  <!-- 短剧列表页面 - 使用现代简约设计重构 -->
  <div class="page-container">
    <div class="content-wrapper animate-fade-in">
      <!-- App Header / 应用头部 -->
      <AppHeader :fixed="false">
        <template #left>
          <div class="page-title">
            <h1>{{ $t('drama.title') }}</h1>
            <span class="subtitle">{{ $t('drama.totalProjects', { count: total }) }}</span>
          </div>
        </template>
        <template #right>
          <el-button type="primary" @click="handleCreate" class="header-btn primary">
            <el-icon>
              <Plus />
            </el-icon>
            <span class="btn-text">{{ $t('drama.createNew') }}</span>
          </el-button>
        </template>
      </AppHeader>

      <!-- Project Grid / 项目网格 -->
      <div v-loading="loading" class="projects-grid" :class="{ 'is-empty': !loading && dramas.length === 0 }">
        <!-- Empty state / 空状态 -->
        <EmptyState v-if="!loading && dramas.length === 0" :title="$t('drama.empty')"
          :description="$t('drama.emptyHint')" :icon="Film">
          <el-button type="primary" @click="handleCreate">
            <el-icon>
              <Plus />
            </el-icon>
            {{ $t('drama.createNew') }}
          </el-button>
        </EmptyState>

        <!-- Project Cards / 项目卡片列表 -->
        <ProjectCard v-for="drama in dramas" :key="drama.id" :title="drama.title" :description="drama.description"
          :updated-at="drama.updated_at" :episode-count="drama.total_episodes || 0" @click="viewDrama(drama.id)">
          <template #actions>
            <ActionButton :icon="Edit" :tooltip="$t('common.edit')" @click="editDrama(drama.id)" />
            <el-popconfirm :title="$t('drama.deleteConfirm')" :confirm-button-text="$t('common.confirm')"
              :cancel-button-text="$t('common.cancel')" @confirm="deleteDrama(drama.id)">
              <template #reference>
                <el-button :icon="Delete" class="action-button danger" link />
              </template>
            </el-popconfirm>
          </template>
        </ProjectCard>
      </div>

      <!-- Unified Project Dialog / 统一项目弹窗 -->
      <DramaProjectDialog 
        v-model="dialogVisible" 
        :drama-id="currentDramaId"
        @created="loadDramas"
        @updated="loadDramas" 
      />

    </div>

    <!-- Sticky Pagination / 吸底分页器 -->
    <div v-if="total > 0" class="pagination-sticky">
      <div class="pagination-inner">
        <div class="pagination-info">
          <span class="pagination-total">{{ $t('drama.totalProjects', { count: total }) }}</span>
        </div>
        <div class="pagination-controls">
          <el-pagination v-model:current-page="queryParams.page" v-model:page-size="queryParams.page_size"
            :total="total" :page-sizes="[12, 24, 36, 48]" :pager-count="5" layout="prev, pager, next"
            @size-change="loadDramas" @current-change="loadDramas" />
        </div>
        <div class="pagination-size">
          <span class="size-label">{{ $t('common.perPage') }}</span>
          <el-select v-model="queryParams.page_size" size="small" class="size-select" @change="loadDramas">
            <el-option :value="12" label="12" />
            <el-option :value="24" label="24" />
            <el-option :value="36" label="36" />
            <el-option :value="48" label="48" />
          </el-select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Plus,
  Film,
  Setting,
  Edit,
  View,
  Delete,
  InfoFilled
} from '@element-plus/icons-vue'
import { dramaAPI } from '@/api/drama'
import type { Drama, DramaListQuery } from '@/types/drama'
import { AppHeader, ProjectCard, ActionButton, DramaProjectDialog, EmptyState } from '@/components/common'

const router = useRouter()
const loading = ref(false)
const dramas = ref<Drama[]>([])
const total = ref(0)

const queryParams = ref<DramaListQuery>({
  page: 1,
  page_size: 12
})

// Dialog state
const dialogVisible = ref(false)
const currentDramaId = ref<string | undefined>(undefined)

// Load drama list / 加载短剧列表
const loadDramas = async () => {
  loading.value = true
  try {
    const res = await dramaAPI.list(queryParams.value)
    dramas.value = res.items || []
    total.value = res.pagination?.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// Navigation handlers / 导航处理
const handleCreate = () => {
  currentDramaId.value = undefined
  dialogVisible.value = true
}
const viewDrama = (id: string) => router.push(`/dramas/${id}`)

// Open edit dialog
const editDrama = (id: string) => {
  currentDramaId.value = id
  dialogVisible.value = true
}



// Delete drama / 删除短剧
const deleteDrama = async (id: string) => {
  try {
    await dramaAPI.delete(id)
    ElMessage.success('删除成功')
    loadDramas()
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败')
  }
}

onMounted(() => {
  loadDramas()
})
</script>

<style scoped>
/* ========================================
   Page Layout / 页面布局 - 紧凑边距
   ======================================== */
.page-container {
  min-height: 100vh;
  background: var(--bg-primary);
  /* padding: var(--space-2) var(--space-3); */
  transition: background var(--transition-normal);
}

@media (min-width: 768px) {
  .page-container {
    /* padding: var(--space-3) var(--space-4); */
  }
}

@media (min-width: 1024px) {
  .page-container {
    /* padding: var(--space-4) var(--space-5); */
  }
}

.content-wrapper {
  margin: 0 auto;
  width: 100%;
}

/* ========================================
   Page Title / 页面标题
   ======================================== */
.page-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-title h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.page-title .subtitle {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

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
  display: flex;
  flex-wrap: wrap;
  /* grid-template-columns: repeat(2, 1fr); */
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  min-height: 300px;
  padding-bottom: 4rem;
}

@media (min-width: 640px) {
  .projects-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }
}

@media (min-width: 900px) {
  .projects-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
  }
}

@media (min-width: 1200px) {
  .projects-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 1500px) {
  .projects-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.projects-grid.is-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ========================================
   Sticky Pagination / 吸底分页器
   ======================================== */
.pagination-sticky {
  /* padding: 12px; */
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border-top: 1px solid var(--border-primary);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
}

.dark .pagination-sticky {
  background: rgba(10, 15, 26, 0.9);
  border-top: 1px solid var(--border-primary);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
}

.pagination-inner {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin: 0 auto;
  padding: var(--space-3) var(--space-4);
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .pagination-inner {
    padding: var(--space-3) var(--space-6);
  }
}

.pagination-info {
  display: none;
}

@media (min-width: 768px) {
  .pagination-info {
    display: block;
  }
}

.pagination-total {
  font-size: 0.8125rem;
  color: var(--text-muted);
  font-weight: 500;
}

.pagination-controls {
  display: flex;
}

.pagination-size {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.size-label {
  font-size: 0.8125rem;
  color: var(--text-muted);
  display: none;
}

@media (min-width: 768px) {
  .size-label {
    display: block;
  }
}

.size-select {
  width: 4.5rem;
}

.size-select :deep(.el-input__wrapper) {
  height: 2rem;
  border-radius: var(--radius-md);
  background: var(--bg-card);
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
