<template>
  <el-dialog
    v-model="visible"
    title="AI 视频生成"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
      <el-form-item label="选择剧本" prop="drama_id">
        <el-select v-model="form.drama_id" placeholder="选择剧本" @change="onDramaChange">
          <el-option
            v-for="drama in dramas"
            :key="drama.id"
            :label="drama.title"
            :value="drama.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="选择图片" prop="image_gen_id">
        <el-select
          v-model="form.image_gen_id"
          placeholder="选择已生成的图片"
          clearable
          @change="onImageChange"
        >
          <el-option
            v-for="image in images"
            :key="image.id"
            :label="truncateText(image.prompt, 50)"
            :value="image.id"
          >
            <div class="image-option">
              <img v-if="image.image_url" :src="image.image_url" class="image-thumb" />
              <span>{{ truncateText(image.prompt, 40) }}</span>
            </div>
          </el-option>
        </el-select>
        <div class="form-tip">或直接输入图片 URL</div>
      </el-form-item>

      <el-form-item label="图片 URL" prop="image_url">
        <el-input
          v-model="form.image_url"
          placeholder="https://example.com/image.jpg"
          :disabled="!!form.image_gen_id"
        />
      </el-form-item>

      <el-form-item label="视频提示词" prop="prompt">
        <el-input
          v-model="form.prompt"
          type="textarea"
          :rows="5"
          placeholder="描述视频中的动作和运镜&#10;例如：Camera slowly zooms in, wind blowing through hair, cinematic lighting"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="AI 服务">
        <el-select v-model="form.provider" placeholder="选择服务">
          <el-option label="豆包视频" value="doubao" />
          <el-option label="Runway" value="runway" />
          <el-option label="Pika" value="pika" />
        </el-select>
      </el-form-item>

      <el-form-item label="视频时长">
        <el-slider
          v-model="form.duration"
          :min="3"
          :max="10"
          :marks="durationMarks"
          show-stops
        />
        <span class="slider-value">{{ form.duration }} 秒</span>
      </el-form-item>

      <el-form-item label="宽高比">
        <el-radio-group v-model="form.aspect_ratio">
          <el-radio label="16:9">16:9 (横屏)</el-radio>
          <el-radio label="9:16">9:16 (竖屏)</el-radio>
          <el-radio label="1:1">1:1 (方形)</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-collapse>
        <el-collapse-item title="高级设置" name="advanced">
          <el-form-item label="运动强度">
            <el-slider
              v-model="form.motion_level"
              :min="0"
              :max="100"
              :marks="motionMarks"
            />
            <span class="slider-value">{{ form.motion_level }}</span>
          </el-form-item>

          <el-form-item label="镜头运动">
            <el-select v-model="form.camera_motion" placeholder="选择镜头运动" clearable>
              <el-option label="静止" value="static" />
              <el-option label="推进 (Zoom In)" value="zoom_in" />
              <el-option label="拉远 (Zoom Out)" value="zoom_out" />
              <el-option label="左移 (Pan Left)" value="pan_left" />
              <el-option label="右移 (Pan Right)" value="pan_right" />
              <el-option label="上移 (Tilt Up)" value="tilt_up" />
              <el-option label="下移 (Tilt Down)" value="tilt_down" />
              <el-option label="环绕 (Orbit)" value="orbit" />
            </el-select>
          </el-form-item>

          <el-form-item label="风格" v-if="form.provider === 'doubao'">
            <el-input v-model="form.style" placeholder="例如：电影级、动画风格" />
          </el-form-item>

          <el-form-item label="随机种子">
            <el-input-number v-model="form.seed" :min="-1" placeholder="留空随机" />
            <span class="form-tip">设置相同种子可复现视频</span>
          </el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="generating" @click="handleGenerate">
        生成视频
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { videoAPI } from '@/api/video'
import { imageAPI } from '@/api/image'
import { dramaAPI } from '@/api/drama'
import type { Drama } from '@/types/drama'
import type { ImageGeneration } from '@/types/image'
import type { GenerateVideoRequest } from '@/types/video'

interface Props {
  modelValue: boolean
  dramaId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref<FormInstance>()
const generating = ref(false)
const dramas = ref<Drama[]>([])
const images = ref<ImageGeneration[]>([])

const form = reactive<GenerateVideoRequest & { image_gen_id?: number }>({
  drama_id: props.dramaId || '',
  image_gen_id: undefined,
  image_url: '',
  prompt: '',
  provider: 'doubao',
  duration: 5,
  aspect_ratio: '16:9',
  motion_level: 50,
  camera_motion: undefined,
  style: undefined,
  seed: undefined
})

const rules: FormRules = {
  drama_id: [
    { required: true, message: '请选择剧本', trigger: 'change' }
  ],
  prompt: [
    { required: true, message: '请输入视频提示词', trigger: 'blur' },
    { min: 5, message: '提示词至少5个字符', trigger: 'blur' }
  ]
}

const durationMarks = {
  3: '3s',
  5: '5s',
  7: '7s',
  10: '10s'
}

const motionMarks = {
  0: '静态',
  50: '适中',
  100: '剧烈'
}

watch(() => props.modelValue, (val) => {
  if (val) {
    loadDramas()
    if (props.dramaId) {
      form.drama_id = props.dramaId
      loadImages(props.dramaId)
    }
  }
})

const loadDramas = async () => {
  try {
    const result = await dramaAPI.list({ page: 1, page_size: 100 })
    dramas.value = result.items
  } catch (error: any) {
    console.error('Failed to load dramas:', error)
  }
}

const loadImages = async (dramaId: string) => {
  try {
    const result = await imageAPI.listImages({
      drama_id: dramaId,
      status: 'completed',
      page: 1,
      page_size: 100
    })
    images.value = result.items
  } catch (error: any) {
    console.error('Failed to load images:', error)
  }
}

const onDramaChange = (dramaId: string) => {
  form.image_gen_id = undefined
  form.image_url = ''
  images.value = []
  if (dramaId) {
    loadImages(dramaId)
  }
}

const onImageChange = (imageGenId: number | undefined) => {
  if (!imageGenId) {
    form.image_url = ''
    return
  }
  
  const image = images.value.find(img => img.id === imageGenId)
  if (image && image.image_url) {
    form.image_url = image.image_url
    form.prompt = image.prompt
  }
}

const truncateText = (text: string, length: number) => {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

const handleGenerate = async () => {
  console.log('handleGenerate called')
  
  if (!formRef.value) {
    console.error('formRef is null')
    ElMessage.error('表单初始化失败，请刷新页面重试')
    return
  }

  try {
    const valid = await formRef.value.validate()
    console.log('Form validation result:', valid)
    
    if (!valid) {
      console.log('Form validation failed')
      return
    }

    generating.value = true
    console.log('Starting video generation...', form)
    
    try {
      if (form.image_gen_id) {
        console.log('Generating from image:', form.image_gen_id)
        await videoAPI.generateFromImage(form.image_gen_id)
      } else {
        const params: GenerateVideoRequest = {
          drama_id: form.drama_id,
          prompt: form.prompt,
          provider: form.provider
        }

        // 判断参考图模式
        if (form.image_url && form.image_url.trim()) {
          params.image_url = form.image_url
          params.reference_mode = 'single'
        } else {
          // 纯文本生成，无参考图
          params.reference_mode = 'none'
        }

        if (form.duration) params.duration = form.duration
        if (form.aspect_ratio) params.aspect_ratio = form.aspect_ratio
        if (form.motion_level !== undefined) params.motion_level = form.motion_level
        if (form.camera_motion) params.camera_motion = form.camera_motion
        if (form.style) params.style = form.style
        if (form.seed && form.seed > 0) params.seed = form.seed

        console.log('Generating video with params:', params)
        await videoAPI.generateVideo(params)
      }
      
      ElMessage.success('视频生成任务已提交，请稍后查看结果')
      emit('success')
      handleClose()
    } catch (error: any) {
      console.error('Video generation failed:', error)
      ElMessage.error(error.response?.data?.message || error.message || '生成失败')
    } finally {
      generating.value = false
    }
  } catch (error: any) {
    console.error('Form validation error:', error)
    ElMessage.warning('请检查表单填写是否完整')
  }
}

const handleClose = () => {
  visible.value = false
  formRef.value?.resetFields()
}
</script>

<style scoped>
.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.slider-value {
  margin-left: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #409eff;
}

.image-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}
</style>
