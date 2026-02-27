<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('drama.management.importFromNovel')"
    width="600px"
    :close-on-click-modal="false"
  >
    <!-- 步骤1: 上传文件 -->
    <div v-if="step === 'upload'" class="upload-step">
      <el-upload
        ref="uploadRef"
        class="novel-upload"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".txt,.docx,.pdf"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
        :before-upload="beforeUpload"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          {{ $t('drama.management.dropFileHere') }}
          <em>{{ $t('drama.management.clickToUpload') }}</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            {{ $t('drama.management.supportedFormats') }}: txt, docx, pdf
            <br />
            {{ $t('drama.management.maxFileSize') }}: 10MB
          </div>
        </template>
      </el-upload>

      <div v-if="selectedFile" class="file-info">
        <el-icon><Document /></el-icon>
        <span class="file-name">{{ selectedFile.name }}</span>
        <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
        <el-button type="danger" :icon="Close" circle size="small" @click="handleFileRemove()" />
      </div>

      <div class="dialog-footer">
        <el-button @click="handleClose">{{ $t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          :disabled="!selectedFile"
          :loading="uploading"
          @click="handleUpload"
        >
          {{ $t('drama.management.startParsing') }}
        </el-button>
      </div>
    </div>

    <!-- 步骤2: 解析中 -->
    <div v-else-if="step === 'parsing'" class="parsing-step">
      <el-result
        icon="info"
        :title="$t('drama.management.parsing')"
      >
        <template #sub-title>
          <div class="progress-container">
            <el-progress
              :percentage="progress"
              :status="progressStatus"
              :stroke-width="20"
              style="margin: 20px 0"
            />
            <div class="progress-steps">
              <div
                v-for="(item, index) in progressSteps"
                :key="index"
                class="progress-step"
                :class="{ active: currentStep >= index, completed: currentStep > index }"
              >
                <el-icon v-if="currentStep > index"><Check /></el-icon>
                <span>{{ item }}</span>
              </div>
            </div>
          </div>
        </template>
        <template #extra>
          <el-button type="danger" @click="handleCancel">
            {{ $t('drama.management.cancelParsing') }}
          </el-button>
        </template>
      </el-result>
    </div>

    <!-- 步骤3: 解析完成 -->
    <div v-else-if="step === 'completed'" class="completed-step">
      <el-result
        icon="success"
        :title="$t('drama.management.parseCompleted')"
        :sub-title="`${$t('drama.management.foundEpisodes')}: ${totalEpisodes}`"
      >
        <template #extra>
          <el-button type="primary" @click="handleGoToEpisodes">
            {{ $t('drama.management.viewEpisodes') }}
          </el-button>
          <el-button @click="handleClose">{{ $t('common.close') }}</el-button>
        </template>
      </el-result>
    </div>

    <!-- 步骤4: 解析失败 -->
    <div v-else-if="step === 'failed'" class="failed-step">
      <el-result
        icon="error"
        :title="$t('drama.management.parseFailed')"
        :sub-title="errorMessage"
      >
        <template #extra>
          <el-button type="primary" @click="step = 'upload'">
            {{ $t('drama.management.retry') }}
          </el-button>
          <el-button @click="handleClose">{{ $t('common.close') }}</el-button>
        </template>
      </el-result>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { UploadFilled, Document, Close, Check } from '@element-plus/icons-vue'
import { novelParseAPI, type NovelParseTask } from '@/api/novel-parse'

const props = defineProps<{
  modelValue: boolean
  dramaId?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'completed': [dramaId: number]
}>()

const { t } = useI18n()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 步骤状态
type StepType = 'upload' | 'parsing' | 'completed' | 'failed'
const step = ref<StepType>('upload')

// 文件相关
const selectedFile = ref<File | null>(null)
const uploading = ref(false)

// 任务相关
const taskId = ref('')
const progress = ref(0)
const totalEpisodes = ref(0)
const errorMessage = ref('')
let pollingTimer: number | null = null

// 进度步骤
const progressSteps = computed(() => [
  t('drama.management.stepUploadComplete'),
  t('drama.management.stepAIAnalysis'),
  t('drama.management.stepExtractContent'),
  t('drama.management.stepSaveToDb')
])

const currentStep = computed(() => {
  if (progress.value < 20) return 0
  if (progress.value < 50) return 1
  if (progress.value < 80) return 2
  return 3
})

const progressStatus = computed(() => {
  if (step.value === 'failed') return 'exception'
  if (step.value === 'completed') return 'success'
  return undefined
})

// 监听对话框关闭
watch(dialogVisible, (val) => {
  if (!val) {
    // 重置状态
    setTimeout(() => {
      step.value = 'upload'
      selectedFile.value = null
      taskId.value = ''
      progress.value = 0
      totalEpisodes.value = 0
      errorMessage.value = ''
      stopPolling()
    }, 300)
  }
})

// 文件变化
const handleFileChange = (file: any) => {
  selectedFile.value = file.raw
}

// 移除文件
const handleFileRemove = () => {
  selectedFile.value = null
}

// 上传前检查
const beforeUpload = (file: File) => {
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    ElMessage.error(t('drama.management.fileSizeLimit'))
    return false
  }
  return false // 手动上传
}

// 上传文件
const handleUpload = async () => {
  if (!selectedFile.value) return

  uploading.value = true
  try {
    const res = await novelParseAPI.createTask(
      props.dramaId || null,
      selectedFile.value,
      undefined
    )
    taskId.value = res.task_id

    // 开始解析
    await novelParseAPI.startTask(taskId.value)

    // 开始轮询
    step.value = 'parsing'
    startPolling()
  } catch (error: any) {
    ElMessage.error(error.message || t('drama.management.uploadFailed'))
  } finally {
    uploading.value = false
  }
}

// 轮询任务状态
const startPolling = () => {
  stopPolling()
  pollingTimer = window.setInterval(async () => {
    try {
      const res = await novelParseAPI.getTask(taskId.value)
      const task: NovelParseTask = res

      progress.value = task.progress

      if (task.status === 'completed') {
        step.value = 'completed'
        totalEpisodes.value = task.total_episodes
        stopPolling()
        emit('completed', task.drama_id!)
      } else if (task.status === 'failed') {
        step.value = 'failed'
        errorMessage.value = task.error_message || t('drama.management.unknownError')
        stopPolling()
      } else if (task.status === 'cancelled') {
        step.value = 'upload'
        ElMessage.warning(t('drama.management.taskCancelled'))
        stopPolling()
      }
    } catch (error) {
      console.error('Polling error:', error)
    }
  }, 2000)
}

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// 取消解析
const handleCancel = async () => {
  try {
    await novelParseAPI.cancelTask(taskId.value)
    step.value = 'upload'
    ElMessage.warning(t('drama.management.taskCancelled'))
  } catch (error) {
    ElMessage.error(t('drama.management.cancelFailed'))
  }
}

// 格式化文件大小
const formatFileSize = (size: number) => {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

// 查看章节
const handleGoToEpisodes = () => {
  emit('update:modelValue', false)
  // 跳转到章节管理
}

// 关闭对话框
const handleClose = () => {
  dialogVisible.value = false
}
</script>

<style scoped>
.upload-step {
  padding: 10px 0;
}

.novel-upload {
  width: 100%;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.file-name {
  flex: 1;
  font-weight: 500;
}

.file-size {
  color: var(--el-text-color-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.progress-container {
  padding: 0 40px;
}

.progress-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.progress-step.active {
  color: var(--el-color-primary);
}

.progress-step.completed {
  color: var(--el-color-success);
}
</style>
