<template>
  <div class="storyboard-editor">
    <!-- 左侧分镜列表 -->
    <div class="left-panel">
      <div class="panel-header">
        <div class="header-left">
          <el-button :icon="ArrowLeft" size="small" text @click="handleBack">返回</el-button>
          <h3>分镜列表</h3>
        </div>
        <el-tag type="success" size="small">{{ storyboards.length }} 个镜头</el-tag>
      </div>
      <div class="scene-list">
        <div
          v-for="(shot, index) in storyboards"
          :key="shot.id || index"
          class="scene-item"
          :class="{ active: currentShotIndex === index }"
          @click="selectShot(index)"
        >
          <div class="scene-number">{{ shot.storyboard_number }}</div>
          <div class="scene-content">
            <div class="scene-title">
              <el-tag size="small" type="info">{{ shot.shot_type }}</el-tag>
              <span class="time-location">{{ shot.time }} · {{ shot.location }}</span>
            </div>
            <div class="scene-desc">{{ shot.action }}</div>
          </div>
          <div class="scene-thumb" v-if="shot.background_url">
            <el-image :src="shot.background_url" fit="cover" />
          </div>
        </div>
      </div>
    </div>

    <!-- 中间预览区 -->
    <div class="center-panel">
      <div class="preview-header">
        <div class="header-info">
          <el-tag type="info">镜头 {{ currentShot?.storyboard_number || '-' }}</el-tag>
          <span class="shot-type">{{ currentShot?.shot_type }}</span>
        </div>
        <div class="header-actions">
          <el-button-group>
            <el-button :icon="VideoPlay" size="small" v-if="currentShot?.video_url">预览</el-button>
            <el-button :icon="Refresh" size="small" @click="handleRegenerateShot">重新生成</el-button>
            <el-button :icon="Download" size="small">导出</el-button>
          </el-button-group>
        </div>
      </div>
      
      <div class="preview-area">
        <div class="preview-container">
          <!-- 视频预览优先 -->
          <div v-if="currentShot?.video_url" class="preview-video">
            <video :src="currentShot.video_url" controls style="max-width: 100%; max-height: 100%;" />
          </div>
          <!-- 背景图预览 -->
          <div v-else-if="currentShot?.background_url" class="preview-image">
            <el-image :src="currentShot.background_url" fit="contain" />
          </div>
          <!-- 占位符 -->
          <div v-else class="preview-placeholder">
            <el-icon :size="60"><Picture /></el-icon>
            <p>暂无预览</p>
            <p class="hint">请先生成背景图或视频</p>
          </div>
        </div>
      </div>

      <!-- 底部时间线 -->
      <div class="timeline-panel">
        <div class="timeline-header">
          <div class="timeline-tools">
            <el-button-group size="small">
              <el-button :icon="VideoPlay">播放</el-button>
              <el-button :icon="VideoPause">暂停</el-button>
            </el-button-group>
            <span class="timecode">00:00:00 / 00:{{ formatDuration(storyboards.length * 3) }}</span>
          </div>
          <div class="timeline-zoom">
            <el-slider v-model="timelineZoom" :min="1" :max="10" :show-tooltip="false" style="width: 100px;" />
          </div>
        </div>
        <div class="timeline-track">
          <div class="timeline-ruler">
            <div 
              v-for="i in Math.ceil(storyboards.length / 5)" 
              :key="i" 
              class="ruler-mark"
              :style="{ left: `${(i - 1) * 300 + 30}px` }"
            >
              <span>{{ i * 5 }}</span>
            </div>
          </div>
          <div class="timeline-clips">
            <div
              v-for="(shot, index) in storyboards"
              :key="shot.id || index"
              class="timeline-clip"
              :class="{ active: currentShotIndex === index }"
              @click="selectShot(index)"
            >
              <div class="clip-content">
                <span class="clip-number">{{ shot.storyboard_number }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧参数面板 -->
    <div class="right-panel">
      <el-tabs v-model="activeTab" class="panel-tabs">
        <el-tab-pane label="基础信息" name="info">
          <div class="param-section" v-if="currentShot">
            <div class="param-group">
              <label>镜号</label>
              <el-input :model-value="currentShot.storyboard_number" disabled size="small" />
            </div>
            <div class="param-group">
              <label>景别</label>
              <el-select v-model="currentShot.shot_type" size="small" @change="handleShotUpdateImmediate">
                <el-option label="特写" value="特写" />
                <el-option label="近景" value="近景" />
                <el-option label="中景" value="中景" />
                <el-option label="全景" value="全景" />
                <el-option label="远景" value="远景" />
              </el-select>
            </div>
            <div class="param-group">
              <label>镜头角度</label>
              <el-select v-model="currentShot.angle" size="small" @change="handleShotUpdateImmediate">
                <el-option label="平视" value="平视" />
                <el-option label="仰视" value="仰视" />
                <el-option label="俯视" value="俯视" />
                <el-option label="侧面" value="侧面" />
                <el-option label="背面" value="背面" />
              </el-select>
            </div>
            <div class="param-group">
              <label>运镜方式</label>
              <el-select v-model="currentShot.movement" size="small" @change="handleShotUpdateImmediate">
                <el-option label="固定镜头" value="固定镜头" />
                <el-option label="推镜" value="推镜" />
                <el-option label="拉镜" value="拉镜" />
                <el-option label="摇镜" value="摇镜" />
                <el-option label="跟镜" value="跟镜" />
                <el-option label="移镜" value="移镜" />
              </el-select>
            </div>
            <div class="param-row">
              <div class="param-group">
                <label>时间</label>
                <el-input v-model="currentShot.time" size="small" @blur="handleShotUpdateImmediate" />
              </div>
              <div class="param-group">
                <label>地点</label>
                <el-input v-model="currentShot.location" size="small" @blur="handleShotUpdateImmediate" />
              </div>
            </div>
            
            <el-divider />
            
            <div class="param-group">
              <label>对角/旁白</label>
              <el-input 
                v-model="currentShot.dialogue" 
                type="textarea" 
                :rows="2"
                size="small"
                placeholder="角色对话或旁白"
                @blur="handleShotUpdateImmediate"
              />
            </div>
            <div class="param-group">
              <label>动作</label>
              <el-input 
                v-model="currentShot.action" 
                type="textarea" 
                :rows="2"
                size="small"
                @blur="handleShotUpdateImmediate"
              />
            </div>
            <div class="param-group">
              <label>画面结果</label>
              <el-input 
                v-model="currentShot.result" 
                type="textarea" 
                :rows="2"
                size="small"
                @blur="handleShotUpdateImmediate"
              />
            </div>
            
<el-divider />
            
            <div class="param-group">
              <label>环境氛围</label>
              <el-input 
                v-model="currentShot.atmosphere" 
                type="textarea" 
                :rows="2"
                size="small"
                placeholder="描述光线、色调、声音环境等"
                @blur="handleShotUpdateImmediate"
              />
            </div>
            <div class="param-group">
              <label>时长（秒）</label>
              <el-input-number 
                v-model="currentShot.duration" 
                :min="4" 
                :max="12" 
                size="small"
                @change="handleShotUpdateImmediate"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="场景制作" name="scene">
          <div class="param-section" v-if="currentShot">
            <!-- 人物选择 -->
            <div class="section-title">人物设置</div>
            <div class="param-group">
              <label>场景角色</label>
              <el-select 
                v-model="selectedCharacters" 
                multiple 
                placeholder="选择出现的角色"
                size="small"
                style="width: 100%"
              >
                <el-option
                  v-for="char in availableCharacters"
                  :key="char.id"
                  :label="char.name"
                  :value="char.id"
                />
              </el-select>
              <p class="help-text">选择在此镜头中出现的角色</p>
            </div>
            
            <div class="character-list">
              <div 
                v-for="charId in selectedCharacters" 
                :key="charId"
                class="character-avatar-item"
                :title="getCharacterById(charId)?.name"
              >
                <div class="avatar-wrapper">
                  <el-image 
                    v-if="getCharacterById(charId)?.avatar_url" 
                    :src="getCharacterById(charId).avatar_url" 
                    fit="cover"
                  />
                  <el-icon v-else :size="24"><User /></el-icon>
                </div>
                <div class="avatar-name">{{ getCharacterById(charId)?.name }}</div>
              </div>
            </div>
            
            <el-divider />
            
            <!-- 背景设置 -->
            <div class="section-title">背景设置</div>
            <div class="param-group">
              <label>背景图片</label>
              <div class="background-compact">
                <div class="background-preview-small" v-if="currentShot.background_url">
                  <el-image :src="currentShot.background_url" fit="cover" />
                </div>
                <div v-else class="background-placeholder-small">
                  <el-icon :size="20"><Picture /></el-icon>
                </div>
                <div class="background-actions-inline">
                  <el-button 
                    size="small" 
                    type="primary" 
                    :icon="MagicStick"
                    :loading="generating"
                    @click="handleGenerateBackground"
                  >
                    生成
                  </el-button>
                  <el-button 
                    size="small" 
                    :icon="Upload"
                    @click="handleUploadBackground"
                  >
                    上传
                  </el-button>
                </div>
              </div>
            </div>
            
            <div class="param-group">
              <label>背景描述</label>
              <el-input 
                v-model="backgroundPrompt" 
                type="textarea" 
                :rows="2"
                placeholder="描述场景背景"
                size="small"
              />
            </div>
            
            <el-divider />
            
            <!-- 场景合成 -->
            <div class="section-title">场景合成</div>
            <div class="param-group">
              <label>合成预览</label>
              <div class="composition-preview">
                <div v-if="currentShot.composed_url" class="composed-image">
                  <el-image :src="currentShot.composed_url" fit="cover" />
                </div>
                <div v-else class="composition-placeholder">
                  <el-icon><Picture /></el-icon>
                  <p>未合成场景</p>
                  <p class="hint">需要先生成背景和选择人物</p>
                </div>
              </div>
            </div>
            
            <div class="param-group" v-if="!currentShot.background_url">
              <el-alert
                title="请先生成背景图"
                type="warning"
                :closable="false"
                show-icon
              />
            </div>
            <div class="param-group" v-else-if="selectedCharacters.length === 0">
              <el-alert
                title="请先选择场景角色"
                type="warning"
                :closable="false"
                show-icon
              />
            </div>
            
            <div class="param-group">
              <el-button 
                type="success" 
                :icon="MagicStick"
                :loading="generating"
                :disabled="!currentShot.background_url || selectedCharacters.length === 0"
                @click="handleComposeScene"
                block
              >
                合成场景
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="视频生成" name="video">
          <div class="param-section" v-if="currentShot">
            <div class="param-group">
              <label>视频预览</label>
              <div class="video-preview" v-if="currentShot.video_url" @click="toggleVideoPlay">
                <video ref="videoPlayerRef" :src="currentShot.video_url" style="width: 100%;" @ended="videoPlaying = false" />
                <div class="video-play-overlay" :class="{ hidden: videoPlaying }">
                  <el-icon :size="48"><VideoPlay /></el-icon>
                </div>
              </div>
              <div v-else class="video-placeholder">
                <el-icon><VideoCamera /></el-icon>
                <p>未生成视频</p>
              </div>
            </div>
            
            <div class="param-group" v-if="!currentShot.background_url">
              <el-alert
                title="请先生成背景图"
                type="warning"
                :closable="false"
                show-icon
              />
            </div>
            <div class="param-group" v-else-if="selectedCharacters.length === 0">
              <el-alert
                title="建议选择场景角色以生成更完整的视频"
                type="info"
                :closable="false"
                show-icon
              />
            </div>
            
            <div class="param-group">
              <el-button 
                size="small" 
                type="success" 
                :icon="VideoPlay" 
                :loading="generating"
                :disabled="!currentShot.background_url"
                block
                @click="handleGenerateVideo"
              >
                生成视频
              </el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { debounce } from 'lodash-es'
import { 
  VideoPlay, 
  VideoPause,
  VideoCamera,
  Picture,
  Download,
  Refresh,
  Upload,
  MagicStick,
  Rank,
  User,
  ArrowLeft
} from '@element-plus/icons-vue'
import { dramaAPI } from '@/api/drama'
import { videoAPI } from '@/api/video'
import { useRouter } from 'vue-router'

interface Storyboard {
  id?: string | number
  storyboard_number: number
  shot_type?: string
  angle?: string
  movement?: string
  time?: string
  location?: string
  action?: string
  result?: string
  atmosphere?: string
  dialogue?: string
  duration?: number
  background_url?: string
  background_id?: string | number
  composed_url?: string
  video_url?: string
  scene_id?: string | number
  title?: string
  bgm_prompt?: string
  sound_effect?: string
}

interface Background {
  id: number
  episode_id: string
  prompt: string  // 后端返回中文提示词
  image_url?: string
  created_at?: string
}

const props = defineProps<{
  storyboards: Storyboard[]
  episodeId: string
  dramaId?: string
}>()

const emit = defineEmits<{
  'update:storyboard': [shot: Storyboard]
  'shot-selected': [index: number]
  'refresh': []
}>()

const currentShotIndex = ref(0)
const activeTab = ref('info')
const timelineZoom = ref(5)
const selectedCharacters = ref<string[]>([])
const availableCharacters = ref<any[]>([])
const backgroundPrompt = ref('')
const backgroundsCache = ref<Background[]>([])
const videoPlayerRef = ref<HTMLVideoElement | null>(null)
const videoPlaying = ref(false)

const toggleVideoPlay = () => {
  if (!videoPlayerRef.value) return
  if (videoPlaying.value) {
    videoPlayerRef.value.pause()
    videoPlaying.value = false
  } else {
    videoPlayerRef.value.play()
    videoPlaying.value = true
  }
}

const router = useRouter()

const cameraIcons = ['正面', '侧面', '俯视', '仰视', '特写', '远景']
const motionIcons = ['静止', '推进', '拉远', '平移', '跟随', '环绕']

const handleBack = () => {
  if (props.dramaId) {
    router.push(`/drama/${props.dramaId}/episodes`)
  } else {
    router.back()
  }
}

const currentShot = computed(() => {
  return props.storyboards[currentShotIndex.value] || null
})

const selectShot = (index: number) => {
  currentShotIndex.value = index
  emit('shot-selected', index)
  
  // 自动选择场景中提到的角色
  autoSelectCharacters()
  
  // 加载背景描述
  loadBackgroundPrompt()
}

// 加载当前镜头的背景描述
const loadBackgroundPrompt = () => {
  if (!currentShot.value) return
  
  // 根据background_id从 backgrounds缓存中获取prompt（中文）
  if (currentShot.value.background_id && backgroundsCache.value.length > 0) {
    const bgId = typeof currentShot.value.background_id === 'string' 
      ? parseInt(currentShot.value.background_id) 
      : currentShot.value.background_id
    
    const background = backgroundsCache.value.find(bg => bg.id === bgId)
    if (background) {
      backgroundPrompt.value = background.prompt || ''
      return
    }
  }
  
  // 如果没有background_id或找不到，自动组合生成
  const parts = []
  if (currentShot.value.time) parts.push(currentShot.value.time)
  if (currentShot.value.location) parts.push(currentShot.value.location)
  backgroundPrompt.value = parts.join('，')
}

// 自动从场景描述中提取并选择相关角色
const autoSelectCharacters = () => {
  if (!currentShot.value) return
  
  const description = `${currentShot.value.dialogue || ''} ${currentShot.value.action || ''}`.toLowerCase()
  const matchedCharacters: string[] = []
  
  // 遍历所有可用角色，检查是否在描述中被提及
  availableCharacters.value.forEach(char => {
    const charName = char.name.toLowerCase()
    if (description.includes(charName)) {
      matchedCharacters.push(char.id)
    }
  })
  
  // 如果找到匹配的角色，自动选中
  if (matchedCharacters.length > 0) {
    selectedCharacters.value = matchedCharacters
  }
}

// 测试函数：不使用防抖，立即触发
const handleShotUpdateImmediate = async () => {
  if (!currentShot.value) {
    console.warn('handleShotUpdate: currentShot.value is null')
    return
  }
  
  if (!currentShot.value.id) {
    console.warn('handleShotUpdate: currentShot.value.id is null or undefined', currentShot.value)
    return
  }
  
  try {
    // 构建更新数据，只发送有值的字段（包括空字符串）
    const updateData: Record<string, any> = {}
    
    if (currentShot.value.shot_type !== undefined) updateData.shot_type = currentShot.value.shot_type
    if (currentShot.value.angle !== undefined) updateData.angle = currentShot.value.angle
    if (currentShot.value.movement !== undefined) updateData.movement = currentShot.value.movement
    if (currentShot.value.time !== undefined) updateData.time = currentShot.value.time
    if (currentShot.value.location !== undefined) updateData.location = currentShot.value.location
    if (currentShot.value.action !== undefined) updateData.action = currentShot.value.action
    if (currentShot.value.dialogue !== undefined) updateData.dialogue = currentShot.value.dialogue
    if (currentShot.value.result !== undefined) updateData.result = currentShot.value.result
    if (currentShot.value.atmosphere !== undefined) updateData.atmosphere = currentShot.value.atmosphere
    if (currentShot.value.duration !== undefined) updateData.duration = currentShot.value.duration
    if (currentShot.value.title !== undefined) updateData.title = currentShot.value.title
    if (currentShot.value.bgm_prompt !== undefined) updateData.bgm_prompt = currentShot.value.bgm_prompt
    if (currentShot.value.sound_effect !== undefined) updateData.sound_effect = currentShot.value.sound_effect
    
    await dramaAPI.updateStoryboard(currentShot.value.id.toString(), updateData)

    emit('update:storyboard', currentShot.value)
    ElMessage.success('分镜更新成功')
  } catch (error: any) {
    console.error('更新分镜失败:', error)
    ElMessage.error(error.message || '更新失败')
  }
}

const handleShotUpdate = debounce(async () => {
  if (!currentShot.value) {
    console.warn('handleShotUpdate: currentShot.value is null')
    return
  }
  
  if (!currentShot.value.id) {
    console.warn('handleShotUpdate: currentShot.value.id is null or undefined', currentShot.value)
    return
  }
  
  try {
    // 构建更新数据，只发送有值的字段（包括空字符串）
    const updateData: Record<string, any> = {}
    
    if (currentShot.value.shot_type !== undefined) updateData.shot_type = currentShot.value.shot_type
    if (currentShot.value.angle !== undefined) updateData.angle = currentShot.value.angle
    if (currentShot.value.movement !== undefined) updateData.movement = currentShot.value.movement
    if (currentShot.value.time !== undefined) updateData.time = currentShot.value.time
    if (currentShot.value.location !== undefined) updateData.location = currentShot.value.location
    if (currentShot.value.action !== undefined) updateData.action = currentShot.value.action
    if (currentShot.value.dialogue !== undefined) updateData.dialogue = currentShot.value.dialogue
    if (currentShot.value.result !== undefined) updateData.result = currentShot.value.result
    if (currentShot.value.atmosphere !== undefined) updateData.atmosphere = currentShot.value.atmosphere
    if (currentShot.value.duration !== undefined) updateData.duration = currentShot.value.duration
    if (currentShot.value.title !== undefined) updateData.title = currentShot.value.title
    if (currentShot.value.bgm_prompt !== undefined) updateData.bgm_prompt = currentShot.value.bgm_prompt
    if (currentShot.value.sound_effect !== undefined) updateData.sound_effect = currentShot.value.sound_effect
    
    await dramaAPI.updateStoryboard(currentShot.value.id.toString(), updateData)
    
    emit('update:storyboard', currentShot.value)
    ElMessage.success('分镜更新成功')
  } catch (error: any) {
    console.error('更新分镜失败:', error)
    ElMessage.error(error.message || '更新失败')
  }
}, 500)

// 使用立即触发版本进行测试
const testUpdate = () => {
  handleShotUpdateImmediate()
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const generating = ref(false)

const handleGenerateBackground = async () => {
  if (!currentShot.value || !currentShot.value.id) {
    ElMessage.warning('请先选择一个镜头')
    return
  }

  // 检查是否有 background_id
  if (!currentShot.value.background_id) {
    ElMessage.warning('该镜头未关联背景信息，请先提取背景')
    return
  }

  // 检查是否有背景描述
  if (!backgroundPrompt.value) {
    ElMessage.warning('背景描述为空，请先填写背景描述')
    return
  }

  try {
    await ElMessageBox.confirm(
      `将使用以下描述生成背景图片：\n\n${backgroundPrompt.value}\n\n是否继续？`,
      '生成背景',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    generating.value = true
    ElMessage.info('正在生成背景图片...')
    
    if (props.dramaId) {
      // 使用 background_id 和 backgrounds 表中的中文 prompt
      const bgId = typeof currentShot.value.background_id === 'string' 
        ? parseInt(currentShot.value.background_id) 
        : currentShot.value.background_id
      
      await dramaAPI.generateSingleBackground(
        bgId, 
        props.dramaId,
        backgroundPrompt.value
      )
    }
    
    ElMessage.success('背景图片生成成功')
    emit('refresh')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '生成失败')
    }
  } finally {
    generating.value = false
  }
}

const handleGenerateVideo = async () => {
  if (!currentShot.value || !currentShot.value.id) {
    ElMessage.warning('请先选择一个镜头')
    return
  }

  if (!currentShot.value.background_url) {
    ElMessage.warning('请先生成背景图片')
    return
  }

  try {
    const characterInfo = selectedCharacters.value.length > 0
      ? `\n角色：${selectedCharacters.value.map(id => getCharacterById(id)?.name).filter(Boolean).join('、')}`
      : ''
    
    await ElMessageBox.confirm(
      `将生成视频：\n场景：${currentShot.value.location}\n动作：${currentShot.value.action}${characterInfo}\n\n预计需要1-3分钟，是否继续？`,
      '视频生成',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    )

    generating.value = true
    ElMessage.info('正在生成视频...')
    
    await videoAPI.generateVideo({
      scene_id: String(currentShot.value.id),
      drama_id: props.dramaId || '',
      prompt: currentShot.value.action ?? ''
    })
    
    ElMessage.success('视频生成任务已创建，请稍后查看')
    emit('refresh')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '生成失败')
    }
  } finally {
    generating.value = false
  }
}

const handleUploadBackground = () => {
  ElMessage.info('上传功能开发中')
}

const getCharacterById = (id: string) => {
  return availableCharacters.value.find(c => c.id === id)
}

const handleComposeScene = async () => {
  if (!currentShot.value) return
  
  if (!currentShot.value.background_url) {
    ElMessage.warning('请先生成背景图')
    return
  }
  
  if (selectedCharacters.value.length === 0) {
    ElMessage.warning('请先选择场景角色')
    return
  }
  
  try {
    const characterNames = selectedCharacters.value
      .map(id => getCharacterById(id)?.name)
      .filter(Boolean)
      .join('、')
    
    await ElMessageBox.confirm(
      `将合成以下内容：\n背景：${currentShot.value.location}\n角色：${characterNames}\n\n是否继续？`,
      '场景合成',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    generating.value = true
    ElMessage.info('正在合成场景...')
    
    // TODO: 调用场景合成API
    // await compositionAPI.composeScene(currentShot.value.id, selectedCharacters.value)
    
    ElMessage.success('场景合成成功')
    emit('refresh')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '合成失败')
    }
  } finally {
    generating.value = false
  }
}

const handleRegenerateShot = async () => {
  if (!currentShot.value) return
  
  try {
    await ElMessageBox.confirm(
      '重新生成将清空当前镜头的背景和视频，是否继续？',
      '重新生成',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    ElMessage.info('功能开发中')
  } catch {
    // 用户取消
  }
}

// 加载背景数据缓存
const loadBackgrounds = async () => {
  if (!props.episodeId) return
  
  try {
    const result = await dramaAPI.getBackgrounds(props.episodeId)
    backgroundsCache.value = (result || []) as unknown as Background[]
    // 加载完背景数据后，重新加载当前背景描述
    loadBackgroundPrompt()
  } catch (error) {
    console.error('加载背景数据失败:', error)
  }
}

// 加载可用角色列表
onMounted(async () => {
  // 加载背景数据
  await loadBackgrounds()
  
  // 加载角色数据
  if (props.dramaId) {
    try {
      const result = await dramaAPI.getCharacters(props.dramaId)
      availableCharacters.value = result || []
      // 加载完角色后，自动选择当前镜头相关的角色
      autoSelectCharacters()
    } catch (error) {
      console.error('加载角色失败:', error)
    }
  }
})

// 监听镜头变化，自动选择相关角色和加载背景描述
watch(() => currentShot.value, () => {
  if (currentShot.value && availableCharacters.value.length > 0) {
    autoSelectCharacters()
    loadBackgroundPrompt()
  }
}, { deep: true })
</script>

<style scoped lang="scss">
.storyboard-editor {
  display: flex;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

.left-panel {
  width: 280px;
  flex-shrink: 0;
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-primary);

  .panel-header {
    padding: 16px;
    border-bottom: 1px solid var(--border-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .scene-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;

    .scene-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
      background: var(--bg-secondary);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid var(--border-primary);

      &:hover {
        background: var(--accent-light);
        border-color: var(--accent);
      }

      &.active {
        background: var(--accent-light);
        border-color: var(--accent);
        box-shadow: var(--shadow-md);
      }

      .scene-number {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        background: var(--accent);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 12px;
        color: var(--text-inverse);
      }

      .scene-content {
        flex: 1;
        min-width: 0;

        .scene-title {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;

          .time-location {
            font-size: 11px;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        .scene-desc {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      }

      .scene-thumb {
        flex-shrink: 0;
        width: 60px;
        height: 40px;
        border-radius: 4px;
        overflow: hidden;
        background: var(--bg-card-hover);
        border: 1px solid var(--border-primary);
      }
    }
  }
}

.center-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);

  .preview-header {
    padding: 12px 20px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .shot-type {
        font-size: 14px;
        color: var(--text-secondary);
      }
    }
  }

  .preview-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow: hidden;

    .preview-container {
      max-width: 90%;
      max-height: 90%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-card);
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-primary);
      box-shadow: var(--shadow-md);

      .preview-image {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;

        :deep(.el-image) {
          max-width: 100%;
          max-height: 100%;
        }
      }

      .preview-placeholder {
        text-align: center;
        color: var(--text-muted);

        p {
          margin-top: 12px;
          font-size: 14px;
        }

        .hint {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 8px;
        }
      }

      .preview-video {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }

  .timeline-panel {
    height: 140px;
    background: var(--bg-card);
    border-top: 1px solid var(--border-primary);

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      border-bottom: 1px solid var(--border-primary);

      .timeline-tools {
        display: flex;
        align-items: center;
        gap: 12px;

        .timecode {
          font-size: 12px;
          color: var(--text-muted);
          font-family: monospace;
        }
      }

      .timeline-zoom {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .timeline-track {
      position: relative;
      height: 92px;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 8px 16px;

      &::-webkit-scrollbar {
        height: 8px;
      }

      &::-webkit-scrollbar-track {
        background: var(--bg-secondary);
      }

      &::-webkit-scrollbar-thumb {
        background: var(--border-secondary);
        border-radius: 4px;

        &:hover {
          background: var(--border-primary);
        }
      }

      .timeline-ruler {
        position: relative;
        height: 20px;
        border-bottom: 1px solid var(--border-primary);
        min-width: max-content;

        .ruler-mark {
          position: absolute;
          transform: translateX(-50%);

          &::before {
            content: '';
            display: block;
            width: 1px;
            height: 8px;
            background: var(--border-primary);
            margin-bottom: 2px;
          }

          span {
            font-size: 10px;
            color: var(--text-secondary);
          }
        }
      }

      .timeline-clips {
        position: relative;
        height: 48px;
        margin-top: 8px;
        display: flex;
        gap: 4px;
        min-width: max-content;

        .timeline-clip {
          flex-shrink: 0;
          width: 60px;
          height: 100%;
          background: var(--accent-light);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid var(--accent);

          &:hover {
            background: var(--accent);
            border-color: var(--accent-hover);
          }

          &.active {
            background: var(--accent);
            border-color: var(--accent);
            box-shadow: var(--shadow-glow);
          }

          .clip-content {
            padding: 4px 8px;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;

            .clip-number {
              font-size: 11px;
              font-weight: 600;
              color: var(--text-primary);
            }
          }

          &.active .clip-content .clip-number {
            color: var(--text-inverse);
          }
        }
      }
    }
  }
}

.right-panel {
  width: 420px;
  flex-shrink: 0;
  background: var(--bg-card);
  border-left: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;

  .panel-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;

    :deep(.el-tabs__header) {
      margin: 0;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border-primary);
      flex-shrink: 0;
      padding: 0 8px;
    }

    :deep(.el-tabs__content) {
      flex: 1;
      overflow-y: auto;
      padding: 16px 14px;
      height: 0;
    }

    :deep(.el-tabs__item) {
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      padding: 0 20px;
      transition: all 0.3s ease;

      &:hover {
        color: var(--accent);
      }

      &.is-active {
        color: var(--accent);
        background: var(--accent-light);
      }
    }

    :deep(.el-tabs__active-bar) {
      background: linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 100%);
      height: 3px;
    }

    :deep(.el-tab-pane) {
      height: 100%;
    }
  }

  .param-section {
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--accent);
      margin: 12px 0 10px;
      padding: 6px 10px;
      background: var(--accent-light);
      border-radius: 6px;
      border-left: 3px solid var(--accent);
    }
    
    .param-group {
      margin-bottom: 10px;
      padding: 10px;
      background: var(--bg-secondary);
      border-radius: 8px;
      border: 1px solid var(--border-primary);
      transition: all 0.3s ease;

      &:hover {
        background: var(--accent-light);
        border-color: var(--accent);
        box-shadow: var(--shadow-sm);
      }

      label {
        display: block;
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 6px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      .icon-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;

        .icon-button {
          aspect-ratio: 1;
          padding: 8px;
        }
      }
    }

    .param-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .background-compact {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .background-preview-small {
      width: 80px;
      height: 60px;
      background: var(--bg-secondary);
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border-primary);
      flex-shrink: 0;
    }

    .background-placeholder-small {
      width: 80px;
      height: 60px;
      background: var(--bg-primary);
      border-radius: 6px;
      border: 2px dashed var(--border-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      flex-shrink: 0;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--accent);
        background: var(--accent-light);
      }
    }

    .background-actions-inline {
      display: flex;
      gap: 6px;
      flex: 1;

      .el-button {
        flex: 1;
      }
    }

    .background-preview,
    .video-preview {
      width: 100%;
      aspect-ratio: 2/1;
      background: var(--bg-secondary);
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 8px;
      border: 1px solid var(--border-primary);
      box-shadow: var(--shadow-sm);
      position: relative;
      cursor: pointer;
    }

    .video-play-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.4);
      transition: opacity 0.3s ease;

      .el-icon {
        color: white;
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
      }

      &.hidden {
        opacity: 0;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.5);
      }
    }

    .background-placeholder,
    .video-placeholder {
      width: 100%;
      aspect-ratio: 2/1;
      background: var(--bg-primary);
      border-radius: 6px;
      border: 2px dashed var(--border-secondary);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      margin-bottom: 8px;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--accent);
        background: var(--accent-light);
      }

      .el-icon {
        font-size: 32px;
      }

      p {
        margin-top: 6px;
        font-size: 11px;
        font-weight: 500;
      }
    }

    .background-actions,
    .video-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;

      :deep(.el-button) {
        border-radius: 6px;
        font-weight: 500;
        transition: all 0.2s ease;

        &.el-button--primary {
          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(64, 158, 255, 0.2);
          }
        }

        &.el-button--success {
          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(103, 194, 58, 0.2);
          }
        }

        &:active {
          transform: translateY(0);
        }
      }
    }

    .help-text {
      margin-top: 6px;
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.5;
      padding: 4px 8px;
      background: var(--accent-light);
      border-radius: 4px;
      border-left: 2px solid var(--accent);
    }

    .character-list {
      margin-top: 8px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      gap: 10px;

      .character-avatar-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          
          .avatar-wrapper {
            border-color: var(--accent);
            box-shadow: var(--shadow-md);
          }
        }

        .avatar-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          border: 2px solid var(--border-secondary);
          transition: all 0.3s ease;
          margin-bottom: 6px;
        }

        .avatar-name {
          font-size: 11px;
          color: var(--text-secondary);
          text-align: center;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .composition-preview {
      .composed-image,
      .composition-placeholder {
        width: 100%;
        aspect-ratio: 2/1;
        background: var(--bg-primary);
        border-radius: 6px;
        border: 2px dashed var(--border-secondary);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
        color: var(--text-muted);

        .el-icon {
          font-size: 32px;
        }

        p {
          margin-top: 6px;
          font-size: 11px;
        }

        .hint {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 4px;
        }
      }
    }
  }
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner),
:deep(.el-select) {
  background-color: var(--bg-card);
  border-radius: 6px;
  border: 1px solid var(--border-primary);
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--border-secondary);
  }

  &:focus,
  &.is-focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.1);
  }
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  color: var(--text-primary);
  font-size: 13px;
}

:deep(.el-textarea__inner) {
  line-height: 1.6;
}

:deep(.el-divider) {
  border-color: var(--border-primary);
  margin: 12px 0;
}

:deep(.el-button) {
  &.is-loading {
    opacity: 0.8;
  }
}

:deep(.el-image__inner) {
  max-width: 100%;
  max-height: 100%;
}

:deep(.el-scrollbar__view) {
  height: 100%;
}
</style>
