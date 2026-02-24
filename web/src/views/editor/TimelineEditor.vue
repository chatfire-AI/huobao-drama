<template>
  <div class="timeline-editor-page">
    <div class="editor-header">
      <el-button link @click="goBack" class="back-button">
        <el-icon><ArrowLeft /></el-icon>
        {{ $t('timeline.backToEditor') }}
      </el-button>
      <h2>{{ $t('timeline.title') }}</h2>
    </div>
    
    <div class="editor-content">
      <VideoTimelineEditor
        v-if="scenes.length > 0"
        :scenes="scenes"
        :episode-id="episodeId"
        :drama-id="dramaId"
      />
      <el-empty v-else :description="$t('timeline.noScenes')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { dramaAPI } from '@/api/drama'
import VideoTimelineEditor from '@/components/editor/VideoTimelineEditor.vue'

const route = useRoute()
const router = useRouter()
const { t: $t } = useI18n()

const episodeId = route.params.id as string
const dramaId = (route.params.dramaId as string) || ''
const scenes = ref<any[]>([])

const loadScenes = async () => {
  try {
    const res = await dramaAPI.getStoryboards(episodeId)
    scenes.value = (res as any).storyboards || []
  } catch (error: any) {
    ElMessage.error($t('timeline.loadFailed'))
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadScenes()
})
</script>

<style scoped lang="scss">
.timeline-editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;

  .editor-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 24px;
    background: white;
    border-bottom: 1px solid #e4e7ed;

    .back-button {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #606266;
      font-size: 14px;
      
      &:hover {
        color: #409eff;
      }
    }

    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }
  }

  .editor-content {
    flex: 1;
    overflow: hidden;
  }
}
</style>
