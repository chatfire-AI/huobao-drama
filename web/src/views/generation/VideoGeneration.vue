<template>
  <div class="video-generation-container">
    <el-page-header @back="goBack" class="page-header">
      <template #content>
        <div class="header-content">
          <h2>{{ $t('video.title') }}</h2>
        </div>
      </template>
      <template #extra>
        <el-button type="primary" @click="showGenerateDialog = true">
          <el-icon><VideoPlay /></el-icon>
          {{ $t('video.generate') }}
        </el-button>
      </template>
    </el-page-header>

    <el-card shadow="never" class="filter-card">
      <el-form inline>
        <el-form-item :label="$t('video.filter.drama')">
          <el-select v-model="filters.drama_id" :placeholder="$t('video.filter.allDramas')" clearable>
            <el-option
              v-for="drama in dramas"
              :key="drama.id"
              :label="drama.title"
              :value="drama.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('video.filter.status')">
          <el-select v-model="filters.status" :placeholder="$t('video.filter.allStatus')" clearable>
            <el-option :label="$t('video.status.processing')" value="processing" />
            <el-option :label="$t('video.status.completed')" value="completed" />
            <el-option :label="$t('video.status.failed')" value="failed" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadVideos">{{ $t('video.filter.query') }}</el-button>
          <el-button @click="resetFilters">{{ $t('video.filter.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" v-loading="loading">
      <el-col
        v-for="video in videos"
        :key="video.id"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
      >
        <el-card class="video-card" shadow="hover">
          <div class="video-wrapper">
            <video
              v-if="video.status === 'completed' && video.video_url"
              :src="video.video_url"
              class="video-player"
              controls
              :poster="video.first_frame_url"
            >
              您的浏览器不支持视频播放
            </video>

            <div v-else-if="video.status === 'processing'" class="video-placeholder processing">
              <el-icon class="loading-icon"><Loading /></el-icon>
              <span>生成中...</span>
              <div class="progress-text">预计需要 1-3 分钟</div>
            </div>

            <div v-else-if="video.status === 'failed'" class="video-placeholder failed">
              <el-icon><CircleClose /></el-icon>
              <span>生成失败</span>
            </div>

            <div v-else class="video-placeholder">
              <el-icon><VideoCamera /></el-icon>
              <span>等待生成</span>
            </div>

            <div class="video-overlay">
              <el-tag :type="getStatusType(video.status)" size="small">
                {{ getStatusText(video.status) }}
              </el-tag>
              <el-tag v-if="video.duration" size="small" class="duration-tag">
                {{ video.duration }}s
              </el-tag>
            </div>
          </div>

          <div class="video-info">
            <div class="prompt-text">{{ truncateText(video.prompt, 60) }}</div>
            <div class="meta-info">
              <span class="provider-tag">
                <el-tag size="small" effect="plain">{{ video.provider }}</el-tag>
              </span>
              <span class="time-text">{{ formatTime(video.created_at) }}</span>
            </div>
            <div v-if="video.aspect_ratio || video.resolution" class="specs-info">
              <span v-if="video.aspect_ratio" class="spec-item">{{ video.aspect_ratio }}</span>
              <span v-if="video.resolution" class="spec-item">{{ video.resolution }}</span>
            </div>
          </div>

          <template #footer>
            <div class="card-actions">
              <el-button text size="small" @click="viewDetails(video)">
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button
                v-if="video.status === 'completed'"
                text
                size="small"
                @click="downloadVideo(video)"
              >
                <el-icon><Download /></el-icon>
                下载
              </el-button>
              <el-popconfirm
                title="确定删除该视频吗？"
                @confirm="deleteVideo(video.id)"
              >
                <template #reference>
                  <el-button text size="small" type="danger">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="!loading && videos.length === 0" description="暂无视频，开始生成吧！" />

    <el-pagination
      v-if="total > 0"
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.page_size"
      :total="total"
      :page-sizes="[12, 24, 36, 48]"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="loadVideos"
      @size-change="loadVideos"
      class="pagination"
    />

    <GenerateVideoDialog
      v-model="showGenerateDialog"
      :drama-id="filters.drama_id"
      @success="loadVideos"
    />

    <VideoDetailDialog
      v-model="showDetailDialog"
      :video="selectedVideo"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  VideoPlay, VideoCamera, Loading, CircleClose,
  View, Download, Delete
} from '@element-plus/icons-vue'
import { videoAPI } from '@/api/video'
import { dramaAPI } from '@/api/drama'
import type { VideoGeneration, VideoStatus } from '@/types/video'
import type { Drama } from '@/types/drama'
import GenerateVideoDialog from './components/GenerateVideoDialog.vue'
import VideoDetailDialog from './components/VideoDetailDialog.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const videos = ref<VideoGeneration[]>([])
const dramas = ref<Drama[]>([])
const total = ref(0)
const showGenerateDialog = ref(false)
const showDetailDialog = ref(false)
const selectedVideo = ref<VideoGeneration>()
let pollInterval: ReturnType<typeof setInterval> | null = null

const filters = reactive({
  drama_id: undefined as string | undefined,
  status: undefined as VideoStatus | undefined
})

const pagination = reactive({
  page: 1,
  page_size: 12
})

const loadVideos = async () => {
  loading.value = true
  try {
    const result = await videoAPI.listVideos({
      drama_id: filters.drama_id,
      status: filters.status,
      page: pagination.page,
      page_size: pagination.page_size
    })
    videos.value = result.items
    total.value = result.pagination.total
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const loadDramas = async () => {
  try {
    const result = await dramaAPI.list({ page: 1, page_size: 100 })
    dramas.value = result.items
  } catch (error: any) {
    console.error('Failed to load dramas:', error)
  }
}

const resetFilters = () => {
  filters.drama_id = undefined
  filters.status = undefined
  pagination.page = 1
  loadVideos()
}

const viewDetails = (video: VideoGeneration) => {
  selectedVideo.value = video
  showDetailDialog.value = true
}

const downloadVideo = (video: VideoGeneration) => {
  if (!video.video_url) return
  window.open(video.video_url, '_blank')
}

const deleteVideo = async (id: number) => {
  try {
    await videoAPI.deleteVideo(id)
    ElMessage.success('删除成功')
    loadVideos()
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败')
  }
}

const getStatusType = (status: VideoStatus) => {
  const types: Record<VideoStatus, any> = {
    pending: 'info',
    processing: 'warning',
    completed: 'success',
    failed: 'danger'
  }
  return types[status]
}

const getStatusText = (status: VideoStatus) => {
  const texts: Record<VideoStatus, string> = {
    pending: '等待中',
    processing: '生成中',
    completed: '已完成',
    failed: '失败'
  }
  return texts[status]
}

const truncateText = (text: string, length: number) => {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString('zh-CN')
}

const goBack = () => {
  router.back()
}

const startPolling = () => {
  pollInterval = setInterval(() => {
    const hasProcessing = videos.value.some(v => v.status === 'processing')
    if (hasProcessing) {
      loadVideos()
    }
  }, 10000)
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

onMounted(() => {
  const dramaId = route.query.drama_id as string
  if (dramaId) {
    filters.drama_id = dramaId
  }
  
  loadDramas()
  loadVideos()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.video-generation-container {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.header-content h2 {
  margin: 0;
  font-size: 24px;
}

.filter-card {
  margin-bottom: 20px;
}

.video-card {
  margin-bottom: 16px;
  transition: all 0.3s;
}

.video-card:hover {
  transform: translateY(-4px);
}

.video-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  overflow: hidden;
  border-radius: 8px;
  background: #000;
}

.video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
  background: #1a1a1a;
}

.video-placeholder .el-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.video-placeholder.processing {
  color: #e6a23c;
}

.video-placeholder.failed {
  color: #f56c6c;
}

.progress-text {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.loading-icon {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.video-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.duration-tag {
  background: rgba(0, 0, 0, 0.6) !important;
  color: #fff !important;
  border: none;
}

.video-info {
  padding: 12px 0;
}

.prompt-text {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  line-height: 1.5;
  min-height: 42px;
}

.meta-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.specs-info {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #999;
}

.spec-item {
  padding: 2px 6px;
  background: #f5f7fa;
  border-radius: 3px;
}

.card-actions {
  display: flex;
  justify-content: space-around;
  gap: 8px;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
</style>
