<template>
  <el-dialog
    v-model="dialogVisible"
    title="裁剪动作序列图"
    width="70vw"
    :close-on-click-modal="false"
    destroy-on-close
    class="crop-dialog"
    align-center
    style="height: 90vh"
  >
    <div class="crop-container">
      <!-- 下方区域 -->
      <div class="content-area">
        <!-- 左侧裁剪区域 -->
        <div class="crop-area">
          <div class="crop-canvas-wrapper">
            <cropper-canvas ref="cropperCanvasRef" background class="cropper-canvas-element">
              <cropper-image
                v-if="imageUrl"
                ref="cropperImageRef"
                :src="imageUrl"
                alt="crop"
                rotatable
                scalable
                skewable
                translatable
              />
              <cropper-shade hidden style="min-width: 300px; min-height: 300px"></cropper-shade>
              <cropper-handle action="move" plain></cropper-handle>
              <cropper-selection
                :width="300"
                :height="300"
                style="min-width: 300px; min-height: 300px"
                movable
                resizable
                outlined
                aspectRatio="1"
              >
                <!-- <cropper-grid role="grid" bordered covered></cropper-grid> -->
                <!-- <cropper-crosshair centered></cropper-crosshair> -->
                <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)"></cropper-handle>
                <cropper-handle action="n-resize"></cropper-handle>
                <cropper-handle action="e-resize"></cropper-handle>
                <cropper-handle action="s-resize"></cropper-handle>
                <cropper-handle action="w-resize"></cropper-handle>
                <cropper-handle action="ne-resize"></cropper-handle>
                <cropper-handle action="nw-resize"></cropper-handle>
                <cropper-handle action="se-resize"></cropper-handle>
                <cropper-handle action="sw-resize"></cropper-handle>
              </cropper-selection>
            </cropper-canvas>
          </div>
        </div>

        <!-- 缩放控制区域 -->
        <div class="zoom-control">
          <div class="slider-box">
            <el-button :icon="ZoomIn" circle @click="handleZoomIn" :disabled="zoomLevel >= 200" />
            <el-slider
              v-model="zoomLevel"
              :min="50"
              :max="200"
              :step="1"
              vertical
              height="300px"
              @change="handleZoomChange"
            />
            <el-button :icon="ZoomOut" circle @click="handleZoomOut" :disabled="zoomLevel <= 50" />
            <div class="zoom-label">{{ zoomLevel }}%</div>
          </div>

          <div class="crop-actions">
            <!-- 裁剪和重置按钮 -->
            <el-button :icon="Crop" circle type="primary" @click="cropImage" :disabled="!canCrop" title="裁剪" />
            <el-button :icon="RefreshLeft" circle @click="resetCrop" title="重置" style="margin: 0" />
          </div>
        </div>

        <!-- 右侧预览区域 -->
        <div class="preview-area">
          <!-- 顶部文件夹区域 -->
          <div class="folder-area">
            <div
              v-for="folder in folders"
              :key="folder.type"
              class="folder-item"
              :class="{
                'drag-over': dragOverFolder === folder.type,
              }"
              @dragover.prevent="handleFolderDragOver(folder.type)"
              @dragleave="handleFolderDragLeave"
              @drop="handleFolderDrop($event, folder.type)"
            >
              <el-icon :size="20" class="folder-icon">
                <Folder />
              </el-icon>
              <span class="folder-name">{{ folder.name }}</span>
              <el-badge :value="folder.count" :hidden="folder.count === 0" />
            </div>
          </div>
          <div class="preview-title">已裁剪图片 ({{ croppedImages.length }})</div>
          <div class="preview-grid">
            <div
              v-for="(img, index) in croppedImages"
              :key="index"
              class="preview-item"
              draggable="true"
              @dragstart="handleImageDragStart($event, img, index)"
              @dragend="handleImageDragEnd"
            >
              <img :src="img.url" alt="cropped" />
              <div class="preview-overlay">
                <el-icon :size="16" class="delete-icon" @click="removeCroppedImage(index)">
                  <Close />
                </el-icon>
              </div>
              <div v-if="img.frameType" class="frame-type-badge">
                {{ getFrameTypeName(img.frameType) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving"> 保存 </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { Folder, Close, ZoomIn, ZoomOut, Crop, RefreshLeft } from '@element-plus/icons-vue'
import 'cropperjs'

interface CroppedImage {
  url: string
  blob: Blob
  frameType?: string
}

interface Props {
  modelValue: boolean
  imageUrl?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', images: { blob: Blob; frameType: string }[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const cropperCanvasRef = ref<any>()
const cropperImageRef = ref<any>()
const croppedImages = ref<CroppedImage[]>([])
const dragOverFolder = ref<string | null>(null)
const draggingImageIndex = ref<number | null>(null)
const saving = ref(false)
const zoomLevel = ref(100)
const previousZoomLevel = ref(100)

const folders = computed(() => [
  {
    type: 'first',
    name: '首帧',
    count: croppedImages.value.filter((img) => img.frameType === 'first').length,
  },
  {
    type: 'last',
    name: '尾帧',
    count: croppedImages.value.filter((img) => img.frameType === 'last').length,
  },
  {
    type: 'key',
    name: '关键帧',
    count: croppedImages.value.filter((img) => img.frameType === 'key').length,
  },
])

const canCrop = computed(() => {
  return cropperCanvasRef.value !== undefined && cropperImageRef.value !== undefined
})
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      // dialog opened
    }
  },
)

const cropImage = async () => {
  if (!cropperCanvasRef.value) {
    console.error('Cropper canvas not found')
    return
  }

  try {
    // 使用 Web Components API 的 $toCanvas 方法获取裁剪后的画布
    const selection = cropperCanvasRef.value.querySelector('cropper-selection')
    if (!selection) {
      console.error('Cropper selection not found')
      return
    }

    // 获取选区的 canvas
    const canvas = await selection.$toCanvas()
    if (!canvas) {
      console.error('Failed to get canvas')
      return
    }

    // 转换为 Blob
    canvas.toBlob((blob: Blob | null) => {
      if (!blob) return

      const url = URL.createObjectURL(blob)
      croppedImages.value.push({
        url,
        blob,
        frameType: undefined,
      })
    })
  } catch (error) {
    console.error('Error cropping image:', error)
  }
}

const resetCrop = () => {
  if (cropperImageRef.value && cropperImageRef.value.$resetTransform) {
    cropperImageRef.value.$resetTransform()
    zoomLevel.value = 100
  }
}

const handleZoomIn = () => {
  if (zoomLevel.value < 200) {
    zoomLevel.value = Math.min(200, zoomLevel.value + 2)
    applyZoom()
  }
}

const handleZoomOut = () => {
  if (zoomLevel.value > 50) {
    zoomLevel.value = Math.max(50, zoomLevel.value - 2)
    applyZoom()
  }
}

const handleZoomChange = (value: number) => {
  zoomLevel.value = value
  applyZoom()
}

const applyZoom = () => {
  if (cropperImageRef.value && cropperImageRef.value.$scale) {
    // 计算相对于上一次的缩放比例
    const ratio = zoomLevel.value / previousZoomLevel.value
    cropperImageRef.value.$scale(ratio)
    previousZoomLevel.value = zoomLevel.value
  }
}

const removeCroppedImage = (index: number) => {
  const img = croppedImages.value[index]
  URL.revokeObjectURL(img.url)
  croppedImages.value.splice(index, 1)
}

const handleImageDragStart = (event: DragEvent, img: CroppedImage, index: number) => {
  draggingImageIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

const handleImageDragEnd = () => {
  draggingImageIndex.value = null
  dragOverFolder.value = null
}

const handleFolderDragOver = (folderType: string) => {
  dragOverFolder.value = folderType
}

const handleFolderDragLeave = () => {
  dragOverFolder.value = null
}

const handleFolderDrop = (event: DragEvent, folderType: string) => {
  event.preventDefault()
  dragOverFolder.value = null

  if (draggingImageIndex.value === null) return

  const img = croppedImages.value[draggingImageIndex.value]
  img.frameType = folderType
  draggingImageIndex.value = null
}

const getFrameTypeName = (type: string) => {
  const map: Record<string, string> = {
    first: '首帧',
    last: '尾帧',
    key: '关键帧',
  }
  return map[type] || type
}

const handleClose = () => {
  croppedImages.value.forEach((img) => {
    URL.revokeObjectURL(img.url)
  })
  croppedImages.value = []
  dialogVisible.value = false
}

const handleSave = () => {
  const imagesToSave = croppedImages.value
    .filter((img) => img.frameType)
    .map((img) => ({
      blob: img.blob,
      frameType: img.frameType!,
    }))

  if (imagesToSave.length === 0) {
    return
  }

  emit('save', imagesToSave)
  handleClose()
}
</script>

<style>
.crop-dialog .el-dialog__body {
  height: calc(100% - 120px) !important;
}
</style>

<style scoped>
:deep(.crop-dialog.el-dialog) {
  width: 1200px;
  height: 90vh;
  margin: 0;
  display: flex;
  flex-direction: column;
}

:deep(.crop-dialog .el-dialog__body) {
  padding: 16px;
  flex: 1;
  overflow: hidden;
  display: flex;
  height: calc(100% - 120px) !important;
}

.crop-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 20px;
}

.folder-area {
  display: flex;
  gap: 16px;
  /* padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 2px dashed var(--border-primary); */
}

.folder-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: var(--bg-primary);
  border: 2px solid var(--border-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.folder-item:hover {
  border-color: var(--accent);
  background: var(--bg-card);
}

.folder-item.drag-over {
  border-color: var(--accent);
  background: var(--accent-light);
  transform: scale(1.05);
}

.folder-icon {
  color: var(--accent);
}

.folder-name {
  font-weight: 500;
  color: var(--text-primary);
}

.content-area {
  flex: 1;
  display: flex;
  gap: 20px;
  min-height: 0;
  overflow: hidden;
  justify-content: center;
}

.crop-area {
  flex: 1;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 16px;
  background: var(--bg-primary);
  min-height: 0;
}

.zoom-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 16px 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  height: fit-content;
  align-self: center;
  height: 100%;
}

.slider-box,
.crop-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}

.zoom-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
  margin-top: 4px;
}

.crop-title,
.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  flex-shrink: 0;
}

.crop-canvas-wrapper {
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
  height: 500px;
  position: relative;
  flex: 1;
  min-height: 400px;
}

.cropper-canvas-element {
  width: 100%;
  height: 100%;
  display: block;
}

/* Cropper.js 基础样式 */
.crop-canvas-wrapper :deep(.cropper-container) {
  direction: ltr;
  font-size: 0;
  line-height: 0;
  position: relative;
  touch-action: none;
  user-select: none;
}

.crop-canvas-wrapper :deep(.cropper-container img) {
  display: block;
  height: 100%;
  image-orientation: 0deg;
  max-height: none !important;
  max-width: none !important;
  min-height: 0 !important;
  min-width: 0 !important;
  width: 100%;
}

.crop-canvas-wrapper :deep(.cropper-wrap-box),
.crop-canvas-wrapper :deep(.cropper-canvas),
.crop-canvas-wrapper :deep(.cropper-drag-box),
.crop-canvas-wrapper :deep(.cropper-crop-box),
.crop-canvas-wrapper :deep(.cropper-modal) {
  bottom: 0;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
}

.crop-canvas-wrapper :deep(.cropper-drag-box) {
  background-color: #fff;
  opacity: 0;
}

.crop-canvas-wrapper :deep(.cropper-modal) {
  background-color: #000;
  opacity: 0.5;
}

.crop-canvas-wrapper :deep(.cropper-view-box) {
  display: block;
  height: 100%;
  outline: 1px solid #39f;
  outline-color: rgba(51, 153, 255, 0.75);
  overflow: hidden;
  width: 100%;
}

.crop-canvas-wrapper :deep(.cropper-dashed) {
  border: 0 dashed #eee;
  display: block;
  opacity: 0.5;
  position: absolute;
}

.crop-canvas-wrapper :deep(.cropper-dashed.dashed-h) {
  border-bottom-width: 1px;
  border-top-width: 1px;
  height: calc(100% / 3);
  left: 0;
  top: calc(100% / 3);
  width: 100%;
}

.crop-canvas-wrapper :deep(.cropper-dashed.dashed-v) {
  border-left-width: 1px;
  border-right-width: 1px;
  height: 100%;
  left: calc(100% / 3);
  top: 0;
  width: calc(100% / 3);
}

.crop-canvas-wrapper :deep(.cropper-center) {
  display: block;
  height: 0;
  left: 50%;
  opacity: 0.75;
  position: absolute;
  top: 50%;
  width: 0;
}

.crop-canvas-wrapper :deep(.cropper-center::before),
.crop-canvas-wrapper :deep(.cropper-center::after) {
  background-color: #eee;
  content: ' ';
  display: block;
  position: absolute;
}

.crop-canvas-wrapper :deep(.cropper-center::before) {
  height: 1px;
  left: -3px;
  top: 0;
  width: 7px;
}

.crop-canvas-wrapper :deep(.cropper-center::after) {
  height: 7px;
  left: 0;
  top: -3px;
  width: 1px;
}

.crop-canvas-wrapper :deep(.cropper-face),
.crop-canvas-wrapper :deep(.cropper-line),
.crop-canvas-wrapper :deep(.cropper-point) {
  display: block;
  height: 100%;
  opacity: 0.1;
  position: absolute;
  width: 100%;
}

.crop-canvas-wrapper :deep(.cropper-face) {
  background-color: #fff;
  left: 0;
  top: 0;
}

.crop-canvas-wrapper :deep(.cropper-line) {
  background-color: #39f;
}

.crop-canvas-wrapper :deep(.cropper-line.line-e) {
  cursor: ew-resize;
  right: -3px;
  top: 0;
  width: 5px;
}

.crop-canvas-wrapper :deep(.cropper-line.line-n) {
  cursor: ns-resize;
  height: 5px;
  left: 0;
  top: -3px;
}

.crop-canvas-wrapper :deep(.cropper-line.line-w) {
  cursor: ew-resize;
  left: -3px;
  top: 0;
  width: 5px;
}

.crop-canvas-wrapper :deep(.cropper-line.line-s) {
  bottom: -3px;
  cursor: ns-resize;
  height: 5px;
  left: 0;
}

.crop-canvas-wrapper :deep(.cropper-point) {
  background-color: #39f;
  height: 5px;
  opacity: 0.75;
  width: 5px;
}

.crop-canvas-wrapper :deep(.cropper-point.point-e) {
  cursor: ew-resize;
  margin-top: -3px;
  right: -3px;
  top: 50%;
}

.crop-canvas-wrapper :deep(.cropper-point.point-n) {
  cursor: ns-resize;
  left: 50%;
  margin-left: -3px;
  top: -3px;
}

.crop-canvas-wrapper :deep(.cropper-point.point-w) {
  cursor: ew-resize;
  left: -3px;
  margin-top: -3px;
  top: 50%;
}

.crop-canvas-wrapper :deep(.cropper-point.point-s) {
  bottom: -3px;
  cursor: s-resize;
  left: 50%;
  margin-left: -3px;
}

.crop-canvas-wrapper :deep(.cropper-point.point-ne) {
  cursor: nesw-resize;
  right: -3px;
  top: -3px;
}

.crop-canvas-wrapper :deep(.cropper-point.point-nw) {
  cursor: nwse-resize;
  left: -3px;
  top: -3px;
}

.crop-canvas-wrapper :deep(.cropper-point.point-sw) {
  bottom: -3px;
  cursor: nesw-resize;
  left: -3px;
}

.crop-canvas-wrapper :deep(.cropper-point.point-se) {
  bottom: -3px;
  cursor: nwse-resize;
  height: 20px;
  opacity: 1;
  right: -3px;
  width: 20px;
}

.crop-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.preview-area {
  flex: 1;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 16px;
  background: var(--bg-primary);
  min-height: 0;
  max-width: 420px;
}

.preview-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  overflow-y: auto;
  align-content: start;
}

.preview-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: move;
  border: 2px solid var(--border-primary);
  transition: all 0.3s;
}

.preview-item:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-overlay {
  position: absolute;
  top: 0;
  right: 0;
  padding: 4px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 0 0 0 8px;
  opacity: 0;
  transition: opacity 0.3s;
}

.preview-item:hover .preview-overlay {
  opacity: 1;
}

.delete-icon {
  color: #fff;
  cursor: pointer;
}

.delete-icon:hover {
  color: #f56c6c;
}

.frame-type-badge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  padding: 2px 8px;
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  border-radius: 4px;
  font-weight: 500;
}
</style>
