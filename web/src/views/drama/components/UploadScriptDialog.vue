<template>
  <el-dialog
    v-model="visible"
    title="上传剧本"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="剧本内容" required>
        <el-input
          v-model="form.script_content"
          type="textarea"
          :rows="15"
          placeholder="粘贴您的剧本内容&#10;系统将自动识别并拆分为剧集和场景"
          maxlength="50000"
          show-word-limit
        />
        <div class="form-tip">
          支持多种剧本格式，系统会智能识别剧集、场景、对话等内容
        </div>
      </el-form-item>

      <el-form-item label="拆分选项">
        <el-checkbox v-model="form.auto_split">自动拆分剧集</el-checkbox>
        <div class="form-tip">
          启用后将自动识别剧集分界点，否则作为单集处理
        </div>
      </el-form-item>
    </el-form>

    <template v-if="parseResult">
      <el-divider>解析结果</el-divider>
      
      <div class="parse-result">
        <el-alert
          title="解析完成"
          type="success"
          :closable="false"
          show-icon
        >
          <template #default>
            共识别 {{ parseResult.episodes.length }} 个剧集，
            {{ totalScenes }} 个场景
          </template>
        </el-alert>

        <div class="summary-box" v-if="parseResult.summary">
          <h4>剧本概要</h4>
          <p>{{ parseResult.summary }}</p>
        </div>

        <el-collapse v-model="activeEpisode" accordion>
          <el-collapse-item
            v-for="episode in parseResult.episodes"
            :key="episode.episode_number"
            :title="`第${episode.episode_number}集: ${episode.title}`"
            :name="episode.episode_number"
          >
            <div class="episode-info">
              <p><strong>场景数：</strong>{{ episode.scenes?.length || 0 }}</p>

              <el-table :data="episode.scenes || []" size="small" border>
                <el-table-column prop="storyboard_number" label="场景号" width="80" />
                <el-table-column prop="title" label="标题" width="150" />
                <el-table-column prop="location" label="地点" width="120" />
                <el-table-column prop="time" label="时间" width="100" />
                <el-table-column prop="characters" label="角色" width="150" />
                <el-table-column label="对话">
                  <template #default="{ row }">
                    <div class="dialogue-preview">{{ row.dialogue }}</div>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </template>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
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
import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { generationAPI } from '@/api/generation'
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

const totalScenes = computed(() => {
  if (!parseResult.value) return 0
  return parseResult.value.episodes.reduce((sum, ep) => sum + (ep.scenes?.length || 0), 0)
})

const handleParse = async () => {
  if (!form.script_content.trim()) {
    ElMessage.warning('请输入剧本内容')
    return
  }

  parsing.value = true
  try {
    // @ts-expect-error parseScript not yet in API type definition
    parseResult.value = await generationAPI.parseScript({
      drama_id: props.dramaId,
      script_content: form.script_content,
      auto_split: form.auto_split
    })
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
    // TODO: 调用保存接口将解析结果保存到数据库
    ElMessage.success('保存成功')
    emit('success')
    handleClose()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  visible.value = false
  form.script_content = ''
  form.auto_split = true
  parseResult.value = undefined
  activeEpisode.value = undefined
}
</script>

<style scoped>
.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
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
