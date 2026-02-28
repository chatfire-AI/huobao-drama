<template>
  <div class="animate-fade-in drama-management-container">
    <ProjectFlowHeader
      :title="drama?.title"
      :description="drama?.description"
      :status="drama?.status"
      :episodes-count="episodesCount"
      :characters-count="charactersCount"
      :scenes-count="scenesCount"
      :props-count="propsCount"
    />

    <div class="tabs-wrapper">
      <el-tabs v-model="activeTab" class="management-tabs">
        <el-tab-pane name="episodes">
          <template #label>
            <div class="tab-label">
              <el-icon :size="16"><Document /></el-icon>
              <span>{{ $t('drama.management.episodes') }}</span>
              <span v-if="episodesCount" class="tab-badge">{{ episodesCount }}</span>
            </div>
          </template>
          <EpisodesTab
            :episodes="drama?.episodes || []"
            @create-episode="createNewEpisode"
            @enter-episode="enterEpisodeWorkflow"
            @delete-episode="deleteEpisode"
            @upload-novel="showUploadNovel = true"
          />
        </el-tab-pane>

        <el-tab-pane name="characters">
          <template #label>
            <div class="tab-label">
              <el-icon :size="16"><User /></el-icon>
              <span>{{ $t('drama.management.characters') }}</span>
              <span v-if="charactersCount" class="tab-badge">{{ charactersCount }}</span>
            </div>
          </template>
          <CharactersTab
            :characters="drama?.characters || []"
            @extract-characters="openExtractCharacterDialog"
            @add-character="openAddCharacterDialog"
            @edit-character="editCharacter"
            @generate-character-image="generateCharacterImage"
            @delete-character="deleteCharacter"
          />
        </el-tab-pane>

        <el-tab-pane name="scenes">
          <template #label>
            <div class="tab-label">
              <el-icon :size="16"><Picture /></el-icon>
              <span>{{ $t('drama.management.sceneList') }}</span>
              <span v-if="scenesCount" class="tab-badge">{{ scenesCount }}</span>
            </div>
          </template>
          <ScenesTab
            :scenes="scenes"
            @extract-scenes="openExtractSceneDialog"
            @add-scene="openAddSceneDialog"
            @edit-scene="editScene"
            @generate-scene-image="generateSceneImage"
            @delete-scene="deleteScene"
          />
        </el-tab-pane>

        <el-tab-pane name="props">
          <template #label>
            <div class="tab-label">
              <el-icon :size="16"><Box /></el-icon>
              <span>{{ $t('drama.management.propList') }}</span>
              <span v-if="propsCount" class="tab-badge">{{ propsCount }}</span>
            </div>
          </template>
          <PropsTab
            :props-list="drama?.props || []"
            @extract-props="openExtractDialog"
            @add-prop="openAddPropDialog"
            @edit-prop="editProp"
            @generate-prop-image="generatePropImage"
            @delete-prop="deleteProp"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

      <!-- 添加/编辑角色对话框 -->
      <el-dialog
        v-model="addCharacterDialogVisible"
        :title="editingCharacter ? $t('character.edit') : $t('character.add')"
        width="600px"
      >
        <el-form :model="newCharacter" label-width="100px">
          <el-form-item :label="$t('character.image')">
            <el-upload
              class="avatar-uploader"
              :action="`/api/v1/upload/image`"
              :show-file-list="false"
              :on-success="handleCharacterAvatarSuccess"
              :before-upload="beforeAvatarUpload"
            >
              <img
                v-if="hasImage(newCharacter)"
                :src="getImageUrl(newCharacter)"
                class="avatar"
                style="width: 100px; height: 100px; object-fit: cover"
              />
              <el-icon
                v-else
                class="avatar-uploader-icon"
                style="
                  border: 1px dashed #d9d9d9;
                  border-radius: 6px;
                  cursor: pointer;
                  position: relative;
                  overflow: hidden;
                  width: 100px;
                  height: 100px;
                  font-size: 28px;
                  color: #8c939d;
                  text-align: center;
                  line-height: 100px;
                "
                ><Plus
              /></el-icon>
            </el-upload>
          </el-form-item>
          <el-form-item :label="$t('character.name')">
            <el-input
              v-model="newCharacter.name"
              :placeholder="$t('character.name')"
            />
          </el-form-item>
          <el-form-item :label="$t('character.role')">
            <el-select
              v-model="newCharacter.role"
              :placeholder="$t('common.pleaseSelect')"
            >
              <el-option label="Main" value="main" />
              <el-option label="Supporting" value="supporting" />
              <el-option label="Minor" value="minor" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('character.appearance')">
            <el-input
              v-model="newCharacter.appearance"
              type="textarea"
              :rows="3"
              :placeholder="$t('character.appearance')"
            />
          </el-form-item>
          <el-form-item :label="$t('character.personality')">
            <el-input
              v-model="newCharacter.personality"
              type="textarea"
              :rows="3"
              :placeholder="$t('character.personality')"
            />
          </el-form-item>
          <el-form-item :label="$t('character.description')">
            <el-input
              v-model="newCharacter.description"
              type="textarea"
              :rows="3"
              :placeholder="$t('common.description')"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="addCharacterDialogVisible = false">{{
            $t("common.cancel")
          }}</el-button>
          <el-button type="primary" @click="saveCharacter">{{
            $t("common.confirm")
          }}</el-button>
        </template>
      </el-dialog>

      <!-- 添加/编辑场景对话框 -->
      <el-dialog
        v-model="addSceneDialogVisible"
        :title="editingScene ? $t('common.edit') : $t('common.add')"
        width="600px"
      >
        <el-form :model="newScene" label-width="100px">
          <el-form-item :label="$t('common.image')">
            <el-upload
              class="avatar-uploader"
              :action="`/api/v1/upload/image`"
              :show-file-list="false"
              :on-success="handleSceneImageSuccess"
              :before-upload="beforeAvatarUpload"
            >
              <img
                v-if="hasImage(newScene)"
                :src="getImageUrl(newScene)"
                class="avatar"
                style="width: 160px; height: 90px; object-fit: cover"
              />
              <el-icon
                v-else
                class="avatar-uploader-icon"
                style="
                  border: 1px dashed #d9d9d9;
                  border-radius: 6px;
                  cursor: pointer;
                  position: relative;
                  overflow: hidden;
                  width: 160px;
                  height: 90px;
                  font-size: 28px;
                  color: #8c939d;
                  text-align: center;
                  line-height: 90px;
                "
                ><Plus
              /></el-icon>
            </el-upload>
          </el-form-item>
          <el-form-item :label="$t('scene.location')">
            <el-input
              v-model="newScene.location"
              :placeholder="$t('scene.location')"
            />
          </el-form-item>
          <el-form-item :label="$t('scene.prompt')">
            <el-input
              v-model="newScene.prompt"
              type="textarea"
              :rows="3"
              :placeholder="$t('scene.prompt')"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="addSceneDialogVisible = false">{{
            $t("common.cancel")
          }}</el-button>
          <el-button type="primary" @click="saveScene">{{
            $t("common.confirm")
          }}</el-button>
        </template>
      </el-dialog>

      <!-- 添加/编辑道具对话框 -->
      <el-dialog
        v-model="addPropDialogVisible"
        :title="editingProp ? $t('common.edit') : $t('common.add')"
        width="600px"
      >
        <el-form :model="newProp" label-width="100px">
          <el-form-item :label="$t('common.image')">
            <el-upload
              class="avatar-uploader"
              :action="`/api/v1/upload/image`"
              :show-file-list="false"
              :on-success="handlePropImageSuccess"
              :before-upload="beforeAvatarUpload"
            >
              <img
                v-if="hasImage(newProp)"
                :src="getImageUrl(newProp)"
                class="avatar"
                style="width: 100px; height: 100px; object-fit: cover"
              />
              <el-icon
                v-else
                class="avatar-uploader-icon"
                style="
                  border: 1px dashed #d9d9d9;
                  border-radius: 6px;
                  cursor: pointer;
                  position: relative;
                  overflow: hidden;
                  width: 100px;
                  height: 100px;
                  font-size: 28px;
                  color: #8c939d;
                  text-align: center;
                  line-height: 100px;
                "
                ><Plus
              /></el-icon>
            </el-upload>
          </el-form-item>
          <el-form-item :label="$t('prop.name')">
            <el-input v-model="newProp.name" :placeholder="$t('prop.name')" />
          </el-form-item>
          <el-form-item :label="$t('prop.type')">
            <el-input
              v-model="newProp.type"
              :placeholder="$t('prop.typePlaceholder')"
            />
          </el-form-item>
          <el-form-item :label="$t('prop.description')">
            <el-input
              v-model="newProp.description"
              type="textarea"
              :rows="3"
              :placeholder="$t('prop.description')"
            />
          </el-form-item>
          <el-form-item :label="$t('prop.prompt')">
            <el-input
              v-model="newProp.prompt"
              type="textarea"
              :rows="3"
              :placeholder="$t('prop.promptPlaceholder')"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="addPropDialogVisible = false">{{
            $t("common.cancel")
          }}</el-button>
          <el-button type="primary" @click="saveProp">{{
            $t("common.confirm")
          }}</el-button>
        </template>
      </el-dialog>
      <!-- 从剧本提取道具对话框 -->
      <el-dialog
        v-model="extractPropsDialogVisible"
        :title="$t('prop.batchExtract')"
        width="500px"
      >
        <el-form label-width="100px">
          <el-form-item :label="$t('prop.selectEpisodes')">
            <div style="width: 100%">
              <el-checkbox
                v-model="selectAllPropsEpisodes"
                :indeterminate="isPropsIndeterminate"
                @change="handleSelectAllPropsEpisodes"
                style="margin-bottom: 8px"
              >{{ $t('common.selectAll') }}</el-checkbox>
              <el-select
                v-model="selectedPropsEpisodeIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                :placeholder="$t('common.pleaseSelect')"
                style="width: 100%"
                @change="handlePropsEpisodeSelectionChange"
              >
                <el-option
                  v-for="ep in sortedEpisodes"
                  :key="ep.id"
                  :label="ep.title"
                  :value="ep.id"
                />
              </el-select>
            </div>
          </el-form-item>
          <el-alert
            :title="$t('prop.batchExtractTip')"
            type="info"
            :closable="false"
            show-icon
          />
          <div v-if="propsExtractProgress.active" style="margin-top: 16px">
            <el-progress :percentage="propsExtractProgress.percent" :status="propsExtractProgress.status" />
            <p style="margin-top: 8px; color: var(--el-text-color-secondary); font-size: 13px">
              {{ propsExtractProgress.message }}
            </p>
          </div>
        </el-form>
        <template #footer>
          <el-button @click="extractPropsDialogVisible = false" :disabled="propsExtractProgress.active">{{
            $t("common.cancel")
          }}</el-button>
          <el-button
            type="primary"
            @click="handleExtractProps"
            :disabled="selectedPropsEpisodeIds.length === 0 || propsExtractProgress.active"
            :loading="propsExtractProgress.active"
          >{{ $t("prop.startExtract") }}</el-button>
        </template>
      </el-dialog>

      <!-- 从剧本提取角色对话框 -->
      <el-dialog
        v-model="extractCharactersDialogVisible"
        :title="$t('character.batchExtract')"
        width="500px"
      >
        <el-form label-width="100px">
          <el-form-item :label="$t('character.selectEpisodes')">
            <div style="width: 100%">
              <el-checkbox
                v-model="selectAllEpisodes"
                :indeterminate="isIndeterminate"
                @change="handleSelectAllEpisodes"
                style="margin-bottom: 8px"
              >{{ $t('common.selectAll') }}</el-checkbox>
              <el-select
                v-model="selectedExtractEpisodeIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                :placeholder="$t('common.pleaseSelect')"
                style="width: 100%"
                @change="handleEpisodeSelectionChange"
              >
                <el-option
                  v-for="ep in sortedEpisodes"
                  :key="ep.id"
                  :label="ep.title"
                  :value="ep.id"
                />
              </el-select>
            </div>
          </el-form-item>
          <el-alert
            :title="$t('character.batchExtractTip')"
            type="info"
            :closable="false"
            show-icon
          />
          <div v-if="extractProgress.active" style="margin-top: 16px">
            <el-progress :percentage="extractProgress.percent" :status="extractProgress.status" />
            <p style="margin-top: 8px; color: var(--el-text-color-secondary); font-size: 13px">
              {{ extractProgress.message }}
            </p>
          </div>
        </el-form>
        <template #footer>
          <el-button @click="extractCharactersDialogVisible = false" :disabled="extractProgress.active">{{
            $t("common.cancel")
          }}</el-button>
          <el-button
            type="primary"
            @click="handleExtractCharacters"
            :disabled="selectedExtractEpisodeIds.length === 0 || extractProgress.active"
            :loading="extractProgress.active"
          >{{ $t("prop.startExtract") }}</el-button>
        </template>
      </el-dialog>

      <!-- 从剧本提取场景对话框 -->
      <el-dialog
        v-model="extractScenesDialogVisible"
        :title="$t('scene.batchExtract')"
        width="500px"
      >
        <el-form label-width="100px">
          <el-form-item :label="$t('scene.selectEpisodes')">
            <div style="width: 100%">
              <el-checkbox
                v-model="selectAllScenesEpisodes"
                :indeterminate="isScenesIndeterminate"
                @change="handleSelectAllScenesEpisodes"
                style="margin-bottom: 8px"
              >{{ $t('common.selectAll') }}</el-checkbox>
              <el-select
                v-model="selectedScenesEpisodeIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                :placeholder="$t('common.pleaseSelect')"
                style="width: 100%"
                @change="handleScenesEpisodeSelectionChange"
              >
                <el-option
                  v-for="ep in sortedEpisodes"
                  :key="ep.id"
                  :label="ep.title"
                  :value="ep.id"
                />
              </el-select>
            </div>
          </el-form-item>
          <el-alert
            :title="$t('scene.batchExtractTip')"
            type="info"
            :closable="false"
            show-icon
          />
          <div v-if="scenesExtractProgress.active" style="margin-top: 16px">
            <el-progress :percentage="scenesExtractProgress.percent" :status="scenesExtractProgress.status" />
            <p style="margin-top: 8px; color: var(--el-text-color-secondary); font-size: 13px">
              {{ scenesExtractProgress.message }}
            </p>
          </div>
        </el-form>
        <template #footer>
          <el-button @click="extractScenesDialogVisible = false" :disabled="scenesExtractProgress.active">{{
            $t("common.cancel")
          }}</el-button>
          <el-button
            type="primary"
            @click="handleExtractScenes"
            :disabled="selectedScenesEpisodeIds.length === 0 || scenesExtractProgress.active"
            :loading="scenesExtractProgress.active"
          >{{ $t("prop.startExtract") }}</el-button>
        </template>
      </el-dialog>

      <!-- 上传小说对话框 -->
      <UploadNovelDialog
        v-model="showUploadNovel"
        :drama-id="(route.params.id as string)"
        :existing-episode-count="episodesCount"
        @success="loadDramaData"
      />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Document, User, Picture, Box } from "@element-plus/icons-vue";
import { dramaAPI } from "@/api/drama";
import { characterLibraryAPI } from "@/api/character-library";
import { propAPI } from "@/api/prop";
import { taskAPI } from "@/api/task";
import type { Drama } from "@/types/drama";
import { ProjectFlowHeader } from "@/components/common";
import { getImageUrl, hasImage } from "@/utils/image";
import { useI18n } from "vue-i18n";
import EpisodesTab from "./management/EpisodesTab.vue";
import CharactersTab from "./management/CharactersTab.vue";
import ScenesTab from "./management/ScenesTab.vue";
import PropsTab from "./management/PropsTab.vue";
import UploadNovelDialog from "./components/UploadNovelDialog.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const drama = ref<Drama>();
const activeTab = ref("episodes");
const scenes = ref<any[]>([]);

let pollingTimer: any = null;

const addCharacterDialogVisible = ref(false);
const addSceneDialogVisible = ref(false);
const addPropDialogVisible = ref(false);
const extractPropsDialogVisible = ref(false);
const extractCharactersDialogVisible = ref(false);
const extractScenesDialogVisible = ref(false);
const showUploadNovel = ref(false);

const editingCharacter = ref<any>(null);
const editingScene = ref<any>(null);
const editingProp = ref<any>(null);
const selectedExtractEpisodeIds = ref<(string | number)[]>([]);
const selectAllEpisodes = ref(false);
const isIndeterminate = ref(false);
const extractProgress = ref({
  active: false,
  percent: 0,
  message: '',
  status: '' as '' | 'success' | 'exception',
});

const selectedPropsEpisodeIds = ref<(string | number)[]>([]);
const selectAllPropsEpisodes = ref(false);
const isPropsIndeterminate = ref(false);
const propsExtractProgress = ref({
  active: false,
  percent: 0,
  message: '',
  status: '' as '' | 'success' | 'exception',
});

const selectedScenesEpisodeIds = ref<(string | number)[]>([]);
const selectAllScenesEpisodes = ref(false);
const isScenesIndeterminate = ref(false);
const scenesExtractProgress = ref({
  active: false,
  percent: 0,
  message: '',
  status: '' as '' | 'success' | 'exception',
});

const newCharacter = ref({
  name: "",
  role: "supporting",
  appearance: "",
  personality: "",
  description: "",
  image_url: "",
  local_path: "",
});

const newProp = ref({
  name: "",
  description: "",
  prompt: "",
  type: "",
  image_url: "",
  local_path: "",
});

const newScene = ref({
  location: "",
  prompt: "",
  image_url: "",
  local_path: "",
});

const episodesCount = computed(() => drama.value?.episodes?.length || 0);
const charactersCount = computed(() => drama.value?.characters?.length || 0);
const scenesCount = computed(() => scenes.value.length);
const propsCount = computed(() => drama.value?.props?.length || 0);

const sortedEpisodes = computed(() => {
  if (!drama.value?.episodes) return [];
  return [...drama.value.episodes].sort(
    (a, b) => a.episode_number - b.episode_number,
  );
});

// Helper for polling
const startPolling = (
  callback: () => Promise<void>,
  maxAttempts = 20,
  interval = 3000,
) => {
  if (pollingTimer) clearInterval(pollingTimer);

  let attempts = 0;
  pollingTimer = setInterval(async () => {
    attempts++;
    await callback();
    if (attempts >= maxAttempts) {
      if (pollingTimer) clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }, interval);
};

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer);
});

const loadDramaData = async () => {
  try {
    const data = await dramaAPI.get(route.params.id as string);
    drama.value = data;
    loadScenes();
  } catch (error: any) {
    ElMessage.error(error.message || t('message.loadProjectFailed'));
  }
};

const loadScenes = async () => {
  if (drama.value?.scenes) {
    scenes.value = drama.value.scenes;
  } else {
    scenes.value = [];
  }
};

const createNewEpisode = () => {
  const nextEpisodeNumber = episodesCount.value + 1;
  router.push({
    name: "EpisodeWorkflowNew",
    params: {
      id: route.params.id,
      episodeNumber: nextEpisodeNumber,
    },
  });
};

const enterEpisodeWorkflow = (episode: any) => {
  router.push({
    name: "EpisodeWorkflowNew",
    params: {
      id: route.params.id,
      episodeNumber: episode.episode_number,
    },
  });
};

const deleteEpisode = async (episode: any) => {
  try {
    await ElMessageBox.confirm(
      t('message.episodeDeleteConfirm', { number: episode.episode_number }),
      t('message.deleteConfirmTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: "warning",
      },
    );

    const existingEpisodes = drama.value?.episodes || [];
    const updatedEpisodes = existingEpisodes
      .filter((ep) => ep.episode_number !== episode.episode_number)
      .map((ep) => ({
        episode_number: ep.episode_number,
        title: ep.title,
        script_content: ep.script_content,
        description: ep.description,
        duration: ep.duration,
        status: ep.status,
      }));

    await dramaAPI.saveEpisodes(drama.value!.id, updatedEpisodes);
    ElMessage.success(t('message.episodeDeleteSuccess', { number: episode.episode_number }));
    await loadDramaData();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error.message || t('message.deleteFailed'));
    }
  }
};

const openAddCharacterDialog = () => {
  editingCharacter.value = null;
  newCharacter.value = {
    name: "",
    role: "supporting",
    appearance: "",
    personality: "",
    description: "",
    image_url: "",
    local_path: "",
  };
  addCharacterDialogVisible.value = true;
};

const handleCharacterAvatarSuccess = (response: any) => {
  if (response.data && response.data.url) {
    newCharacter.value.image_url = response.data.url;
    newCharacter.value.local_path = response.data.local_path || "";
  }
};

const handleSceneImageSuccess = (response: any) => {
  if (response.data && response.data.url) {
    newScene.value.image_url = response.data.url;
    newScene.value.local_path = response.data.local_path || "";
  }
};

const beforeAvatarUpload = (file: any) => {
  const isImage = file.type.startsWith("image/");
  const isLt10M = file.size / 1024 / 1024 < 10;

  if (!isImage) {
    ElMessage.error(t('message.imageOnlyUpload'));
  }
  if (!isLt10M) {
    ElMessage.error(t('message.imageSizeLimit'));
  }
  return isImage && isLt10M;
};

const generateCharacterImage = async (character: any) => {
  try {
    await characterLibraryAPI.generateCharacterImage(character.id);
    ElMessage.success(t('message.imageTaskSubmitted'));
    startPolling(loadDramaData);
  } catch (error: any) {
    ElMessage.error(error.message || t('message.generateFailed'));
  }
};

const openExtractCharacterDialog = () => {
  extractCharactersDialogVisible.value = true;
  selectedExtractEpisodeIds.value = [];
  selectAllEpisodes.value = false;
  isIndeterminate.value = false;
  extractProgress.value = { active: false, percent: 0, message: '', status: '' };
};

const handleSelectAllEpisodes = (val: boolean) => {
  selectedExtractEpisodeIds.value = val ? sortedEpisodes.value.map(ep => ep.id) : [];
  isIndeterminate.value = false;
};

const handleEpisodeSelectionChange = (val: (string | number)[]) => {
  const total = sortedEpisodes.value.length;
  selectAllEpisodes.value = val.length === total;
  isIndeterminate.value = val.length > 0 && val.length < total;
};

const handleExtractCharacters = async () => {
  if (selectedExtractEpisodeIds.value.length === 0) return;

  try {
    extractProgress.value = { active: true, percent: 0, message: t('character.extracting'), status: '' };

    const res = await characterLibraryAPI.batchExtractFromEpisodes(
      route.params.id as string,
      selectedExtractEpisodeIds.value.map(Number),
    );

    const taskId = res.task_id;

    // 轮询任务进度
    const pollInterval = setInterval(async () => {
      try {
        const task = await taskAPI.getStatus(taskId);
        if (task.progress !== undefined) {
          extractProgress.value.percent = task.progress;
        }
        if (task.message) {
          extractProgress.value.message = task.message;
        }

        if (task.status === 'completed') {
          clearInterval(pollInterval);
          const result = typeof task.result === 'string' ? JSON.parse(task.result) : task.result;
          extractProgress.value = {
            active: false,
            percent: 100,
            message: t('character.extractComplete', {
              characters: result?.characters || 0,
              scenes: result?.dedup_scenes || 0,
            }),
            status: 'success',
          };
          await loadDramaData();
        } else if (task.status === 'failed') {
          clearInterval(pollInterval);
          extractProgress.value = {
            active: false,
            percent: 0,
            message: task.error || t('common.failed'),
            status: 'exception',
          };
        }
      } catch {
        clearInterval(pollInterval);
        extractProgress.value = { active: false, percent: 0, message: t('common.failed'), status: 'exception' };
      }
    }, 3000);
  } catch (error: any) {
    extractProgress.value = { active: false, percent: 0, message: '', status: '' };
    ElMessage.error(error.message || t('message.extractFailed'));
  }
};

const generateSceneImage = async (scene: any) => {
  try {
    await dramaAPI.generateSceneImage({ scene_id: scene.id });
    ElMessage.success(t('message.imageTaskSubmitted'));
    startPolling(loadScenes);
  } catch (error: any) {
    ElMessage.error(error.message || t('message.generateFailed'));
  }
};

const openExtractSceneDialog = () => {
  extractScenesDialogVisible.value = true;
  selectedScenesEpisodeIds.value = [];
  selectAllScenesEpisodes.value = false;
  isScenesIndeterminate.value = false;
  scenesExtractProgress.value = { active: false, percent: 0, message: '', status: '' };
};

const handleSelectAllScenesEpisodes = (val: boolean) => {
  selectedScenesEpisodeIds.value = val ? sortedEpisodes.value.map(ep => ep.id) : [];
  isScenesIndeterminate.value = false;
};

const handleScenesEpisodeSelectionChange = (val: (string | number)[]) => {
  const total = sortedEpisodes.value.length;
  selectAllScenesEpisodes.value = val.length === total;
  isScenesIndeterminate.value = val.length > 0 && val.length < total;
};

const handleExtractScenes = async () => {
  if (selectedScenesEpisodeIds.value.length === 0) return;

  try {
    scenesExtractProgress.value = { active: true, percent: 0, message: t('character.extracting'), status: '' };

    const res = await dramaAPI.batchExtractBackgrounds(
      route.params.id as string,
      selectedScenesEpisodeIds.value.map(Number),
    );

    const taskId = res.task_id;

    const pollInterval = setInterval(async () => {
      try {
        const task = await taskAPI.getStatus(taskId);
        if (task.progress !== undefined) {
          scenesExtractProgress.value.percent = task.progress;
        }
        if (task.message) {
          scenesExtractProgress.value.message = task.message;
        }

        if (task.status === 'completed') {
          clearInterval(pollInterval);
          const result = typeof task.result === 'string' ? JSON.parse(task.result) : task.result;
          scenesExtractProgress.value = {
            active: false,
            percent: 100,
            message: t('scene.extractComplete', {
              scenes: result?.scenes || 0,
              dedup: result?.dedup_scenes || 0,
            }),
            status: 'success',
          };
          await loadDramaData();
        } else if (task.status === 'failed') {
          clearInterval(pollInterval);
          scenesExtractProgress.value = {
            active: false,
            percent: 0,
            message: task.error || t('common.failed'),
            status: 'exception',
          };
        }
      } catch {
        clearInterval(pollInterval);
        scenesExtractProgress.value = { active: false, percent: 0, message: t('common.failed'), status: 'exception' };
      }
    }, 3000);
  } catch (error: any) {
    scenesExtractProgress.value = { active: false, percent: 0, message: '', status: '' };
    ElMessage.error(error.message || t('message.extractFailed'));
  }
};

const saveCharacter = async () => {
  if (!newCharacter.value.name.trim()) {
    ElMessage.warning(t('message.enterCharacterName'));
    return;
  }

  try {
    if (editingCharacter.value) {
      await dramaAPI.updateCharacter(editingCharacter.value.id, {
        name: newCharacter.value.name,
        role: newCharacter.value.role,
        appearance: newCharacter.value.appearance,
        personality: newCharacter.value.personality,
        description: newCharacter.value.description,
        image_url: newCharacter.value.image_url,
        local_path: newCharacter.value.local_path,
      });
      ElMessage.success(t('message.characterUpdateSuccess'));
    } else {
      const allCharacters = [
        ...(drama.value?.characters || []).map((c) => ({
          name: c.name,
          role: c.role,
          appearance: c.appearance,
          personality: c.personality,
          description: c.description,
          image_url: c.image_url,
          local_path: c.local_path,
        })),
        newCharacter.value,
      ];

      await dramaAPI.saveCharacters(drama.value!.id, allCharacters);
      ElMessage.success(t('message.characterAddSuccess'));
    }

    addCharacterDialogVisible.value = false;
    await loadDramaData();
  } catch (error: any) {
    ElMessage.error(error.message || t('message.operationFailed'));
  }
};

const editCharacter = (character: any) => {
  editingCharacter.value = character;
  newCharacter.value = {
    name: character.name,
    role: character.role || "supporting",
    appearance: character.appearance || "",
    personality: character.personality || "",
    description: character.description || "",
    image_url: character.image_url || "",
    local_path: character.local_path || "",
  };
  addCharacterDialogVisible.value = true;
};

const deleteCharacter = async (character: any) => {
  if (!character.id) {
    ElMessage.error(t('message.characterIdNotExist'));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t('message.characterDeleteConfirm', { name: character.name }),
      t('message.deleteConfirmTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: "warning",
      },
    );

    await characterLibraryAPI.deleteCharacter(character.id);
    ElMessage.success(t('message.characterDeleted'));
    await loadDramaData();
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除角色失败:", error);
      ElMessage.error(error.message || t('message.deleteFailed'));
    }
  }
};

const openAddSceneDialog = () => {
  editingScene.value = null;
  newScene.value = {
    location: "",
    prompt: "",
    image_url: "",
    local_path: "",
  };
  addSceneDialogVisible.value = true;
};

const saveScene = async () => {
  if (!newScene.value.location.trim()) {
    ElMessage.warning(t('message.enterSceneName'));
    return;
  }

  try {
    if (editingScene.value) {
      await dramaAPI.updateScene(editingScene.value.id, {
        location: newScene.value.location,
        description: newScene.value.prompt,
        image_url: newScene.value.image_url,
        local_path: newScene.value.local_path,
      });
    } else {
      await dramaAPI.createScene({
        drama_id: Number(drama.value!.id),
        location: newScene.value.location,
        prompt: newScene.value.prompt,
        description: newScene.value.prompt,
        image_url: newScene.value.image_url,
        local_path: newScene.value.local_path,
      });
    }

    ElMessage.success(t(editingScene.value ? 'message.sceneUpdateSuccess' : 'message.sceneAddSuccess'));
    addSceneDialogVisible.value = false;
    await loadScenes();
  } catch (error: any) {
    ElMessage.error(error.message || t('message.operationFailed'));
  }
};

const editScene = (scene: any) => {
  editingScene.value = scene;
  newScene.value = {
    location: scene.location || scene.name || "",
    prompt: scene.prompt || scene.description || "",
    image_url: scene.image_url || "",
    local_path: scene.local_path || "",
  };
  addSceneDialogVisible.value = true;
};

const deleteScene = async (scene: any) => {
  if (!scene.id) {
    ElMessage.error(t('message.sceneIdNotExist'));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t('message.sceneDeleteConfirm', { name: scene.name || scene.location }),
      t('message.deleteConfirmTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: "warning",
      },
    );

    await dramaAPI.deleteScene(scene.id.toString());
    ElMessage.success(t('message.sceneDeleted'));
    await loadScenes();
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除场景失败:", error);
      ElMessage.error(error.message || t('message.deleteFailed'));
    }
  }
};

const openAddPropDialog = () => {
  editingProp.value = null;
  newProp.value = {
    name: "",
    description: "",
    prompt: "",
    type: "",
    image_url: "",
    local_path: "",
  };
  addPropDialogVisible.value = true;
};

const saveProp = async () => {
  if (!newProp.value.name.trim()) {
    ElMessage.warning(t('message.enterPropName'));
    return;
  }

  try {
    const propData = {
      drama_id: drama.value!.id,
      name: newProp.value.name,
      description: newProp.value.description,
      prompt: newProp.value.prompt,
      type: newProp.value.type,
      image_url: newProp.value.image_url,
      local_path: newProp.value.local_path,
    };

    if (editingProp.value) {
      await propAPI.update(editingProp.value.id, propData);
      ElMessage.success(t('message.propUpdateSuccess'));
    } else {
      await propAPI.create(propData as any);
      ElMessage.success(t('message.propAddSuccess'));
    }

    addPropDialogVisible.value = false;
    await loadDramaData();
  } catch (error: any) {
    ElMessage.error(error.message || t('message.operationFailed'));
  }
};

const editProp = (prop: any) => {
  editingProp.value = prop;
  newProp.value = {
    name: prop.name,
    description: prop.description || "",
    prompt: prop.prompt || "",
    type: prop.type || "",
    image_url: prop.image_url || "",
    local_path: prop.local_path || "",
  };
  addPropDialogVisible.value = true;
};

const deleteProp = async (prop: any) => {
  try {
    await ElMessageBox.confirm(
      t('message.propDeleteConfirm', { name: prop.name }),
      t('message.deleteConfirmTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: "warning",
      },
    );

    await propAPI.delete(prop.id);
    ElMessage.success(t('message.propDeleted'));
    await loadDramaData();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error.message || t('message.deleteFailed'));
    }
  }
};

const generatePropImage = async (prop: any) => {
  if (!prop.prompt) {
    ElMessage.warning(t('message.setPropPromptFirst'));
    editProp(prop);
    return;
  }

  try {
    await propAPI.generateImage(prop.id);
    ElMessage.success(t('message.imageTaskSubmitted'));
    startPolling(loadDramaData);
  } catch (error: any) {
    ElMessage.error(error.message || t('message.generateFailed'));
  }
};

const handlePropImageSuccess = (response: any) => {
  if (response.data && response.data.url) {
    newProp.value.image_url = response.data.url;
    newProp.value.local_path = response.data.local_path || "";
  }
};

const openExtractDialog = () => {
  extractPropsDialogVisible.value = true;
  selectedPropsEpisodeIds.value = [];
  selectAllPropsEpisodes.value = false;
  isPropsIndeterminate.value = false;
  propsExtractProgress.value = { active: false, percent: 0, message: '', status: '' };
};

const handleSelectAllPropsEpisodes = (val: boolean) => {
  selectedPropsEpisodeIds.value = val ? sortedEpisodes.value.map(ep => ep.id) : [];
  isPropsIndeterminate.value = false;
};

const handlePropsEpisodeSelectionChange = (val: (string | number)[]) => {
  const total = sortedEpisodes.value.length;
  selectAllPropsEpisodes.value = val.length === total;
  isPropsIndeterminate.value = val.length > 0 && val.length < total;
};

const handleExtractProps = async () => {
  if (selectedPropsEpisodeIds.value.length === 0) return;

  try {
    propsExtractProgress.value = { active: true, percent: 0, message: t('prop.extracting') || t('character.extracting'), status: '' };

    const res = await propAPI.batchExtractFromEpisodes(
      route.params.id as string,
      selectedPropsEpisodeIds.value.map(Number),
    );

    const taskId = res.task_id;

    const pollInterval = setInterval(async () => {
      try {
        const task = await taskAPI.getStatus(taskId);
        if (task.progress !== undefined) {
          propsExtractProgress.value.percent = task.progress;
        }
        if (task.message) {
          propsExtractProgress.value.message = task.message;
        }

        if (task.status === 'completed') {
          clearInterval(pollInterval);
          const result = typeof task.result === 'string' ? JSON.parse(task.result) : task.result;
          propsExtractProgress.value = {
            active: false,
            percent: 100,
            message: t('prop.extractComplete', {
              props: result?.props || 0,
              dedup: result?.dedup_props || 0,
            }),
            status: 'success',
          };
          await loadDramaData();
        } else if (task.status === 'failed') {
          clearInterval(pollInterval);
          propsExtractProgress.value = {
            active: false,
            percent: 0,
            message: task.error || t('common.failed'),
            status: 'exception',
          };
        }
      } catch {
        clearInterval(pollInterval);
        propsExtractProgress.value = { active: false, percent: 0, message: t('common.failed'), status: 'exception' };
      }
    }, 3000);
  } catch (error: any) {
    propsExtractProgress.value = { active: false, percent: 0, message: '', status: '' };
    ElMessage.error(error.message || t('common.failed'));
  }
};

onMounted(() => {
  loadDramaData();
  loadScenes();
});
</script>

<style scoped>
/* Container */
.drama-management-container {
  min-height: 100vh;
  background: var(--glass-bg-canvas);
  padding: var(--glass-space-5);
}

/* Glass Design for DramaManagement */
.tabs-wrapper {
  background: var(--glass-bg-surface);
  backdrop-filter: blur(var(--glass-blur-md));
  -webkit-backdrop-filter: blur(var(--glass-blur-md));
  border: 1px solid var(--glass-stroke-base);
  border-radius: var(--glass-radius-lg);
  padding: var(--glass-space-3);
  box-shadow: var(--glass-shadow-sm);
}

@media (min-width: 768px) {
  .tabs-wrapper {
    padding: var(--glass-space-4);
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 0.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--glass-text-tertiary);
  background: var(--glass-bg-muted);
  border-radius: 10px;
  border: 1px solid var(--glass-stroke-soft);
  transition: all 0.2s ease;
}

:deep(.el-tabs__item.is-active) .tab-badge {
  color: var(--glass-accent-from);
  background: var(--glass-tone-info-bg);
  border-color: transparent;
}

:deep(.management-tabs .el-tabs__header) {
  margin-bottom: var(--glass-space-4);
}

:deep(.management-tabs .el-tabs__nav-wrap::after) {
  height: 1px;
  background: var(--glass-stroke-base);
}

:deep(.management-tabs .el-tabs__active-bar) {
  height: 2.5px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--glass-accent-from), var(--glass-accent-to));
}

:deep(.management-tabs .el-tabs__item) {
  padding: 0 20px;
  height: 44px;
  font-weight: 500;
  color: var(--glass-text-tertiary);
  transition: color 0.2s ease;
}

:deep(.management-tabs .el-tabs__item.is-active) {
  color: var(--glass-accent-from);
  font-weight: 600;
}

:deep(.management-tabs .el-tabs__item:hover) {
  color: var(--glass-accent-from);
}

/* Glass Dialog Styles */
:deep(.el-dialog) {
  background: var(--glass-bg-surface-modal);
  backdrop-filter: blur(var(--glass-blur-lg));
  -webkit-backdrop-filter: blur(var(--glass-blur-lg));
  border: 1px solid var(--glass-stroke-base);
  border-radius: var(--glass-radius-xl);
  box-shadow: var(--glass-shadow-modal);
}

:deep(.el-dialog__header) {
  padding: var(--glass-space-5) var(--glass-space-6);
  border-bottom: 1px solid var(--glass-stroke-soft);
  margin-right: 0;
}

:deep(.el-dialog__title) {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--glass-text-primary);
}

:deep(.el-dialog__body) {
  padding: var(--glass-space-6);
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--glass-text-primary);
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  background: var(--glass-bg-muted);
  border: 1px solid var(--glass-stroke-base);
  border-radius: var(--glass-radius-sm);
  box-shadow: none;
}

:deep(.el-input__wrapper:hover),
:deep(.el-textarea__inner:hover) {
  border-color: var(--glass-stroke-strong);
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus) {
  border-color: var(--glass-stroke-focus);
  box-shadow: var(--glass-focus-ring);
}

:deep(.el-select .el-input__wrapper) {
  background: var(--glass-bg-muted);
  border: 1px solid var(--glass-stroke-base);
}

:deep(.el-select .el-input__wrapper:hover) {
  border-color: var(--glass-stroke-strong);
}

:deep(.el-dialog__footer) {
  padding: var(--glass-space-4) var(--glass-space-6);
  border-top: 1px solid var(--glass-stroke-soft);
}

:deep(.el-dialog__footer .el-button) {
  border-radius: var(--glass-radius-sm);
}

:deep(.el-dialog__footer .el-button--primary) {
  background: linear-gradient(135deg, var(--glass-accent-from) 0%, var(--glass-accent-to) 100%);
  border: none;
  box-shadow: var(--glass-accent-shadow-soft);
}

:deep(.el-dialog__footer .el-button--default) {
  background: var(--glass-bg-muted);
  border: 1px solid var(--glass-stroke-base);
  color: var(--glass-text-primary);
}

:deep(.el-dialog__footer .el-button--default:hover) {
  background: var(--glass-bg-surface-strong);
  border-color: var(--glass-stroke-strong);
}

/* Avatar uploader */
:deep(.avatar-uploader .el-upload) {
  border: 1px dashed var(--glass-stroke-base);
  border-radius: var(--glass-radius-sm);
  background: var(--glass-bg-muted);
  transition: all 0.2s ease;
}

:deep(.avatar-uploader .el-upload:hover) {
  border-color: var(--glass-accent-from);
}

:deep(.avatar-uploader-icon) {
  color: var(--glass-text-tertiary);
}

/* Alert */
:deep(.el-alert) {
  background: var(--glass-tone-info-bg);
  border: 1px solid transparent;
  border-radius: var(--glass-radius-sm);
}

:deep(.el-alert__title) {
  color: var(--glass-tone-info-fg);
  font-size: 0.8125rem;
}

:deep(.el-alert__icon) {
  color: var(--glass-tone-info-fg);
}

/* Checkbox */
:deep(.el-checkbox__label) {
  color: var(--glass-text-primary);
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: var(--glass-accent-from);
  border-color: var(--glass-accent-from);
}

/* Progress */
:deep(.el-progress-bar__outer) {
  background: var(--glass-bg-muted);
  border-radius: var(--glass-radius-xs);
}

:deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, var(--glass-accent-from), var(--glass-accent-to));
  border-radius: var(--glass-radius-xs);
}
</style>
