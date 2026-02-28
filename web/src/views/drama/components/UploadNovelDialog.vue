<template>
  <el-dialog
    v-model="visible"
    :title="$t('drama.novel.title')"
    width="900px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- Step 1: Upload & Config -->
    <div v-if="step === 1">
      <el-upload
        drag
        accept=".txt"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
      >
        <el-icon :size="40" style="color: var(--el-color-primary)"><Upload /></el-icon>
        <div class="el-upload__text">{{ $t('drama.novel.dragTip') }}</div>
        <template #tip>
          <div class="el-upload__tip">{{ $t('drama.novel.txtOnly') }}</div>
        </template>
      </el-upload>

      <el-descriptions v-if="fileText" :column="2" border class="mt-4">
        <el-descriptions-item :label="$t('drama.novel.fileName')">{{ fileName }}</el-descriptions-item>
        <el-descriptions-item :label="$t('drama.novel.totalChars')">{{ fileText.length }}</el-descriptions-item>
      </el-descriptions>

      <el-form v-if="fileText" label-width="120px" class="mt-4">
        <el-form-item :label="$t('drama.novel.splitMode')">
          <el-radio-group v-model="splitMode">
            <el-radio value="chapter">{{ $t('drama.novel.byChapter') }}</el-radio>
            <el-radio value="charCount">{{ $t('drama.novel.byCharCount') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="$t('drama.novel.targetChars')">
          <el-input-number v-model="targetChars" :min="1000" :max="10000" :step="500" />
        </el-form-item>
        <el-form-item :label="$t('drama.novel.saveMode')">
          <el-radio-group v-model="saveMode">
            <el-radio value="append">{{ $t('drama.novel.append') }}</el-radio>
            <el-radio value="replace">{{ $t('drama.novel.replace') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-alert
          v-if="saveMode === 'replace' && existingEpisodeCount > 0"
          :title="$t('drama.novel.replaceWarning')"
          type="warning"
          :closable="false"
          show-icon
          class="mb-2"
        />
      </el-form>
    </div>

    <!-- Step 2: Preview -->
    <div v-else class="preview-container">
      <div class="preview-stats">
        <el-tag type="primary">{{ $t('drama.novel.totalChapters', { count: chapters.length }) }}</el-tag>
        <el-tag>{{ $t('drama.novel.totalCharsCount', { count: totalCharsCount }) }}</el-tag>
      </div>
      <div class="preview-body">
        <div class="chapter-list">
          <div
            v-for="(ch, idx) in chapters"
            :key="idx"
            class="chapter-item"
            :class="{ active: selectedIndex === idx }"
            @click="selectedIndex = idx"
          >
            <div class="chapter-item-header">
              <div class="chapter-item-title">
                <span v-if="editingIndex !== idx" @dblclick="startEdit(idx)">{{ ch.title }}</span>
                <el-input
                  v-else
                  v-model="ch.title"
                  size="small"
                  @blur="editingIndex = -1"
                  @keyup.enter="editingIndex = -1"
                />
              </div>
              <el-icon
                class="chapter-item-delete"
                :size="14"
                @click.stop="handleDeleteChapter(idx)"
              ><Close /></el-icon>
            </div>
            <span class="chapter-item-count">{{ $t('drama.novel.charCount', { count: ch.charCount }) }}</span>
          </div>
        </div>
        <div class="chapter-preview">
          <el-input
            v-if="chapters[selectedIndex]"
            type="textarea"
            :model-value="chapters[selectedIndex].content"
            :autosize="{ minRows: 20, maxRows: 30 }"
            @input="handleContentEdit"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <template v-if="step === 1">
        <el-button @click="handleClose">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :disabled="!fileText" @click="handleSplit">
          {{ $t('drama.novel.startSplit') }}
        </el-button>
      </template>
      <template v-else>
        <el-button @click="step = 1">{{ $t('drama.novel.back') }}</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          {{ $t('drama.novel.save') }}
        </el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Upload, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { splitNovel, type ChapterResult, type SplitOptions } from '@/utils/novelSplitter'
import { dramaAPI } from '@/api/drama'

const props = defineProps<{
  modelValue: boolean
  dramaId: string
  existingEpisodeCount: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const { t } = useI18n()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const step = ref(1)
const fileText = ref('')
const fileName = ref('')
const splitMode = ref<SplitOptions['mode']>('chapter')
const targetChars = ref(3000)
const saveMode = ref<'append' | 'replace'>('append')
const chapters = ref<ChapterResult[]>([])
const selectedIndex = ref(0)
const editingIndex = ref(-1)
const saving = ref(false)

const totalCharsCount = computed(() =>
  chapters.value.reduce((sum, ch) => sum + ch.charCount, 0),
)

const startEdit = (idx: number) => {
  editingIndex.value = idx
}

const handleDeleteChapter = (idx: number) => {
  chapters.value.splice(idx, 1)
  if (selectedIndex.value >= chapters.value.length) {
    selectedIndex.value = Math.max(0, chapters.value.length - 1)
  }
}

const handleContentEdit = (val: string) => {
  const ch = chapters.value[selectedIndex.value]
  if (ch) {
    ch.content = val
    ch.charCount = val.length
  }
}

const handleFileChange = (file: any) => {
  const raw = file.raw as File
  if (!raw.name.endsWith('.txt')) {
    ElMessage.warning(t('drama.novel.txtOnly'))
    return
  }
  fileName.value = raw.name
  const reader = new FileReader()
  reader.onload = (e) => {
    fileText.value = (e.target?.result as string) || ''
  }
  reader.readAsText(raw, 'UTF-8')
}

const handleSplit = () => {
  if (!fileText.value) {
    ElMessage.warning(t('drama.novel.noFile'))
    return
  }
  chapters.value = splitNovel(fileText.value, {
    mode: splitMode.value,
    targetChars: targetChars.value,
  })
  selectedIndex.value = 0
  step.value = 2
}

const handleSave = async () => {
  saving.value = true
  try {
    const startNum = saveMode.value === 'append' ? props.existingEpisodeCount : 0
    const episodes = chapters.value.map((ch, idx) => ({
      episode_number: startNum + idx + 1,
      title: ch.title,
      script_content: ch.content,
    }))

    if (saveMode.value === 'append' && props.existingEpisodeCount > 0) {
      const dramaData = await dramaAPI.get(props.dramaId)
      const existing = (dramaData.episodes || []).map((ep: any) => ({
        id: ep.id,
        episode_number: ep.episode_number,
        title: ep.title,
        script_content: ep.script_content,
      }))
      await dramaAPI.saveEpisodes(props.dramaId, [...existing, ...episodes])
    } else {
      await dramaAPI.saveEpisodes(props.dramaId, episodes)
    }

    ElMessage.success(t('drama.novel.saveSuccess'))
    emit('success')
    handleClose()
  } catch (error: any) {
    ElMessage.error(error.message || t('common.failed'))
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  visible.value = false
  step.value = 1
  fileText.value = ''
  fileName.value = ''
  chapters.value = []
  selectedIndex.value = 0
  editingIndex.value = -1
}
</script>

<style scoped>
.mt-4 { margin-top: 16px; }
.mb-2 { margin-bottom: 8px; }

.preview-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.preview-body {
  display: flex;
  gap: 12px;
  height: 450px;
}

.chapter-list {
  width: 220px;
  flex-shrink: 0;
  overflow-y: auto;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.chapter-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background 0.2s;
}

.chapter-item:hover { background: var(--el-fill-color-light); }
.chapter-item.active { background: var(--el-color-primary-light-9); }

.chapter-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.chapter-item-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
  color: var(--el-text-color-primary);
}

.chapter-item-delete {
  flex-shrink: 0;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
}

.chapter-item:hover .chapter-item-delete {
  opacity: 1;
}

.chapter-item-delete:hover {
  color: var(--el-color-danger);
}

.chapter-item-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.chapter-preview {
  flex: 1;
  min-width: 0;
}

.chapter-preview :deep(.el-textarea__inner) {
  height: 100% !important;
  font-size: 13px;
  line-height: 1.8;
}
</style>
