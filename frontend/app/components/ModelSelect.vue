<template>
  <div class="model-select">
    <span class="model-select-label">{{ label }}</span>
    <AppMenu v-model:open="isOpen" :min-width="280">
      <template #trigger>
        <button type="button" class="model-select-trigger" :class="{ open: isOpen }">
          <img v-if="triggerIcon" :src="triggerIcon" class="model-select-icon" alt="" />
          <span v-else-if="currentOption?.provider" class="model-select-provider">{{ currentOption.provider }}</span>
          <span class="model-select-value">{{ currentLabel }}</span>
          <ChevronDown :size="11" class="model-select-arrow" :class="{ open: isOpen }" />
        </button>
      </template>

      <AppMenuItem v-if="!hideDefault" :selected="modelValue === ''" @click="pick('')">
        <img v-if="defaultIcon" :src="defaultIcon" class="model-select-icon sm" alt="" />
        <span class="model-select-dim">{{ effectiveDefaultLabel }}</span>
      </AppMenuItem>
      <AppMenuItem
        v-for="o in options"
        :key="o.key || o.model"
        :selected="modelValue === (o.key || o.model)"
        :title="`${o.model}${o.configName ? ` · ${o.configName}` : ''}`"
        @click="pick(o.key || o.model)"
      >
        <span class="model-select-option-name">{{ o.model }}</span>
        <template v-if="modelIconUrl(o.provider, o.model)" #trailing>
          <img :src="modelIconUrl(o.provider, o.model)" class="model-select-icon sm" alt="" />
        </template>
      </AppMenuItem>
    </AppMenu>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown } from 'lucide-vue-next'
import { modelIconUrl } from '~/composables/useProviderIcon'

const props = defineProps({
  label: { type: String, required: true },          // 改写 / 图片 / 视频
  modelValue: { type: String, default: '' },        // '' = 默认（配置首个模型）；选中值为 'provider/model' 复合键
  options: { type: Array, default: () => [] },      // [{ key, model, provider, configId, configName }]
  defaultLabel: { type: String, default: '' },      // 缺省回退 t('common.default')
  showConfig: { type: Boolean, default: false },    // 多配置时显示来源配置名
  hideDefault: { type: Boolean, default: false },   // 无「默认」语义的选择器（如分辨率）隐藏默认项
})
const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

const isOpen = ref(false)

const effectiveDefaultLabel = computed(() => props.defaultLabel || t('common.default'))
const currentOption = computed(() => props.options.find(o => (o.key || o.model) === props.modelValue) || null)
const currentLabel = computed(() => currentOption.value?.model || effectiveDefaultLabel.value)
// 默认 = 首个选项；未显式选模型时也展示默认模型的厂商图标（与 defaultLabel 取 options[0] 同口径）
// 图标按模型名推断（网关 provider=openai 但模型实为 deepseek 等场景），回退 provider
const defaultIcon = computed(() => modelIconUrl(props.options[0]?.provider, props.options[0]?.model))
const triggerIcon = computed(() =>
  currentOption.value
    ? modelIconUrl(currentOption.value.provider, currentOption.value.model)
    : defaultIcon.value)

function pick(model) {
  emit('update:modelValue', model)
  isOpen.value = false
}
</script>

<style scoped>
.model-select {
  display: flex;
  align-items: center;
  gap: 6px;
}
.model-select-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
}
.model-select-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  max-width: 210px;
  padding: 0 8px 0 10px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: var(--bg-input);
  color: var(--text-1);
  font: 11px var(--font-body);
  cursor: pointer;
  transition: border-color 0.16s, box-shadow 0.16s, background 0.16s;
}
.model-select-trigger:hover { border-color: var(--border-hover); }
.model-select-trigger.open,
.model-select-trigger:focus-visible {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--button-focus);
  outline: none;
}
.model-select-value {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.model-select-icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  object-fit: contain;
  border-radius: 2.5px;
}
.model-select-icon.sm { width: 12px; height: 12px; }
.model-select-provider {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--accent-bg);
  color: var(--accent);
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.model-select-arrow {
  flex-shrink: 0;
  color: var(--text-3);
  transition: transform 0.18s var(--ease-out);
}
.model-select-arrow.open { transform: rotate(180deg); }

/* 菜单项：模型名完整优先，超长才省略（tooltip 有全名） */
.model-select-option-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 320px;
}
.model-select-dim { color: var(--text-3); }
</style>
