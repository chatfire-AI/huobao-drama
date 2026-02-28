<template>
  <el-dialog
    v-model="visible"
    :title="$t('aiConfig.title')"
    width="900px"
    :close-on-click-modal="false"
    destroy-on-close
    class="ai-config-dialog"
  >
    <!-- Dialog Header Actions -->
    <template #header>
      <div class="dialog-header">
        <span class="dialog-title">{{ $t("aiConfig.title") }}</span>
        <div class="header-actions">
          <el-button type="success" size="small" @click="showQuickSetupDialog">
            <el-icon><MagicStick /></el-icon>
            <span>一键配置火宝</span>
          </el-button>
        </div>
      </div>
    </template>

    <!-- Provider Cards Grid -->
    <div v-loading="loading" class="dialog-provider-grid">
      <ProviderCard
        v-for="group in providerGroupsWithConfigs"
        :key="group.key"
        :provider-group="group"
        :configs="group.configs"
        :preset-models="group.presetModels"
        @refresh="loadAll"
      />
    </div>

    <!-- Quick Setup Dialog -->
    <el-dialog
      v-model="quickSetupVisible"
      title="一键配置"
      width="500px"
      :close-on-click-modal="false"
      append-to-body
    >
      <div class="quick-setup-info">
        <p>将自动创建以下配置：</p>
        <ul>
          <li><strong>文本服务</strong>: {{ chatfireFirstModel('text') }}</li>
          <li><strong>图片服务</strong>: {{ chatfireFirstModel('image') }}</li>
          <li><strong>视频服务</strong>: {{ chatfireFirstModel('video') }}</li>
        </ul>
        <p class="quick-setup-tip">Base URL: https://api.chatfire.site/v1</p>
      </div>
      <el-form label-width="80px">
        <el-form-item label="API Key" required>
          <el-input
            v-model="quickSetupApiKey"
            type="password"
            show-password
            placeholder="请输入 ChatFire API Key"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="quick-setup-footer">
          <a
            href="https://api.chatfire.site/login?inviteCode=C4453345"
            target="_blank"
            class="register-link"
          >
            没有 API Key？点击注册
          </a>
          <div class="footer-buttons">
            <el-button @click="quickSetupVisible = false">取消</el-button>
            <el-button
              type="primary"
              @click="handleQuickSetup"
              :loading="quickSetupLoading"
            >
              确认配置
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { MagicStick } from '@element-plus/icons-vue'
import { aiAPI } from '@/api/ai'
import type { AIServiceConfig, AIServiceProvider, AIServiceType } from '@/types/ai'
import { PROVIDER_GROUPS, buildPresetModels } from '@/constants/ai-providers'
import ProviderCard from '@/views/settings/components/ProviderCard.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'config-updated': []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// --- State ---
const loading = ref(false)
const allConfigs = ref<AIServiceConfig[]>([])
const allProviders = ref<AIServiceProvider[]>([])
const quickSetupVisible = ref(false)
const quickSetupApiKey = ref('')
const quickSetupLoading = ref(false)

// --- Computed ---
const presetModelsMap = computed(() => buildPresetModels(allProviders.value))

const providerGroupsWithConfigs = computed(() => {
  return PROVIDER_GROUPS.map(group => {
    const configs = allConfigs.value.filter(c => group.ids.includes(c.provider || ''))
    const presetModels = presetModelsMap.value[group.key] || { text: [], image: [], video: [], audio: [], lipsync: [] }
    return { ...group, configs, presetModels }
  })
})

function chatfireFirstModel(serviceType: AIServiceType): string {
  const models = presetModelsMap.value['chatfire']?.[serviceType]
  return models?.[0] || '-'
}

// --- Load ---
async function loadAll() {
  loading.value = true
  try {
    const [text, image, video, audio, lipsync, providers] = await Promise.all([
      aiAPI.list('text'),
      aiAPI.list('image'),
      aiAPI.list('video'),
      aiAPI.list('audio'),
      aiAPI.list('lipsync'),
      aiAPI.listProviders(),
    ])
    allConfigs.value = [...text, ...image, ...video, ...audio, ...lipsync]
    allProviders.value = providers
    emit('config-updated')
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// --- Quick Setup ---
function showQuickSetupDialog() {
  quickSetupApiKey.value = ''
  quickSetupVisible.value = true
}

const generateConfigName = (provider: string, serviceType: AIServiceType): string => {
  const providerNames: Record<string, string> = {
    chatfire: 'ChatFire', openai: 'OpenAI', gemini: 'Gemini', google: 'Google',
  }
  const serviceNames: Record<AIServiceType, string> = { text: '文本', image: '图片', video: '视频', audio: '音频', lipsync: '口型同步' }
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${providerNames[provider] || provider}-${serviceNames[serviceType]}-${randomNum}`
}

async function handleQuickSetup() {
  if (!quickSetupApiKey.value.trim()) {
    ElMessage.warning('请输入 API Key')
    return
  }

  quickSetupLoading.value = true
  const baseUrl = 'https://api.chatfire.site/v1'
  const apiKey = quickSetupApiKey.value.trim()

  try {
    const [textConfigs, imageConfigs, videoConfigs] = await Promise.all([
      aiAPI.list('text'),
      aiAPI.list('image'),
      aiAPI.list('video'),
    ])

    const createdServices: string[] = []
    const skippedServices: string[] = []

    const types: { key: AIServiceType; label: string; configs: AIServiceConfig[] }[] = [
      { key: 'text', label: '文本', configs: textConfigs },
      { key: 'image', label: '图片', configs: imageConfigs },
      { key: 'video', label: '视频', configs: videoConfigs },
    ]

    for (const { key, label, configs } of types) {
      if (!configs.find(c => c.base_url === baseUrl)) {
        const firstModel = chatfireFirstModel(key)
        await aiAPI.create({
          service_type: key, provider: 'chatfire',
          name: generateConfigName('chatfire', key),
          base_url: baseUrl, api_key: apiKey,
          model: firstModel !== '-' ? [firstModel] : [], priority: 0,
        })
        createdServices.push(label)
      } else {
        skippedServices.push(label)
      }
    }

    if (createdServices.length > 0 && skippedServices.length > 0) {
      ElMessage.success(`已创建 ${createdServices.join('、')} 配置，${skippedServices.join('、')} 配置已存在`)
    } else if (createdServices.length > 0) {
      ElMessage.success(`一键配置成功！已创建 ${createdServices.join('、')} 服务配置`)
    } else {
      ElMessage.info('所有配置已存在，无需重复创建')
    }

    quickSetupVisible.value = false
    loadAll()
  } catch (error: any) {
    ElMessage.error(error.message || '配置失败')
  } finally {
    quickSetupLoading.value = false
  }
}

// Load when dialog opens
watch(visible, (val) => {
  if (val) {
    loadAll()
  }
})
</script>

<style scoped>
.ai-config-dialog :deep(.el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-primary);
  margin-right: 0;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 32px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.dialog-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.ai-config-dialog :deep(.el-dialog__body) {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.dialog-provider-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  min-height: 200px;
}

@media (min-width: 640px) {
  .dialog-provider-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Quick Setup */
.quick-setup-info {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);

  p {
    margin: 0 0 8px 0;
  }

  ul {
    margin: 8px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
    color: var(--text-secondary);
  }

  .quick-setup-tip {
    margin-top: 12px;
    font-size: 12px;
    color: var(--text-muted);
  }
}

.quick-setup-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.register-link {
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: var(--accent);
  }
}

.footer-buttons {
  display: flex;
  gap: 8px;
}

/* Dark mode */
.dark .ai-config-dialog :deep(.el-dialog) {
  background: var(--bg-card);
}

.dark .ai-config-dialog :deep(.el-dialog__header) {
  background: var(--bg-card);
}
</style>
