<template>
  <div class="animate-fade-in">
    <PageHeader :title="drama?.title || ''" :subtitle="drama?.description || $t('drama.management.overview')">
    </PageHeader>

    <!-- Tabs / 标签页 -->
    <div class="tabs-wrapper">
        <el-tabs v-model="activeTab" class="management-tabs">
          <!-- 项目概览 -->
          <el-tab-pane :label="$t('drama.management.overview')" name="overview">
            <OverviewTab
              :drama="drama ?? null"
              :episodes-count="episodesCount"
              :characters-count="charactersCount"
              :scenes-count="scenesCount"
              :props-count="propsCount"
              @create-episode="createNewEpisode"
            />
          </el-tab-pane>

          <!-- 章节管理 -->
          <el-tab-pane :label="$t('drama.management.episodes')" name="episodes">
            <EpisodesTab
              :episodes="drama?.episodes || []"
              @create-episode="createNewEpisode"
              @enter-episode="enterEpisodeWorkflow"
              @delete-episode="deleteEpisode"
            />
          </el-tab-pane>

          <!-- 角色管理 -->
          <el-tab-pane
            :label="$t('drama.management.characters')"
            name="characters"
          >
            <CharactersTab
              :characters="drama?.characters || []"
              @extract-characters="openExtractCharacterDialog"
              @add-character="openAddCharacterDialog"
              @edit-character="editCharacter"
              @generate-character-image="generateCharacterImage"
              @delete-character="deleteCharacter"
            />
          </el-tab-pane>

          <!-- 场景库管理 -->
          <el-tab-pane :label="$t('drama.management.sceneList')" name="scenes">
            <ScenesTab
              :scenes="scenes"
              @edit-scene="editScene"
              @generate-scene-image="generateSceneImage"
              @delete-scene="deleteScene"
            />
          </el-tab-pane>

          <!-- 道具管理 -->
          <el-tab-pane :label="$t('drama.management.propList')" name="props">
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
        :title="$t('prop.extractTitle')"
        width="500px"
      >
        <el-form label-width="100px">
          <el-form-item :label="$t('prop.selectEpisode')">
            <el-select
              v-model="selectedExtractEpisodeId"
              :placeholder="$t('common.pleaseSelect')"
              style="width: 100%"
            >
              <el-option
                v-for="ep in sortedEpisodes"
                :key="ep.id"
                :label="ep.title"
                :value="ep.id"
              />
            </el-select>
          </el-form-item>
          <el-alert
            :title="$t('prop.extractTip')"
            type="info"
            :closable="false"
            show-icon
          />
        </el-form>
        <template #footer>
          <el-button @click="extractPropsDialogVisible = false">{{
            $t("common.cancel")
          }}</el-button>
          <el-button
            type="primary"
            @click="handleExtractProps"
            :disabled="!selectedExtractEpisodeId"
            >{{ $t("prop.startExtract") }}</el-button
          >
        </template>
      </el-dialog>

      <!-- 从剧本提取角色对话框 -->
      <el-dialog
        v-model="extractCharactersDialogVisible"
        :title="$t('prop.extractTitle')"
        width="500px"
      >
        <el-form label-width="100px">
          <el-form-item :label="$t('prop.selectEpisode')">
            <el-select
              v-model="selectedExtractEpisodeId"
              :placeholder="$t('common.pleaseSelect')"
              style="width: 100%"
            >
              <el-option
                v-for="ep in sortedEpisodes"
                :key="ep.id"
                :label="ep.title"
                :value="ep.id"
              />
            </el-select>
          </el-form-item>
          <el-alert
            :title="$t('prop.extractTip')"
            type="info"
            :closable="false"
            show-icon
          />
        </el-form>
        <template #footer>
          <el-button @click="extractCharactersDialogVisible = false">{{
            $t("common.cancel")
          }}</el-button>
          <el-button
            type="primary"
            @click="handleExtractCharacters"
            :disabled="!selectedExtractEpisodeId"
            >{{ $t("prop.startExtract") }}</el-button
          >
        </template>
      </el-dialog>

      <!-- 从剧本提取场景对话框 -->
      <el-dialog
        v-model="extractScenesDialogVisible"
        :title="$t('prop.extractTitle')"
        width="500px"
      >
        <el-form label-width="100px">
          <el-form-item :label="$t('prop.selectEpisode')">
            <el-select
              v-model="selectedExtractEpisodeId"
              :placeholder="$t('common.pleaseSelect')"
              style="width: 100%"
            >
              <el-option
                v-for="ep in sortedEpisodes"
                :key="ep.id"
                :label="ep.title"
                :value="ep.id"
              />
            </el-select>
          </el-form-item>
          <el-alert
            :title="$t('prop.extractTip')"
            type="info"
            :closable="false"
            show-icon
          />
        </el-form>
        <template #footer>
          <el-button @click="extractScenesDialogVisible = false">{{
            $t("common.cancel")
          }}</el-button>
          <el-button
            type="primary"
            @click="handleExtractScenes"
            :disabled="!selectedExtractEpisodeId"
            >{{ $t("prop.startExtract") }}</el-button
          >
        </template>
      </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { dramaAPI } from "@/api/drama";
import { characterLibraryAPI } from "@/api/character-library";
import { propAPI } from "@/api/prop";
import type { Drama } from "@/types/drama";
import { PageHeader } from "@/components/common";
import { getImageUrl, hasImage } from "@/utils/image";
import { useI18n } from "vue-i18n";
import OverviewTab from "./management/OverviewTab.vue";
import EpisodesTab from "./management/EpisodesTab.vue";
import CharactersTab from "./management/CharactersTab.vue";
import ScenesTab from "./management/ScenesTab.vue";
import PropsTab from "./management/PropsTab.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const drama = ref<Drama>();
const activeTab = ref((route.query.tab as string) || "overview");
const scenes = ref<any[]>([]);

let pollingTimer: any = null;

const addCharacterDialogVisible = ref(false);
const addSceneDialogVisible = ref(false);
const addPropDialogVisible = ref(false);
const extractPropsDialogVisible = ref(false);
const extractCharactersDialogVisible = ref(false);
const extractScenesDialogVisible = ref(false);

const editingCharacter = ref<any>(null);
const editingScene = ref<any>(null);
const editingProp = ref<any>(null);
const selectedExtractEpisodeId = ref<string | number | null>(null);

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
  if (sortedEpisodes.value.length > 0 && !selectedExtractEpisodeId.value) {
    selectedExtractEpisodeId.value = sortedEpisodes.value[0].id;
  }
};

const handleExtractCharacters = async () => {
  if (!selectedExtractEpisodeId.value) return;

  try {
    const res = await characterLibraryAPI.extractFromEpisode(
      Number(selectedExtractEpisodeId.value),
    );
    extractCharactersDialogVisible.value = false;

    let checkCount = 0;
    const checkInterval = setInterval(() => {
      loadDramaData();
      checkCount++;
      if (checkCount > 10) clearInterval(checkInterval);
    }, 5000);
  } catch (error: any) {
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
  if (sortedEpisodes.value.length > 0 && !selectedExtractEpisodeId.value) {
    selectedExtractEpisodeId.value = sortedEpisodes.value[0].id;
  }
};

const handleExtractScenes = async () => {
  if (!selectedExtractEpisodeId.value) return;

  try {
    const res = await dramaAPI.extractBackgrounds(
      selectedExtractEpisodeId.value.toString(),
    );
    extractScenesDialogVisible.value = false;

    let checkCount = 0;
    const checkInterval = setInterval(() => {
      loadScenes();
      checkCount++;
      if (checkCount > 10) clearInterval(checkInterval);
    }, 5000);
  } catch (error: any) {
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
  if (sortedEpisodes.value.length > 0 && !selectedExtractEpisodeId.value) {
    selectedExtractEpisodeId.value = sortedEpisodes.value[0].id;
  }
};

const handleExtractProps = async () => {
  if (!selectedExtractEpisodeId.value) return;

  try {
    const res = await propAPI.extractFromScript(Number(selectedExtractEpisodeId.value));
    extractPropsDialogVisible.value = false;

    let checkCount = 0;
    const checkInterval = setInterval(() => {
      loadDramaData();
      checkCount++;
      if (checkCount > 10) clearInterval(checkInterval);
    }, 5000);
  } catch (error: any) {
    ElMessage.error(error.message || t("common.failed"));
  }
};

onMounted(() => {
  loadDramaData();
  loadScenes();

  if (route.query.tab) {
    activeTab.value = route.query.tab as string;
  }
});
</script>

<style scoped>
.tabs-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  box-shadow: var(--shadow-card);
}

@media (min-width: 768px) {
  .tabs-wrapper {
    padding: var(--space-4);
  }
}
</style>
