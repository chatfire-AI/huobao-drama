<template>
  <!-- Create Drama Dialog / 创建短剧弹窗 -->
  <el-dialog
    v-model="visible"
    :title="$t('drama.createNew')"
    width="520px"
    :close-on-click-modal="false"
    class="create-dialog"
    @closed="handleClosed"
  >
    <div class="dialog-desc">{{ $t('drama.createDesc') }}</div>
    
    <el-form 
      ref="formRef" 
      :model="form" 
      :rules="rules" 
      label-position="top"
      class="create-form"
      @submit.prevent="handleSubmit"
    >
      <el-form-item :label="$t('drama.projectName')" prop="title" required>
        <el-input 
          v-model="form.title" 
          :placeholder="$t('drama.projectNamePlaceholder')"
          size="large"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item :label="$t('drama.projectDesc')" prop="description">
        <el-input 
          v-model="form.description" 
          type="textarea" 
          :rows="4"
          :placeholder="$t('drama.projectDescPlaceholder')"
          maxlength="500"
          show-word-limit
          resize="none"
        />
      </el-form-item>

      <el-divider content-position="left">{{ $t('drama.styleSettings') }}</el-divider>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item :label="$t('drama.defaultImageRatio')" prop="default_image_ratio">
            <el-select v-model="form.default_image_ratio" placeholder="Select ratio">
              <el-option label="16:9" value="16:9" />
              <el-option label="9:16" value="9:16" />
              <el-option label="1:1" value="1:1" />
              <el-option label="4:3" value="4:3" />
              <el-option label="3:4" value="3:4" />
              <el-option label="21:9" value="21:9" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="$t('drama.defaultVideoRatio')" prop="default_video_ratio">
            <el-select v-model="form.default_video_ratio" placeholder="Select ratio">
              <el-option label="16:9" value="16:9" />
              <el-option label="9:16" value="9:16" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item :label="$t('drama.defaultStyle')" prop="default_style">
        <el-input 
          v-model="form.default_style" 
          type="textarea" 
          :rows="2"
          placeholder="Global style prompt (e.g. Anime, Realistic)"
        />
      </el-form-item>

      <el-collapse>
        <el-collapse-item :title="$t('drama.advancedStyleSettings')" name="1">
          <el-form-item :label="$t('drama.defaultRoleStyle')" prop="default_role_style">
            <el-input v-model="form.default_role_style" type="textarea" :rows="2" placeholder="Specific style for characters" />
          </el-form-item>
          <el-form-item :label="$t('drama.defaultSceneStyle')" prop="default_scene_style">
            <el-input v-model="form.default_scene_style" type="textarea" :rows="2" placeholder="Specific style for scenes" />
          </el-form-item>
          <el-form-item :label="$t('drama.defaultPropStyle')" prop="default_prop_style">
            <el-input v-model="form.default_prop_style" type="textarea" :rows="2" placeholder="Specific style for props" />
          </el-form-item>
          
          <el-row :gutter="20">
             <el-col :span="8">
                <el-form-item :label="$t('drama.defaultRoleRatio')" prop="default_role_ratio">
                  <el-select v-model="form.default_role_ratio" placeholder="Default">
                    <el-option label="Default" value="" />
                    <el-option label="1:1" value="1:1" />
                    <el-option label="9:16" value="9:16" />
                    <el-option label="3:4" value="3:4" />
                  </el-select>
                </el-form-item>
             </el-col>
             <el-col :span="8">
                <el-form-item :label="$t('drama.defaultPropRatio')" prop="default_prop_ratio">
                  <el-select v-model="form.default_prop_ratio" placeholder="Default">
                    <el-option label="Default" value="" />
                    <el-option label="1:1" value="1:1" />
                    <el-option label="4:3" value="4:3" />
                  </el-select>
                </el-form-item>
             </el-col>
             <el-col :span="8">
                <el-form-item :label="$t('drama.defaultImageSize')" prop="default_image_size">
                   <el-select v-model="form.default_image_size" placeholder="Default">
                      <el-option label="Default" value="" />
                      <el-option label="256x256" value="256x256" />
                      <el-option label="512x512" value="512x512" />
                      <el-option label="1024x1024" value="1024x1024" />
                      <el-option label="1280x720" value="1280x720" />
                      <el-option label="720x1280" value="720x1280" />
                      <el-option label="1920x1080" value="1920x1080" />
                      <el-option label="2560x1440" value="2560x1440" />
                   </el-select>
                </el-form-item>
             </el-col>
          </el-row>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button size="large" @click="handleClose">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button 
          type="primary" 
          size="large"
          :loading="loading"
          @click="handleSubmit"
        >
          <el-icon v-if="!loading"><Plus /></el-icon>
          {{ $t('drama.createNew') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { dramaAPI } from '@/api/drama'
import type { CreateDramaRequest } from '@/types/drama'

/**
 * CreateDramaDialog - Reusable dialog for creating new drama projects
 * 创建短剧弹窗 - 可复用的创建短剧项目弹窗
 */
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'created': [id: string]
}>()

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)

// v-model binding / 双向绑定
const visible = ref(props.modelValue)
watch(() => props.modelValue, (val) => {
  visible.value = val
})
watch(visible, (val) => {
  emit('update:modelValue', val)
})

// Form data / 表单数据
const form = reactive<CreateDramaRequest>({
  title: '',
  description: '',
  default_style: '',
  default_image_ratio: '16:9',
  default_video_ratio: '16:9',
  default_role_style: '',
  default_scene_style: '',
  default_prop_style: '',
  default_role_ratio: '',
  default_prop_ratio: '',
  default_image_size: ''
})

// Validation rules / 验证规则
const rules: FormRules = {
  title: [
    { required: true, message: '请输入项目标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' }
  ]
}

// Reset form when dialog closes / 关闭时重置表单
const handleClosed = () => {
  form.title = ''
  form.description = ''
  form.default_style = ''
  form.default_image_ratio = '16:9'
  form.default_video_ratio = '16:9'
  form.default_role_style = ''
  form.default_scene_style = ''
  form.default_prop_style = ''
  form.default_role_ratio = ''
  form.default_prop_ratio = ''
  form.default_image_size = ''
  formRef.value?.resetFields()
}

// Close dialog / 关闭弹窗
const handleClose = () => {
  visible.value = false
}

// Submit form / 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const drama = await dramaAPI.create(form)
        ElMessage.success('创建成功')
        visible.value = false
        emit('created', drama.id)
        // Navigate to drama detail page / 跳转到短剧详情页
        router.push(`/dramas/${drama.id}`)
      } catch (error: any) {
        ElMessage.error(error.message || '创建失败')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
/* ========================================
   Dialog Styles / 弹窗样式
   ======================================== */
.create-dialog :deep(.el-dialog) {
  border-radius: var(--radius-xl);
}

.create-dialog :deep(.el-dialog__header) {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-primary);
  margin-right: 0;
}

.create-dialog :deep(.el-dialog__title) {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.create-dialog :deep(.el-dialog__body) {
  padding: 1.5rem;
}

.dialog-desc {
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* ========================================
   Form Styles / 表单样式
   ======================================== */
.create-form :deep(.el-form-item) {
  margin-bottom: 1.25rem;
}

.create-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.create-form :deep(.el-input__wrapper),
.create-form :deep(.el-textarea__inner) {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 1px var(--border-primary) inset;
  transition: all var(--transition-fast);
}

.create-form :deep(.el-input__wrapper:hover),
.create-form :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px var(--border-secondary) inset;
}

.create-form :deep(.el-input__wrapper.is-focus),
.create-form :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 2px var(--accent) inset;
}

.create-form :deep(.el-input__inner),
.create-form :deep(.el-textarea__inner) {
  color: var(--text-primary);
}

.create-form :deep(.el-input__inner::placeholder),
.create-form :deep(.el-textarea__inner::placeholder) {
  color: var(--text-muted);
}

.create-form :deep(.el-input__count) {
  color: var(--text-muted);
  background: transparent;
}

/* ========================================
   Footer Styles / 底部样式
   ======================================== */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.dialog-footer .el-button {
  min-width: 100px;
}
</style>
