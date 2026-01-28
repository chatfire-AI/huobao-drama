<template>
  <!-- Unified Drama Project Dialog / 统一短剧项目弹窗 -->
  <el-dialog
    v-model="visible"
    :title="isEdit ? $t('drama.editProject') : $t('drama.createNew')"
    width="520px"
    :close-on-click-modal="false"
    class="drama-project-dialog"
    @closed="handleClosed"
    @open="handleOpen"
  >
    <div v-if="!isEdit" class="dialog-desc">{{ $t('drama.createDesc') }}</div>
    
    <el-form 
      ref="formRef" 
      :model="form" 
      :rules="rules" 
      label-position="top"
      class="project-form"
      v-loading="loading"
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
            <el-select v-model="form.default_image_ratio" :placeholder="$t('drama.selectRatio')">
              <el-option 
                v-for="opt in visualOptions.Ratios?.Image || []" 
                :key="opt.Value" 
                :label="opt.Label" 
                :value="opt.Value" 
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="$t('drama.defaultVideoRatio')" prop="default_video_ratio">
            <el-select v-model="form.default_video_ratio" :placeholder="$t('drama.selectRatio')">
              <el-option 
                v-for="opt in visualOptions.Ratios?.Video || []" 
                :key="opt.Value" 
                :label="opt.Label" 
                :value="opt.Value" 
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item :label="$t('drama.defaultStyle')" prop="default_style">
        <el-input 
          v-model="form.default_style" 
          type="textarea" 
          :rows="2"
          :placeholder="$t('drama.defaultStylePlaceholder')"
        />
      </el-form-item>

      <el-collapse>
        <el-collapse-item :title="$t('drama.advancedStyleSettings')" name="1">
          <el-form-item :label="$t('drama.defaultRoleStyle')" prop="default_role_style">
            <el-input v-model="form.default_role_style" type="textarea" :rows="2" :placeholder="$t('drama.roleStylePlaceholder')" />
          </el-form-item>
          <el-form-item :label="$t('drama.defaultSceneStyle')" prop="default_scene_style">
            <el-input v-model="form.default_scene_style" type="textarea" :rows="2" :placeholder="$t('drama.sceneStylePlaceholder')" />
          </el-form-item>
          <el-form-item :label="$t('drama.defaultPropStyle')" prop="default_prop_style">
            <el-input v-model="form.default_prop_style" type="textarea" :rows="2" :placeholder="$t('drama.propStylePlaceholder')" />
          </el-form-item>
          
          <el-row :gutter="20">
             <el-col :span="8">
                <el-form-item :label="$t('drama.defaultRoleRatio')" prop="default_role_ratio">
                  <el-select v-model="form.default_role_ratio" :placeholder="$t('drama.defaultOption')">
                    <el-option :label="$t('drama.defaultOption')" value="" />
                    <el-option 
                      v-for="opt in visualOptions.Ratios?.Role || []" 
                      :key="opt.Value" 
                      :label="opt.Label" 
                      :value="opt.Value" 
                    />
                  </el-select>
                </el-form-item>
             </el-col>
             <el-col :span="8">
                <el-form-item :label="$t('drama.defaultPropRatio')" prop="default_prop_ratio">
                  <el-select v-model="form.default_prop_ratio" :placeholder="$t('drama.defaultOption')">
                    <el-option :label="$t('drama.defaultOption')" value="" />
                    <el-option 
                      v-for="opt in visualOptions.Ratios?.Prop || []" 
                      :key="opt.Value" 
                      :label="opt.Label" 
                      :value="opt.Value" 
                    />
                  </el-select>
                </el-form-item>
             </el-col>
             <el-col :span="8">
                <el-form-item :label="$t('drama.defaultImageSize')" prop="default_image_size">
                   <el-select v-model="form.default_image_size" :placeholder="$t('drama.defaultOption')">
                      <el-option :label="$t('drama.defaultOption')" value="" />
                      <el-option 
                        v-for="opt in visualOptions.ImageSizes || []" 
                        :key="opt.Value" 
                        :label="opt.Label" 
                        :value="opt.Value" 
                      />
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
          :loading="submitting"
          @click="handleSubmit"
        >
          <el-icon v-if="!submitting"><Plus v-if="!isEdit" /><Edit v-else /></el-icon>
          {{ isEdit ? $t('common.save') : $t('drama.createNew') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Edit } from '@element-plus/icons-vue'
import { dramaAPI } from '@/api/drama'
import { optionAPI, type VisualOptions } from '@/api/option'
import type { CreateDramaRequest } from '@/types/drama'
import { useI18n } from 'vue-i18n'

/**
 * DramaProjectDialog - Unified dialog for creating and editing drama projects
 * 统一短剧项目弹窗 - 用于创建和编辑短剧项目
 */
const props = defineProps<{
  modelValue: boolean
  dramaId?: string // If provided, mode is 'edit'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'created': [id: string]
  'updated': [id: string]
}>()

const router = useRouter()
const { locale } = useI18n()
const formRef = ref<FormInstance>()
const loading = ref(false) // Loading initial data
const submitting = ref(false) // Submitting form
const visualOptions = ref<Partial<VisualOptions>>({})

const isEdit = computed(() => !!props.dramaId)

// v-model binding
const visible = ref(props.modelValue)
watch(() => props.modelValue, (val) => {
  visible.value = val
})
watch(visible, (val) => {
  emit('update:modelValue', val)
})

// Form data
const form = reactive<CreateDramaRequest & { default_style: string }>({
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

// Validation rules
const rules: FormRules = {
  title: [
    { required: true, message: '请输入项目标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' }
  ]
}
// Fetch options
const fetchOptions = async () => {
  try {
    const res = await optionAPI.getVisualOptions(locale.value)
    visualOptions.value = res
  } catch (error) {
    console.error('Failed to load visual options', error)
  }
}

// Reset form
const resetForm = () => {
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

// Handle dialog open
const handleOpen = async () => {
  await fetchOptions() // Fetch options first
  
  if (isEdit.value && props.dramaId) {
    loading.value = true
    try {
      const drama = await dramaAPI.get(props.dramaId)
      form.title = drama.title
      form.description = drama.description || ''
      form.default_style = drama.default_style || ''
      form.default_image_ratio = drama.default_image_ratio || '16:9'
      form.default_video_ratio = drama.default_video_ratio || '16:9'
      form.default_role_style = drama.default_role_style || ''
      form.default_scene_style = drama.default_scene_style || ''
      form.default_prop_style = drama.default_prop_style || ''
      form.default_role_ratio = drama.default_role_ratio || ''
      form.default_prop_ratio = drama.default_prop_ratio || ''
      form.default_image_size = drama.default_image_size || ''
    } catch (error: any) {
      ElMessage.error(error.message || '加载项目详情失败')
      handleClose()
    } finally {
      loading.value = false
    }
  } else {
    resetForm()
  }
}

// Reset on close
const handleClosed = () => {
  resetForm()
  loading.value = false
  submitting.value = false
}

// Close dialog
const handleClose = () => {
  visible.value = false
}

// Submit form
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEdit.value && props.dramaId) {
          await dramaAPI.update(props.dramaId, form)
          ElMessage.success('更新成功')
          visible.value = false
          emit('updated', props.dramaId)
        } else {
          const drama = await dramaAPI.create(form)
          ElMessage.success('创建成功')
          visible.value = false
          emit('created', drama.id)
          // Only navigate on create
          router.push(`/dramas/${drama.id}`)
        }
      } catch (error: any) {
        ElMessage.error(error.message || (isEdit.value ? '更新失败' : '创建失败'))
      } finally {
        submitting.value = false
      }
    }
  })
}
</script>

<style scoped>
/* ========================================
   Dialog Styles / 弹窗样式
   ======================================== */
.drama-project-dialog :deep(.el-dialog) {
  border-radius: var(--radius-xl);
}

.drama-project-dialog :deep(.el-dialog__header) {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-primary);
  margin-right: 0;
}

.drama-project-dialog :deep(.el-dialog__title) {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.drama-project-dialog :deep(.el-dialog__body) {
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
.project-form :deep(.el-form-item) {
  margin-bottom: 1.25rem;
}

.project-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.project-form :deep(.el-input__wrapper),
.project-form :deep(.el-textarea__inner) {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 1px var(--border-primary) inset;
  transition: all var(--transition-fast);
}

.project-form :deep(.el-input__wrapper:hover),
.project-form :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px var(--border-secondary) inset;
}

.project-form :deep(.el-input__wrapper.is-focus),
.project-form :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 2px var(--accent) inset;
}

.project-form :deep(.el-input__inner),
.project-form :deep(.el-textarea__inner) {
  color: var(--text-primary);
}

.project-form :deep(.el-input__inner::placeholder),
.project-form :deep(.el-textarea__inner::placeholder) {
  color: var(--text-muted);
}

.project-form :deep(.el-input__count) {
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
