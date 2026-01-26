<template>
  <div class="scene-images-container">
    <el-page-header @back="goBack" title="返回项目">
      <template #content>
        <h2>场景图片生成</h2>
      </template>
    </el-page-header>

    <el-card shadow="never" class="main-card">
      <el-tabs v-model="activeEpisode">
        <el-tab-pane
          v-for="episode in episodes"
          :key="episode.id"
          :label="`第${episode.episode_number}集`"
          :name="episode.id"
        >
          <el-row :gutter="20">
            <el-col :span="8" v-for="scene in episode.scenes" :key="scene.id">
              <el-card
                shadow="hover"
                class="scene-card"
                :class="{ 'has-image': scene.image_url }"
              >
                <template #header>
                  <div class="scene-header">
                    <span class="scene-number"
                      >场景 {{ scene.storyboard_number }}</span
                    >
                    <el-tag size="small">{{ scene.location }}</el-tag>
                  </div>
                </template>

                <div class="scene-preview">
                  <el-image
                    v-if="hasImage(scene)"
                    :src="getImageUrl(scene)"
                    fit="cover"
                  />
                  <div v-else class="placeholder">
                    <el-icon :size="48"><Picture /></el-icon>
                    <p>未生成</p>
                  </div>
                </div>

                <div class="scene-info">
                  <h4>{{ scene.title }}</h4>
                  <p class="description">{{ scene.description }}</p>
                </div>

                <el-button
                  type="primary"
                  @click="generateImage(scene)"
                  :loading="generatingId === scene.id"
                  :disabled="!!generatingId && generatingId !== scene.id"
                  style="width: 100%"
                >
                  {{ hasImage(scene) ? "重新生成" : "生成图片" }}
                </el-button>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>

      <div class="actions">
        <el-button
          type="success"
          size="large"
          @click="goToNextStep"
          :disabled="!allImagesGenerated"
        >
          下一步：视频生成
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Picture } from "@element-plus/icons-vue";
import type { Episode, Scene } from "@/types/drama";
import { getImageUrl, hasImage } from "@/utils/image";

const route = useRoute();
const router = useRouter();
const dramaId = route.params.id as string;

const episodes = ref<Episode[]>([]);
const activeEpisode = ref<string>();
const generatingId = ref<string>();

const allImagesGenerated = computed(() => {
  return episodes.value.every((ep) => ep.scenes?.every((s) => s.image_url));
});

const goBack = () => {
  router.push(`/dramas/${dramaId}`);
};

const generateImage = async (scene: Scene) => {
  generatingId.value = scene.id;
  try {
    const { imageAPI } = await import("@/api/image");

    // 构建场景提示词
    let prompt = `${scene.location}, ${scene.time}`;
    if (scene.description) {
      prompt += `, ${scene.description}`;
    }

    const result = await imageAPI.generateImage({
      drama_id: dramaId,
      scene_id: scene.id as number,
      image_type: "scene",
      prompt: prompt,
    });

    ElMessage.success("场景图片生成任务已提交");
  } catch (error: any) {
    ElMessage.error(error.message || "生成失败");
  } finally {
    generatingId.value = undefined;
  }
};

const goToNextStep = () => {
  router.push(`/dramas/${dramaId}/videos`);
};

onMounted(() => {
  // TODO: 加载剧集和场景列表
  episodes.value = [];
});
</script>

<style scoped>
.scene-images-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.main-card {
  margin-top: 20px;
}

.scene-card {
  margin-bottom: 20px;
}

.scene-card.has-image {
  border-color: #67c23a;
}

.scene-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scene-number {
  font-weight: 500;
}

.scene-preview {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.scene-preview img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
}

.placeholder {
  text-align: center;
  color: #909399;
}

.placeholder p {
  margin-top: 8px;
}

.scene-info h4 {
  margin: 8px 0;
}

.scene-info .description {
  color: #606266;
  font-size: 13px;
  margin: 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.actions {
  margin-top: 30px;
  text-align: center;
}
</style>
