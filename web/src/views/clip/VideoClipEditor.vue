<template>
  <div class="video-clip-editor">
    <!-- 顶部工具栏 -->
    <div class="editor-header">
      <div class="header-left">
        <h2>视频剪辑编辑器</h2>
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Download" @click="exportVideo" :disabled="!hasClips" :loading="exporting">
          导出视频
        </el-button>
      </div>
    </div>

    <!-- 主工作区 -->
    <div class="editor-workspace">
      <!-- 左侧：素材库 -->
      <div class="media-panel">
        <div class="panel-header">
          <h3>{{ $t('clip.mediaLibrary') }}</h3>
          <el-button-group size="small">
            <el-button :icon="VideoCamera" @click="importVideo">
              {{ $t('clip.importVideo') }}
            </el-button>
            <el-button :icon="Headset" @click="importAudio">
              {{ $t('clip.importAudio') }}
            </el-button>
          </el-button-group>
        </div>

        <!-- 视频素材 -->
        <div class="media-section">
          <div class="section-title">
            <el-icon>
              <VideoCamera />
            </el-icon>
            <span>{{ $t('clip.videos') }}</span>
          </div>
          <div class="media-list">
            <div v-for="video in videoAssets" :key="video.id" class="media-item" draggable="true"
              @dragstart="handleDragStart($event, video, 'video')">
              <div class="media-thumbnail">
                <video :src="video.url" />
                <div class="media-duration">{{ formatTime(video.duration) }}</div>
              </div>
              <div class="media-info">
                <div class="media-name">{{ video.name }}</div>
                <el-button type="danger" size="small" :icon="Delete" circle @click="removeAsset(video.id, 'video')" />
              </div>
            </div>
            <div v-if="videoAssets.length === 0" class="empty-state">
              <el-empty :description="$t('clip.noVideos')" />
            </div>
          </div>
        </div>

        <!-- 音频素材 -->
        <div class="media-section">
          <div class="section-title">
            <el-icon>
              <Headset />
            </el-icon>
            <span>{{ $t('clip.audios') }}</span>
          </div>
          <div class="media-list">
            <div v-for="audio in audioAssets" :key="audio.id" class="media-item audio-item" draggable="true"
              @dragstart="handleDragStart($event, audio, 'audio')">
              <div class="media-thumbnail audio-thumbnail">
                <el-icon :size="40">
                  <Microphone />
                </el-icon>
              </div>
              <div class="media-info">
                <div class="media-name">{{ audio.name }}</div>
                <div class="media-duration">{{ formatTime(audio.duration) }}</div>
                <el-button type="danger" size="small" :icon="Delete" circle @click="removeAsset(audio.id, 'audio')" />
              </div>
            </div>
            <div v-if="audioAssets.length === 0" class="empty-state">
              <el-empty :description="$t('clip.noAudios')" />
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：预览区 -->
      <div class="preview-panel">
        <div class="preview-container">
          <video ref="previewPlayer" class="preview-video" @loadedmetadata="handleVideoLoaded"
            @timeupdate="handleTimeUpdate" @ended="handleVideoEnded" />
          <div v-if="!currentPreviewUrl" class="preview-placeholder">
            <el-empty :description="$t('clip.previewPlaceholder')" />
          </div>
        </div>
        <div class="preview-controls">
          <div class="time-display">
            {{ formatTime(currentTime) }} / {{ formatTime(totalDuration) }}
          </div>
          <el-slider v-model="currentTime" :max="totalDuration" :step="0.01" @change="seekToTime" />
        </div>
      </div>

      <!-- 右侧：属性面板 -->
      <div class="properties-panel">
        <div class="panel-header">
          <h3>{{ $t('clip.properties') }}</h3>
        </div>
        <div v-if="selectedClip" class="properties-content">
          <el-form label-position="top">
            <el-form-item :label="$t('clip.clipName')">
              <el-input v-model="selectedClip.name" />
            </el-form-item>
            <el-form-item :label="$t('clip.startTime')">
              <el-input-number v-model="selectedClip.startTime" :min="0" :max="selectedClip.originalDuration"
                :step="0.1" @change="updateClipTrim" />
            </el-form-item>
            <el-form-item :label="$t('clip.endTime')">
              <el-input-number v-model="selectedClip.endTime" :min="selectedClip.startTime"
                :max="selectedClip.originalDuration" :step="0.1" @change="updateClipTrim" />
            </el-form-item>
            <el-form-item :label="$t('clip.duration')">
              <span>{{ formatTime(selectedClip.duration) }}</span>
            </el-form-item>
            <el-form-item v-if="selectedClip.type === 'audio'" :label="$t('clip.volume')">
              <el-slider v-model="selectedClip.volume" :min="0" :max="100" />
            </el-form-item>
            <el-button type="danger" @click="deleteSelectedClip">
              {{ $t('common.delete') }}
            </el-button>
          </el-form>
        </div>
        <div v-else class="empty-state">
          <el-empty :description="$t('clip.selectClip')" />
        </div>
      </div>
    </div>

    <!-- 时间线区域 -->
    <div class="timeline-area">
      <div class="timeline-toolbar">
        <div class="playback-controls">
          <el-button-group size="small">
            <el-button :icon="VideoPlay" @click="playPreview" :disabled="!hasClips" title="播放" />
            <el-button :icon="VideoPause" @click="pausePreview" title="暂停" />
            <el-button :icon="CaretRight" @click="playFromHere" :disabled="!hasClips" title="从此处播放" />
          </el-button-group>
        </div>
        <div class="history-controls">
          <el-button-group size="small">
            <el-button :icon="RefreshLeft" @click="undo" :disabled="!canUndo" title="撤销" />
            <el-button :icon="RefreshRight" @click="redo" :disabled="!canRedo" title="重做" />
          </el-button-group>
        </div>
        <div class="zoom-controls">
          <el-button-group size="small">
            <el-button :icon="ZoomOut" @click="zoomOut" />
            <el-button @click="resetZoom">{{ Math.round(zoom * 100) }}%</el-button>
            <el-button :icon="ZoomIn" @click="zoomIn" />
          </el-button-group>
        </div>
        <div class="track-controls">
          <el-button size="small" :icon="Scissor" @click="cutClip" :disabled="!selectedClip" title="剪切片段" />
          <el-button size="small" :icon="Plus" @click="addAudioTrack" title="添加音频轨道" />
        </div>
      </div>

      <div class="timeline-container" ref="timelineContainer">
        <!-- 时间标尺 -->
        <div class="timeline-ruler" :style="{ width: timelineWidth + 'px' }">
          <div v-for="tick in timeRulerTicks" :key="tick.time" :style="{ left: tick.position + 'px' }">
            <div class="ruler-tick" :class="tick.type"></div>
            <div class="tick-label" v-if="tick.type === 'major'">
              {{ formatTime(tick.time) }}
            </div>
          </div>
        </div>

        <!-- 播放头 -->
        <div class="playhead" :style="{ left: playheadPosition + 'px' }" @mousedown="startDragPlayhead">
          <div class="playhead-line"></div>
          <div class="playhead-handle"></div>
        </div>

        <!-- 轨道容器 -->
        <div class="tracks-container">
          <!-- 视频轨道 -->
          <div class="track video-track">
            <div class="track-header">
              <el-icon>
                <VideoCamera />
              </el-icon>
              <span>{{ $t('clip.videoTrack') }}</span>
            </div>
            <div class="track-content" :style="{ width: timelineWidth + 'px' }"
              @drop="handleTrackDrop($event, 'video', 0)" @dragover.prevent @click="deselectClip">
              <div v-for="(clip, clipIndex) in videoTracks[0]" :key="clip.id" class="clip"
                :class="{ selected: selectedClip?.id === clip.id }" :style="getClipStyle(clip)"
                @click.stop="selectClip(clip)" @mousedown.stop="startDragClip($event, clip)">
                <div class="clip-content">
                  <canvas :ref="el => setClipCanvas(el, clip.id)" class="clip-frames" />
                  <div class="clip-name">{{ clip.name }}</div>
                </div>
                <!-- 裁剪手柄 -->
                <div class="clip-handle clip-handle-left" @mousedown.stop="startTrimClip($event, clip, 'left')"></div>
                <div class="clip-handle clip-handle-right" @mousedown.stop="startTrimClip($event, clip, 'right')"></div>
              </div>
              <!-- 转场指示器 -->
              <div v-for="(clip, clipIndex) in videoTracks[0].slice(1)" :key="'transition-' + clip.id"
                class="transition-indicator" :style="getTransitionStyle(videoTracks[0][clipIndex], clip)"
                @click.stop="openTransitionDialog(videoTracks[0][clipIndex], clip)"
                :title="getTransitionLabel(videoTracks[0][clipIndex])">
                <el-icon>
                  <Connection />
                </el-icon>
              </div>
            </div>
          </div>

          <!-- 音频轨道 -->
          <div v-for="(track, trackIndex) in audioTracks" :key="'audio-' + trackIndex" class="track audio-track">
            <div class="track-header">
              <el-icon>
                <Headset />
              </el-icon>
              <span>{{ $t('clip.audioTrack') }} {{ trackIndex + 1 }}</span>
              <el-button v-if="trackIndex > 0" type="text" size="small" :icon="Delete"
                @click="removeAudioTrack(trackIndex)" />
            </div>
            <div class="track-content" :style="{ width: timelineWidth + 'px' }"
              @drop="handleTrackDrop($event, 'audio', trackIndex)" @dragover.prevent @click="deselectClip">
              <div v-for="clip in track" :key="clip.id" class="clip audio-clip"
                :class="{ selected: selectedClip?.id === clip.id }" :style="getClipStyle(clip)"
                @click.stop="selectClip(clip)" @mousedown.stop="startDragClip($event, clip)">
                <div class="clip-content">
                  <div class="clip-waveform">
                    <el-icon>
                      <Microphone />
                    </el-icon>
                  </div>
                  <div class="clip-name">{{ clip.name }}</div>
                </div>
                <!-- 裁剪手柄 -->
                <div class="clip-handle clip-handle-left" @mousedown.stop="startTrimClip($event, clip, 'left')"></div>
                <div class="clip-handle clip-handle-right" @mousedown.stop="startTrimClip($event, clip, 'right')"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件输入（隐藏） -->
    <input ref="videoInput" type="file" accept="video/*" multiple style="display: none" @change="handleVideoImport" />
    <input ref="audioInput" type="file" accept="audio/*" multiple style="display: none" @change="handleAudioImport" />

    <!-- 转场设置对话框 -->
    <el-dialog v-model="transitionDialogVisible" title="设置转场效果" width="500px">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        转场效果将在导出视频时应用，预览播放时不会显示
      </el-alert>
      <el-form label-width="100px">
        <el-form-item label="转场类型">
          <el-select v-model="editingTransition.type" placeholder="选择转场效果">
            <el-option label="无转场" value="none" />
            <el-option label="淡入淡出" value="fade" />
            <el-option label="溶解" value="dissolve" />
            <el-option label="擦除" value="wipe" />
            <el-option label="滑动" value="slide" />
          </el-select>
        </el-form-item>
        <el-form-item label="转场时长" v-if="editingTransition.type !== 'none'">
          <el-slider v-model="editingTransition.duration" :min="0.3" :max="3" :step="0.1" show-input />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transitionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="applyTransition">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  VideoPlay,
  VideoPause,
  VideoCamera,
  Headset,
  Microphone,
  Download,
  Delete,
  Plus,
  ZoomIn,
  ZoomOut,
  CaretRight,
  RefreshLeft,
  RefreshRight,
  Connection,
  Scissor,
} from '@element-plus/icons-vue'

// 类型定义
interface MediaAsset {
  id: string
  name: string
  url: string
  duration: number
  type: 'video' | 'audio'
}

interface TimelineClip {
  id: string
  assetId: string
  name: string
  url: string
  type: 'video' | 'audio'
  trackIndex: number
  position: number // 在时间线上的位置（秒）
  startTime: number // 裁剪开始时间
  endTime: number // 裁剪结束时间
  duration: number // 裁剪后的时长
  originalDuration: number // 原始时长
  volume?: number // 音量 (0-100)
  transition?: {
    type: string
    duration: number
  }
}

interface HistoryState {
  videoTracks: TimelineClip[][]
  audioTracks: TimelineClip[][]
}

// 状态
const videoAssets = ref<MediaAsset[]>([])
const audioAssets = ref<MediaAsset[]>([])
const videoTracks = ref<TimelineClip[][]>([[]])
const audioTracks = ref<TimelineClip[][]>([[]])
const selectedClip = ref<TimelineClip | null>(null)
const currentTime = ref(0)
const zoom = ref(1)
const isPlaying = ref(false)
const exporting = ref(false)

// 历史记录
const history = ref<HistoryState[]>([])
const historyIndex = ref(-1)
const maxHistorySize = 50

// 转场对话框
const transitionDialogVisible = ref(false)
const editingTransitionClips = ref<{ prev: TimelineClip | null; next: TimelineClip | null }>({ prev: null, next: null })
const editingTransition = ref({ type: 'fade', duration: 1.0 })

// Canvas引用映射
const clipCanvasRefs = new Map<string, HTMLCanvasElement>()
// 帧渲染缓存，避免重复渲染
const frameRenderCache = new Map<string, boolean>()

// DOM引用
const previewPlayer = ref<HTMLVideoElement | null>(null)
const timelineContainer = ref<HTMLElement | null>(null)
const videoInput = ref<HTMLInputElement | null>(null)
const audioInput = ref<HTMLInputElement | null>(null)

// Canvas引用设置
const setClipCanvas = (el: any, clipId: string) => {
  if (el) {
    clipCanvasRefs.set(clipId, el)
    // 渲染帧预览（仅在未渲染过时渲染）
    const clip = videoTracks.value[0].find(c => c.id === clipId)
    const cacheKey = `${clipId}_${clip?.startTime}_${clip?.endTime}`
    if (clip && !frameRenderCache.has(cacheKey)) {
      frameRenderCache.set(cacheKey, true)
      renderClipFrames(clip, el, cacheKey)
    }
  }
}

// 计算属性
const hasClips = computed(() => {
  return videoTracks.value.some(track => track.length > 0) ||
    audioTracks.value.some(track => track.length > 0)
})

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

const totalDuration = computed(() => {
  let maxDuration = 0
  const allTracks = [...videoTracks.value, ...audioTracks.value]
  allTracks.forEach(track => {
    track.forEach(clip => {
      const clipEnd = clip.position + clip.duration
      if (clipEnd > maxDuration) {
        maxDuration = clipEnd
      }
    })
  })
  return Math.max(maxDuration, 30)
})

const pixelsPerSecond = computed(() => 50 * zoom.value)

const timelineWidth = computed(() => {
  return 150 + totalDuration.value * pixelsPerSecond.value + 100
})

const playheadPosition = computed(() => {
  return 150 + currentTime.value * pixelsPerSecond.value
})

const timeRulerTicks = computed(() => {
  const ticks = []
  const duration = totalDuration.value
  const majorInterval = zoom.value >= 2 ? 1 : zoom.value >= 1 ? 5 : 10
  const minorInterval = majorInterval / 10 // 每个大刻度之间有9个小刻度

  for (let i = 0; i <= Math.ceil(duration / minorInterval) * minorInterval; i += minorInterval) {
    const isMajor = Math.abs(i % majorInterval) < 0.001
    const isMedium = Math.abs(i % (majorInterval / 2)) < 0.001 && !isMajor

    let type = 'minor'
    if (isMajor) type = 'major'
    else if (isMedium) type = 'medium'

    ticks.push({
      time: i,
      position: 150 + i * pixelsPerSecond.value,
      type: type,
    })
  }
  return ticks
})

const currentPreviewUrl = computed(() => {
  if (videoTracks.value[0].length === 0) return ''

  const videoClip = videoTracks.value[0].find(
    clip => currentTime.value >= clip.position && currentTime.value < clip.position + clip.duration
  )

  // 如果没有找到片段，返回第一个片段的URL
  if (!videoClip && videoTracks.value[0].length > 0) {
    return videoTracks.value[0][0].url
  }

  return videoClip?.url || ''
})

// 工具函数
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`
}

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

const getMediaDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const media = file.type.startsWith('video/')
      ? document.createElement('video')
      : document.createElement('audio')

    media.preload = 'metadata'
    media.src = url

    media.onloadedmetadata = () => {
      const duration = media.duration
      URL.revokeObjectURL(url)
      resolve(duration)
    }

    media.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load media'))
    }
  })
}

// 导入媒体
const importVideo = () => {
  videoInput.value?.click()
}

const importAudio = () => {
  audioInput.value?.click()
}

const handleVideoImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files) return

  for (const file of Array.from(files)) {
    try {
      const duration = await getMediaDuration(file)
      const url = URL.createObjectURL(file)
      const asset: MediaAsset = {
        id: generateId(),
        name: file.name,
        url,
        duration,
        type: 'video',
      }
      videoAssets.value.push(asset)
      ElMessage.success(`已导入视频: ${file.name}`)
    } catch (error) {
      ElMessage.error(`导入视频失败: ${file.name}`)
    }
  }
  target.value = ''
}

const handleAudioImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files) return

  for (const file of Array.from(files)) {
    try {
      const duration = await getMediaDuration(file)
      const url = URL.createObjectURL(file)
      const asset: MediaAsset = {
        id: generateId(),
        name: file.name,
        url,
        duration,
        type: 'audio',
      }
      audioAssets.value.push(asset)
      ElMessage.success(`已导入音频: ${file.name}`)
    } catch (error) {
      ElMessage.error(`导入音频失败: ${file.name}`)
    }
  }
  target.value = ''
}

const removeAsset = (id: string, type: 'video' | 'audio') => {
  if (type === 'video') {
    const index = videoAssets.value.findIndex(a => a.id === id)
    if (index !== -1) {
      URL.revokeObjectURL(videoAssets.value[index].url)
      videoAssets.value.splice(index, 1)
    }
  } else {
    const index = audioAssets.value.findIndex(a => a.id === id)
    if (index !== -1) {
      URL.revokeObjectURL(audioAssets.value[index].url)
      audioAssets.value.splice(index, 1)
    }
  }
}

// 拖拽处理
let draggedAsset: { asset: MediaAsset; type: 'video' | 'audio' } | null = null

const handleDragStart = (event: DragEvent, asset: MediaAsset, type: 'video' | 'audio') => {
  draggedAsset = { asset, type }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
  }
}

const handleTrackDrop = (event: DragEvent, trackType: 'video' | 'audio', trackIndex: number) => {
  event.preventDefault()
  if (!draggedAsset) return

  // 检查类型匹配
  if (draggedAsset.type !== trackType) {
    ElMessage.warning('素材类型不匹配')
    return
  }

  // 计算放置位置，默认从最左边开始
  const position = 0

  // 创建片段
  const clip: TimelineClip = {
    id: generateId(),
    assetId: draggedAsset.asset.id,
    name: draggedAsset.asset.name,
    url: draggedAsset.asset.url,
    type: draggedAsset.type,
    trackIndex,
    position,
    startTime: 0,
    endTime: draggedAsset.asset.duration,
    duration: draggedAsset.asset.duration,
    originalDuration: draggedAsset.asset.duration,
    volume: 100,
  }

  // 添加到对应轨道
  if (trackType === 'video') {
    videoTracks.value[trackIndex].push(clip)
    sortTrack(videoTracks.value[trackIndex])
  } else {
    audioTracks.value[trackIndex].push(clip)
    sortTrack(audioTracks.value[trackIndex])
  }

  saveHistory()
  draggedAsset = null
}

const sortTrack = (track: TimelineClip[]) => {
  track.sort((a, b) => a.position - b.position)
}

// 片段操作
const selectClip = (clip: TimelineClip) => {
  selectedClip.value = clip
}

const deselectClip = () => {
  selectedClip.value = null
}

const deleteSelectedClip = () => {
  if (!selectedClip.value) return

  const clip = selectedClip.value
  if (clip.type === 'video') {
    const track = videoTracks.value[clip.trackIndex]
    const index = track.findIndex(c => c.id === clip.id)
    if (index !== -1) track.splice(index, 1)
  } else {
    const track = audioTracks.value[clip.trackIndex]
    const index = track.findIndex(c => c.id === clip.id)
    if (index !== -1) track.splice(index, 1)
  }

  saveHistory()
  selectedClip.value = null
}

const updateClipTrim = () => {
  if (!selectedClip.value) return
  selectedClip.value.duration = selectedClip.value.endTime - selectedClip.value.startTime
}

const getClipStyle = (clip: TimelineClip) => {
  return {
    left: clip.position * pixelsPerSecond.value + 'px',
    width: clip.duration * pixelsPerSecond.value + 'px',
  }
}

// 拖拽片段
let draggingClip: { clip: TimelineClip; startX: number; startPosition: number } | null = null

const startDragClip = (event: MouseEvent, clip: TimelineClip) => {
  draggingClip = {
    clip,
    startX: event.clientX,
    startPosition: clip.position,
  }
  document.addEventListener('mousemove', handleDragClipMove)
  document.addEventListener('mouseup', handleDragClipEnd)
}

const handleDragClipMove = (event: MouseEvent) => {
  if (!draggingClip || !timelineContainer.value) return
  const rect = timelineContainer.value.getBoundingClientRect()
  const x = event.clientX - rect.left - 150
  draggingClip.clip.position = Math.max(0, x / pixelsPerSecond.value)
}

const handleDragClipEnd = () => {
  if (draggingClip) {
    const clip = draggingClip.clip
    if (clip.type === 'video') {
      sortTrack(videoTracks.value[clip.trackIndex])
    } else {
      sortTrack(audioTracks.value[clip.trackIndex])
    }
    saveHistory()
  }
  draggingClip = null
  document.removeEventListener('mousemove', handleDragClipMove)
  document.removeEventListener('mouseup', handleDragClipEnd)
}

// 裁剪片段
let trimmingClip: { clip: TimelineClip; side: 'left' | 'right'; startX: number; startTime: number; startPosition: number } | null = null

const startTrimClip = (event: MouseEvent, clip: TimelineClip, side: 'left' | 'right') => {
  trimmingClip = {
    clip,
    side,
    startX: event.clientX,
    startTime: side === 'left' ? clip.startTime : clip.endTime,
    startPosition: clip.position,
  }
  document.addEventListener('mousemove', handleTrimClipMove)
  document.addEventListener('mouseup', handleTrimClipEnd)
}

const handleTrimClipMove = (event: MouseEvent) => {
  if (!trimmingClip) return
  const deltaX = event.clientX - trimmingClip.startX
  const deltaTime = deltaX / pixelsPerSecond.value

  if (trimmingClip.side === 'left') {
    const newStartTime = Math.max(0, Math.min(trimmingClip.startTime + deltaTime, trimmingClip.clip.endTime - 0.1))
    trimmingClip.clip.startTime = newStartTime
    trimmingClip.clip.position = trimmingClip.startPosition + (newStartTime - trimmingClip.startTime)
    trimmingClip.clip.duration = trimmingClip.clip.endTime - newStartTime
  } else {
    const newEndTime = Math.max(trimmingClip.clip.startTime + 0.1, Math.min(trimmingClip.startTime + deltaTime, trimmingClip.clip.originalDuration))
    trimmingClip.clip.endTime = newEndTime
    trimmingClip.clip.duration = newEndTime - trimmingClip.clip.startTime
  }
}

const handleTrimClipEnd = () => {
  if (trimmingClip) {
    saveHistory()
    // 重新渲染帧预览
    const canvas = clipCanvasRefs.get(trimmingClip.clip.id)
    if (canvas) {
      const cacheKey = `${trimmingClip.clip.id}_${trimmingClip.clip.startTime}_${trimmingClip.clip.endTime}`
      // 清除旧缓存
      frameRenderCache.forEach((_, key) => {
        if (key.startsWith(trimmingClip.clip.id)) {
          frameRenderCache.delete(key)
        }
      })
      frameRenderCache.set(cacheKey, true)
      renderClipFrames(trimmingClip.clip, canvas, cacheKey)
    }
  }
  trimmingClip = null
  document.removeEventListener('mousemove', handleTrimClipMove)
  document.removeEventListener('mouseup', handleTrimClipEnd)
}

// 播放头拖拽
let draggingPlayhead = false

const startDragPlayhead = () => {
  draggingPlayhead = true
  document.addEventListener('mousemove', handlePlayheadMove)
  document.addEventListener('mouseup', handlePlayheadEnd)
}

const handlePlayheadMove = (event: MouseEvent) => {
  if (!draggingPlayhead || !timelineContainer.value) return
  const rect = timelineContainer.value.getBoundingClientRect()
  const x = event.clientX - rect.left - 150
  const time = Math.max(0, x / pixelsPerSecond.value)
  currentTime.value = time
  seekToTime(time)
}

const handlePlayheadEnd = () => {
  draggingPlayhead = false
  document.removeEventListener('mousemove', handlePlayheadMove)
  document.removeEventListener('mouseup', handlePlayheadEnd)
}

// 缩放控制
const zoomIn = () => {
  zoom.value = Math.min(zoom.value * 1.2, 5)
}

const zoomOut = () => {
  zoom.value = Math.max(zoom.value / 1.2, 0.2)
}

const resetZoom = () => {
  zoom.value = 1
}

// 轨道管理
const addAudioTrack = () => {
  audioTracks.value.push([])
  ElMessage.success('已添加音频轨道')
}

const removeAudioTrack = (trackIndex: number) => {
  if (audioTracks.value[trackIndex].length > 0) {
    ElMessage.warning('请先清空轨道内容')
    return
  }
  audioTracks.value.splice(trackIndex, 1)
}

// 播放控制
const playPreview = () => {
  if (!previewPlayer.value || !currentPreviewUrl.value) return
  isPlaying.value = true
  previewPlayer.value.play()
}

const playFromHere = () => {
  // 从当前播放头位置开始播放
  seekToTime(currentTime.value)
  playPreview()
}

const pausePreview = () => {
  if (!previewPlayer.value) return
  isPlaying.value = false
  previewPlayer.value.pause()
}

const seekToTime = (time: number) => {
  currentTime.value = time
  if (!previewPlayer.value) return

  const videoClip = videoTracks.value[0].find(
    clip => time >= clip.position && time < clip.position + clip.duration
  )

  if (videoClip) {
    // 更新视频源（如果需要）
    if (previewPlayer.value.src !== videoClip.url) {
      previewPlayer.value.src = videoClip.url
      previewPlayer.value.load()
    }
    const offsetInClip = time - videoClip.position
    previewPlayer.value.currentTime = videoClip.startTime + offsetInClip
  }
}

const handleVideoLoaded = () => {
  if (previewPlayer.value && currentPreviewUrl.value) {
    seekToTime(currentTime.value)
  }
}

const handleTimeUpdate = () => {
  if (!isPlaying.value || !previewPlayer.value) return

  const videoClip = videoTracks.value[0].find(
    clip => currentTime.value >= clip.position && currentTime.value < clip.position + clip.duration
  )

  if (videoClip) {
    const videoTime = previewPlayer.value.currentTime
    const clipOffset = videoTime - videoClip.startTime
    currentTime.value = videoClip.position + clipOffset

    if (videoTime >= videoClip.endTime - 0.05) {
      // 切换到下一个片段或停止
      const nextClip = videoTracks.value[0].find(c => c.position > videoClip.position + videoClip.duration)
      if (nextClip) {
        currentTime.value = nextClip.position
        seekToTime(nextClip.position)
      } else {
        pausePreview()
      }
    }
  }
}

const handleVideoEnded = () => {
  pausePreview()
}

// 历史记录管理
const saveHistory = () => {
  // 深拷贝当前状态
  const state: HistoryState = {
    videoTracks: JSON.parse(JSON.stringify(videoTracks.value)),
    audioTracks: JSON.parse(JSON.stringify(audioTracks.value)),
  }

  // 如果当前不在历史记录末尾，删除后面的记录
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }

  history.value.push(state)
  historyIndex.value = history.value.length - 1

  // 限制历史记录大小
  if (history.value.length > maxHistorySize) {
    history.value.shift()
    historyIndex.value--
  }
}

const undo = () => {
  if (!canUndo.value) return
  historyIndex.value--
  restoreHistory()
}

const redo = () => {
  if (!canRedo.value) return
  historyIndex.value++
  restoreHistory()
}

const restoreHistory = () => {
  const state = history.value[historyIndex.value]
  if (state) {
    videoTracks.value = JSON.parse(JSON.stringify(state.videoTracks))
    audioTracks.value = JSON.parse(JSON.stringify(state.audioTracks))
    selectedClip.value = null
  }
}

// 渲染视频帧预览
const renderClipFrames = async (clip: TimelineClip, canvas: HTMLCanvasElement, cacheKey?: string) => {
  if (clip.type !== 'video') return

  const video = document.createElement('video')
  video.src = clip.url
  video.preload = 'metadata'

  await new Promise((resolve) => {
    video.onloadedmetadata = resolve
  })

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 设置canvas尺寸
  const clipWidth = clip.duration * pixelsPerSecond.value
  canvas.width = clipWidth
  canvas.height = 36

  // 计算需要渲染的帧数
  const frameCount = Math.min(Math.ceil(clipWidth / 40), 20) // 每40px一帧，最多20帧
  const timeStep = clip.duration / frameCount

  // 渲染每一帧
  for (let i = 0; i < frameCount; i++) {
    const time = clip.startTime + i * timeStep
    video.currentTime = time

    await new Promise((resolve) => {
      video.onseeked = resolve
    })

    const x = (clipWidth / frameCount) * i
    const w = clipWidth / frameCount
    const h = 36

    // 计算视频宽高比
    const videoAspect = video.videoWidth / video.videoHeight
    const canvasAspect = w / h

    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight

    if (videoAspect > canvasAspect) {
      // 视频更宽，裁剪左右
      sw = video.videoHeight * canvasAspect
      sx = (video.videoWidth - sw) / 2
    } else {
      // 视频更高，裁剪上下
      sh = video.videoWidth / canvasAspect
      sy = (video.videoHeight - sh) / 2
    }

    ctx.drawImage(video, sx, sy, sw, sh, x, 0, w, h)
  }
}

// 转场效果
const getTransitionStyle = (prevClip: TimelineClip, nextClip: TimelineClip) => {
  const position = prevClip.position + prevClip.duration
  return {
    left: 150 + position * pixelsPerSecond.value - 12 + 'px',
  }
}

const getTransitionLabel = (clip: TimelineClip) => {
  if (!clip.transition || clip.transition.type === 'none') {
    return '无转场'
  }
  const labels: Record<string, string> = {
    fade: '淡入淡出',
    dissolve: '溶解',
    wipe: '擦除',
    slide: '滑动',
  }
  return labels[clip.transition.type] || clip.transition.type
}

const openTransitionDialog = (prevClip: TimelineClip, nextClip: TimelineClip) => {
  editingTransitionClips.value = { prev: prevClip, next: nextClip }
  editingTransition.value = {
    type: prevClip.transition?.type || 'fade',
    duration: prevClip.transition?.duration || 1.0,
  }
  transitionDialogVisible.value = true
}

const applyTransition = () => {
  if (editingTransitionClips.value.prev) {
    editingTransitionClips.value.prev.transition = {
      type: editingTransition.value.type,
      duration: editingTransition.value.duration,
    }
    saveHistory()
  }
  transitionDialogVisible.value = false
}

// 剪切片段
const cutClip = () => {
  if (!selectedClip.value) return

  const clip = selectedClip.value
  const cutTime = currentTime.value

  // 检查播放头是否在片段内
  if (cutTime <= clip.position || cutTime >= clip.position + clip.duration) {
    ElMessage.warning('请将播放头移动到要剪切的片段内部')
    return
  }

  // 计算剪切点在片段内的偏移
  const offsetInClip = cutTime - clip.position
  const cutTimeInOriginal = clip.startTime + offsetInClip

  // 创建第二个片段
  const secondClip: TimelineClip = {
    id: generateId(),
    assetId: clip.assetId,
    name: clip.name,
    url: clip.url,
    type: clip.type,
    trackIndex: clip.trackIndex,
    position: cutTime,
    startTime: cutTimeInOriginal,
    endTime: clip.endTime,
    duration: clip.endTime - cutTimeInOriginal,
    originalDuration: clip.originalDuration,
    volume: clip.volume,
  }

  // 修改第一个片段
  clip.endTime = cutTimeInOriginal
  clip.duration = cutTimeInOriginal - clip.startTime

  // 添加第二个片段到轨道
  if (clip.type === 'video') {
    videoTracks.value[clip.trackIndex].push(secondClip)
    sortTrack(videoTracks.value[clip.trackIndex])
  } else {
    audioTracks.value[clip.trackIndex].push(secondClip)
    sortTrack(audioTracks.value[clip.trackIndex])
  }

  saveHistory()

  // 重新渲染帧预览（如果是视频）
  if (clip.type === 'video') {
    const canvas1 = clipCanvasRefs.get(clip.id)
    if (canvas1) {
      frameRenderCache.forEach((_, key) => {
        if (key.startsWith(clip.id)) {
          frameRenderCache.delete(key)
        }
      })
      const cacheKey = `${clip.id}_${clip.startTime}_${clip.endTime}`
      frameRenderCache.set(cacheKey, true)
      renderClipFrames(clip, canvas1, cacheKey)
    }
  }

  ElMessage.success('片段已剪切')
}

// 导出视频
const exportVideo = () => {
  ElMessage.info('导出功能需要集成 FFmpeg，请参考现有的视频合并功能')
}

// 初始化
onMounted(() => {
  // 保存初始状态
  saveHistory()
})

// 清理
onUnmounted(() => {
  videoAssets.value.forEach(asset => URL.revokeObjectURL(asset.url))
  audioAssets.value.forEach(asset => URL.revokeObjectURL(asset.url))
})
</script>

<style scoped lang="scss">
.video-clip-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--el-bg-color);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--el-bg-color-overlay);
  border-bottom: 1px solid var(--el-border-color);

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
}

.editor-workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.media-panel {
  width: 280px;
  border-right: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-overlay);

  .panel-header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color);

    h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
    }
  }

  .media-section {
    flex: 1;
    overflow-y: auto;
    padding: 12px;

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .media-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .media-item {
      border: 1px solid var(--el-border-color);
      border-radius: 8px;
      overflow: hidden;
      cursor: grab;
      transition: all 0.2s;

      &:hover {
        border-color: var(--el-color-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      &:active {
        cursor: grabbing;
      }

      .media-thumbnail {
        position: relative;
        width: 100%;
        height: 120px;
        background: #000;

        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .media-duration {
          position: absolute;
          bottom: 4px;
          right: 4px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
        }
      }

      &.audio-item .media-thumbnail {
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .media-info {
        padding: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .media-name {
          flex: 1;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .media-duration {
          font-size: 12px;
          color: var(--el-text-color-secondary);
          margin-right: 8px;
        }
      }
    }

    .empty-state {
      padding: 20px;
    }
  }
}

.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;

  .preview-container {
    flex: 1;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    .preview-video {
      max-width: 100%;
      max-height: 100%;
    }

    .preview-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
    }
  }

  .preview-controls {
    margin-top: 16px;

    .time-display {
      text-align: center;
      margin-bottom: 8px;
      font-family: monospace;
      font-size: 14px;
    }
  }
}

.properties-panel {
  width: 300px;
  border-left: 1px solid var(--el-border-color);
  background: var(--el-bg-color-overlay);
  display: flex;
  flex-direction: column;

  .panel-header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color);

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }

  .properties-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.timeline-area {
  height: 400px;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-bg-color-overlay);
  display: flex;
  flex-direction: column;

  .timeline-toolbar {
    display: flex;
    gap: 16px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color);

    .playback-controls,
    .history-controls,
    .zoom-controls,
    .track-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .timeline-container {
    flex: 1;
    overflow: auto;
    position: relative;
  }

  .timeline-ruler {
    height: 30px;
    position: relative;
    background: var(--el-fill-color-light);
    border-bottom: 1px solid var(--el-border-color);

    .ruler-tick {
      position: absolute;
      bottom: 0;
      width: 1px;
      background: var(--el-border-color);

      &.major {
        height: 100%;
        background: var(--el-border-color);

        &::after {
          content: attr(data-time);
          position: absolute;
          top: 2px;
          left: 4px;
          font-size: 11px;
          color: var(--el-text-color-secondary);
        }
      }

      &.medium {
        height: 50%;
        background: var(--el-border-color-light);
      }

      &.minor {
        height: 30%;
        background: var(--el-border-color-lighter);
      }
    }

    .tick-label {
      position: absolute;
      top: 2px;
      left: 4px;
      font-size: 11px;
      color: var(--el-text-color-secondary);
      white-space: nowrap;
    }
  }

  .playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 100;
    pointer-events: none;

    .playhead-line {
      width: 2px;
      height: 100%;
      background: var(--el-color-primary);
      pointer-events: auto;
    }

    .playhead-handle {
      position: absolute;
      top: 0;
      left: -6px;
      width: 14px;
      height: 14px;
      background: var(--el-color-primary);
      border-radius: 50%;
      cursor: grab;
      pointer-events: auto;

      &:active {
        cursor: grabbing;
      }
    }
  }

  .tracks-container {
    .track {
      display: flex;
      border-bottom: 1px solid var(--el-border-color);

      .track-header {
        width: 150px;
        padding: 0 12px;
        background: var(--el-bg-color-overlay);
        border-right: 1px solid var(--el-border-color);
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 500;
      }

      .track-content {
        flex: 1;
        height: 36px;
        position: relative;
        background: var(--el-bg-color);

        .clip {
          position: absolute;
          top: 0;
          height: 36px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 4px;
          overflow: hidden;
          cursor: move;
          transition: box-shadow 0.2s;

          &:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }

          &.selected {
            box-shadow: 0 0 0 2px var(--el-color-primary);
          }

          .clip-content {
            position: relative;
            height: 100%;
            color: white;

            .clip-frames {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .clip-waveform {
              width: 48px;
              height: 48px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 4px;
              margin-right: 8px;
            }

            .clip-name {
              position: absolute;
              bottom: 2px;
              left: 4px;
              right: 4px;
              font-size: 10px;
              background: rgba(0, 0, 0, 0.6);
              padding: 1px 3px;
              border-radius: 2px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }

          .clip-handle {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 8px;
            background: rgba(255, 255, 255, 0.3);
            cursor: ew-resize;
            opacity: 0;
            transition: opacity 0.2s;

            &:hover {
              background: rgba(255, 255, 255, 0.5);
            }

            &.clip-handle-left {
              left: 0;
            }

            &.clip-handle-right {
              right: 0;
            }
          }

          &:hover .clip-handle {
            opacity: 1;
          }
        }

        .audio-clip {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .transition-indicator {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          background: var(--el-color-warning);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: all 0.2s;

          &:hover {
            transform: translateY(-50%) scale(1.2);
            background: var(--el-color-warning-light-3);
          }

          .el-icon {
            color: white;
            font-size: 14px;
          }
        }
      }

      &.video-track .track-header {
        color: #667eea;
      }

      &.audio-track .track-header {
        color: #f5576c;
      }
    }
  }
}
</style>
