<template>
  <div class="video-timeline-editor">
    <!-- 顶部工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-button-group>
          <el-button
            :icon="VideoPlay"
            @click="playTimeline"
            :disabled="timelineClips.length === 0"
            >{{ $t("common.play") }}</el-button
          >
          <el-button :icon="VideoPause" @click="pauseTimeline">{{
            $t("common.pause")
          }}</el-button>
        </el-button-group>
        <span class="time-display"
          >{{ formatTime(currentTime) }} / {{ formatTime(totalDuration) }}</span
        >
      </div>
      <div class="toolbar-right">
        <el-button
          type="primary"
          :icon="VideoCamera"
          @click="submitTimelineForMerge"
          :disabled="timelineClips.length === 0"
          :loading="serverMerging"
        >
          {{ $t("video.merge") }}
        </el-button>
      </div>
    </div>

    <!-- 主工作区 -->
    <div class="editor-workspace">
      <!-- 预览区域 -->
      <div class="preview-panel">
        <div class="video-preview" @click="togglePlay">
          <video
            ref="previewPlayer"
            :src="currentPreviewUrl"
            @loadedmetadata="handlePreviewLoaded"
            @timeupdate="handlePreviewTimeUpdate"
            @ended="handlePreviewEnded"
          />
          <!-- 音频播放器（隐藏） -->
          <audio
            ref="audioPlayer"
            :src="currentAudioUrl"
            @loadedmetadata="handleAudioLoaded"
            @ended="handleAudioEnded"
            style="display: none"
          />
          <!-- 转场效果层 -->
          <div
            v-if="transitionState.active"
            class="transition-overlay"
            :class="[
              `transition-${transitionState.type}`,
              {
                'transition-in': transitionState.phase === 'in',
                'transition-out': transitionState.phase === 'out',
              },
            ]"
            :style="{ animationDuration: transitionState.duration + 's' }"
          ></div>
          <!-- 播放/暂停图标覆盖层 -->
          <div
            class="video-play-overlay"
            :class="{ hidden: isPlaying }"
            v-if="currentPreviewUrl"
          >
            <el-icon :size="64"><VideoPlay /></el-icon>
          </div>
          <div class="preview-overlay" v-if="!currentPreviewUrl">
            <el-empty :description="$t('video.dragToTimeline')" />
          </div>
        </div>
        <div class="preview-controls">
          <el-slider
            v-model="currentTime"
            :max="totalDuration"
            :step="0.1"
            @change="seekToTime"
          />
        </div>
      </div>

      <!-- 素材库 -->
      <div class="media-library">
        <div class="library-header">
          <div class="header-left">
            <h4>{{ $t("video.mediaLibrary") }}</h4>
            <span>{{
              $t("video.videoCount", { count: availableStoryboards.length })
            }}</span>
          </div>
          <el-button
            type="primary"
            size="small"
            :icon="FolderAdd"
            @click="addAllScenesInOrder"
            :disabled="availableStoryboards.length === 0"
          >
            {{ $t("common.addAll") }}
          </el-button>
        </div>
        <div class="media-grid">
          <div
            v-for="scene in availableStoryboards"
            :key="scene.id"
            class="media-item"
            draggable="true"
            @dragstart="handleDragStart($event, scene)"
          >
            <div class="media-thumbnail" @click="previewScene(scene)">
              <video :src="scene.video_url" />
              <div class="media-duration">
                {{ scene.duration > 0 ? scene.duration.toFixed(1) : "?" }}s
              </div>
              <el-button
                class="delete-btn"
                type="danger"
                size="small"
                :icon="Delete"
                circle
                @click.stop="deleteAsset(scene)"
              />
              <div class="media-overlay">
                <el-button
                  type="primary"
                  size="small"
                  :icon="Plus"
                  @click.stop="addClipToTimeline(scene)"
                >
                  {{ $t("common.addToTimeline") }}
                </el-button>
              </div>
            </div>
            <div class="media-info">
              <div class="media-title">
                {{ $t("storyboard.shot") }} #{{
                  scene.storyboard_num || scene.asset_id
                }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 时间线区域 -->
    <div class="timeline-panel">
      <div class="timeline-header">
        <div class="zoom-controls">
          <el-button-group size="small">
            <el-button @click="zoomOut">-</el-button>
            <el-button @click="zoomReset">{{ $t("common.reset") }}</el-button>
            <el-button @click="zoomIn">+</el-button>
          </el-button-group>
          <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
        </div>
      </div>

      <div class="timeline-container" ref="timelineContainer">
        <!-- 时间标尺 -->
        <div class="timeline-ruler" :style="{ width: timelineWidth + 'px' }">
          <div
            v-for="tick in timeRulerTicks"
            :key="tick.time"
            class="ruler-tick"
            :style="{ left: tick.position + 'px' }"
          >
            <div class="tick-mark" :class="tick.type"></div>
            <div class="tick-label" v-if="tick.type === 'major'">
              {{ formatTime(tick.time) }}
            </div>
          </div>
        </div>

        <!-- 播放头 -->
        <div class="playhead" :style="{ left: playheadPosition + 'px' }">
          <div class="playhead-line"></div>
          <div class="playhead-handle"></div>
        </div>

        <!-- 视频轨道 -->
        <div
          class="timeline-track"
          :style="{ width: timelineWidth + 'px' }"
          @drop="handleTrackDrop($event)"
          @dragover.prevent
          @click="clickTimeline($event)"
        >
          <div class="track-label">
            <span>{{ $t("video.videoTrack") }}</span>
            <el-button
              type="text"
              size="small"
              @click.stop="clearAllClips"
              :disabled="timelineClips.length === 0"
              :title="$t('video.clearTrack')"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <div class="track-clips">
            <!-- 视频片段 -->
            <div
              v-for="(clip, index) in timelineClips"
              :key="clip.id"
              class="track-clip"
              :class="{ selected: selectedClipId === clip.id }"
              :style="getClipStyle(clip)"
              @click.stop="selectClip(clip)"
              @mousedown="startDragClip($event, clip)"
            >
              <div class="clip-content">
                <div class="clip-thumbnail">
                  <video :src="clip.video_url" />
                </div>
                <div class="clip-info">
                  <div class="clip-title">
                    {{ $t("storyboard.scene") }} {{ clip.storyboard_number }}
                  </div>
                  <div class="clip-duration">
                    {{ clip.duration.toFixed(1) }}s
                  </div>
                </div>
              </div>
              <div
                class="clip-resize-left"
                @mousedown.stop="startResizeClip($event, clip, 'left')"
              ></div>
              <div
                class="clip-resize-right"
                @mousedown.stop="startResizeClip($event, clip, 'right')"
              ></div>
              <div class="clip-remove" @click.stop="removeClip(clip)">
                <el-icon><Close /></el-icon>
              </div>
            </div>

            <!-- 转场指示器 -->
            <div
              v-for="(clip, index) in timelineClips.slice(1)"
              :key="'transition-' + clip.id"
              class="transition-indicator"
              :style="getTransitionStyle(clip)"
              @click.stop="openTransitionDialog(timelineClips[index])"
            >
              <el-icon><connection /></el-icon>
              <span class="transition-label">{{
                getTransitionLabel(timelineClips[index])
              }}</span>
            </div>
          </div>
        </div>

        <!-- 音频轨道 -->
        <div
          v-if="showAudioTrack"
          class="timeline-track audio-track"
          :style="{ width: timelineWidth + 'px' }"
          @click="clickTimeline($event)"
        >
          <div class="track-label">
            <span>{{ $t("video.audioTrack") }}</span>
            <el-button
              type="text"
              size="small"
              @click.stop="extractAllAudio"
              :disabled="timelineClips.length === 0"
              :title="$t('video.extractAudio')"
            >
              <el-icon><Headset /></el-icon>
            </el-button>
          </div>
          <div class="track-clips">
            <!-- 音频片段 -->
            <div
              v-for="audio in audioClips"
              :key="audio.id"
              class="track-clip audio-clip"
              :class="{ selected: selectedAudioClipId === audio.id }"
              :style="getClipStyle(audio)"
              @click.stop="selectAudioClip(audio)"
              @mousedown="startDragAudioClip($event, audio)"
            >
              <div class="clip-content">
                <div class="audio-waveform">
                  <el-icon><Microphone /></el-icon>
                </div>
                <div class="clip-info">
                  <div class="clip-title">
                    {{ $t("video.audio") }} {{ audio.order + 1 }}
                  </div>
                  <div class="clip-duration">
                    {{ audio.duration.toFixed(1) }}s
                  </div>
                </div>
              </div>
              <div
                class="clip-resize-left"
                @mousedown.stop="startResizeAudioClip($event, audio, 'left')"
              ></div>
              <div
                class="clip-resize-right"
                @mousedown.stop="startResizeAudioClip($event, audio, 'right')"
              ></div>
              <div class="clip-remove" @click.stop="removeAudioClip(audio)">
                <el-icon><Close /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 转场设置对话框 -->
    <el-dialog
      v-model="transitionDialogVisible"
      title="设置转场效果"
      width="500px"
    >
      <el-form label-width="100px">
        <el-form-item :label="$t('video.transitionType')">
          <el-select
            v-model="editingTransition.type"
            :placeholder="$t('video.selectTransition')"
          >
            <el-option label="无转场" value="none" />
            <!-- 淡入淡出类 -->
            <el-option label="淡入淡出" value="fade" />
            <el-option label="黑场过渡" value="fadeblack" />
            <el-option label="白场过渡" value="fadewhite" />
            <el-option label="灰场过渡" value="fadegrays" />
            <!-- 滑动类 -->
            <el-option label="左滑" value="slideleft" />
            <el-option label="右滑" value="slideright" />
            <el-option label="上滑" value="slideup" />
            <el-option label="下滑" value="slidedown" />
            <!-- 擦除类 -->
            <el-option label="左擦除" value="wipeleft" />
            <el-option label="右擦除" value="wiperight" />
            <el-option label="上擦除" value="wipeup" />
            <el-option label="下擦除" value="wipedown" />
            <!-- 圆形类 -->
            <el-option label="圆形展开" value="circleopen" />
            <el-option label="圆形收缩" value="circleclose" />
            <!-- 其他特效 -->
            <el-option label="溶解" value="dissolve" />
            <el-option label="距离" value="distance" />
            <el-option label="水平打开" value="horzopen" />
            <el-option label="水平关闭" value="horzclose" />
            <el-option label="垂直打开" value="vertopen" />
            <el-option label="垂直关闭" value="vertclose" />
          </el-select>
        </el-form-item>
        <el-form-item
          :label="$t('video.transitionDuration')"
          v-if="editingTransition.type !== 'none'"
        >
          <el-slider
            v-model="editingTransition.duration"
            :min="0.3"
            :max="3"
            :step="0.1"
            show-input
            :format-tooltip="(val: number) => val.toFixed(1) + 's'"
          />
        </el-form-item>
        <el-alert
          v-if="editingTransition.type !== 'none'"
          title="注意：添加转场效果需要重新编码视频，处理时间会更长"
          type="warning"
          :closable="false"
          show-icon
        />
      </el-form>
      <template #footer>
        <el-button @click="transitionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="applyTransition">确定</el-button>
      </template>
    </el-dialog>

    <!-- 合并进度对话框 -->
    <el-dialog
      v-model="mergeDialogVisible"
      title="视频合并中"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="!merging"
    >
      <div class="merge-progress-container">
        <div class="progress-info">
          <div class="progress-phase">
            <el-tag :type="getPhaseType(mergeProgressDetail.phase)">
              {{ getPhaseText(mergeProgressDetail.phase) }}
            </el-tag>
          </div>
          <div class="progress-message">{{ mergeProgressDetail.message }}</div>
        </div>

        <el-progress
          :percentage="mergeProgressDetail.progress"
          :status="
            mergeProgressDetail.phase === 'completed' ? 'success' : undefined
          "
          :stroke-width="20"
        />

        <div class="progress-tips">
          <p v-if="mergeProgressDetail.phase === 'loading'">
            <el-icon><Loading /></el-icon>
            正在加载FFmpeg引擎（首次需要下载约30MB）...
          </p>
          <p v-else-if="mergeProgressDetail.phase === 'processing'">
            <el-icon><Download /></el-icon>
            正在处理视频文件，请稍候...
          </p>
          <p v-else-if="mergeProgressDetail.phase === 'encoding'">
            <el-icon><VideoCamera /></el-icon>
            正在编码合并视频，可能需要几分钟...
          </p>
          <p v-else-if="mergeProgressDetail.phase === 'completed'">
            <el-icon><Check /></el-icon>
            合并完成！视频已自动下载。
          </p>
        </div>
      </div>

      <template #footer v-if="!merging">
        <el-button @click="mergeDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  VideoPlay,
  VideoPause,
  Plus,
  FolderAdd,
  ArrowLeft,
  ArrowRight,
  Scissor,
  Connection,
  Setting,
  ZoomIn,
  ZoomOut,
  Refresh,
  Download,
  Delete,
  Close,
  VideoCamera,
  Check,
  Loading,
  Headset,
  Microphone,
} from "@element-plus/icons-vue";
import { videoMerger, type MergeProgress } from "@/utils/videoMerger";
import { trimAndMergeVideos } from "@/utils/ffmpeg";
import { getVideoUrl } from "@/utils/image";

interface Scene {
  id: string;
  storyboard_id: string;
  storyboard_number: number;
  title?: string;
  description?: string;
  location?: string;
  time?: string;
  video_url: string;
  asset_id?: string;
  duration?: number;
}

interface TimelineClip {
  id: string;
  storyboard_id: string;
  storyboard_number: number;
  video_url: string;
  asset_id?: string; // 素材库中的资源ID
  start_time: number;
  end_time: number;
  duration: number;
  position: number; // 在时间线上的位置（秒）
  order: number;
  transition?: {
    type:
      | "fade"
      | "fadeblack"
      | "fadewhite"
      | "fadegrays"
      | "slideleft"
      | "slideright"
      | "slideup"
      | "slidedown"
      | "wipeleft"
      | "wiperight"
      | "wipeup"
      | "wipedown"
      | "circleopen"
      | "circleclose"
      | "dissolve"
      | "distance"
      | "horzopen"
      | "horzclose"
      | "vertopen"
      | "vertclose"
      | "none";
    duration: number;
  };
  audio_url?: string; // 提取的音频URL
  muted?: boolean; // 是否静音
}

interface AudioClip {
  id: string;
  source_clip_id: string; // 关联的视频片段ID
  audio_url: string;
  start_time: number;
  end_time: number;
  duration: number;
  position: number;
  order: number;
  volume: number; // 音量 0-1
}

const props = defineProps<{
  scenes: Scene[];
  episodeId: string;
  dramaId: string;
  assets?: any[];
}>();

const emit = defineEmits<{
  (e: "merge-completed", mergeId: number): void;
  (e: "asset-deleted"): void;
}>();

// 基础状态
const availableStoryboards = computed(() => {
  const assets = (props.assets || [])
    .filter((a) => {
      const isValid = a.type === "video" && a.url;
      return isValid;
    })
    .map((a) => ({
      id: `asset_${a.id}`,
      storyboard_number: a.storyboard_num || a.id,
      storyboard_num: a.storyboard_num,
      storyboard_id: a.storyboard_id,
      video_url: getVideoUrl(a), // 优先使用 local_path
      duration: a.duration || 0,
      name: a.name,
      isAsset: true,
      asset_id: a.id, // 使用 asset_id 字段名
    }))
    .sort((a, b) => {
      // 优先按storyboard_num排序，如果没有则按storyboard_id排序，最后按asset id排序
      const aNum = a.storyboard_num || a.storyboard_id || a.asset_id;
      const bNum = b.storyboard_num || b.storyboard_id || b.asset_id;
      return aNum - bNum;
    });
  return assets;
});
const timelineClips = ref<TimelineClip[]>([]);
const audioClips = ref<AudioClip[]>([]);
const selectedClipId = ref<string | null>(null);
const selectedAudioClipId = ref<string | null>(null);
const previewPlayer = ref<HTMLVideoElement | null>(null);
const audioPlayer = ref<HTMLAudioElement | null>(null);
const timelineContainer = ref<HTMLElement | null>(null);
const showAudioTrack = ref(true); // 是否显示音频轨道

// 时间线状态
const currentTime = ref(0);
const zoom = ref(1); // 缩放级别
const pixelsPerSecond = computed(() => 50 * zoom.value); // 每秒对应的像素数
const isPlaying = ref(false);
const playbackTimer = ref<number | null>(null);

// 转场预览状态（必须在模板使用前定义）
const transitionState = ref({
  active: false,
  type: "fade",
  phase: "in" as "in" | "out",
  duration: 1.0,
});

// 导出状态
const merging = ref(false);
const serverMerging = ref(false);
const mergeProgress = ref(0);
const mergeDialogVisible = ref(false);
const mergeProgressDetail = ref<MergeProgress>({
  phase: "loading",
  progress: 0,
  message: "",
});

// 转场设置状态
const transitionDialogVisible = ref(false);
const editingTransitionClipId = ref<string | null>(null);
const editingTransition = ref({
  type: "fade" as
    | "fade"
    | "fadeblack"
    | "fadewhite"
    | "fadegrays"
    | "slideleft"
    | "slideright"
    | "slideup"
    | "slidedown"
    | "wipeleft"
    | "wiperight"
    | "wipeup"
    | "wipedown"
    | "circleopen"
    | "circleclose"
    | "dissolve"
    | "distance"
    | "horzopen"
    | "horzclose"
    | "vertopen"
    | "vertclose"
    | "none",
  duration: 1.0,
});

// 计算总时长
const totalDuration = computed(() => {
  if (timelineClips.value.length === 0) return 0;
  const lastClip = timelineClips.value[timelineClips.value.length - 1];
  return lastClip ? lastClip.position + lastClip.duration : 0;
});

// 工具函数
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
};

const getSceneDesc = (scene: Scene) => {
  const parts = [];
  if (scene.location) parts.push(scene.location);
  if (scene.time) parts.push(scene.time);
  return (
    parts.join(" · ") || scene.description?.slice(0, 15) + "..." || "无描述"
  );
};

// 预览相关
const currentPreviewUrl = computed(() => {
  if (timelineClips.value.length === 0) return "";
  // 根据当前时间找到应该播放的片段
  const clip = timelineClips.value.find(
    (c) =>
      currentTime.value >= c.position &&
      currentTime.value < c.position + c.duration,
  );
  return clip?.video_url || timelineClips.value[0]?.video_url || "";
});

// 当前音频URL
const currentAudioUrl = computed(() => {
  if (audioClips.value.length === 0) return "";
  // 根据当前时间找到应该播放的音频片段
  const audioClip = audioClips.value.find(
    (a) =>
      currentTime.value >= a.position &&
      currentTime.value < a.position + a.duration,
  );
  return audioClip?.audio_url || "";
});

const previewScene = (scene: Scene) => {
  if (previewPlayer.value) {
    previewPlayer.value.src = scene.video_url;
    previewPlayer.value.play();
  }
};

const handlePreviewLoaded = () => {
  // 视频加载完成后跳转到正确的时间点
  if (previewPlayer.value) {
    const clip = timelineClips.value.find(
      (c) =>
        currentTime.value >= c.position &&
        currentTime.value < c.position + c.duration,
    );
    if (clip) {
      const offsetInClip = currentTime.value - clip.position;
      previewPlayer.value.currentTime = clip.start_time + offsetInClip;
    }
  }
};

const handleAudioLoaded = () => {
  // 音频加载完成后跳转到正确的时间点
  if (audioPlayer.value && audioClips.value.length > 0) {
    const audioClip = audioClips.value.find(
      (a) =>
        currentTime.value >= a.position &&
        currentTime.value < a.position + a.duration,
    );
    if (audioClip) {
      const offsetInClip = currentTime.value - audioClip.position;
      audioPlayer.value.currentTime = audioClip.start_time + offsetInClip;
    }
  }
};

const handleAudioEnded = () => {
  // 音频自然结束，尝试播放下一个音频片段
  const currentAudio = audioClips.value.find(
    (a) =>
      currentTime.value >= a.position &&
      currentTime.value < a.position + a.duration,
  );

  if (currentAudio) {
    const currentIndex = audioClips.value.findIndex(
      (a) => a.id === currentAudio.id,
    );
    const nextAudio = audioClips.value[currentIndex + 1];

    if (nextAudio && isPlaying.value) {
      // 有下一个音频片段且正在播放，继续
      // 时间线会自动更新到下一个片段
    }
  }
};

const handlePreviewTimeUpdate = () => {
  if (!isPlaying.value || !previewPlayer.value) return;

  // 找到当前播放的片段
  const currentClip = timelineClips.value.find(
    (c) =>
      currentTime.value >= c.position &&
      currentTime.value < c.position + c.duration,
  );

  if (!currentClip) {
    pauseTimeline();
    return;
  }

  // 计算时间线上的当前位置
  const videoTime = previewPlayer.value.currentTime;
  const clipOffset = videoTime - currentClip.start_time;
  currentTime.value = currentClip.position + clipOffset;

  // 检查是否播放到片段结尾（提前0.1秒检测，避免播放完才切换）
  if (videoTime >= currentClip.end_time - 0.1) {
    // 查找下一个片段
    const currentIndex = timelineClips.value.findIndex(
      (c) => c.id === currentClip.id,
    );
    const nextClip = timelineClips.value[currentIndex + 1];

    if (nextClip) {
      // 切换到下一个片段
      switchToClip(nextClip);
    } else {
      // 没有下一个片段，停止播放
      pauseTimeline();
      currentTime.value = totalDuration.value;
    }
  }
};

const switchToClip = async (clip: TimelineClip) => {
  if (!previewPlayer.value) return;

  // 获取转场配置
  const transition = clip.transition;
  const hasTransition = transition && transition.type !== "none";
  const transitionDuration = hasTransition ? transition.duration * 1000 : 0;

  if (hasTransition) {
    // 触发转场效果
    transitionState.value = {
      active: true,
      type: transition.type,
      phase: "out",
      duration: transition.duration,
    };

    // 等待转场动画完成一半
    await new Promise((resolve) => setTimeout(resolve, transitionDuration / 2));
  }

  // 暂停当前播放，避免冲突
  previewPlayer.value.pause();
  if (audioPlayer.value) {
    audioPlayer.value.pause();
  }

  // 切换视频源
  currentTime.value = clip.position;
  previewPlayer.value.src = clip.video_url;

  // 同步切换音频源
  if (audioClips.value.length > 0 && audioPlayer.value) {
    const audioClip = audioClips.value.find(
      (a) =>
        clip.position >= a.position && clip.position < a.position + a.duration,
    );
    if (audioClip) {
      audioPlayer.value.src = audioClip.audio_url;
    }
  }

  // 等待视频加载
  try {
    await new Promise((resolve, reject) => {
      if (!previewPlayer.value) return reject();

      const onCanPlay = () => {
        previewPlayer.value?.removeEventListener("canplay", onCanPlay);
        previewPlayer.value?.removeEventListener("error", onError);
        resolve(undefined);
      };

      const onError = () => {
        previewPlayer.value?.removeEventListener("canplay", onCanPlay);
        previewPlayer.value?.removeEventListener("error", onError);
        reject();
      };

      previewPlayer.value.addEventListener("canplay", onCanPlay);
      previewPlayer.value.addEventListener("error", onError);
    });

    // 设置起始时间并播放
    previewPlayer.value.currentTime = clip.start_time;

    if (hasTransition) {
      // 切换到转场入场阶段
      transitionState.value.phase = "in";

      // 等待转场剩余时间
      setTimeout(() => {
        transitionState.value.active = false;
      }, transitionDuration / 2);
    }

    if (isPlaying.value) {
      await previewPlayer.value.play();

      // 同步播放音频
      if (audioClips.value.length > 0 && audioPlayer.value) {
        const audioClip = audioClips.value.find(
          (a) =>
            clip.position >= a.position &&
            clip.position < a.position + a.duration,
        );
        if (audioClip && audioPlayer.value.src) {
          audioPlayer.value.currentTime = audioClip.start_time;
          audioPlayer.value.play().catch((err) => {
            console.warn("音频播放失败:", err);
          });
        }
      }
    }
  } catch (error) {
    console.error("切换视频片段失败:", error);
    transitionState.value.active = false;
    pauseTimeline();
  }
};

const handlePreviewEnded = () => {
  // 视频自然结束，尝试播放下一个片段
  const currentClip = timelineClips.value.find(
    (c) =>
      currentTime.value >= c.position &&
      currentTime.value < c.position + c.duration,
  );

  if (currentClip) {
    const currentIndex = timelineClips.value.findIndex(
      (c) => c.id === currentClip.id,
    );
    const nextClip = timelineClips.value[currentIndex + 1];

    if (nextClip) {
      currentTime.value = nextClip.position;
      seekToTime(nextClip.position);
    } else {
      pauseTimeline();
    }
  }
};

// 时间线计算
const timelineWidth = computed(() => {
  const duration = Math.max(totalDuration.value, 30);
  const contentWidth = duration * pixelsPerSecond.value;
  const minContentWidth = 800; // 最小内容宽度
  return 100 + Math.max(contentWidth, minContentWidth) + 100; // 100px左边距 + 100px右边距
});

const playheadPosition = computed(() => {
  return 100 + currentTime.value * pixelsPerSecond.value;
});

const timeRulerTicks = computed(() => {
  const ticks = [];
  const duration = Math.max(totalDuration.value, 30);
  const interval = zoom.value >= 1.5 ? 1 : zoom.value >= 0.5 ? 5 : 10;

  for (let i = 0; i <= duration; i += interval) {
    ticks.push({
      time: i,
      position: 100 + i * pixelsPerSecond.value,
      type: i % (interval * 2) === 0 ? "major" : "minor",
    });
  }
  return ticks;
});

// 片段样式计算
const getClipStyle = (clip: TimelineClip) => {
  return {
    left: 100 + clip.position * pixelsPerSecond.value + "px",
    width: clip.duration * pixelsPerSecond.value + "px",
  };
};

// 拖拽场景到时间线
const handleDragStart = (event: DragEvent, scene: Scene) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("scene", JSON.stringify(scene));
  }
};

const handleTrackDrop = (event: DragEvent) => {
  event.preventDefault();
  const sceneData = event.dataTransfer?.getData("scene");
  if (!sceneData) return;

  const scene = JSON.parse(sceneData) as Scene;

  // 默认添加到末尾，不使用拖拽位置（避免产生空隙）
  addClipToTimeline(scene);
};

const getVideoDuration = (videoUrl: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = videoUrl;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      video.remove();
      resolve(duration);
    };

    video.onerror = () => {
      video.remove();
      reject(new Error("Failed to load video"));
    };
  });
};

const addClipToTimeline = async (scene: Scene, insertAtPosition?: number) => {
  // 获取视频真实时长
  let videoDuration = scene.duration || 5;
  if (scene.video_url) {
    try {
      videoDuration = await getVideoDuration(scene.video_url);
    } catch (error) {
      console.warn(
        "Failed to get video duration, using default or scene duration:",
        error,
      );
      videoDuration = scene.duration || 5;
    }
  }

  // 计算新片段的位置
  let clipPosition: number;
  let insertAfterIndex: number | null = null;

  if (insertAtPosition !== undefined && timelineClips.value.length > 0) {
    // 如果指定了插入位置,找到应该插入的位置
    clipPosition = insertAtPosition;
  } else if (selectedClipId.value && timelineClips.value.length > 0) {
    // 如果有选中的片段，插入到选中片段之后
    const selectedIndex = timelineClips.value.findIndex(
      (c) => c.id === selectedClipId.value,
    );
    if (selectedIndex !== -1) {
      const selectedClip = timelineClips.value[selectedIndex];
      clipPosition = selectedClip.position + selectedClip.duration;
      insertAfterIndex = selectedIndex;
    } else {
      // 选中的片段不存在，添加到末尾
      const lastClip = timelineClips.value[timelineClips.value.length - 1];
      clipPosition = lastClip.position + lastClip.duration;
    }
  } else {
    // 默认添加到末尾（紧密连接）
    if (timelineClips.value.length === 0) {
      clipPosition = 0; // 第一个片段从0开始
    } else {
      // 添加到最后一个片段的结尾
      const lastClip = timelineClips.value[timelineClips.value.length - 1];
      clipPosition = lastClip.position + lastClip.duration;
    }
  }

  const newClip: TimelineClip = {
    id: `clip_${Date.now()}_${scene.id}`,
    storyboard_id: scene.storyboard_id,
    storyboard_number: scene.storyboard_number,
    video_url: scene.video_url,
    asset_id: scene.asset_id, // 保存素材库ID
    start_time: 0,
    end_time: videoDuration,
    duration: videoDuration,
    position: clipPosition,
    order: timelineClips.value.length,
    transition: {
      type: "fade",
      duration: 1.0,
    },
  };

  // 如果是插入到中间，需要调整后续片段的位置
  if (
    insertAfterIndex !== null &&
    insertAfterIndex < timelineClips.value.length - 1
  ) {
    const newDuration = newClip.duration;
    // 将后续所有片段向后移动
    for (let i = insertAfterIndex + 1; i < timelineClips.value.length; i++) {
      timelineClips.value[i].position += newDuration;
    }
  }

  timelineClips.value.push(newClip);
  timelineClips.value.sort((a, b) => a.position - b.position);
  updateClipOrders();

  // 选中新添加的片段
  selectedClipId.value = newClip.id;

  const insertInfo = insertAfterIndex !== null ? "（已插入到选中片段后）" : "";
  ElMessage.success(`已添加到时间线${insertInfo}`);
};

// 一键添加全部场景
const addAllScenesInOrder = async () => {
  if (availableStoryboards.value.length === 0) {
    ElMessage.warning("没有可用的场景");
    return;
  }

  // 按场景编号排序
  const sortedScenes = [...availableStoryboards.value].sort(
    (a, b) => a.storyboard_number - b.storyboard_number,
  );

  // 清空当前选中，让所有场景都添加到末尾
  selectedClipId.value = null;

  // 批量添加（顺序添加以确保正确的时长）
  for (const scene of sortedScenes) {
    await addClipToTimeline(scene);
  }

  ElMessage.success(`已批量添加 ${sortedScenes.length} 个场景到时间线`);
};

// 删除素材
const deleteAsset = async (scene: any) => {
  if (!scene.isAsset) {
    ElMessage.warning("只能删除素材库中的视频");
    return;
  }

  try {
    // 直接调用API删除
    const { assetAPI } = await import("@/api/asset");
    await assetAPI.deleteAsset(scene.asset_id);

    ElMessage.success("删除成功");

    // 通知父组件刷新素材列表
    emit("asset-deleted");
  } catch (error: any) {
    console.error("删除素材失败:", error);
    ElMessage.error(error.message || "删除失败");
  }
};

// 转场相关方法
const getTransitionStyle = (clip: TimelineClip) => {
  // 转场指示器显示在片段开始位置
  return {
    left: 100 + clip.position * pixelsPerSecond.value - 15 + "px",
  };
};

const getTransitionLabel = (clip: TimelineClip) => {
  if (!clip.transition || clip.transition.type === "none") {
    return "无";
  }
  const labels: Record<string, string> = {
    fade: "淡入",
    fadeblack: "黑场",
    fadewhite: "白场",
    fadegrays: "灰场",
    slideleft: "左滑",
    slideright: "右滑",
    slideup: "上滑",
    slidedown: "下滑",
    wipeleft: "左擦",
    wiperight: "右擦",
    wipeup: "上擦",
    wipedown: "下擦",
    circleopen: "圆开",
    circleclose: "圆关",
    dissolve: "溶解",
    distance: "距离",
    horzopen: "水平开",
    horzclose: "水平关",
    vertopen: "垂直开",
    vertclose: "垂直关",
  };
  return labels[clip.transition.type] || "转场";
};

const openTransitionDialog = (clip: TimelineClip) => {
  console.log("🎬 打开转场设置对话框:", {
    clip_id: clip.id,
    storyboard_id: clip.storyboard_id,
    order: clip.order,
    current_transition: clip.transition,
  });
  editingTransitionClipId.value = clip.id;
  editingTransition.value = {
    type: clip.transition?.type || "fade",
    duration: clip.transition?.duration || 1.0,
  };
  transitionDialogVisible.value = true;
};

const applyTransition = () => {
  const clip = timelineClips.value.find(
    (c) => c.id === editingTransitionClipId.value,
  );
  if (clip) {
    clip.transition = {
      type: editingTransition.value.type,
      duration: editingTransition.value.duration,
    };
    console.log("✅ 转场效果已设置:", {
      clip_id: clip.id,
      storyboard_id: clip.storyboard_id,
      order: clip.order,
      transition: clip.transition,
    });
    ElMessage.success("转场效果已设置");
  } else {
    console.error("❌ 未找到目标片段:", editingTransitionClipId.value);
  }
  transitionDialogVisible.value = false;
};

// 选择和删除片段
const selectClip = (clip: TimelineClip) => {
  selectedClipId.value = clip.id;
};

const removeClip = (clip: TimelineClip) => {
  const index = timelineClips.value.findIndex((c) => c.id === clip.id);
  if (index !== -1) {
    timelineClips.value.splice(index, 1);
    updateClipOrders();

    // 同时移除关联的音频片段
    const audioIndex = audioClips.value.findIndex(
      (a) => a.source_clip_id === clip.id,
    );
    if (audioIndex !== -1) {
      audioClips.value.splice(audioIndex, 1);
      updateAudioClipOrders();
    }
  }
};

const clearAllClips = () => {
  if (timelineClips.value.length === 0) return;

  timelineClips.value = [];
  audioClips.value = [];
  selectedClipId.value = null;
  selectedAudioClipId.value = null;
  currentTime.value = 0;
  ElMessage.success("已清空轨道");
};

const updateClipOrders = () => {
  timelineClips.value.forEach((clip, index) => {
    clip.order = index;
  });
};

// 音频片段管理
const extractAllAudio = async () => {
  if (timelineClips.value.length === 0) {
    ElMessage.warning("时间线上没有视频片段");
    return;
  }

  const loadingMessage = ElMessage.info({
    message: "正在从视频中提取音频轨道，请稍候...",
    duration: 0,
  });

  try {
    // 清空现有音频
    audioClips.value = [];

    // 收集所有视频URL
    const videoUrls = timelineClips.value.map((clip) => clip.video_url);

    // 调用后端API批量提取音频
    const { audioAPI } = await import("@/api/audio");
    const response = await audioAPI.batchExtractAudio(videoUrls);

    if (!response.results || response.results.length === 0) {
      throw new Error("音频提取失败，未返回结果");
    }

    // 为每个视频片段创建对应的音频片段
    timelineClips.value.forEach((clip, index) => {
      const extractedAudio = response.results[index];
      if (!extractedAudio) {
        console.warn(`视频片段 ${index} 未能提取音频`);
        return;
      }

      // 验证音频时长
      const audioDuration = extractedAudio.duration;
      if (!audioDuration || audioDuration <= 0) {
        console.error(`音频片段 ${index} 时长无效:`, audioDuration);
        throw new Error(`音频片段 ${index + 1} 时长无效`);
      }

      console.log(`音频片段 ${index}:`, {
        video_duration: clip.duration,
        audio_duration: audioDuration,
        video_position: clip.position,
        video_url: clip.video_url,
        audio_url: extractedAudio.audio_url,
      });

      const audioClip: AudioClip = {
        id: `audio_${Date.now()}_${index}`,
        source_clip_id: clip.id,
        audio_url: extractedAudio.audio_url,
        start_time: 0, // 音频从头开始播放
        end_time: audioDuration, // 使用实际音频时长
        duration: audioDuration, // 使用提取的音频时长
        position: clip.position, // 和视频片段在时间轴上相同位置
        order: index,
        volume: 1.0,
      };
      audioClips.value.push(audioClip);
    });

    updateAudioClipOrders();
    loadingMessage.close();
    ElMessage.success(`已成功提取 ${audioClips.value.length} 个音频片段`);
  } catch (error: any) {
    console.error("提取音频失败:", error);
    loadingMessage.close();
    ElMessage.error(error.message || "音频提取失败，请重试");
    // 清空部分提取的音频
    audioClips.value = [];
  }
};

const selectAudioClip = (audio: AudioClip) => {
  selectedAudioClipId.value = audio.id;
  // 取消选中视频片段
  selectedClipId.value = null;
};

const removeAudioClip = (audio: AudioClip) => {
  const index = audioClips.value.findIndex((a) => a.id === audio.id);
  if (index !== -1) {
    audioClips.value.splice(index, 1);
    updateAudioClipOrders();
  }
};

const updateAudioClipOrders = () => {
  audioClips.value.forEach((clip, index) => {
    clip.order = index;
  });
};

// 拖拽音频片段
const startDragAudioClip = (event: MouseEvent, audio: AudioClip) => {
  if (dragState.value.isResizing) return;

  event.stopPropagation();
  dragState.value = {
    isDragging: true,
    isResizing: false,
    clipId: audio.id,
    startX: event.clientX,
    startPosition: audio.position,
    startTime: 0,
    originalDuration: audio.duration,
  };

  selectedAudioClipId.value = audio.id;
  document.addEventListener("mousemove", handleDragAudioMove);
  document.addEventListener("mouseup", handleDragAudioEnd);
};

const handleDragAudioMove = (event: MouseEvent) => {
  if (!dragState.value.isDragging || !dragState.value.clipId) return;

  const audio = audioClips.value.find((a) => a.id === dragState.value.clipId);
  if (!audio) return;

  const deltaX = event.clientX - dragState.value.startX;
  const deltaTime = deltaX / pixelsPerSecond.value;
  const newPosition = Math.max(0, dragState.value.startPosition + deltaTime);

  audio.position = newPosition;
};

const handleDragAudioEnd = () => {
  dragState.value.isDragging = false;
  dragState.value.clipId = null;

  document.removeEventListener("mousemove", handleDragAudioMove);
  document.removeEventListener("mouseup", handleDragAudioEnd);

  // 重新排序
  audioClips.value.sort((a, b) => a.position - b.position);
  updateAudioClipOrders();
};

// 调整音频片段大小
const startResizeAudioClip = (
  event: MouseEvent,
  audio: AudioClip,
  side: "left" | "right",
) => {
  event.stopPropagation();

  dragState.value = {
    isDragging: false,
    isResizing: true,
    resizeSide: side,
    clipId: audio.id,
    startX: event.clientX,
    startPosition: audio.position,
    startTime: audio.start_time,
    originalDuration: audio.duration,
  };

  selectedAudioClipId.value = audio.id;
  document.addEventListener("mousemove", handleResizeAudioMove);
  document.addEventListener("mouseup", handleResizeAudioEnd);
};

const handleResizeAudioMove = (event: MouseEvent) => {
  if (!dragState.value.isResizing || !dragState.value.clipId) return;

  const audio = audioClips.value.find((a) => a.id === dragState.value.clipId);
  if (!audio) return;

  const deltaX = event.clientX - dragState.value.startX;
  const deltaTime = deltaX / pixelsPerSecond.value;

  if (dragState.value.resizeSide === "left") {
    const newStartTime = Math.max(0, dragState.value.startTime + deltaTime);
    const maxStartTime =
      dragState.value.startTime + dragState.value.originalDuration - 0.1;

    audio.start_time = Math.min(newStartTime, maxStartTime);
    audio.position = dragState.value.startPosition + deltaTime;
    audio.duration =
      dragState.value.originalDuration -
      (audio.start_time - dragState.value.startTime);
  } else {
    const newDuration = Math.max(
      0.1,
      dragState.value.originalDuration + deltaTime,
    );
    const maxDuration = audio.end_time - audio.start_time;

    audio.duration = Math.min(newDuration, maxDuration);
    audio.end_time = audio.start_time + audio.duration;
  }
};

const handleResizeAudioEnd = () => {
  dragState.value.isResizing = false;
  dragState.value.clipId = null;

  document.removeEventListener("mousemove", handleResizeAudioMove);
  document.removeEventListener("mouseup", handleResizeAudioEnd);
};

// 拖拽和调整片段
interface DragState {
  isDragging: boolean;
  isResizing: boolean;
  resizeSide?: "left" | "right";
  clipId: string | null;
  startX: number;
  startPosition: number;
  startTime: number;
  originalDuration: number;
}

const dragState = ref<DragState>({
  isDragging: false,
  isResizing: false,
  clipId: null,
  startX: 0,
  startPosition: 0,
  startTime: 0,
  originalDuration: 0,
});

// 拖拽移动片段位置
const startDragClip = (event: MouseEvent, clip: TimelineClip) => {
  if (dragState.value.isResizing) return;

  event.stopPropagation();
  dragState.value = {
    isDragging: true,
    isResizing: false,
    clipId: clip.id,
    startX: event.clientX,
    startPosition: clip.position,
    startTime: 0,
    originalDuration: clip.duration,
  };

  selectedClipId.value = clip.id;
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);
};

const handleDragMove = (event: MouseEvent) => {
  if (!dragState.value.clipId) return;

  const clip = timelineClips.value.find((c) => c.id === dragState.value.clipId);
  if (!clip) return;

  if (dragState.value.isDragging) {
    // 计算新位置
    const deltaX = event.clientX - dragState.value.startX;
    const deltaTime = deltaX / pixelsPerSecond.value;
    let newPosition = Math.max(0, dragState.value.startPosition + deltaTime);

    // 吸附到其他片段边缘
    newPosition = snapToNearby(newPosition, clip.id, clip.duration);

    clip.position = newPosition;
    updateClipOrders();
  } else if (dragState.value.isResizing) {
    handleResizeMove(event, clip);
  }
};

const handleDragEnd = () => {
  dragState.value = {
    isDragging: false,
    isResizing: false,
    clipId: null,
    startX: 0,
    startPosition: 0,
    startTime: 0,
    originalDuration: 0,
  };

  document.removeEventListener("mousemove", handleDragMove);
  document.removeEventListener("mouseup", handleDragEnd);

  // 重新排序片段并紧密连接
  timelineClips.value.sort((a, b) => a.position - b.position);
  compactClips();
  updateClipOrders();
};

// 紧密排列所有片段（消除空隙）
const compactClips = () => {
  let currentPosition = 0;
  for (const clip of timelineClips.value) {
    clip.position = currentPosition;
    currentPosition += clip.duration;
  }
};

// 调整片段时长
const startResizeClip = (
  event: MouseEvent,
  clip: TimelineClip,
  side: "left" | "right",
) => {
  event.stopPropagation();

  dragState.value = {
    isDragging: false,
    isResizing: true,
    resizeSide: side,
    clipId: clip.id,
    startX: event.clientX,
    startPosition: clip.position,
    startTime: side === "left" ? clip.start_time : clip.end_time,
    originalDuration: clip.duration,
  };

  selectedClipId.value = clip.id;
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);
};

const handleResizeMove = (event: MouseEvent, clip: TimelineClip) => {
  const deltaX = event.clientX - dragState.value.startX;
  const deltaTime = deltaX / pixelsPerSecond.value;

  if (dragState.value.resizeSide === "left") {
    // 调整开始时间（不改变位置，只改变裁剪点）
    const newStartTime = Math.max(0, dragState.value.startTime + deltaTime);
    const maxStartTime = clip.end_time - 0.1; // 至少保留0.1秒

    clip.start_time = Math.min(newStartTime, maxStartTime);
    clip.duration = clip.end_time - clip.start_time;

    // 调整左边缘后需要重新紧密连接
    const clipIndex = timelineClips.value.findIndex((c) => c.id === clip.id);
    if (clipIndex > 0) {
      // 调整前面片段的结束位置
      compactClipsFromIndex(clipIndex);
    }
  } else {
    // 调整结束时间
    const scene = props.scenes.find((s) => s.id === clip.scene_id);
    const maxDuration = scene?.duration || 10;
    const maxEndTime = clip.start_time + maxDuration;

    const newEndTime = Math.max(
      clip.start_time + 0.1,
      dragState.value.startTime + deltaTime,
    );
    clip.end_time = Math.min(newEndTime, maxEndTime);
    clip.duration = clip.end_time - clip.start_time;

    // 调整右边缘后需要重新紧密连接后续片段
    const clipIndex = timelineClips.value.findIndex((c) => c.id === clip.id);
    if (clipIndex < timelineClips.value.length - 1) {
      compactClipsFromIndex(clipIndex + 1);
    }
  }
};

// 从指定索引开始重新紧密排列片段
const compactClipsFromIndex = (startIndex: number) => {
  if (startIndex >= timelineClips.value.length) return;

  for (let i = startIndex; i < timelineClips.value.length; i++) {
    if (i === 0) {
      timelineClips.value[i].position = 0;
    } else {
      const prevClip = timelineClips.value[i - 1];
      timelineClips.value[i].position = prevClip.position + prevClip.duration;
    }
  }
};

// 吸附到附近片段
const snapToNearby = (
  position: number,
  clipId: string,
  duration: number,
): number => {
  const snapThreshold = 5 / pixelsPerSecond.value; // 5像素的吸附范围

  for (const other of timelineClips.value) {
    if (other.id === clipId) continue;

    const otherEnd = other.position + other.duration;

    // 吸附到前一个片段的结尾
    if (Math.abs(position - otherEnd) < snapThreshold) {
      return otherEnd;
    }

    // 吸附到后一个片段的开头
    if (Math.abs(position + duration - other.position) < snapThreshold) {
      return other.position - duration;
    }
  }

  // 吸附到起点
  if (position < snapThreshold) {
    return 0;
  }

  return position;
};

// 缩放控制
const zoomIn = () => {
  zoom.value = Math.min(zoom.value * 1.2, 3);
};

const zoomOut = () => {
  zoom.value = Math.max(zoom.value / 1.2, 0.3);
};

const zoomReset = () => {
  zoom.value = 1;
};

// 时间线点击跳转
const clickTimeline = (event: MouseEvent) => {
  if (dragState.value.isDragging || dragState.value.isResizing) return;

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const clickX = event.clientX - rect.left - 100;
  const newTime = Math.max(0, clickX / pixelsPerSecond.value);
  seekToTime(newTime);
};

const seekToTime = (time: number) => {
  currentTime.value = time;

  // 找到对应时间的视频片段并播放
  const clip = timelineClips.value.find(
    (c) => time >= c.position && time < c.position + c.duration,
  );

  if (clip && previewPlayer.value) {
    // 切换视频源（如果需要）
    if (previewPlayer.value.src !== clip.video_url) {
      previewPlayer.value.src = clip.video_url;
    }

    // 跳转到片段内的对应时间
    const offsetInClip = time - clip.position;
    previewPlayer.value.currentTime = clip.start_time + offsetInClip;

    if (isPlaying.value) {
      previewPlayer.value.play();
    }
  }

  // 同步音频播放器
  if (audioClips.value.length > 0 && audioPlayer.value) {
    const audioClip = audioClips.value.find(
      (a) => time >= a.position && time < a.position + a.duration,
    );

    if (audioClip) {
      // 切换音频源（如果需要）
      if (audioPlayer.value.src !== audioClip.audio_url) {
        audioPlayer.value.src = audioClip.audio_url;
      }

      // 跳转到音频片段内的对应时间
      const offsetInAudioClip = time - audioClip.position;
      audioPlayer.value.currentTime = audioClip.start_time + offsetInAudioClip;

      if (isPlaying.value) {
        audioPlayer.value.play().catch((err) => {
          console.warn("音频播放失败:", err);
        });
      }
    } else {
      // 当前位置没有音频，暂停音频播放器
      audioPlayer.value.pause();
    }
  }
};

// 播放控制
const playTimeline = () => {
  if (timelineClips.value.length === 0) {
    ElMessage.warning("时间线中没有视频片段");
    return;
  }

  isPlaying.value = true;

  // 找到当前时间对应的视频片段
  const clip = timelineClips.value.find(
    (c) =>
      currentTime.value >= c.position &&
      currentTime.value < c.position + c.duration,
  );

  if (clip && previewPlayer.value) {
    if (previewPlayer.value.src !== clip.video_url) {
      previewPlayer.value.src = clip.video_url;
    }
    const offsetInClip = currentTime.value - clip.position;
    previewPlayer.value.currentTime = clip.start_time + offsetInClip;
    previewPlayer.value.play();
  } else if (timelineClips.value[0]) {
    // 如果当前时间超出范围，从头开始播放
    currentTime.value = 0;
    seekToTime(0);
    previewPlayer.value?.play();
  }

  // 同时播放音频（如果有）
  if (audioClips.value.length > 0 && audioPlayer.value) {
    const audioClip = audioClips.value.find(
      (a) =>
        currentTime.value >= a.position &&
        currentTime.value < a.position + a.duration,
    );

    if (audioClip) {
      if (audioPlayer.value.src !== audioClip.audio_url) {
        audioPlayer.value.src = audioClip.audio_url;
      }
      const offsetInAudioClip = currentTime.value - audioClip.position;
      audioPlayer.value.currentTime = audioClip.start_time + offsetInAudioClip;
      audioPlayer.value.play().catch((err) => {
        console.warn("音频播放失败:", err);
      });
    }
  }
};

const pauseTimeline = () => {
  isPlaying.value = false;
  if (previewPlayer.value) {
    previewPlayer.value.pause();
  }
  // 同时暂停音频
  if (audioPlayer.value) {
    audioPlayer.value.pause();
  }
};

const togglePlay = () => {
  if (isPlaying.value) {
    pauseTimeline();
  } else {
    playTimeline();
  }
};

// 键盘快捷键
const handleKeyPress = (event: KeyboardEvent) => {
  // 如果在输入框中，不处理快捷键
  if ((event.target as HTMLElement).tagName === "INPUT") return;

  switch (event.code) {
    case "Space":
      event.preventDefault();
      if (isPlaying.value) {
        pauseTimeline();
      } else {
        playTimeline();
      }
      break;
    case "Delete":
    case "Backspace":
      if (selectedClipId.value) {
        event.preventDefault();
        const clip = timelineClips.value.find(
          (c) => c.id === selectedClipId.value,
        );
        if (clip) removeClip(clip);
      }
      break;
    case "ArrowLeft":
      event.preventDefault();
      seekToTime(Math.max(0, currentTime.value - 1));
      break;
    case "ArrowRight":
      event.preventDefault();
      seekToTime(Math.min(totalDuration.value, currentTime.value + 1));
      break;
    case "Home":
      event.preventDefault();
      seekToTime(0);
      break;
    case "End":
      event.preventDefault();
      seekToTime(totalDuration.value);
      break;
  }
};

// 生命周期管理
onMounted(() => {
  document.addEventListener("keydown", handleKeyPress);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyPress);
  document.removeEventListener("mousemove", handleDragMove);
  document.removeEventListener("mouseup", handleDragEnd);
});

// 进度显示辅助函数
const getPhaseType = (phase: string) => {
  switch (phase) {
    case "loading":
      return "info";
    case "processing":
      return "warning";
    case "encoding":
      return "warning";
    case "completed":
      return "success";
    default:
      return "info";
  }
};

const getPhaseText = (phase: string) => {
  switch (phase) {
    case "loading":
      return "初始化";
    case "processing":
      return "处理中";
    case "encoding":
      return "编码中";
    case "completed":
      return "完成";
    default:
      return "准备中";
  }
};

// 导出功能
const handleExport = async () => {
  if (timelineClips.value.length === 0) {
    ElMessage.warning("请至少添加一个视频片段");
    return;
  }

  try {
    // 计算总视频大小（粗略估算）
    const totalSize = timelineClips.value.length * 20; // 假设每个片段约20MB
    const estimatedTime = Math.ceil(totalSize / 50); // 每50MB约1分钟

    await ElMessageBox.confirm(
      `即将在浏览器中合并 ${timelineClips.value.length} 个视频片段。\n\n` +
        `预计处理时间：${estimatedTime}-${estimatedTime + 1} 分钟\n` +
        `预计内存占用：约 ${Math.round(totalSize * 1.5)}MB\n\n` +
        `处理期间请勿关闭页面。`,
      "确认导出",
      {
        confirmButtonText: "开始合并",
        cancelButtonText: "取消",
        type: "warning",
        dangerouslyUseHTMLString: true,
      },
    );

    mergeDialogVisible.value = true;
    merging.value = true;

    // 初始化FFmpeg
    await videoMerger.initialize((progress) => {
      mergeProgress.value = progress;
    });

    // 准备视频片段数据（包含转场信息）
    const clips = timelineClips.value.map((clip) => ({
      url: clip.video_url,
      startTime: clip.start_time,
      endTime: clip.end_time,
      duration: clip.end_time - clip.start_time,
      transition: clip.transition,
    }));

    // 执行合并
    const mergedBlob = await videoMerger.mergeVideos(clips);

    // 下载合并后的视频
    const url = URL.createObjectURL(mergedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `merged_video_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    ElMessage.success("视频合并完成，已开始下载！");
    mergeDialogVisible.value = false;
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("视频合并失败:", error);
      ElMessage.error(error.message || "视频合并失败");
    }
  } finally {
    merging.value = false;
  }
};

// 提交时间线数据到后端进行合成
// 浏览器端FFmpeg合成
const mergeVideoInBrowser = async () => {
  if (timelineClips.value.length === 0) {
    ElMessage.warning("时间线上没有视频片段");
    return;
  }

  try {
    await ElMessageBox.confirm(
      "将在浏览器中使用FFmpeg合成视频。\n注意：处理时间较长，且会占用浏览器资源，请勿关闭页面。\n适合少量视频场景（1-5个）。\n是否继续？",
      "浏览器合成视频",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    merging.value = true;
    mergeProgress.value = 0;

    ElMessage.info("开始加载FFmpeg引擎...");

    // 准备剪辑数据
    const clips = timelineClips.value.map((clip) => ({
      url: clip.video_url,
      startTime: clip.start_time,
      endTime: clip.end_time,
    }));

    // 使用FFmpeg合成
    ElMessage.info("正在合成视频，请稍候...");
    const mergedBlob = await trimAndMergeVideos(clips, (progress) => {
      mergeProgress.value = Math.round(progress);
    });

    // 创建下载链接
    const url = URL.createObjectURL(mergedBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `episode_${props.episodeId}_merged.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success("视频合成完成并已下载！");
    emit("merge-completed", 0);
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error({
        message: `合成失败: ${error.message || "未知错误"}。请检查控制台或尝试服务器合成`,
        duration: 5000,
      });
    }
  } finally {
    merging.value = false;
    mergeProgress.value = 0;
  }
};

// 服务器端合成
const submitTimelineForMerge = async () => {
  if (timelineClips.value.length === 0) {
    ElMessage.warning("时间线上没有视频片段");
    return;
  }

  try {
    await ElMessageBox.confirm(
      "将根据时间线编排的顺序和转场效果合成最终视频。\n注意：未生成视频的场景将被跳过，只合成已有视频的场景。\n适合大量场景合成。\n是否继续？",
      "服务器合成视频",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
        dangerouslyUseHTMLString: false,
      },
    );

    serverMerging.value = true;

    // 准备时间线数据
    const timelineData = {
      episode_id: props.episodeId,
      clips: timelineClips.value.map((clip, index) => {
        console.log(`📹 片段 ${index}:`, {
          storyboard_id: clip.storyboard_id,
          asset_id: clip.asset_id,
          transition: clip.transition,
        });
        return {
          storyboard_id: String(clip.storyboard_id),
          asset_id: clip.asset_id, // 包含素材库ID
          order: index,
          start_time: clip.start_time,
          end_time: clip.end_time,
          duration: clip.duration,
          transition: clip.transition || { type: "none", duration: 0 },
        };
      }),
    };
    console.log("📤 提交时间线数据:", JSON.stringify(timelineData, null, 2));

    // 调用后端API
    const { dramaAPI } = await import("@/api/drama");
    const result = await dramaAPI.finalizeEpisode(
      props.episodeId,
      timelineData,
    );

    // 如果有跳过的场景，显示警告
    if (result.warning) {
      ElMessage.warning({
        message: result.warning,
        duration: 5000,
      });
    } else {
      ElMessage.success("视频合成任务已提交，正在后台处理...");
    }

    emit("merge-completed", result.merge_id || 0);
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("提交合成任务失败:", error);
      ElMessage.error(error.response?.data?.message || "提交失败");
    }
  } finally {
    serverMerging.value = false;
  }
};

// 暴露方法供父组件调用
const updateClipsByStoryboardId = (
  storyboardId: string | number,
  newVideoUrl: string,
) => {
  console.log("=== updateClipsByStoryboardId 调用 ===");
  console.log(
    "目标 storyboard_id:",
    storyboardId,
    "类型:",
    typeof storyboardId,
  );
  console.log("新视频 URL:", newVideoUrl);
  console.log("当前时间线片段数量:", timelineClips.value.length);

  let updated = false;
  const targetId = String(storyboardId); // 统一转换为字符串进行比较

  timelineClips.value.forEach((clip, index) => {
    console.log(
      `片段 ${index}: storyboard_id=${clip.storyboard_id} (类型: ${typeof clip.storyboard_id})`,
    );
    if (String(clip.storyboard_id) === targetId) {
      console.log(`✅ 匹配成功！更新片段 ${index} 的视频URL`);
      console.log("  旧URL:", clip.video_url);
      console.log("  新URL:", newVideoUrl);
      clip.video_url = newVideoUrl;
      updated = true;
    }
  });

  if (updated) {
    console.log("✅ 时间线视频已更新");
    ElMessage.success("时间线中的视频已自动更新");
  } else {
    console.log("⚠️ 没有找到匹配的时间线片段");
  }
};

defineExpose({
  updateClipsByStoryboardId,
});
</script>

<style scoped lang="scss">
.video-timeline-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 16px;

      .time-display {
        font-family: "Courier New", monospace;
        font-size: 14px;
        color: var(--text-secondary);
        min-width: 160px;
      }
    }
  }

  .editor-workspace {
    display: flex;
    flex: 1;
    overflow: hidden;

    .preview-panel {
      flex: 0 0 500px;
      display: flex;
      flex-direction: column;
      background: var(--bg-card);
      border: 1px solid var(--border-primary);

      .video-preview {
        flex: 1;
        position: relative;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;

        video {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .preview-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
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
          background: rgba(0, 0, 0, 0.3);
          cursor: pointer;
          transition: opacity 0.3s ease;
          z-index: 5;

          .el-icon {
            color: white;
            filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
          }

          &.hidden {
            opacity: 0;
          }

          &:hover {
            background: rgba(0, 0, 0, 0.4);
          }
        }

        .transition-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 10;
        }

        // 淡入淡出效果
        .transition-fade.transition-out {
          background: black;
          animation: fadeOut forwards;
        }
        .transition-fade.transition-in {
          background: black;
          animation: fadeIn forwards;
        }

        // 黑场过渡
        .transition-fadeblack.transition-out {
          background: black;
          animation: fadeOut forwards;
        }
        .transition-fadeblack.transition-in {
          background: black;
          animation: fadeIn forwards;
        }

        // 白场过渡
        .transition-fadewhite.transition-out {
          background: white;
          animation: fadeOut forwards;
        }
        .transition-fadewhite.transition-in {
          background: white;
          animation: fadeIn forwards;
        }

        // 左滑
        .transition-slideleft.transition-out {
          background: black;
          animation: slideLeftOut forwards;
        }
        .transition-slideleft.transition-in {
          background: black;
          animation: slideLeftIn forwards;
        }

        // 右滑
        .transition-slideright.transition-out {
          background: black;
          animation: slideRightOut forwards;
        }
        .transition-slideright.transition-in {
          background: black;
          animation: slideRightIn forwards;
        }

        // 上滑
        .transition-slideup.transition-out {
          background: black;
          animation: slideUpOut forwards;
        }
        .transition-slideup.transition-in {
          background: black;
          animation: slideUpIn forwards;
        }

        // 下滑
        .transition-slidedown.transition-out {
          background: black;
          animation: slideDownOut forwards;
        }
        .transition-slidedown.transition-in {
          background: black;
          animation: slideDownIn forwards;
        }

        @keyframes fadeOut {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes slideLeftOut {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes slideLeftIn {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-100%);
          }
        }

        @keyframes slideRightOut {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes slideRightIn {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(100%);
          }
        }

        @keyframes slideUpOut {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes slideUpIn {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-100%);
          }
        }

        @keyframes slideDownOut {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes slideDownIn {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(100%);
          }
        }
      }

      .preview-controls {
        padding: 12px 16px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-primary);
      }
    }

    .media-library {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--bg-card);
      overflow: hidden;

      .library-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-primary);

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;

          h4 {
            margin: 0;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
          }

          span {
            font-size: 12px;
            color: var(--text-muted);
          }
        }
      }

      .media-grid {
        max-height: 450px;
        overflow-y: auto;
        padding: 12px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
        align-content: start;

        // 自定义滚动条样式
        &::-webkit-scrollbar {
          width: 8px;
        }

        &::-webkit-scrollbar-track {
          background: var(--bg-secondary);
          border-radius: 4px;
        }

        &::-webkit-scrollbar-thumb {
          background: var(--border-secondary);
          border-radius: 4px;

          &:hover {
            background: var(--border-primary);
          }
        }

        .media-item {
          position: relative;
          background: var(--bg-secondary);
          border-radius: 6px;
          overflow: hidden;
          cursor: move;
          border: 1px solid var(--border-primary);
          transition: all 0.3s;

          &:hover {
            border-color: var(--el-color-primary);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .delete-btn {
            position: absolute;
            top: 4px;
            right: 4px;
            z-index: 10;
            opacity: 0;
            transition: opacity 0.3s;
          }

          &:hover .delete-btn {
            opacity: 1;
          }

          .media-thumbnail {
            position: relative;
            width: 100%;
            aspect-ratio: 16/9;
            background: var(--bg-card-hover);
            cursor: pointer;

            video {
              width: 100%;
              height: 100%;
              object-fit: cover;
              pointer-events: none;
            }

            .media-duration {
              position: absolute;
              bottom: 4px;
              right: 4px;
              padding: 2px 6px;
              background: rgba(0, 0, 0, 0.8);
              color: white;
              font-size: 11px;
              border-radius: 3px;
              z-index: 1;
            }

            .media-overlay {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(0, 0, 0, 0.6);
              opacity: 0;
              transition: opacity 0.2s;
              z-index: 2;

              .add-to-timeline-btn {
                transform: translateY(10px);
                transition: transform 0.2s;
              }
            }

            &:hover .media-overlay {
              opacity: 1;

              .add-to-timeline-btn {
                transform: translateY(0);
              }
            }
          }

          .media-info {
            padding: 8px;

            .media-title {
              font-size: 12px;
              font-weight: 500;
              color: var(--text-primary);
              margin-bottom: 4px;
            }

            .media-desc {
              font-size: 11px;
              color: var(--text-muted);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }
        }
      }
    }
  }

  .timeline-panel {
    flex: 0 0 280px;
    display: flex;
    flex-direction: column;
    background: var(--bg-card);
    border: 1px solid var(--border-primary);

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);

      .zoom-controls {
        display: flex;
        align-items: center;
        gap: 8px;

        .zoom-level {
          font-size: 12px;
          color: var(--text-muted);
          min-width: 50px;
          text-align: right;
        }
      }
    }

    .timeline-container {
      flex: 1;
      position: relative;
      overflow-x: auto;
      overflow-y: hidden;
      background: var(--bg-primary);

      .timeline-ruler {
        height: 30px;
        background: var(--bg-card);
        border: 1px solid var(--border-primary);
        position: relative;

        .ruler-tick {
          position: absolute;
          top: 0;
          bottom: 0;

          .tick-mark {
            width: 1px;
            background: var(--border-secondary);

            &.major {
              height: 20px;
              background: var(--border-primary);
            }

            &.minor {
              height: 10px;
              margin-top: 10px;
            }
          }

          .tick-label {
            position: absolute;
            top: 2px;
            left: 4px;
            font-size: 10px;
            color: var(--text-muted);
            font-family: "Courier New", monospace;
          }
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
          background: var(--accent);
          box-shadow: 0 0 8px rgba(14, 165, 233, 0.6);
        }

        .playhead-handle {
          position: absolute;
          top: 0;
          left: -6px;
          width: 14px;
          height: 14px;
          background: var(--accent);
          border-radius: 50%;
          border: 2px solid var(--bg-card);
        }
      }

      .timeline-track {
        position: relative;
        height: 80px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-primary);

        .track-label {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 100px;
          display: flex;
          align-items: center;
          padding-left: 12px;
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          z-index: 50;
        }

        .track-clips {
          position: relative;
          height: 100%;
          padding-left: 100px;

          .track-clip {
            position: absolute;
            top: 8px;
            bottom: 8px;
            background: var(--accent);
            border-radius: 4px;
            border: 2px solid transparent;
            cursor: move;
            transition: all 0.15s;
            overflow: hidden;

            &:hover {
              border-color: var(--accent-hover);
              box-shadow: var(--shadow-md);
            }

            &.selected {
              border-color: var(--accent);
              box-shadow: var(--shadow-glow);
            }

            .clip-content {
              display: flex;
              align-items: center;
              height: 100%;
              padding: 4px 8px;
              gap: 8px;

              .clip-thumbnail {
                width: 60px;
                height: 100%;
                background: var(--bg-card-hover);
                border-radius: 3px;
                overflow: hidden;
                flex-shrink: 0;

                video {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  pointer-events: none;
                }
              }

              .clip-info {
                flex: 1;
                min-width: 0;

                .clip-title {
                  font-size: 11px;
                  font-weight: 500;
                  color: var(--text-inverse);
                  margin-bottom: 2px;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }

                .clip-duration {
                  font-size: 10px;
                  color: var(--text-inverse);
                  opacity: 0.8;
                }
              }
            }

            .clip-resize-left,
            .clip-resize-right {
              position: absolute;
              top: 0;
              bottom: 0;
              width: 8px;
              cursor: ew-resize;
              z-index: 10;

              &:hover {
                background: rgba(52, 152, 219, 0.3);
              }
            }

            .clip-resize-left {
              left: 0;
            }

            .clip-resize-right {
              right: 0;
            }

            .clip-remove {
              position: absolute;
              top: 4px;
              right: 4px;
              width: 18px;
              height: 18px;
              background: rgba(0, 0, 0, 0.6);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              opacity: 0;
              transition: opacity 0.2s;

              &:hover {
                background: var(--error);
              }
            }

            &:hover .clip-remove {
              opacity: 1;
            }
          }

          .transition-indicator {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 30px;
            height: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 60;
            border: 2px solid #1e1e1e;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
            transition: all 0.2s;

            &:hover {
              transform: translateY(-50%) scale(1.2);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.6);
            }

            .el-icon {
              font-size: 14px;
              color: white;
            }

            .transition-label {
              position: absolute;
              top: 100%;
              margin-top: 4px;
              font-size: 10px;
              color: var(--text-secondary);
              white-space: nowrap;
              background: rgba(0, 0, 0, 0.8);
              padding: 2px 6px;
              border-radius: 3px;
              pointer-events: none;
              opacity: 0;
              transition: opacity 0.2s;
            }

            &:hover .transition-label {
              opacity: 1;
            }
          }
        }
      }

      // 音频轨道特殊样式
      .audio-track {
        .track-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-right: 8px;

          .el-button {
            color: var(--text-muted);

            &:hover {
              color: var(--accent);
            }
          }
        }

        .audio-clip {
          background: #7c3aed;

          &:hover {
            border-color: #a78bfa;
            box-shadow: var(--shadow-md);
          }

          &.selected {
            border-color: #8b5cf6;
            box-shadow: var(--shadow-glow);
          }

          .audio-waveform {
            width: 60px;
            height: 100%;
            background: linear-gradient(135deg, #8b5cf6 0%, var(--accent) 100%);
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            .el-icon {
              font-size: 24px;
              color: rgba(255, 255, 255, 0.8);
            }
          }
        }
      }
    }
  }

  .merge-progress-container {
    padding: 20px 0;

    .progress-info {
      margin-bottom: 20px;

      .progress-phase {
        margin-bottom: 8px;
      }

      .progress-message {
        font-size: 14px;
        color: var(--text-secondary);
        font-weight: 500;
      }
    }

    .progress-tips {
      margin-top: 20px;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 6px;

      p {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--text-secondary);

        .el-icon {
          font-size: 16px;
        }
      }
    }
  }
}
</style>
