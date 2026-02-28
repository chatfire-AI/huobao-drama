<template>
  <div class="provider-card glass-surface">
    <!-- Header -->
    <div class="card-header">
      <div class="provider-identity">
        <div class="provider-avatar" :style="{ background: avatarColor }">
          {{ providerGroup.name.charAt(0) }}
        </div>
        <div class="provider-info">
          <span class="provider-name">{{ providerGroup.name }}</span>
          <span :class="['status-dot', hasApiKey ? 'connected' : 'disconnected']" />
        </div>
      </div>
    </div>

    <!-- API Key & Base URL -->
    <div class="credentials-section glass-surface-soft">
      <!-- API Key Row -->
      <div class="credential-row">
        <label class="credential-label">API Key</label>
        <div class="credential-value">
          <template v-if="editingField === 'api_key'">
            <input
              v-model="editApiKey"
              type="password"
              class="glass-input-base glass-input-sm credential-input"
              placeholder="sk-..."
              @keyup.enter="saveCredential('api_key')"
              @keyup.escape="cancelEdit"
            />
            <button class="glass-icon-btn-sm" @click="saveCredential('api_key')" title="保存">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button class="glass-icon-btn-sm" @click="cancelEdit" title="取消">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </template>
          <template v-else>
            <span class="masked-key">{{ maskedApiKey }}</span>
            <button v-if="hasApiKey" class="glass-icon-btn-sm" @click="toggleKeyVisibility" :title="showFullKey ? '隐藏' : '显示'">
              <svg v-if="showFullKey" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="glass-icon-btn-sm" @click="startEdit('api_key')" title="编辑">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </template>
        </div>
      </div>

      <!-- Base URL Row -->
      <div class="credential-row">
        <label class="credential-label">Base URL</label>
        <div class="credential-value">
          <template v-if="editingField === 'base_url'">
            <input
              v-model="editBaseUrl"
              type="text"
              class="glass-input-base glass-input-sm credential-input"
              placeholder="https://api.example.com/v1"
              @keyup.enter="saveCredential('base_url')"
              @keyup.escape="cancelEdit"
            />
            <button class="glass-icon-btn-sm" @click="saveCredential('base_url')" title="保存">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button class="glass-icon-btn-sm" @click="cancelEdit" title="取消">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </template>
          <template v-else>
            <span class="base-url-text">{{ currentBaseUrl || '未配置' }}</span>
            <button class="glass-icon-btn-sm" @click="startEdit('base_url')" title="编辑">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Model Section -->
    <div class="models-section">
      <!-- Service Type Tabs -->
      <div class="service-tabs">
        <button
          v-for="tab in availableTabs"
          :key="tab.key"
          :class="['service-tab', { active: activeServiceType === tab.key }]"
          @click="activeServiceType = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Model List -->
      <div class="model-list glass-provider-model-scroll">
        <div
          v-for="model in currentModels"
          :key="model.name"
          class="model-row glass-list-row"
        >
          <span class="model-name">{{ model.name }}</span>
          <el-switch
            :model-value="model.active"
            size="small"
            @change="(val: boolean) => handleModelToggle(model, val)"
          />
        </div>

        <div v-if="currentModels.length === 0" class="empty-models">
          <span>暂无模型</span>
        </div>

        <!-- Add Custom Model -->
        <div v-if="addingModel" class="model-row add-model-row">
          <input
            v-model="newModelName"
            class="glass-input-base glass-input-sm add-model-input"
            placeholder="输入模型名称"
            @keyup.enter="confirmAddModel"
            @keyup.escape="addingModel = false"
          />
          <div class="add-model-actions">
            <button class="glass-icon-btn-sm" @click="confirmAddModel" title="确认">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button class="glass-icon-btn-sm" @click="addingModel = false" title="取消">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <button v-else class="add-model-btn glass-btn-base glass-btn-ghost glass-btn-sm" @click="addingModel = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          添加模型
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { aiAPI } from '@/api/ai'
import type { AIServiceConfig, AIServiceType } from '@/types/ai'
import type { ProviderGroup } from '@/constants/ai-providers'

const props = defineProps<{
  providerGroup: ProviderGroup
  configs: AIServiceConfig[]
  presetModels: Record<AIServiceType, string[]>
}>()

const emit = defineEmits<{
  refresh: []
}>()

// --- State ---
const editingField = ref<'api_key' | 'base_url' | null>(null)
const editApiKey = ref('')
const editBaseUrl = ref('')
const showFullKey = ref(false)
const activeServiceType = ref<AIServiceType>('text')
const addingModel = ref(false)
const newModelName = ref('')
const saving = ref(false)

// --- Avatar color ---
const avatarColors: Record<string, string> = {
  chatfire: 'linear-gradient(135deg, #f97316, #ef4444)',
  gemini: 'linear-gradient(135deg, #4285f4, #34a853)',
  openai: 'linear-gradient(135deg, #10a37f, #1a7f64)',
  volcengine: 'linear-gradient(135deg, #3370ff, #2b5fd9)',
  minimax: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  vidu: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  openrouter: 'linear-gradient(135deg, #f59e0b, #d97706)',
  fal: 'linear-gradient(135deg, #ec4899, #be185d)',
  qwen: 'linear-gradient(135deg, #6366f1, #4f46e5)',
}
const avatarColor = computed(() => avatarColors[props.providerGroup.key] || 'linear-gradient(135deg, #6366f1, #8b5cf6)')

// --- Computed ---
const hasApiKey = computed(() => props.configs.some(c => c.api_key && c.api_key.length > 0))

const currentApiKey = computed(() => {
  const config = props.configs.find(c => c.api_key)
  return config?.api_key || ''
})

const maskedApiKey = computed(() => {
  const key = showFullKey.value ? currentApiKey.value : currentApiKey.value
  if (!key) return '未配置'
  if (showFullKey.value) return key
  if (key.length <= 8) return '****'
  return key.substring(0, 4) + '****' + key.substring(key.length - 4)
})

const currentBaseUrl = computed(() => {
  const config = props.configs.find(c => c.base_url)
  return config?.base_url || ''
})

const SERVICE_TYPE_LABELS: Record<AIServiceType, string> = {
  text: '文本',
  image: '图片',
  video: '视频',
  audio: '音频',
  lipsync: '口型同步',
}

const availableTabs = computed(() => {
  const types: AIServiceType[] = ['text', 'image', 'video', 'audio', 'lipsync']
  return types
    .filter(t => (props.presetModels[t] && props.presetModels[t].length > 0) || props.configs.some(c => c.service_type === t))
    .map(t => ({ key: t, label: SERVICE_TYPE_LABELS[t] }))
})

// 确保 activeServiceType 始终指向有效 tab（MiniMax/Vidu 只有 video）
watch(availableTabs, (tabs) => {
  if (tabs.length > 0 && !tabs.some(t => t.key === activeServiceType.value)) {
    activeServiceType.value = tabs[0].key
  }
}, { immediate: true })

interface ModelItem {
  name: string
  active: boolean
  configId?: number
  providerId: string
}

const currentModels = computed<ModelItem[]>(() => {
  const st = activeServiceType.value
  const presets = props.presetModels[st] || []
  const configsForType = props.configs.filter(c => c.service_type === st)

  // Build a map of model -> config info from existing configs
  const configModelMap = new Map<string, { active: boolean; configId: number; providerId: string }>()
  for (const cfg of configsForType) {
    const models = Array.isArray(cfg.model) ? cfg.model : [cfg.model]
    for (const m of models) {
      configModelMap.set(m, { active: cfg.is_active, configId: cfg.id, providerId: cfg.provider || '' })
    }
  }

  // Merge presets + any extra models from configs not in presets
  const allModelNames = new Set([...presets])
  for (const m of configModelMap.keys()) {
    allModelNames.add(m)
  }

  return Array.from(allModelNames).map(name => {
    const info = configModelMap.get(name)
    return {
      name,
      active: info?.active ?? false,
      configId: info?.configId,
      providerId: info?.providerId || props.providerGroup.ids[0],
    }
  })
})

// --- Inline Edit ---
function startEdit(field: 'api_key' | 'base_url') {
  editingField.value = field
  if (field === 'api_key') {
    editApiKey.value = currentApiKey.value
  } else {
    editBaseUrl.value = currentBaseUrl.value
  }
}

function cancelEdit() {
  editingField.value = null
}

async function saveCredential(field: 'api_key' | 'base_url') {
  const value = field === 'api_key' ? editApiKey.value.trim() : editBaseUrl.value.trim()
  if (!value) {
    ElMessage.warning(field === 'api_key' ? '请输入 API Key' : '请输入 Base URL')
    return
  }

  saving.value = true
  try {
    // Update all configs under this provider
    const updates = props.configs.map(c =>
      aiAPI.update(c.id, { [field]: value })
    )
    await Promise.all(updates)
    ElMessage.success('保存成功')
    editingField.value = null
    emit('refresh')
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// --- Model Toggle ---
async function handleModelToggle(model: ModelItem, active: boolean) {
  try {
    if (model.configId) {
      // Existing config — toggle is_active
      await aiAPI.update(model.configId, { is_active: active })
    } else {
      // No config yet — create one
      const providerId = props.providerGroup.ids[0]
      await aiAPI.create({
        service_type: activeServiceType.value,
        provider: providerId,
        name: `${props.providerGroup.name}-${SERVICE_TYPE_LABELS[activeServiceType.value]}-${model.name}`,
        base_url: currentBaseUrl.value || getDefaultBaseUrl(providerId),
        api_key: currentApiKey.value,
        model: [model.name],
        priority: 0,
      })
    }
    emit('refresh')
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  }
}

// --- Add Model ---
async function confirmAddModel() {
  const name = newModelName.value.trim()
  if (!name) return

  try {
    const providerId = props.providerGroup.ids[0]
    await aiAPI.create({
      service_type: activeServiceType.value,
      provider: providerId,
      name: `${props.providerGroup.name}-${SERVICE_TYPE_LABELS[activeServiceType.value]}-${name}`,
      base_url: currentBaseUrl.value || getDefaultBaseUrl(providerId),
      api_key: currentApiKey.value,
      model: [name],
      priority: 0,
    })
    ElMessage.success('模型已添加')
    addingModel.value = false
    newModelName.value = ''
    emit('refresh')
  } catch (error: any) {
    ElMessage.error(error.message || '添加失败')
  }
}

function getDefaultBaseUrl(providerId: string): string {
  const defaults: Record<string, string> = {
    chatfire: 'https://api.chatfire.site/v1',
    openai: 'https://api.openai.com/v1',
    gemini: 'https://generativelanguage.googleapis.com',
    google: 'https://generativelanguage.googleapis.com',
    volcengine: 'https://ark.cn-beijing.volces.com/api/v3',
    volces: 'https://ark.cn-beijing.volces.com/api/v3',
    minimax: 'https://api.minimaxi.com/v1',
    vidu: 'https://api.vidu.com/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    fal: 'https://queue.fal.run',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  }
  return defaults[providerId] || 'https://api.chatfire.site/v1'
}

// --- Key Visibility ---
function toggleKeyVisibility() {
  showFullKey.value = !showFullKey.value
}
</script>

<style scoped>
.provider-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.2s ease;
}

.provider-card:hover {
  box-shadow: var(--glass-shadow-md);
}

/* Header */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.provider-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--glass-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  color: #fff;
  flex-shrink: 0;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--glass-text-primary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.connected {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.status-dot.disconnected {
  background: #eab308;
  box-shadow: 0 0 6px rgba(234, 179, 8, 0.3);
}

/* Credentials */
.credentials-section {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.credential-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
}

.credential-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--glass-text-tertiary);
  min-width: 60px;
  flex-shrink: 0;
}

.credential-value {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.credential-input {
  flex: 1;
  min-width: 0;
}

.masked-key {
  font-family: monospace;
  font-size: 13px;
  color: var(--glass-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-url-text {
  font-size: 13px;
  color: var(--glass-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Service Tabs */
.models-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.service-tabs {
  display: flex;
  gap: 4px;
  padding: 2px;
  background: var(--glass-bg-muted);
  border-radius: var(--glass-radius-xs);
  width: fit-content;
}

.service-tab {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--glass-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--glass-radius-xs);
  cursor: pointer;
  transition: all 0.2s ease;
}

.service-tab:hover {
  color: var(--glass-text-primary);
}

.service-tab.active {
  background: var(--glass-bg-surface);
  color: var(--glass-text-primary);
  box-shadow: var(--glass-shadow-sm);
}

/* Model List */
.model-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 240px;
  overflow-y: auto;
}

.model-row {
  padding: 6px 10px;
}

.model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--glass-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-models {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--glass-text-tertiary);
}

/* Add Model */
.add-model-btn {
  width: 100%;
  justify-content: center;
  margin-top: 4px;
  color: var(--glass-text-tertiary);
}

.add-model-btn:hover {
  color: var(--glass-text-primary);
}

.add-model-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-model-input {
  flex: 1;
  min-width: 0;
}

.add-model-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
</style>
