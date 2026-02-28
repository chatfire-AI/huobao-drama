<template>
  <div class="page-container">
    <div class="content-wrapper animate-fade-in">
      <!-- Page Header / 页面头部 -->
      <PageHeader
        :title="$t('aiConfig.title')"
        :subtitle="$t('aiConfig.subtitle') || '管理 AI 服务配置'"
        :show-back="true"
        :back-text="$t('common.back')"
      >
        <template #actions>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            <span>{{ $t("aiConfig.addConfig") }}</span>
          </el-button>
        </template>
      </PageHeader>

      <!-- Tabs / 标签页 -->
      <div class="tabs-wrapper">
        <el-tabs
          v-model="activeTab"
          @tab-change="handleTabChange"
          class="config-tabs"
        >
          <el-tab-pane :label="$t('aiConfig.tabs.text')" name="text">
            <ConfigList
              :configs="configs"
              :loading="loading"
              :show-test-button="true"
              @edit="handleEdit"
              @delete="handleDelete"
              @toggle-active="handleToggleActive"
              @test="handleTest"
            />
          </el-tab-pane>

          <el-tab-pane :label="$t('aiConfig.tabs.image')" name="image">
            <ConfigList
              :configs="configs"
              :loading="loading"
              :show-test-button="false"
              @edit="handleEdit"
              @delete="handleDelete"
              @toggle-active="handleToggleActive"
            />
          </el-tab-pane>

          <el-tab-pane :label="$t('aiConfig.tabs.video')" name="video">
            <ConfigList
              :configs="configs"
              :loading="loading"
              :show-test-button="false"
              @edit="handleEdit"
              @delete="handleDelete"
              @toggle-active="handleToggleActive"
            />
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- Edit/Create Dialog / 编辑创建弹窗 -->
      <el-dialog
        v-model="dialogVisible"
        :title="isEdit ? $t('aiConfig.editConfig') : $t('aiConfig.addConfig')"
        width="600px"
        :close-on-click-modal="false"
      >
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <el-form-item :label="$t('aiConfig.form.name')" prop="name">
            <el-input
              v-model="form.name"
              :placeholder="$t('aiConfig.form.namePlaceholder')"
            />
          </el-form-item>

          <el-form-item :label="$t('aiConfig.form.provider')" prop="provider">
            <el-select
              v-model="form.provider"
              :placeholder="$t('aiConfig.form.providerPlaceholder')"
              @change="handleProviderChange"
              style="width: 100%"
            >
              <el-option
                v-for="provider in availableProviders"
                :key="provider.id"
                :label="provider.name"
                :value="provider.id"
                :disabled="provider.disabled"
              />
            </el-select>
            <div class="form-tip">{{ $t("aiConfig.form.providerTip") }}</div>
          </el-form-item>

          <el-form-item :label="$t('aiConfig.form.priority')" prop="priority">
            <el-input-number
              v-model="form.priority"
              :min="0"
              :max="100"
              :step="1"
              style="width: 100%"
            />
            <div class="form-tip">{{ $t("aiConfig.form.priorityTip") }}</div>
          </el-form-item>

          <el-form-item :label="$t('aiConfig.form.model')" prop="model">
            <el-select
              v-model="form.model"
              :placeholder="$t('aiConfig.form.modelPlaceholder')"
              multiple
              filterable
              allow-create
              default-first-option
              collapse-tags
              collapse-tags-tooltip
              style="width: 100%"
            >
              <el-option
                v-for="model in availableModels"
                :key="model"
                :label="model"
                :value="model"
              />
            </el-select>
            <div class="form-tip">{{ $t("aiConfig.form.modelTip") }}</div>
          </el-form-item>

          <el-form-item :label="$t('aiConfig.form.baseUrl')" prop="base_url">
            <el-input
              v-model="form.base_url"
              :placeholder="$t('aiConfig.form.baseUrlPlaceholder')"
            />
            <div class="form-tip">
              {{ $t("aiConfig.form.baseUrlTip") }}
              <br />
              {{ $t("aiConfig.form.fullEndpoint") }}: {{ fullEndpointExample }}
            </div>
          </el-form-item>

          <el-form-item :label="$t('aiConfig.form.apiKey')" prop="api_key">
            <el-input
              v-model="form.api_key"
              type="password"
              show-password
              :placeholder="$t('aiConfig.form.apiKeyPlaceholder')"
            />
            <div class="form-tip">{{ $t("aiConfig.form.apiKeyTip") }}</div>
          </el-form-item>

          <el-form-item v-if="isEdit" :label="$t('aiConfig.form.isActive')">
            <el-switch v-model="form.is_active" />
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="dialogVisible = false">{{
            $t("common.cancel")
          }}</el-button>
          <el-button
            v-if="form.service_type === 'text'"
            @click="testConnection"
            :loading="testing"
            >{{ $t("aiConfig.actions.test") }}</el-button
          >
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? $t("common.save") : $t("common.create") }}
          </el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from "element-plus";
import { Plus, ArrowLeft } from "@element-plus/icons-vue";
import { aiAPI } from "@/api/ai";
import { PageHeader } from "@/components/common";
import type {
  AIServiceConfig,
  AIServiceType,
  CreateAIConfigRequest,
  UpdateAIConfigRequest,
} from "@/types/ai";
import ConfigList from "./components/ConfigList.vue";

const router = useRouter();

const activeTab = ref<AIServiceType>("text");
const loading = ref(false);
const configs = ref<AIServiceConfig[]>([]);
const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number>();
const formRef = ref<FormInstance>();
const submitting = ref(false);
const testing = ref(false);

const form = reactive<
  CreateAIConfigRequest & { is_active?: boolean; provider?: string }
>({
  service_type: "text",
  provider: "",
  name: "",
  base_url: "",
  api_key: "",
  model: [], // 改为数组支持多选
  priority: 0, // 默认优先级为0
  is_active: true,
});

// 厂商和模型配置
interface ProviderConfig {
  id: string;
  name: string;
  models: string[];
  disabled?: boolean;
}

const providerConfigs: Record<AIServiceType, ProviderConfig[]> = {
  text: [
    {
      id: "openai",
      name: "OpenAI",
      models: ["gpt-5.2", "gemini-3-flash-preview"],
    },
    {
      id: "chatfire",
      name: "Chatfire",
      models: [
        "gemini-3-flash-preview",
        "claude-sonnet-4-5-20250929",
        "doubao-seed-1-8-251228",
      ],
    },
    {
      id: "gemini",
      name: "Google Gemini",
      models: ["gemini-2.5-pro", "gemini-3-flash-preview"],
    },
    {
      id: "volcengine",
      name: "火山引擎",
      models: ["doubao-seed-1-8-251228"],
    },
  ],
  image: [
    {
      id: "volcengine",
      name: "火山引擎",
      models: ["doubao-seedream-4-5-251128", "doubao-seedream-4-0-250828"],
    },
    {
      id: "chatfire",
      name: "Chatfire",
      models: ["doubao-seedream-4-5-251128", "nano-banana-pro"],
    },
    {
      id: "gemini",
      name: "Google Gemini",
      models: ["gemini-3-pro-image-preview"],
    },
    { id: "openai", name: "OpenAI", models: ["dall-e-3", "dall-e-2"] },
  ],
  video: [
    {
      id: "volces",
      name: "火山引擎",
      models: [
        "doubao-seedance-1-5-pro-251215",
        "doubao-seedance-1-0-lite-i2v-250428",
        "doubao-seedance-1-0-lite-t2v-250428",
        "doubao-seedance-1-0-pro-250528",
        "doubao-seedance-1-0-pro-fast-251015",
      ],
    },
    {
      id: "chatfire",
      name: "Chatfire",
      models: [
        "doubao-seedance-1-5-pro-251215",
        "doubao-seedance-1-0-lite-i2v-250428",
        "doubao-seedance-1-0-lite-t2v-250428",
        "doubao-seedance-1-0-pro-250528",
        "doubao-seedance-1-0-pro-fast-251015",
        "sora-2",
        "sora-2-pro",
      ],
    },
    { id: "openai", name: "OpenAI", models: ["sora-2", "sora-2-pro"] },
    //    { id: 'minimax', name: 'MiniMax', models: ['MiniMax-Hailuo-2.3', 'MiniMax-Hailuo-2.3-Fast', 'MiniMax-Hailuo-02'] }
  ],
};

// 当前可用的厂商列表（只显示有激活配置的）
const availableProviders = computed(() => {
  return providerConfigs[form.service_type] || [];
});

// 当前可用的模型列表（从已激活的配置中获取）
const availableModels = computed(() => {
  if (!form.provider) return [];

  const providerConfig = providerConfigs[form.service_type]?.find(
    (p) => p.id === form.provider,
  );

  // 从已激活的配置中提取该 provider 的所有模型
  const activeConfigsForProvider = configs.value.filter(
    (c) =>
      c.provider === form.provider &&
      c.service_type === form.service_type &&
      c.is_active,
  );

  // 提取所有模型，去重
  const models = new Set<string>();
  activeConfigsForProvider.forEach((config) => {
    config.model.forEach((m) => models.add(m));
  });

  // 如果当前 provider 没有已激活配置，回退到预定义模型列表
  if (models.size === 0 && providerConfig) {
    providerConfig.models.forEach((m) => models.add(m));
  }

  return Array.from(models);
});

// 完整端点示例
const fullEndpointExample = computed(() => {
  const baseUrl = form.base_url || "https://api.example.com";
  const provider = form.provider;
  const serviceType = form.service_type;

  let endpoint = "";

  if (serviceType === "text") {
    if (provider === "gemini" || provider === "google") {
      endpoint = "/v1beta/models/{model}:generateContent";
    } else {
      endpoint = "/chat/completions";
    }
  } else if (serviceType === "image") {
    if (provider === "gemini" || provider === "google") {
      endpoint = "/v1beta/models/{model}:generateContent";
    } else {
      endpoint = "/images/generations";
    }
  } else if (serviceType === "video") {
    if (provider === "chatfire") {
      endpoint = "/video/generations";
    } else if (
      provider === "doubao" ||
      provider === "volcengine" ||
      provider === "volces"
    ) {
      endpoint = "/contents/generations/tasks";
    } else if (provider === "openai") {
      endpoint = "/videos";
    } else {
      endpoint = "/video/generations";
    }
  }

  return baseUrl + endpoint;
});

const rules: FormRules = {
  name: [{ required: true, message: "请输入配置名称", trigger: "blur" }],
  provider: [{ required: true, message: "请选择厂商", trigger: "change" }],
  base_url: [
    { required: true, message: "请输入 Base URL", trigger: "blur" },
    { type: "url", message: "请输入正确的 URL 格式", trigger: "blur" },
  ],
  api_key: [{ required: true, message: "请输入 API Key", trigger: "blur" }],
  model: [
    {
      required: true,
      message: "请至少选择一个模型",
      trigger: "change",
      validator: (rule: any, value: any, callback: any) => {
        if (Array.isArray(value) && value.length > 0) {
          callback();
        } else if (typeof value === "string" && value.length > 0) {
          callback();
        } else {
          callback(new Error("请至少选择一个模型"));
        }
      },
    },
  ],
};

const loadConfigs = async () => {
  loading.value = true;
  try {
    configs.value = await aiAPI.list(activeTab.value);
  } catch (error: any) {
    ElMessage.error(error.message || "加载失败");
  } finally {
    loading.value = false;
  }
};

// 生成随机配置名称
const generateConfigName = (
  provider: string,
  serviceType: AIServiceType,
): string => {
  const providerNames: Record<string, string> = {
    chatfire: "ChatFire",
    openai: "OpenAI",
    gemini: "Gemini",
    google: "Google",
    volcengine: "火山引擎",
  };

  const serviceNames: Record<AIServiceType, string> = {
    text: "文本",
    image: "图片",
    video: "视频",
  };

  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  const providerName = providerNames[provider] || provider;
  const serviceName = serviceNames[serviceType] || serviceType;

  return `${providerName}-${serviceName}-${randomNum}`;
};

const showCreateDialog = () => {
  isEdit.value = false;
  editingId.value = undefined;
  resetForm();
  form.service_type = activeTab.value;
  // 默认选择 chatfire
  form.provider = "chatfire";
  // 设置默认 base_url
  form.base_url = "https://api.chatfire.site/v1";
  // 自动生成随机配置名称
  form.name = generateConfigName("chatfire", activeTab.value);
  dialogVisible.value = true;
};

const handleEdit = (config: AIServiceConfig) => {
  isEdit.value = true;
  editingId.value = config.id;

  Object.assign(form, {
    service_type: config.service_type,
    provider: config.provider || "chatfire", // 直接使用配置中的 provider，默认为 chatfire
    name: config.name,
    base_url: config.base_url,
    api_key: config.api_key,
    model: Array.isArray(config.model) ? config.model : [config.model], // 统一转换为数组
    priority: config.priority || 0,
    is_active: config.is_active,
  });
  dialogVisible.value = true;
};

const handleDelete = async (config: AIServiceConfig) => {
  try {
    await ElMessageBox.confirm("确定要删除该配置吗？", "警告", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    await aiAPI.delete(config.id);
    ElMessage.success("删除成功");
    loadConfigs();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error.message || "删除失败");
    }
  }
};

const handleToggleActive = async (config: AIServiceConfig) => {
  try {
    const newActiveState = !config.is_active;
    await aiAPI.update(config.id, { is_active: newActiveState });
    ElMessage.success(newActiveState ? "已启用配置" : "已禁用配置");
    await loadConfigs();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
  }
};

const testConnection = async () => {
  if (!formRef.value) return;

  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  testing.value = true;
  try {
    await aiAPI.testConnection({
      base_url: form.base_url,
      api_key: form.api_key,
      model: form.model,
      provider: form.provider,
    });
    ElMessage.success("连接测试成功！");
  } catch (error: any) {
    ElMessage.error(error.message || "连接测试失败");
  } finally {
    testing.value = false;
  }
};

const handleTest = async (config: AIServiceConfig) => {
  testing.value = true;
  try {
    await aiAPI.testConnection({
      base_url: config.base_url,
      api_key: config.api_key,
      model: config.model,
      provider: config.provider,
    });
    ElMessage.success("连接测试成功！");
  } catch (error: any) {
    ElMessage.error(error.message || "连接测试失败");
  } finally {
    testing.value = false;
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      if (isEdit.value && editingId.value) {
        const updateData: UpdateAIConfigRequest = {
          name: form.name,
          provider: form.provider,
          base_url: form.base_url,
          api_key: form.api_key,
          model: form.model,
          priority: form.priority,
          is_active: form.is_active,
        };
        await aiAPI.update(editingId.value, updateData);
        ElMessage.success("更新成功");
      } else {
        await aiAPI.create(form);
        ElMessage.success("创建成功");
      }

      dialogVisible.value = false;
      loadConfigs();
    } catch (error: any) {
      ElMessage.error(error.message || "操作失败");
    } finally {
      submitting.value = false;
    }
  });
};

const handleTabChange = (tabName: string | number) => {
  // 标签页切换时重新加载对应服务类型的配置
  activeTab.value = tabName as AIServiceType;
  loadConfigs();
};

const handleProviderChange = () => {
  // 切换厂商时清空已选模型
  form.model = [];

  // 根据厂商自动设置默认 base_url
  if (form.provider === "gemini" || form.provider === "google") {
    form.base_url = "https://api.chatfire.site";
  } else if (form.provider === "volcengine" || form.provider === "volces") {
    form.base_url = "https://ark.cn-beijing.volces.com/api/v3";
  } else {
    // openai, chatfire 等其他厂商
    form.base_url = "https://api.chatfire.site/v1";
  }

  // 仅在新建配置时自动更新名称
  if (!isEdit.value) {
    form.name = generateConfigName(form.provider, form.service_type);
  }
};

// getDefaultEndpoint 已移除，端点由后端根据 provider 自动设置
// 保留该函数定义以避免编译错误
const getDefaultEndpoint = (serviceType: AIServiceType): string => {
  switch (serviceType) {
    case "text":
      return "";
    case "image":
      return "/v1/images/generations";
    case "video":
      return "/v1/video/generations";
    default:
      return "/v1/chat/completions";
  }
};

const resetForm = () => {
  const serviceType = form.service_type || "text";
  Object.assign(form, {
    service_type: serviceType,
    provider: "",
    name: "",
    base_url: "",
    api_key: "",
    model: [], // 改为空数组
    priority: 0,
    is_active: true,
  });
  formRef.value?.resetFields();
};

const goBack = () => {
  router.back();
};

onMounted(() => {
  loadConfigs();
});
</script>

<style scoped>
/* ========================================
   Page Layout / 页面布局 - 紧凑边距
   ======================================== */
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
  max-width: 1200px;
  margin: 0 auto;
}

/* ========================================
   Tabs / 标签页 - 紧凑内边距
   ======================================== */
.tabs-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  box-shadow: var(--shadow-card);
}

@media (min-width: 768px) {
  .tabs-wrapper {
    padding: var(--space-4);
  }
}

/* ========================================
   Form Tips / 表单提示
   ======================================== */
.form-tip {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

/* ========================================
   Dialog / 弹窗
   ======================================== */
:deep(.el-dialog) {
  border-radius: 0.75rem;
}

:deep(.el-dialog__header) {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-primary);
  margin-right: 0;
}

:deep(.el-dialog__title) {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

:deep(.el-dialog__body) {
  padding: 1.5rem;
}

:deep(.el-dialog__footer) {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-primary);
}

/* ========================================
   Dark Mode / 深色模式
   ======================================== */
.dark .tabs-wrapper {
  background: var(--bg-card);
}

.dark :deep(.el-dialog) {
  background: var(--bg-card);
}

.dark :deep(.el-dialog__header) {
  background: var(--bg-card);
}

.dark :deep(.el-dialog__body) {
  background: var(--bg-card);
}

.dark :deep(.el-form-item__label) {
  color: var(--text-primary);
}

.dark :deep(.el-input__wrapper) {
  background: var(--bg-secondary);
  box-shadow: 0 0 0 1px var(--border-primary) inset;
}

.dark :deep(.el-input__inner) {
  color: var(--text-primary);
}

.dark :deep(.el-input__inner::placeholder) {
  color: var(--text-muted);
}

.dark :deep(.el-select .el-input__wrapper) {
  background: var(--bg-secondary);
}

.dark :deep(.el-textarea__inner) {
  background: var(--bg-secondary);
  color: var(--text-primary);
  box-shadow: 0 0 0 1px var(--border-primary) inset;
}

.dark :deep(.el-input-number) {
  background: var(--bg-secondary);
}

.dark :deep(.el-switch__core) {
  background: var(--bg-secondary);
  border-color: var(--border-primary);
}

.dark :deep(.el-button--default) {
  background: var(--bg-secondary);
  border-color: var(--border-primary);
  color: var(--text-primary);
}

.dark :deep(.el-button--default:hover) {
  background: var(--bg-card-hover);
  border-color: var(--border-secondary);
}
</style>
