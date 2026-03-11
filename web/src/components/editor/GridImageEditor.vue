<template>
  <el-dialog v-model="visible" :title="$t('editor.gridImageEditor')" width="900px" :close-on-click-modal="false"
    @close="handleClose" align-center>
    <!-- 宫格类型选择 -->
    <div class="grid-type-selector">
      <div class="section-label">{{ $t("editor.gridType") }}</div>
      <el-radio-group v-model="gridType" @change="initGridImages">
        <el-radio-button :label="4">{{
          $t("editor.fourGrid")
          }}</el-radio-button>
        <el-radio-button :label="6">{{ $t("editor.sixGrid") }}</el-radio-button>
        <el-radio-button :label="9">{{
          $t("editor.nineGrid")
          }}</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 宫格图片编辑区域 -->
    <div class="grid-editor">
      <div class="section-label">{{ $t("editor.editGridImage") }}</div>
      <div class="grid-container" :class="`grid-${gridType}`">
        <div v-for="(item, index) in gridImages" :key="index" class="grid-cell" @click="handleGridCellClick(index)">
          <img v-if="item.url" :src="item.url" alt="" />
          <div v-else class="grid-cell-placeholder">
            <el-icon :size="32">
              <Plus />
            </el-icon>
          </div>
          <div v-if="item.url" class="grid-cell-actions">
            <el-icon @click.stop="previewGridCell(index)">
              <ZoomIn />
            </el-icon>
            <el-icon @click.stop="removeGridCell(index)">
              <Delete />
            </el-icon>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="clearGrid">{{ $t("editor.clear") }}</el-button>
        <el-button @click="handleClose">{{ $t("common.cancel") }}</el-button>
        <el-button type="primary" :loading="creating" :disabled="!isGridComplete" @click="createGridImage">
          {{ creating ? $t("editor.creating") : $t("editor.createGridImage") }}
        </el-button>
      </div>
    </template>

    <!-- 图片选择对话框 -->
    <el-dialog v-model="showImageSelector" :title="$t('editor.selectImage')" width="900px" :close-on-click-modal="false"
      append-to-body>
      <el-tabs type="border-card">
        <el-tab-pane :label="$t('editor.existingImages')">
          <div class="image-selector-grid">
            <div v-for="img in allImages" :key="img.id" class="image-selector-item" @click="selectImageForGrid(img)">
              <el-image :src="getImageUrl(img)" fit="cover" style="width: 100%; height: 150px" />
              <div class="image-selector-label">
                {{ getFrameTypeText(img.frame_type) }}
              </div>
            </div>
          </div>
          <el-empty v-if="allImages.length === 0" :description="$t('editor.noImagesAvailable')" />
        </el-tab-pane>
        <el-tab-pane :label="$t('editor.uploadNewImage')">
          <el-upload drag :auto-upload="false" :show-file-list="false" accept="image/*"
            :on-change="handleUploadForGrid">
            <el-icon :size="67">
              <Upload />
            </el-icon>
            <div class="el-upload__text">
              {{ $t("common.upload") }}<em>{{ $t("common.upload") }}</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                {{ $t("editor.uploadNewImage") }}
              </div>
            </template>
          </el-upload>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="showImageSelector = false">{{
          $t("common.cancel")
          }}</el-button>
      </template>
    </el-dialog>

    <!-- 宫格图片预览对话框 -->
    <el-dialog v-model="showGridImagePreview" :title="$t('editor.preview')" width="800px" append-to-body align-center>
      <div v-if="previewGridImage" class="grid-preview-container">
        <img :src="previewGridImage.url" style="width: 100%; display: block" />
        <div style="margin-top: 16px; text-align: center">
          <el-button type="primary" @click="replaceGridImage">{{
            $t("editor.replaceImage")
            }}</el-button>
          <el-button @click="showGridImagePreview = false">{{
            $t("common.close")
            }}</el-button>
        </div>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { Plus, ZoomIn, Delete, Upload } from "@element-plus/icons-vue";
import { getImageUrl } from "@/utils/image";
import { imageAPI } from "@/api/image";

const { t: $t } = useI18n();

interface GridImage {
  id?: number;
  url?: string;
  file?: File;
  source?: string;
}

interface ImageGeneration {
  id: number;
  frame_type?: string;
  image_url?: string;
  local_path?: string;
  [key: string]: any;
}

const props = defineProps<{
  modelValue: boolean;
  storyboardId: number;
  dramaId: number;
  allImages: ImageGeneration[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "success"): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const gridType = ref<4 | 6 | 9>(4);
const gridImages = ref<GridImage[]>([]);
const showImageSelector = ref(false);
const currentGridIndex = ref<number>(-1);
const showGridImagePreview = ref(false);
const previewGridImage = ref<{ url: string; index: number } | null>(null);
const creating = ref(false);

// 初始化宫格图片数组
const initGridImages = () => {
  gridImages.value = Array.from({ length: gridType.value }, () => ({}));
};

// 检查宫格是否完整
const isGridComplete = computed(() => {
  return gridImages.value.every((item) => item.url);
});

// 处理宫格单元格点击
const handleGridCellClick = (index: number) => {
  currentGridIndex.value = index;
  showImageSelector.value = true;
};

// 选择已有图片用于宫格
const selectImageForGrid = (img: ImageGeneration) => {
  if (
    currentGridIndex.value >= 0 &&
    currentGridIndex.value < gridImages.value.length
  ) {
    gridImages.value[currentGridIndex.value] = {
      id: img.id,
      url: getImageUrl(img),
      source: "existing",
    };
    showImageSelector.value = false;
  }
};

// 处理上传图片用于宫格
const handleUploadForGrid = (file: any) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    if (
      currentGridIndex.value >= 0 &&
      currentGridIndex.value < gridImages.value.length
    ) {
      gridImages.value[currentGridIndex.value] = {
        url: e.target?.result as string,
        file: file.raw,
        source: "upload",
      };
      showImageSelector.value = false;
    }
  };
  reader.readAsDataURL(file.raw);
};

// 预览宫格单元格
const previewGridCell = (index: number) => {
  const item = gridImages.value[index];
  if (item.url) {
    previewGridImage.value = { url: item.url, index };
    showGridImagePreview.value = true;
  }
};

// 替换宫格图片
const replaceGridImage = () => {
  if (previewGridImage.value) {
    currentGridIndex.value = previewGridImage.value.index;
    showGridImagePreview.value = false;
    showImageSelector.value = true;
  }
};

// 移除宫格单元格图片
const removeGridCell = (index: number) => {
  gridImages.value[index] = {};
};

// 清空宫格
const clearGrid = () => {
  initGridImages();
};

// 获取帧类型文本
const getFrameTypeText = (frameType: string) => {
  const typeMap: Record<string, string> = {
    first: $t("editor.firstFrame"),
    last: $t("editor.lastFrame"),
    panel: $t("editor.panelFrame"),
    action: $t("editor.actionSequence"),
    key: $t("editor.keyFrame"),
  };
  return typeMap[frameType] || frameType;
};

// 创建宫格图片
const createGridImage = async () => {
  if (!isGridComplete.value) {
    ElMessage.warning($t("editor.allCellsRequired"));
    return;
  }

  creating.value = true;
  try {
    // 创建 canvas 来合成宫格图片
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建 canvas 上下文");

    // 根据宫格类型设置画布尺寸和布局
    const cellSize = 512; // 每个图片的尺寸
    const gap = 6; // 图片之间的间隙
    let cols = 2,
      rows = 2;
    if (gridType.value === 6) {
      cols = 3;
      rows = 2;
    } else if (gridType.value === 9) {
      cols = 3;
      rows = 3;
    }

    // 计算画布总尺寸：图片尺寸 * 数量 + 间隙 * (数量 - 1)
    canvas.width = cellSize * cols + gap * (cols - 1);
    canvas.height = cellSize * rows + gap * (rows - 1);

    // 填充背景色（间隙颜色）
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 加载所有图片并绘制到 canvas
    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    };

    for (let i = 0; i < gridImages.value.length; i++) {
      const item = gridImages.value[i];
      if (!item.url) continue;

      const img = await loadImage(item.url);
      const col = i % cols;
      const row = Math.floor(i / cols);
      // 计算绘制位置：考虑间隙
      const x = col * (cellSize + gap);
      const y = row * (cellSize + gap);
      ctx.drawImage(img, x, y, cellSize, cellSize);
    }

    // 将 canvas 转换为 blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9);
    });

    // 上传合成的图片
    const formData = new FormData();
    formData.append("file", blob, "grid-image.jpg");

    const response = await fetch("/api/v1/upload/image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("上传失败");
    }

    const result = await response.json();
    const imageUrl = result.data?.url;

    if (imageUrl) {
      // 创建图片生成记录（关联到动作序列帧类型）
      await imageAPI.uploadImage({
        storyboard_id: props.storyboardId,
        drama_id: props.dramaId,
        frame_type: "action",
        image_url: imageUrl,
        prompt: `${$t("editor.createGridImage")} - ${gridType.value}${$t("editor.gridType")}`,
      });

      ElMessage.success($t("editor.createSuccess"));
      emit("success");
      handleClose();
    }
  } catch (error: any) {
    console.error("制作宫格图片失败:", error);
    ElMessage.error(error.message || $t("editor.createFailed"));
  } finally {
    creating.value = false;
  }
};

// 关闭对话框
const handleClose = () => {
  clearGrid();
  visible.value = false;
};

// 监听对话框打开，初始化宫格
watch(visible, (newVal) => {
  if (newVal) {
    initGridImages();
  }
});
</script>

<style scoped>
.section-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.grid-type-selector {
  margin-bottom: 20px;
}

.grid-editor {
  margin-bottom: 20px;
}

.grid-container {
  display: grid;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  height: 550px;
  max-height: 550px;
  place-content: center;
  place-items: center;
}

.grid-container.grid-4 {
  grid-template-columns: repeat(2, 200px);
  grid-template-rows: repeat(2, 200px);
}

.grid-container.grid-6 {
  grid-template-columns: repeat(3, 200px);
  grid-template-rows: repeat(2, 200px);
}

.grid-container.grid-9 {
  grid-template-columns: repeat(3, 160px);
  grid-template-rows: repeat(3, 160px);
}

.grid-cell {
  position: relative;
  border: 2px dashed var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--bg-card);
  min-height: 0;
  width: 100%;
  height: 100%;
}

.grid-cell:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.2);
}

.grid-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.grid-cell-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.grid-cell-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.grid-cell:hover .grid-cell-actions {
  opacity: 1;
}

.grid-cell-actions .el-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.grid-cell-actions .el-icon:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 图片选择器样式 */
.image-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
  padding: 12px;
}

.image-selector-item {
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.image-selector-item:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
  transform: translateY(-2px);
}

.image-selector-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 12px;
  text-align: center;
}

.grid-preview-container {
  text-align: center;
}

.grid-preview-container img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
