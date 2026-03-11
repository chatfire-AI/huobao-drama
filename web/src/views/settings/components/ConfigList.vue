<template>
  <div v-loading="loading" class="config-list">
    <el-empty v-if="!loading && configs.length === 0" :description="$t('aiConfig.empty')" />

    <el-card v-for="config in configs" :key="config.id" class="config-card" shadow="hover">
      <div class="config-header">
        <div class="config-title">
          <h3>{{ config.name }}</h3>
          <el-tag v-if="config.is_active" type="success" size="small">{{ $t('aiConfig.enabled') }}</el-tag>
          <el-tag v-else type="info" size="small">{{ $t('aiConfig.disabled') }}</el-tag>
        </div>
        <div class="config-actions">
          <el-button v-if="showTestButton" text @click="$emit('test', config)" :icon="Connection">
            {{ $t('aiConfig.actions.test') }}
          </el-button>
          <el-button text @click="$emit('edit', config)" :icon="Edit">
            {{ $t('common.edit') }}
          </el-button>
          <el-button text :type="config.is_active ? 'warning' : 'success'" @click="$emit('toggle-active', config)">
            {{ config.is_active ? $t('aiConfig.disable') : $t('aiConfig.enable') }}
          </el-button>
          <el-popconfirm :title="$t('aiConfig.messages.deleteConfirm')" @confirm="$emit('delete', config)">
            <template #reference>
              <el-button text type="danger" :icon="Delete">
                {{ $t('common.delete') }}
              </el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>

      <div class="config-info">
        <div class="info-item">
          <label>Base URL:</label>
          <el-tooltip :content="config.base_url" placement="top" :show-after="300">
            <span class="url-text ellipsis">{{ config.base_url }}</span>
          </el-tooltip>
          <el-button text size="small" :icon="DocumentCopy" @click="copyText(config.base_url)">
            复制
          </el-button>
        </div>

        <div class="info-item">
          <label>{{ $t('aiConfig.endpoint') }}:</label>
          <span>{{ config.endpoint || '/v1/chat/completions' }}</span>
        </div>

        <div v-if="config.service_type === 'video' && config.query_endpoint" class="info-item">
          <label>{{ $t('aiConfig.queryEndpoint') }}:</label>
          <span>{{ config.query_endpoint }}</span>
        </div>

        <div class="info-item">
          <label>优先级:</label>
          <el-tag size="small" :type="(config.priority || 0) >= 50 ? 'danger' : (config.priority || 0) >= 20 ? 'warning' : 'info'">
            {{ config.priority || 0 }}
          </el-tag>
        </div>

        <div class="info-item">
          <label>模型:</label>
          <template v-if="Array.isArray(config.model)">
            <el-tooltip :content="config.model.join(', ')" placement="top" :show-after="300">
              <span class="ellipsis">{{ config.model.join(', ') }}</span>
            </el-tooltip>
            <el-tag size="small" effect="plain">{{ config.model.length }} 个</el-tag>
          </template>
          <el-tag v-else size="small" effect="plain">{{ config.model }}</el-tag>
        </div>

        <div class="info-item">
          <label>API Key:</label>
          <span class="api-key">{{ maskApiKey(config.api_key) }}</span>
        </div>

        <div class="info-item">
          <label>创建时间:</label>
          <span class="time-text">{{ formatDate(config.created_at) }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Connection, Delete, DocumentCopy, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { AIServiceConfig } from '@/types/ai'

defineProps<{
  configs: AIServiceConfig[]
  loading: boolean
  showTestButton?: boolean
}>()

defineEmits<{
  edit: [config: AIServiceConfig]
  delete: [config: AIServiceConfig]
  'toggle-active': [config: AIServiceConfig]
  test: [config: AIServiceConfig]
}>()

const maskApiKey = (key: string) => {
  if (!key) return ''
  if (key.length <= 8) return '***'
  return `${key.slice(0, 4)}***${key.slice(-4)}`
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN')
}

const copyText = async (text: string) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.config-list {
  display: grid;
  gap: 1rem;
  min-height: 300px;
}

.config-card {
  transition: all 0.2s ease;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
}

.config-card :deep(.el-card__body) {
  padding: 1.25rem;
}

.config-card:hover {
  border-color: var(--border-secondary);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-primary);
}

.config-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.config-title h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.config-actions {
  display: flex;
  gap: 0.5rem;
}

.config-info {
  display: grid;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.info-item label {
  min-width: 5.5rem;
  color: var(--text-muted);
  font-weight: 500;
}

.info-item span {
  color: var(--text-secondary);
}

.ellipsis {
  max-width: 460px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.url-text {
  color: #0ea5e9 !important;
}

.api-key {
  font-family: monospace;
  color: var(--text-muted) !important;
}

.time-text {
  color: var(--text-muted) !important;
  font-size: 0.8125rem;
}

@media (max-width: 900px) {
  .config-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .config-actions {
    flex-wrap: wrap;
  }

  .ellipsis {
    max-width: 260px;
  }
}
</style>
