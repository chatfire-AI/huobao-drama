<template>
  <el-dialog
    v-model="visible"
:title="$t('imageDialog.title')"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
      <el-form-item :label="$t('imageDialog.selectDrama')" prop="drama_id">
        <el-select v-model="form.drama_id" :placeholder="$t('imageDialog.selectDrama')" @change="onDramaChange">
          <el-option
            v-for="drama in dramas"
            :key="drama.id"
            :label="drama.title"
            :value="drama.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('imageDialog.selectScene')" prop="scene_id">
        <el-select
          v-model="form.scene_id"
          :placeholder="$t('imageDialog.selectSceneOptional')"
          clearable
          @change="onSceneChange"
        >
          <el-option
            v-for="scene in scenes"
            :key="scene.id"
:label="$t('imageDialog.sceneLabel', { number: scene.storyboard_number, title: scene.title })"
            :value="scene.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('imageDialog.prompt')" prop="prompt">
        <el-input
          v-model="form.prompt"
          type="textarea"
          :rows="6"
:placeholder="$t('imageDialog.promptPlaceholder')"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item :label="$t('imageDialog.negativePrompt')">
        <el-input
          v-model="form.negative_prompt"
          type="textarea"
          :rows="3"
:placeholder="$t('imageDialog.negativePromptPlaceholder')"
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item :label="$t('imageDialog.aiService')">
        <el-select v-model="form.provider" :placeholder="$t('imageDialog.selectService')">
          <el-option label="OpenAI/DALL-E" value="openai" />
          <el-option label="Stable Diffusion" value="stable_diffusion" />
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('imageDialog.imageSize')">
        <el-select v-model="form.size" :placeholder="$t('imageDialog.selectSize')">
          <el-option :label="`1024x1024 (${$t('imageDialog.square')})`" value="1024x1024" />
          <el-option :label="`1792x1024 (${$t('imageDialog.landscape')})`" value="1792x1024" />
          <el-option :label="`1024x1792 (${$t('imageDialog.portrait')})`" value="1024x1792" />
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('imageDialog.imageQuality')" v-if="form.provider === 'openai'">
        <el-radio-group v-model="form.quality">
          <el-radio label="standard">{{ $t('imageDialog.standard') }}</el-radio>
          <el-radio label="hd">{{ $t('imageDialog.hd') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item :label="$t('imageDialog.style')" v-if="form.provider === 'openai'">
        <el-radio-group v-model="form.style">
          <el-radio label="vivid">{{ $t('imageDialog.vivid') }}</el-radio>
          <el-radio label="natural">{{ $t('imageDialog.natural') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-collapse v-if="form.provider === 'stable_diffusion'">
        <el-collapse-item :title="$t('imageDialog.advancedSettings')" name="advanced">
          <el-form-item :label="$t('imageDialog.samplingSteps')">
            <el-slider v-model="form.steps" :min="10" :max="50" :marks="stepsMarks" />
          </el-form-item>

          <el-form-item :label="$t('imageDialog.promptRelevance')">
            <el-slider v-model="form.cfg_scale" :min="1" :max="20" :step="0.5" :marks="cfgMarks" />
          </el-form-item>

          <el-form-item :label="$t('imageDialog.randomSeed')">
            <el-input-number v-model="form.seed" :min="-1" :placeholder="$t('imageDialog.leaveBlankRandom')" />
            <span class="form-tip">{{ $t('imageDialog.seedTip') }}</span>
          </el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="generating" @click="handleGenerate">
        {{ $t('imageDialog.generate') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { imageAPI } from '@/api/image'
import { dramaAPI } from '@/api/drama'
import type { Drama, Scene } from '@/types/drama'
import type { GenerateImageRequest } from '@/types/image'

interface Props {
  modelValue: boolean
  dramaId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const { t } = useI18n()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref<FormInstance>()
const generating = ref(false)
const dramas = ref<Drama[]>([])
const scenes = ref<Scene[]>([])

const form = reactive<GenerateImageRequest>({
  drama_id: props.dramaId || '',
  scene_id: undefined,
  prompt: '',
  negative_prompt: '',
  provider: 'openai',
  size: '1024x1024',
  quality: 'standard',
  style: 'vivid',
  steps: 30,
  cfg_scale: 7.5,
  seed: undefined
})

const rules: FormRules = {
  drama_id: [
    { required: true, message: t('imageDialog.pleaseSelectDrama'), trigger: 'change' }
  ],
  prompt: [
    { required: true, message: t('imageDialog.pleaseEnterPrompt'), trigger: 'blur' },
    { min: 5, message: t('imageDialog.promptMinLength'), trigger: 'blur' }
  ]
}

const stepsMarks = {
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50'
}

const cfgMarks = {
  1: t('imageDialog.weak'),
  7.5: t('imageDialog.moderate'),
  15: t('imageDialog.strong'),
  20: t('imageDialog.veryStrong')
}

watch(() => props.modelValue, (val) => {
  if (val) {
    loadDramas()
    if (props.dramaId) {
      form.drama_id = props.dramaId
      loadScenes(props.dramaId)
    }
  }
})

const loadDramas = async () => {
  try {
    const result = await dramaAPI.list({ page: 1, page_size: 100 })
    dramas.value = result.items || []
  } catch (error: any) {
    console.error('Failed to load dramas:', error)
  }
}

const loadScenes = async (dramaId: string) => {
  try {
    const drama = await dramaAPI.get(dramaId)
    const allScenes: Scene[] = []
    
    if (drama.episodes) {
      for (const episode of drama.episodes) {
        if (episode.scenes) {
          allScenes.push(...episode.scenes)
        }
      }
    }
    
    scenes.value = allScenes
  } catch (error: any) {
    console.error('Failed to load scenes:', error)
  }
}

const onDramaChange = (dramaId: string) => {
  form.scene_id = undefined
  scenes.value = []
  if (dramaId) {
    loadScenes(dramaId)
  }
}

const onSceneChange = (sceneId: number | string | undefined) => {
  if (!sceneId) return

  const scene = scenes.value.find(s => String(s.id) === String(sceneId))
  if (scene && scene.prompt) {
    form.prompt = scene.prompt
  }
}

const handleGenerate = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    generating.value = true
    try {
      const params: GenerateImageRequest = {
        drama_id: form.drama_id,
        prompt: form.prompt,
        provider: form.provider
      }

      if (form.scene_id) {
        params.scene_id = form.scene_id
      }

      if (form.negative_prompt) {
        params.negative_prompt = form.negative_prompt
      }

      if (form.size) {
        params.size = form.size
      }

      if (form.provider === 'openai') {
        if (form.quality) params.quality = form.quality
        if (form.style) params.style = form.style
      }

      if (form.provider === 'stable_diffusion') {
        if (form.steps) params.steps = form.steps
        if (form.cfg_scale) params.cfg_scale = form.cfg_scale
        if (form.seed && form.seed > 0) params.seed = form.seed
      }

      await imageAPI.generateImage(params)
      
      ElMessage.success(t('imageDialog.taskSubmitted'))
      emit('success')
      handleClose()
    } catch (error: any) {
      ElMessage.error(error.message || t('imageDialog.generateFailed'))
    } finally {
      generating.value = false
    }
  })
}

const handleClose = () => {
  visible.value = false
  formRef.value?.resetFields()
}
</script>

<style scoped>
.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: #999;
}
</style>
