<template>
  <!-- Drama Create Page / 创建短剧页面 -->
  <div class="drama-create animate-fade-in">
    <PageHeader
      :title="$t('drama.createNew')"
      :subtitle="$t('drama.createDesc')"
    >
      <template #actions>
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t('common.back') }}
        </el-button>
      </template>
    </PageHeader>

    <!-- Form Card / 表单卡片 -->
    <div class="form-card">
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
            :rows="5"
            :placeholder="$t('drama.projectDescPlaceholder')"
            maxlength="500"
            show-word-limit
            resize="none"
          />
        </el-form-item>

        <div class="form-actions">
          <el-button size="large" @click="goBack">{{ $t('common.cancel') }}</el-button>
            <el-button 
              type="primary" 
              size="large"
              :loading="loading"
              @click="handleSubmit"
            >
              <el-icon v-if="!loading"><Plus /></el-icon>
              {{ $t('drama.create') }}
            </el-button>
          </div>
        </el-form>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { dramaAPI } from '@/api/drama'
import type { CreateDramaRequest } from '@/types/drama'
import { PageHeader } from '@/components/common'

const { t } = useI18n()
const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive<CreateDramaRequest>({
  title: '',
  description: ''
})

const rules: FormRules = {
  title: [
    { required: true, message: () => t('drama.validation.titleRequired'), trigger: 'blur' },
    { min: 1, max: 100, message: () => t('drama.validation.titleLength'), trigger: 'blur' }
  ]
}

// Submit form / 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const drama = await dramaAPI.create(form)
        ElMessage.success(t('common.success'))
        router.push(`/dramas/${drama.id}`)
      } catch (error: any) {
        ElMessage.error(error.message || t('common.failed'))
      } finally {
        loading.value = false
      }
    }
  })
}

// Go back / 返回上一页
const goBack = () => {
  router.back()
}
</script>

<style scoped>
/* ========================================
   Page Layout / 页面布局
   ======================================== */
.drama-create {
  max-width: 640px;
  margin: 0 auto;
}

/* ========================================
   Form Card / 表单卡片
   ======================================== */
.form-card {
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

/* ========================================
   Form Styles / 表单样式 - 紧凑内边距
   ======================================== */
.create-form {
  padding: var(--space-4);
}

.create-form :deep(.el-form-item) {
  margin-bottom: var(--space-4);
}

/* ========================================
   Form Actions / 表单操作区
   ======================================== */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-primary);
  margin-top: var(--space-2);
}

.form-actions .el-button {
  min-width: 100px;
}
</style>
