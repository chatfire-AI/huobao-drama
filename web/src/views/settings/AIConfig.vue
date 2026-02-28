<template>
  <div class="animate-fade-in">
    <!-- Page Header -->
    <PageHeader
      :title="$t('aiConfig.title')"
      :subtitle="$t('aiConfig.subtitle') || '管理 AI 服务配置'"
    >
      <template #actions>
        <el-button type="success" @click="showQuickSetupDialog">
          <el-icon><MagicStick /></el-icon>
          <span>一键配置火宝</span>
        </el-button>
      </template>
    </PageHeader>

    <!-- Provider Cards Grid -->
    <div v-loading="loading" class="provider-grid">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { MagicStick } from '@element-plus/icons-vue'
import { aiAPI } from '@/api/ai'
import { PageHeader } from '@/components/common'
import type { AIServiceConfig, AIServiceProvider, AIServiceType } from '@/types/ai'
import { PROVIDER_GROUPS, buildPresetModels } from '@/constants/ai-providers'
import ProviderCard from './components/ProviderCard.vue'

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

/** 获取 chatfire 在指定 service_type 下的第一个预设模型 */
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

onMounted(() => {
  loadAll()
})
</script>

<style scoped>
.provider-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  min-height: 200px;
}

@media (min-width: 768px) {
  .provider-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Quick Setup Dialog */
.quick-setup-info {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--glass-bg-muted);
  border-radius: var(--glass-radius-md);
  font-size: 14px;
  color: var(--glass-text-primary);

  p {
    margin: 0 0 8px 0;
  }

  ul {
    margin: 8px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
    color: var(--glass-text-secondary);
  }

  .quick-setup-tip {
    margin-top: 12px;
    font-size: 12px;
    color: var(--glass-text-tertiary);
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
  color: var(--glass-text-tertiary);
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: var(--glass-accent-from);
  }
}

.footer-buttons {
  display: flex;
  gap: 8px;
}
</style>
