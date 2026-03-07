<template>
  <el-dialog
    v-model="visible"
    title="上传剧本"
    width="800px"
    :close-on-click-modal="false"
    :before-close="beforeDialogClose"
    @close="handleClose"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="剧本内容" required>
        <el-input
          v-model="form.script_content"
          type="textarea"
          :rows="15"
          placeholder="粘贴剧本内容，系统会尝试自动拆分集数和场景"
          maxlength="50000"
          show-word-limit
        />
        <div class="meta-row">
          <span class="form-tip">共 {{ scriptStats.lines }} 行 / {{ scriptStats.chars }} 字</span>
          <span class="form-tip">建议按段落换行，便于自动拆分</span>
        </div>
      </el-form-item>

      <el-form-item label="拆分选项">
        <el-checkbox v-model="form.auto_split">自动拆分剧集</el-checkbox>
        <div class="form-tip">关闭后将按单集导入</div>
      </el-form-item>
    </el-form>

    <template v-if="parseResult">
      <el-divider>解析结果</el-divider>

      <div class="parse-result">
        <el-alert title="解析完成" type="success" :closable="false" show-icon>
          <template #default>
            共识别 {{ parseResult.episodes.length }} 个剧集，{{ totalScenes }} 个场景
          </template>
        </el-alert>

        <div class="summary-box" v-if="parseResult.summary">
          <h4>剧本概要</h4>
          <p>{{ parseResult.summary }}</p>
        </div>

        <el-collapse v-model="activeEpisode" accordion>
          <el-collapse-item
            v-for="episode in normalizedEpisodes"
            :key="episode.episode_number"
            :title="`第${episode.episode_number}集 ${episode.title || ''}`"
            :name="episode.episode_number"
          >
            <div class="episode-info">
              <p><strong>场景数：</strong>{{ episode.scenes.length }}</p>

              <el-table :data="episode.scenes" size="small" border>
                <el-table-column prop="storyboard_number" label="场景号" width="80" />
                <el-table-column prop="title" label="标题" width="180" />
                <el-table-column prop="location" label="地点" width="120" />
                <el-table-column prop="time" label="时间" width="100" />
                <el-table-column label="内容">
                  <template #default="{ row }">
                    <div class="dialogue-preview">{{ row.dialogue || '-' }}</div>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </template>

    <template #footer>
      <el-button @click="requestClose">取消</el-button>
      <el-button v-if="!parseResult" type="primary" @click="handleParse" :loading="parsing">
        解析剧本
      </el-button>
      <el-button v-else type="success" @click="handleSave" :loading="saving">
        保存到项目
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { generationAPI } from '@/api/generation'
import { dramaAPI } from '@/api/drama'
import type { ParseScriptResult } from '@/types/generation'

interface Props {
  modelValue: boolean
  dramaId: string
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

const form = reactive({
  script_content: '',
  auto_split: true
})

const parsing = ref(false)
const saving = ref(false)
const parseResult = ref<ParseScriptResult>()
const activeEpisode = ref<number>()
const draftKey = computed(() => `huobao:script-draft:${props.dramaId}`)

const scriptStats = computed(() => {
  const content = form.script_content || ''
  const lines = content ? content.split(/\r?\n/).filter((line) => line.trim()).length : 0
  return {
    lines,
    chars: content.length
  }
})

const normalizedEpisodes = computed(() => {
  if (!parseResult.value) return []
  return parseResult.value.episodes.map((episode) => ({
    ...episode,
    scenes: episode.scenes || []
  }))
})

const totalScenes = computed(() => {
  return normalizedEpisodes.value.reduce((sum, ep) => sum + ep.scenes.length, 0)
})

watch(
  () => form.script_content,
  (val) => {
    if (val) {
      localStorage.setItem(draftKey.value, val)
    } else {
      localStorage.removeItem(draftKey.value)
    }
  }
)

watch(
  () => visible.value,
  (open) => {
    if (!open) return
    const draft = localStorage.getItem(draftKey.value)
    if (draft && !form.script_content) {
      form.script_content = draft
    }
  },
  { immediate: true }
)

const handleParse = async () => {
  if (!form.script_content.trim()) {
    ElMessage.warning('请输入剧本内容')
    return
  }

  parsing.value = true
  try {
    parseResult.value = await generationAPI.parseScript({
      drama_id: props.dramaId,
      script_content: form.script_content,
      auto_split: form.auto_split
    })
    activeEpisode.value = parseResult.value.episodes[0]?.episode_number
    ElMessage.success('剧本解析成功')
  } catch (error: any) {
    ElMessage.error(error.message || '解析失败')
  } finally {
    parsing.value = false
  }
}

const handleSave = async () => {
  if (!parseResult.value) return

  saving.value = true
  try {
    const episodes = normalizedEpisodes.value.map((episode) => ({
      episode_number: episode.episode_number,
      title: episode.title || `第${episode.episode_number}集`,
      description: episode.description || '',
      script_content: episode.script_content || ''
    }))

    await dramaAPI.saveEpisodes(props.dramaId, episodes)

    ElMessage.success('保存成功')
    localStorage.removeItem(draftKey.value)
    emit('success')
    resetForm()
    visible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const hasUnsavedData = computed(() => {
  return !!form.script_content.trim() || !!parseResult.value
})

const requestClose = async () => {
  if (!hasUnsavedData.value) {
    resetForm()
    visible.value = false
    return true
  }

  try {
    await ElMessageBox.confirm('当前内容尚未保存，确认关闭吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确认关闭',
      cancelButtonText: '继续编辑'
    })
    resetForm()
    visible.value = false
    return true
  } catch {
    return false
  }
}

const beforeDialogClose = async (done: () => void) => {
  const canClose = await requestClose()
  if (canClose) done()
}

const resetForm = () => {
  form.script_content = ''
  form.auto_split = true
  parseResult.value = undefined
  activeEpisode.value = undefined
}

const handleClose = () => {
  resetForm()
}
</script>

<style scoped>
.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.parse-result {
  margin-top: 20px;
}

.summary-box {
  margin: 20px 0;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.summary-box h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #303133;
}

.summary-box p {
  margin: 0;
  line-height: 1.6;
  color: #606266;
}

.episode-info {
  padding: 10px 0;
}

.dialogue-preview {
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  font-size: 12px;
  line-height: 1.5;
}

:deep(.el-collapse-item__header) {
  font-weight: 500;
  color: #303133;
}
</style>
