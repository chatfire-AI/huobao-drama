<template>
  <div class="page-container">
    <div class="content-wrapper animate-fade-in">
      <PageHeader
        :title="$t('operationLog.title')"
        :subtitle="$t('operationLog.subtitle')"
        :show-back="true"
        :back-text="$t('common.back')"
      >
        <template #actions>
          <el-button @click="loadLogs">
            <el-icon><Refresh /></el-icon>
            <span>{{ $t('operationLog.refresh') }}</span>
          </el-button>
        </template>
      </PageHeader>

      <div class="filters-card">
        <el-form :model="filters" label-position="top" class="filters-form">
          <div class="filters-grid">
            <el-form-item :label="$t('operationLog.module')">
              <el-input v-model="filters.module" clearable />
            </el-form-item>
            <el-form-item :label="$t('operationLog.action')">
              <el-input v-model="filters.action" clearable />
            </el-form-item>
            <el-form-item :label="$t('operationLog.api')">
              <el-input v-model="filters.api" clearable />
            </el-form-item>
            <el-form-item :label="$t('operationLog.result')">
              <el-select v-model="filters.result" clearable>
                <el-option value="success" :label="$t('common.success')" />
                <el-option value="failed" :label="$t('common.failed')" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('operationLog.userId')">
              <el-input v-model="filters.user_id" clearable />
            </el-form-item>
            <el-form-item :label="$t('operationLog.timeRange')">
              <el-date-picker
                v-model="dateRange"
                type="datetimerange"
                range-separator="-"
                :start-placeholder="$t('operationLog.startTime')"
                :end-placeholder="$t('operationLog.endTime')"
                value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
                format="YYYY-MM-DD HH:mm"
                clearable
              />
            </el-form-item>
          </div>
        </el-form>
        <div class="filters-actions">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            {{ $t('common.search') }}
          </el-button>
          <el-button @click="handleReset">{{ $t('common.reset') }}</el-button>
        </div>
      </div>

      <div class="table-card">
        <el-table
          v-loading="loading"
          :data="logs"
          stripe
          class="log-table"
        >
          <el-table-column prop="module" :label="$t('operationLog.module')" width="140" />
          <el-table-column prop="action" :label="$t('operationLog.action')" min-width="200">
            <template #default="{ row }">
              <el-tooltip :content="row.action" placement="top" v-if="row.action">
                <span class="ellipsis">{{ row.action }}</span>
              </el-tooltip>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="api" :label="$t('operationLog.api')" min-width="200">
            <template #default="{ row }">
              <el-tooltip :content="row.api" placement="top" v-if="row.api">
                <span class="ellipsis">{{ row.api }}</span>
              </el-tooltip>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('operationLog.requestData')" min-width="140">
            <template #default="{ row }">
              <el-popover
                trigger="click"
                width="420"
                placement="top-start"
                v-if="row.request_data"
              >
                <pre class="json-preview">{{ formatRequestData(row.request_data) }}</pre>
                <template #reference>
                  <el-button type="primary" text>
                    {{ $t('operationLog.view') }}
                  </el-button>
                </template>
              </el-popover>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('operationLog.result')" width="110">
            <template #default="{ row }">
              <el-tag :type="row.result === 'success' ? 'success' : 'danger'">
                {{ row.result === 'success' ? $t('common.success') : $t('common.failed') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="error_message" :label="$t('operationLog.errorMessage')" min-width="200">
            <template #default="{ row }">
              <el-tooltip :content="row.error_message" placement="top" v-if="row.error_message">
                <span class="ellipsis error-text">{{ row.error_message }}</span>
              </el-tooltip>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.createdAt')" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && logs.length === 0" :description="$t('common.noData')" />
      </div>
    </div>

    <div v-if="total > 0" class="pagination-sticky">
      <div class="pagination-inner">
        <div class="pagination-info">
          <span class="pagination-total">
            {{ $t('operationLog.total', { count: total }) }}
          </span>
        </div>
        <div class="pagination-controls">
          <el-pagination
            v-model:current-page="filters.page"
            v-model:page-size="filters.page_size"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            :pager-count="5"
            layout="prev, pager, next"
            @size-change="loadLogs"
            @current-change="loadLogs"
          />
        </div>
        <div class="pagination-size">
          <span class="size-label">{{ $t('common.perPage') }}</span>
          <el-select
            v-model="filters.page_size"
            size="small"
            class="size-select"
            @change="loadLogs"
          >
            <el-option :value="10" label="10" />
            <el-option :value="20" label="20" />
            <el-option :value="50" label="50" />
            <el-option :value="100" label="100" />
          </el-select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { PageHeader } from '@/components/common'
import { operationLogAPI } from '@/api/operationLog'
import type { OperationLog, OperationLogQuery } from '@/types/operationLog'

const logs = ref<OperationLog[]>([])
const total = ref(0)
const loading = ref(false)
const dateRange = ref<[string, string] | []>([])

const filters = ref<OperationLogQuery>({
  page: 1,
  page_size: 20,
  module: '',
  action: '',
  api: '',
  result: '',
  user_id: ''
})

const buildQueryParams = () => {
  const params: OperationLogQuery = { ...filters.value }
  if (dateRange.value.length === 2) {
    params.start_time = dateRange.value[0]
    params.end_time = dateRange.value[1]
  } else {
    delete params.start_time
    delete params.end_time
  }
  return params
}

const loadLogs = async () => {
  loading.value = true
  try {
    const res = await operationLogAPI.list(buildQueryParams())
    logs.value = res.items || []
    total.value = res.pagination?.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  filters.value.page = 1
  loadLogs()
}

const handleReset = () => {
  filters.value = {
    page: 1,
    page_size: 20,
    module: '',
    action: '',
    api: '',
    result: '',
    user_id: ''
  }
  dateRange.value = []
  loadLogs()
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatRequestData = (data: Record<string, any>) => {
  if (!data) return '-'
  try {
    if (typeof data === 'string') {
      return JSON.stringify(JSON.parse(data), null, 2)
    }
    return JSON.stringify(data, null, 2)
  } catch (error) {
    return String(data)
  }
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: var(--space-2) var(--space-3);
  transition: background var(--transition-normal);
}

@media (min-width: 768px) {
  .page-container {
    padding: var(--space-3) var(--space-4);
  }
}

@media (min-width: 1024px) {
  .page-container {
    padding: var(--space-4) var(--space-5);
  }
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

.filters-card {
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  margin-bottom: var(--space-3);
  box-shadow: var(--shadow-card);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
}

.filters-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.table-card {
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-2);
  box-shadow: var(--shadow-card);
}

.ellipsis {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.error-text {
  color: #ef4444;
}

.json-preview {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
}

.pagination-sticky {
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
</style>
