<template>
  <div class="page-container">
    <div class="content-wrapper animate-fade-in">
      <!-- Page Header / 页面头部 -->
      <AppHeader :fixed="false" :show-logo="false">
        <template #left>
          <el-button text @click="$router.back()" class="back-btn">
            <el-icon><ArrowLeft /></el-icon>
            <span>{{ $t("common.back") }}</span>
          </el-button>
          <div class="page-title">
            <h1>{{ drama?.title || "" }}</h1>
            <span class="subtitle">{{
              drama?.description || $t("drama.management.overview")
            }}</span>
          </div>
        </template>
      </AppHeader>

      <!-- Tabs / 标签页 -->
      <div class="tabs-wrapper">
        <el-tabs v-model="activeTab" class="management-tabs">
          <!-- 项目概览 -->
          <el-tab-pane :label="$t('drama.management.overview')" name="overview">
            <div class="stats-grid">
              <StatCard
                :label="$t('drama.management.episodeStats')"
                :value="episodesCount"
                :icon="Document"
                icon-color="var(--accent)"
                icon-bg="var(--accent-light)"
                value-color="var(--accent)"
                :description="$t('drama.management.episodesCreated')"
              />
              <StatCard
                :label="$t('drama.management.characterStats')"
                :value="charactersCount"
                :icon="User"
                icon-color="var(--success)"
                icon-bg="var(--success-light)"
                value-color="var(--success)"
                :description="$t('drama.management.charactersCreated')"
              />
              <StatCard
                :label="$t('drama.management.sceneStats')"
                :value="scenesCount"
                :icon="Picture"
                icon-color="var(--warning)"
                icon-bg="var(--warning-light)"
                value-color="var(--warning)"
                :description="$t('drama.management.sceneLibraryCount')"
              />
              <StatCard
                :label="$t('drama.management.propStats')"
                :value="propsCount"
                :icon="Box"
                icon-color="var(--primary)"
                icon-bg="var(--primary-light)"
                value-color="var(--primary)"
                :description="$t('drama.management.propsCreated')"
              />
              <StatCard
                :label="$t('drama.management.poseStats')"
                :value="posesCount"
                :icon="User"
                icon-color="var(--info)"
                icon-bg="var(--info-light)"
                value-color="var(--info)"
                :description="$t('drama.management.posesCreated')"
              />
            </div>

            <!-- 引导卡片：无章节时显示 -->
            <el-alert
              v-if="episodesCount === 0"
              :title="$t('drama.management.startFirstEpisode')"
              type="info"
              :closable="false"
              style="margin-top: 20px"
            >
              <template #default>
                <p style="margin: 8px 0">
                  {{ $t("drama.management.noEpisodesYet") }}
                </p>
                <el-button
                  type="primary"
                  :icon="Plus"
                  @click="createNewEpisode"
                  style="margin-top: 8px"
                >
                  {{ $t("drama.management.createFirstEpisode") }}
                </el-button>
              </template>
            </el-alert>

            <el-card shadow="never" class="project-info-card">
              <template #header>
                <div class="card-header">
                  <h3 class="card-title">
                    {{ $t("drama.management.projectInfo") }}
                  </h3>
                  <el-tag :type="getStatusType(drama?.status)" size="small">{{
                    getStatusText(drama?.status)
                  }}</el-tag>
                </div>
              </template>
              <el-descriptions :column="2" border class="project-descriptions">
                <el-descriptions-item
                  :label="$t('drama.management.projectName')"
                >
                  <span class="info-value">{{ drama?.title }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('common.createdAt')">
                  <span class="info-value">{{
                    formatDate(drama?.created_at)
                  }}</span>
                </el-descriptions-item>
                <el-descriptions-item
                  :label="$t('drama.management.projectDesc')"
                  :span="2"
                >
                  <span class="info-desc">{{
                    drama?.description || $t("drama.management.noDescription")
                  }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('drama.defaultStyle')" :span="2">
                   <span class="info-value">{{ drama?.default_style || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('drama.defaultImageRatio')">
                   <span class="info-value">{{ drama?.default_image_ratio || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('drama.defaultVideoRatio')">
                   <span class="info-value">{{ drama?.default_video_ratio || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('drama.defaultImageSize')">
                   <span class="info-value">{{ drama?.default_image_size || '-' }}</span>
                </el-descriptions-item>

                <el-descriptions-item :label="$t('drama.defaultRoleStyle')" :span="2">
                   <span class="info-value">{{ drama?.default_role_style || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('drama.defaultRoleRatio')">
                   <span class="info-value">{{ drama?.default_role_ratio || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="" /> 

                <el-descriptions-item :label="$t('drama.defaultSceneStyle')" :span="2">
                   <span class="info-value">{{ drama?.default_scene_style || '-' }}</span>
                </el-descriptions-item>

                <el-descriptions-item :label="$t('drama.defaultPropStyle')" :span="2">
                   <span class="info-value">{{ drama?.default_prop_style || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('drama.defaultPropRatio')">
                   <span class="info-value">{{ drama?.default_prop_ratio || '-' }}</span>
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-tab-pane>

          <!-- 章节管理 -->
          <el-tab-pane :label="$t('drama.management.episodes')" name="episodes">
            <div class="tab-header">
              <h2>{{ $t("drama.management.episodeList") }}</h2>
              <el-button
                type="primary"
                :icon="Plus"
                @click="createNewEpisode"
                >{{ $t("drama.management.createNewEpisode") }}</el-button
              >
            </div>

            <!-- 空状态引导 -->
            <el-empty
              v-if="episodesCount === 0"
              :description="$t('drama.management.noEpisodes')"
              style="margin-top: 40px"
            >
              <template #image>
                <el-icon :size="80" class="empty-icon"><Document /></el-icon>
              </template>
              <el-button type="primary" :icon="Plus" @click="createNewEpisode">
                {{ $t("drama.management.createFirstEpisode") }}
              </el-button>
            </el-empty>

            <el-table
              v-else
              :data="sortedEpisodes"
              border
              stripe
              style="margin-top: 16px"
            >
              <el-table-column
                type="index"
                :label="$t('storyboard.table.number')"
                width="80"
              />
              <el-table-column
                prop="title"
                :label="$t('drama.management.episodeList')"
                min-width="200"
              />
              <el-table-column :label="$t('common.status')" width="120">
                <template #default="{ row }">
                  <el-tag :type="getEpisodeStatusType(row)">{{
                    getEpisodeStatusText(row)
                  }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="Shots" width="100">
                <template #default="{ row }">
                  {{ row.shots?.length || 0 }}
                </template>
              </el-table-column>
              <el-table-column :label="$t('common.createdAt')" width="180">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column
                :label="$t('storyboard.table.operations')"
                width="220"
                fixed="right"
              >
                <template #default="{ row }">
                  <el-button
                    size="small"
                    type="primary"
                    @click="enterEpisodeWorkflow(row)"
                  >
                    {{ $t("drama.management.goToEdit") }}
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    @click="deleteEpisode(row)"
                  >
                    {{ $t("common.delete") }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- 角色管理 -->
          <el-tab-pane
            :label="$t('drama.management.characters')"
            name="characters"
          >
            <div class="tab-header">
              <h2>{{ $t("drama.management.characterList") }}</h2>
              <div style="display: flex; gap: 10px">
                <el-button
                  :icon="Document"
                  @click="openExtractCharacterDialog"
                  >{{ $t("prop.extract") }}</el-button
                >
                <el-button
                  type="primary"
                  :icon="Plus"
                  @click="openAddCharacterDialog"
                  >{{ $t("character.add") }}</el-button
                >
              </div>
            </div>

            <el-row :gutter="16" style="margin-top: 16px">
              <el-col
                :span="6"
                v-for="character in drama?.characters"
                :key="character.id"
              >
                <el-card shadow="hover" class="character-card">
                  <div class="character-preview">
                    <img
                      v-if="character.local_path || character.image_url"
                      :src="getImageUrl(character)"
                      :alt="character.name"
                    />
                    <el-avatar v-else :size="120">{{
                      character.name[0]
                    }}</el-avatar>
                  </div>

                  <div class="character-info">
                    <h4>{{ character.name }}</h4>
                    <el-tag
                      :type="character.role === 'main' ? 'danger' : 'info'"
                      size="small"
                    >
                      {{
                        character.role === "main"
                          ? "Main"
                          : character.role === "supporting"
                            ? "Supporting"
                            : "Minor"
                      }}
                    </el-tag>
                    <p class="desc">
                      {{ character.appearance || character.description }}
                    </p>
                  </div>

                  <div class="character-actions">
                    <el-button size="small" @click="editCharacter(character)">{{
                      $t("common.edit")
                    }}</el-button>
                    <el-button
                      size="small"
                      @click="generateCharacterImage(character)"
                      >{{ $t("prop.generateImage") }}</el-button
                    >
                    <el-button
                      size="small"
                      type="danger"
                      @click="deleteCharacter(character)"
                      >{{ $t("common.delete") }}</el-button
                    >
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <el-empty
              v-if="!drama?.characters || drama.characters.length === 0"
              :description="$t('drama.management.noCharacters')"
            />
          </el-tab-pane>

          <!-- 场景库管理 -->
          <el-tab-pane :label="$t('drama.management.sceneList')" name="scenes">
            <div class="tab-header">
              <h2>{{ $t("drama.management.sceneList") }}</h2>
              <div style="display: flex; gap: 10px">
                <el-button :icon="Document" @click="openExtractSceneDialog">{{
                  $t("prop.extract")
                }}</el-button>
                <el-button
                  type="primary"
                  :icon="Plus"
                  @click="openAddSceneDialog"
                  >{{ $t("common.add") }}</el-button
                >
              </div>
            </div>

            <el-row :gutter="16" style="margin-top: 16px">
              <el-col :span="6" v-for="scene in scenes" :key="scene.id">
                <el-card shadow="hover" class="scene-card">
                  <div class="scene-preview">
                    <img
                      v-if="scene.local_path || scene.image_url"
                      :src="getImageUrl(scene)"
                      :alt="scene.name"
                    />
                    <div v-else class="scene-placeholder">
                      <el-icon :size="48"><Picture /></el-icon>
                    </div>
                  </div>

                  <div class="scene-info">
                    <h4>{{ scene.name }}</h4>
                    <p class="desc">{{ scene.description }}</p>
                  </div>

                  <div class="scene-actions">
                    <el-button size="small" @click="editScene(scene)">{{
                      $t("common.edit")
                    }}</el-button>
                    <el-button
                      size="small"
                      @click="generateSceneImage(scene)"
                      >{{ $t("prop.generateImage") }}</el-button
                    >
                    <el-button
                      size="small"
                      type="danger"
                      @click="deleteScene(scene)"
                      >{{ $t("common.delete") }}</el-button
                    >
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <el-empty
              v-if="scenes.length === 0"
              :description="$t('drama.management.noScenes')"
            />
          </el-tab-pane>

          <!-- 道具管理 -->
          <el-tab-pane :label="$t('drama.management.propList')" name="props">
            <div class="tab-header">
              <h2>{{ $t("drama.management.propList") }}</h2>
              <div style="display: flex; gap: 10px">
                <el-button :icon="Document" @click="openExtractDialog">{{
                  $t("prop.extract")
                }}</el-button>
                <el-button
                  type="primary"
                  :icon="Plus"
                  @click="openAddPropDialog"
                  >{{ $t("common.add") }}</el-button
                >
              </div>
            </div>

            <el-row :gutter="16" style="margin-top: 16px">
              <el-col :span="6" v-for="prop in drama?.props" :key="prop.id">
                <el-card shadow="hover" class="scene-card">
                  <div class="scene-preview">
                    <img
                      v-if="hasImage(prop)"
                      :src="getImageUrl(prop)"
                      :alt="prop.name"
                    />
                    <div v-else class="scene-placeholder">
                      <el-icon :size="48"><Box /></el-icon>
                    </div>
                  </div>

                  <div class="scene-info">
                    <h4>{{ prop.name }}</h4>
                    <el-tag size="small" v-if="prop.type">{{
                      prop.type
                    }}</el-tag>
                    <p class="desc">{{ prop.description || prop.prompt }}</p>
                  </div>

                  <div class="scene-actions">
                    <el-button size="small" @click="editProp(prop)">{{
                      $t("common.edit")
                    }}</el-button>
                    <el-button
                      size="small"
                      @click="generatePropImage(prop)"
                      :disabled="!prop.prompt"
                      >{{ $t("prop.generateImage") }}</el-button
                    >
                    <el-button
                      size="small"
                      type="danger"
                      @click="deleteProp(prop)"
                      >{{ $t("common.delete") }}</el-button
                    >
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <el-empty
              v-if="!drama?.props || drama.props.length === 0"
              :description="$t('drama.management.noProps')"
            />
          </el-tab-pane>

          <!-- 姿态管理 -->
          <el-tab-pane :label="$t('pose.list')" name="poses">
            <div class="tab-header">
              <h2>{{ $t("pose.list") }}</h2>
              <div style="display: flex; gap: 10px">
                <el-button
                  :icon="Document"
                  @click="openExtractPoseDialog"
                  >{{ $t("pose.extractFromScript") }}</el-button
                >
                <el-button
                  type="primary"
                  :icon="Plus"
                  @click="openAddPoseDialog"
                  >{{ $t("common.add") }}</el-button
                >
              </div>
            </div>

            <el-row :gutter="16" style="margin-top: 16px">
              <el-col :span="6" v-for="pose in drama?.poses" :key="pose.id">
                <el-card shadow="hover" class="scene-card">
                  <div class="scene-preview">
                    <img
                      v-if="pose.image_url"
                      :src="fixImageUrl(pose.image_url)"
                      :alt="pose.name"
                    />
                    <div v-else class="scene-placeholder">
                      <el-icon :size="48"><User /></el-icon>
                    </div>
                  </div>

                  <div class="scene-info">
                    <h4>{{ pose.name }}</h4>
                    <p class="desc">{{ pose.description }}</p>
                  </div>

                  <div class="scene-actions">
                     <el-button size="small" @click="editPose(pose)">{{
                      $t("common.edit")
                    }}</el-button>
                    <el-button
                      size="small"
                      @click="generatePoseImage(pose)"
                      :disabled="!pose.description"
                      >{{ $t("prop.generateImage") }}</el-button
                    >
                    <el-button
                      size="small"
                      type="danger"
                      @click="deletePose(pose)"
                      >{{ $t("common.delete") }}</el-button
                    >
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <el-empty
              v-if="!drama?.poses || drama.poses.length === 0"
              :description="$t('pose.noPoses')"
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
          <el-form-item :label="$t('common.name')">
            <el-input
              v-model="newScene.location"
              :placeholder="$t('common.name')"
            />
          </el-form-item>
          <el-form-item :label="$t('common.description')">
            <el-input
              v-model="newScene.description"
              type="textarea"
              :rows="3"
              :placeholder="$t('common.description')"
            />
          </el-form-item>
          <el-form-item :label="$t('prop.prompt')">
            <el-input
              v-model="newScene.prompt"
              type="textarea"
              :rows="4"
              :placeholder="$t('prop.promptPlaceholder')"
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

      <!-- 从剧本提取姿态对话框 -->
      <el-dialog
        v-model="extractPosesDialogVisible"
        :title="$t('pose.extractTitle')"
        width="500px"
      >
        <el-form label-width="100px">
          <el-form-item :label="$t('pose.selectEpisode')">
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
            :title="$t('pose.extractTip')"
            type="info"
            :closable="false"
            show-icon
          />
        </el-form>
        <template #footer>
          <el-button @click="extractPosesDialogVisible = false">{{
            $t("common.cancel")
          }}</el-button>
          <el-button
            type="primary"
            @click="handleExtractPoses"
            :disabled="!selectedExtractEpisodeId"
            >{{ $t("pose.startExtract") }}</el-button
          >
        </template>
      </el-dialog>
      <!-- 添加/编辑姿态对话框 -->
      <el-dialog
        v-model="addPoseDialogVisible"
        :title="editingPose ? $t('pose.edit') : $t('pose.add')"
        width="500px"
      >
        <el-form :model="newPose" label-width="80px">
          <el-form-item :label="$t('pose.name')">
            <el-input
              v-model="newPose.name"
              :placeholder="$t('pose.namePlaceholder')"
            />
          </el-form-item>
          <el-form-item :label="$t('pose.description')">
            <el-input
              v-model="newPose.description"
              type="textarea"
              :rows="4"
              :placeholder="$t('pose.promptPlaceholder')"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="addPoseDialogVisible = false">{{
            $t("common.cancel")
          }}</el-button>
          <el-button type="primary" @click="savePose">{{
            $t("common.save")
          }}</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ArrowLeft,
  Document,
  User,
  Picture,
  Plus,
  Box,
} from "@element-plus/icons-vue";
import { dramaAPI } from "@/api/drama";
import { characterLibraryAPI } from "@/api/character-library";
import { propAPI } from "@/api/prop";
import { poseAPI } from "@/api/pose";
import type { Drama } from "@/types/drama";
import { AppHeader, StatCard, EmptyState } from "@/components/common";
import { getImageUrl, hasImage } from "@/utils/image";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const drama = ref<Drama>();
const activeTab = ref((route.query.tab as string) || "overview");
const scenes = ref<any[]>([]);

let pollingTimer: any = null; // Add polling timer definition

const addCharacterDialogVisible = ref(false);
const addSceneDialogVisible = ref(false);
const addPropDialogVisible = ref(false);
const extractPropsDialogVisible = ref(false);
const extractCharactersDialogVisible = ref(false);
const extractScenesDialogVisible = ref(false);

const extractPosesDialogVisible = ref(false); // Added ref
const addPoseDialogVisible = ref(false);
const editingPose = ref<any>(null);

const editingCharacter = ref<any>(null);
const editingScene = ref<any>(null);
const editingProp = ref<any>(null);
const selectedExtractEpisodeId = ref<number | null |string>(null);

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
  description: "",
  prompt: "",
  image_url: "",
  local_path: "",
});

const newPose = ref({
  name: "",
  description: "",
  image_url: "",
});

const episodesCount = computed(() => drama.value?.episodes?.length || 0);
const charactersCount = computed(() => drama.value?.characters?.length || 0);
const scenesCount = computed(() => scenes.value.length);
const propsCount = computed(() => drama.value?.props?.length || 0);
const posesCount = computed(() => drama.value?.poses?.length || 0);

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

// Clear timer on unmount
import { onUnmounted } from "vue";
onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer);
});

const loadDramaData = async () => {
  try {
    const data = await dramaAPI.get(route.params.id as string);
    drama.value = data;
    loadScenes();
  } catch (error: any) {
    ElMessage.error(error.message || "加载项目数据失败");
  }
};

const loadScenes = async () => {
  // 场景数据已经在drama中加载了（后端Preload了Scenes）
  if (drama.value?.scenes) {
    scenes.value = drama.value.scenes;
  } else {
    scenes.value = [];
  }
};

const getStatusType = (status?: string) => {
  const map: Record<string, any> = {
    draft: "info",
    in_progress: "warning",
    completed: "success",
  };
  return map[status || "draft"] || "info";
};

const getStatusText = (status?: string) => {
  const map: Record<string, string> = {
    draft: "草稿",
    in_progress: "制作中",
    completed: "已完成",
  };
  return map[status || "draft"] || "草稿";
};

const getEpisodeStatusType = (episode: any) => {
  if (episode.shots && episode.shots.length > 0) return "success";
  if (episode.script_content) return "warning";
  return "info";
};

const getEpisodeStatusText = (episode: any) => {
  if (episode.shots && episode.shots.length > 0) return "已拆分";
  if (episode.script_content) return "已创建";
  return "草稿";
};

const formatDate = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("zh-CN");
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
      `确定要删除第${episode.episode_number}章吗？此操作将同时删除该章节的所有相关数据（角色、场景、分镜等）。`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    // 过滤掉要删除的章节
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

    // 保存更新后的章节列表
    await dramaAPI.saveEpisodes(drama.value!.id, updatedEpisodes);

    ElMessage.success(`第${episode.episode_number}章删除成功`);
    await loadDramaData();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error.message || "删除失败");
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
    ElMessage.error("只能上传图片文件!");
  }
  if (!isLt10M) {
    ElMessage.error("图片大小不能超过 10MB!");
  }
  return isImage && isLt10M;
};

const generateCharacterImage = async (character: any) => {
  try {
    await characterLibraryAPI.generateCharacterImage(character.id);
    ElMessage.success("图片生成任务已提交");
    startPolling(loadDramaData);
  } catch (error: any) {
    ElMessage.error(error.message || "生成失败");
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
      selectedExtractEpisodeId.value,
    );
    extractCharactersDialogVisible.value = false;

    // 自动刷新几次
    let checkCount = 0;
    const checkInterval = setInterval(() => {
      loadDramaData();
      checkCount++;
      if (checkCount > 10) clearInterval(checkInterval);
    }, 5000);
  } catch (error: any) {
    ElMessage.error(error.message || "提取失败");
  }
};

const generateSceneImage = async (scene: any) => {
  try {
    await dramaAPI.generateSceneImage({ scene_id: scene.id });
    ElMessage.success("图片生成任务已提交");
    startPolling(loadScenes);
  } catch (error: any) {
    ElMessage.error(error.message || "生成失败");
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

    // 自动刷新几次
    let checkCount = 0;
    const checkInterval = setInterval(() => {
      loadScenes();
      checkCount++;
      if (checkCount > 10) clearInterval(checkInterval);
    }, 5000);
  } catch (error: any) {
    ElMessage.error(error.message || "提取失败");
  }
};

const saveCharacter = async () => {
  if (!newCharacter.value.name.trim()) {
    ElMessage.warning("请输入角色名称");
    return;
  }

  try {
    if (editingCharacter.value) {
      // Edit existing character using dedicated update endpoint
      await dramaAPI.updateCharacter(editingCharacter.value.id, {
        name: newCharacter.value.name,
        role: newCharacter.value.role,
        appearance: newCharacter.value.appearance,
        personality: newCharacter.value.personality,
        description: newCharacter.value.description,
        image_url: newCharacter.value.image_url,
        local_path: newCharacter.value.local_path,
      });
      ElMessage.success("角色更新成功");
    } else {
      // Add new character
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
      ElMessage.success("角色添加成功");
    }

    addCharacterDialogVisible.value = false;
    await loadDramaData();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
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
    ElMessage.error("角色ID不存在，无法删除");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除角色"${character.name}"吗？此操作不可恢复。`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    await characterLibraryAPI.deleteCharacter(character.id);
    ElMessage.success("角色已删除");
    await loadDramaData();
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除角色失败:", error);
      ElMessage.error(error.message || "删除失败");
    }
  }
};

const openAddSceneDialog = () => {
  editingScene.value = null;
  newScene.value = {
    location: "",
    description: "",
    prompt: "",
    image_url: "",
  };
  addSceneDialogVisible.value = true;
};

const saveScene = async () => {
  if (!newScene.value.location.trim()) {
    ElMessage.warning("请输入场景名称");
    return;
  }

  try {
    if (editingScene.value) {
      // Update existing scene
      await dramaAPI.updateScene(editingScene.value.id, {
        location: newScene.value.location,
        description: newScene.value.description,
        prompt: newScene.value.prompt,
        image_url: newScene.value.image_url,
        local_path: newScene.value.local_path,
      });
      // prompt field in Update is description or prompt? Check backend.
      // UpdateSceneRequest has Description *string.
      // And also ImagePrompt *string and VideoPrompt *string.
      // The backend model has Prompt string.
      // Checking backend handler:
      /*
        if req.Description != nil { updates["description"] = req.Description }
        if req.ImagePrompt != nil { updates["image_prompt"] = req.ImagePrompt }
      */
      // But CreateScene uses Prompt.
      // Let's assume description maps to Prompt or Description.
      // Wait, UpdateSceneRequest has Description but NO Prompt field?
      // Let's check backend UpdateSceneRequest struct again.
      // It has `ImagePrompt` and `VideoPrompt`, and `Description`.
      // But `Prompt` usually refers to image prompt in Scene model?
      // `models.Scene` has `Prompt` string.
      // `CreateScene` sets `Prompt: req.Prompt`.
      // `UpdateScene` handler:
      /*
      	if req.Description != nil {
      		updates["description"] = req.Description
      	}
      */
      // It seems UpdateScene doesn't support updating the main `Prompt` field directly via UpdateSceneRequest?
      // Wait, `UpdateScenePrompt` endpoint exists! `/scenes/:id/prompt`
      // But we probably want to update everything in one go.
      // I should update UpdateSceneRequest in backend if needed or use UpdateScenePrompt separately.
      // For now, let's look at scene model:
      // Scene struct: Location, Time, Description, Prompt...
      // Let's use `description` for now as it's available in Update.
      // Or if `prompt` is critical, I might need to call UpdateScenePrompt too.
      // Let's check `CreateScene` again. It uses `Prompt`.

      // Let's just update prompt via specific endpoint if needed, or mapping description to description.
      // Actually `newScene.prompt` is mapped to `description` in my current code for Update.
      // Let's stick with that for now or fix backend to support prompt update in general update.
    } else {
      // Create new scene
      await dramaAPI.createScene({
        drama_id: drama.value!.id,
        location: newScene.value.location,
        prompt: newScene.value.prompt,
        description: newScene.value.description,
        image_url: newScene.value.image_url,
        local_path: newScene.value.local_path,
      });
    }

    ElMessage.success(editingScene.value ? "场景更新成功" : "场景添加成功");
    addSceneDialogVisible.value = false;
    await loadScenes();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
  }
};

const editScene = (scene: any) => {
  editingScene.value = scene;
  newScene.value = {
    location: scene.location || scene.name || "",
    description: scene.description || "",
    prompt: scene.prompt || "",
    image_url: scene.image_url || "",
    local_path: scene.local_path || "",
  };
  addSceneDialogVisible.value = true;
};

const deleteScene = async (scene: any) => {
  if (!scene.id) {
    ElMessage.error("场景ID不存在，无法删除");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除场景"${scene.name || scene.location}"吗？此操作不可恢复。`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    await dramaAPI.deleteScene(scene.id.toString());
    ElMessage.success("场景已删除");
    await loadScenes();
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除场景失败:", error);
      ElMessage.error(error.message || "删除失败");
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
    ElMessage.warning("请输入道具名称");
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
      ElMessage.success("道具更新成功");
    } else {
      await propAPI.create(propData as any);
      ElMessage.success("道具添加成功");
    }

    addPropDialogVisible.value = false;
    await loadDramaData();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
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
      `确定要删除道具"${prop.name}"吗？此操作不可恢复。`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    await propAPI.delete(prop.id);
    ElMessage.success("道具已删除");
    await loadDramaData();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error.message || "删除失败");
    }
  }
};

const generatePropImage = async (prop: any) => {
  if (!prop.prompt) {
    ElMessage.warning("请先设置道具的图片提示词");
    editProp(prop);
    return;
  }

  try {
    await propAPI.generateImage(prop.id);
    ElMessage.success("图片生成任务已提交");
    startPolling(loadDramaData);
  } catch (error: any) {
    ElMessage.error(error.message || "生成失败");
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

const openExtractPoseDialog = () => {
  extractPosesDialogVisible.value = true;
  if (sortedEpisodes.value.length > 0 && !selectedExtractEpisodeId.value) {
    selectedExtractEpisodeId.value = sortedEpisodes.value[0].id;
  }
};

const handleExtractProps = async () => {
  if (!selectedExtractEpisodeId.value) return;

  try {
    const res = await propAPI.extractFromScript(selectedExtractEpisodeId.value);
    extractPropsDialogVisible.value = false;

    ElMessage.success(t('imageDialog.taskSubmitted')); // Use i18n or text

    // 自动刷新几次
    let checkCount = 0;
    const checkInterval = setInterval(() => {
      loadDramaData();
      checkCount++;
      if (checkCount > 10) clearInterval(checkInterval);
    }, 5000);
  } catch (error: any) {
    ElMessage.error(error.message || "提取失败");
  }
};

const handleExtractPoses = async () => {
  if (!selectedExtractEpisodeId.value) return;

  try {
    const res = await poseAPI.extractFromScript(selectedExtractEpisodeId.value);
    extractPosesDialogVisible.value = false;

    ElMessage.success(t('imageDialog.taskSubmitted'));

    // 自动刷新几次
    let checkCount = 0;
    const checkInterval = setInterval(() => {
      loadDramaData();
      checkCount++;
      if (checkCount > 10) clearInterval(checkInterval);
    }, 5000);
  } catch (error: any) {
    ElMessage.error(error.message || t('message.operationFailed'));
  }
};


const openAddPoseDialog = () => {
  editingPose.value = null;
  newPose.value = {
    name: "",
    description: "",
    image_url: "",
  };
  addPoseDialogVisible.value = true;
};

const savePose = async () => {
  if (!newPose.value.name.trim()) {
    ElMessage.warning("请输入姿态名称"); // Keep hardcoded or add key if preferred, but existing ones have mixed
    return;
  }

  try {
    const poseData = {
      drama_id: drama.value!.id,
      name: newPose.value.name,
      description: newPose.value.description,
      image_url: newPose.value.image_url,
    };

    if (editingPose.value) {
      await poseAPI.update(editingPose.value.id, poseData);
      ElMessage.success(t('pose.updateSuccess'));
    } else {
      await poseAPI.create(poseData as any);
      ElMessage.success(t('pose.createSuccess'));
    }

    addPoseDialogVisible.value = false;
    await loadDramaData();
  } catch (error: any) {
    ElMessage.error(error.message || t('message.operationFailed'));
  }
};

const editPose = (pose: any) => {
  editingPose.value = pose;
  newPose.value = {
    name: pose.name,
    description: pose.description || "",
    image_url: pose.image_url || "",
  };
  addPoseDialogVisible.value = true;
};

const deletePose = async (pose: any) => {
  try {
    await ElMessageBox.confirm(
      t('pose.deleteConfirm', { name: pose.name }),
      t('message.deleteConfirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: "warning",
      },
    );

    await poseAPI.delete(pose.id);
    ElMessage.success(t('pose.deleteSuccess'));
    await loadDramaData();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error.message || t('message.operationFailed'));
    }
  }
};

const generatePoseImage = async (pose: any) => {
  if (!pose.description) {
    ElMessage.warning(t('pose.promptPlaceholder')); // Reuse placeholder as warning or keep hardcoded if exact match needed
    editPose(pose);
    return;
  }

  try {
    await poseAPI.generateImage(pose.id);
    ElMessage.success(t('imageDialog.taskSubmitted'));
    startPolling(loadDramaData);
  } catch (error: any) {
    ElMessage.error(error.message || t('image.generateFailed'));
  }
};

const handlePoseImageSuccess = (response: any) => {
  if (response.data && response.data.url) {
    newPose.value.image_url = response.data.url;
  }
};

onMounted(() => {
  loadDramaData();
  loadScenes();

  // 如果有query参数指定tab，切换到对应tab
  if (route.query.tab) {
    activeTab.value = route.query.tab as string;
  }
});
</script>

<style scoped>
/* ========================================
   Page Layout / 页面布局 - 紧凑边距
   ======================================== */
.page-container {
  min-height: 100vh;
  background: var(--bg-primary);
  /* padding: var(--space-2) var(--space-3); */
  transition: background var(--transition-normal);
}

@media (min-width: 768px) {
  .page-container {
    /* padding: var(--space-3) var(--space-4); */
  }
}

@media (min-width: 1024px) {
  .page-container {
    /* padding: var(--space-4) var(--space-5); */
  }
}

.content-wrapper {
  margin: 0 auto;
  width: 100%;
}

/* ========================================
   Stats Grid / 统计网格 - 紧凑间距
   ======================================== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

@media (min-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ========================================
   Tabs Wrapper / 标签页容器 - 紧凑内边距
   ======================================== */
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

/* ========================================
   Tab Header / 标签页头部
   ======================================== */
.tab-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

@media (min-width: 640px) {
  .tab-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.tab-header h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

/* ========================================
   Character & Scene Cards / 角色场景卡片
   ======================================== */
.character-card,
.scene-card {
  margin-bottom: var(--space-4);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all var(--transition-normal);
}

.character-card:hover,
.scene-card:hover {
  border-color: var(--border-secondary);
  box-shadow: var(--shadow-card-hover);
}

.character-card :deep(.el-card__body),
.scene-card :deep(.el-card__body) {
  padding: 0;
}

.character-preview,
.scene-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 160px;
  background: linear-gradient(135deg, var(--accent) 0%, #06b6d4 100%);
  overflow: hidden;
}

.character-preview img,
.scene-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-normal);
}

.character-card:hover .character-preview img,
.scene-card:hover .scene-preview img {
  transform: scale(1.05);
}

.scene-placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.character-info,
.scene-info {
  text-align: center;
  padding: var(--space-4);
}

.character-info h4,
.scene-info h4 {
  margin: 0 0 var(--space-2) 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.desc {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: var(--space-2) 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.character-actions,
.scene-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  padding: 0 var(--space-4) var(--space-4);
}

.empty-icon {
  color: var(--accent);
}

/* ========================================
   Dark Mode / 深色模式
   ======================================== */
.dark .tabs-wrapper {
  background: var(--bg-card);
}

.dark :deep(.el-card) {
  background: var(--bg-card);
  border-color: var(--border-primary);
}

.dark :deep(.el-card__header) {
  background: var(--bg-secondary);
  border-color: var(--border-primary);
}

.dark :deep(.el-table) {
  background: var(--bg-card);
  --el-table-bg-color: var(--bg-card);
  --el-table-tr-bg-color: var(--bg-card);
  --el-table-header-bg-color: var(--bg-secondary);
  --el-fill-color-lighter: var(--bg-secondary);
}

.dark :deep(.el-table th),
.dark :deep(.el-table tr) {
  background: var(--bg-card);
}

.dark :deep(.el-table td),
.dark :deep(.el-table th) {
  border-color: var(--border-primary);
}

.dark :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: var(--bg-secondary);
}

.dark :deep(.el-table__body tr:hover > td) {
  background: var(--bg-card-hover) !important;
}

.dark :deep(.el-descriptions) {
  background: var(--bg-card);
}

.dark :deep(.el-descriptions__label) {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-color: var(--border-primary);
}

.dark :deep(.el-descriptions__content) {
  background: var(--bg-card);
  color: var(--text-primary);
  border-color: var(--border-primary);
}

.dark :deep(.el-descriptions__cell) {
  border-color: var(--border-primary);
}

/* ========================================
   Project Info Card / 项目信息卡片
   ======================================== */
.project-info-card {
  margin-top: var(--space-5);
  border-radius: var(--radius-lg);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.project-descriptions {
  width: 100%;
}

:deep(.project-descriptions .el-descriptions__label) {
  width: 120px;
  font-weight: 500;
  color: var(--text-secondary);
}

:deep(.project-descriptions .el-descriptions__content) {
  min-width: 150px;
}

.info-value {
  font-weight: 500;
  color: var(--text-primary);
}

.info-desc {
  color: var(--text-secondary);
  line-height: 1.6;
}

.dark :deep(.el-dialog) {
  background: var(--bg-card);
}

.dark :deep(.el-dialog__header) {
  background: var(--bg-card);
}

.dark :deep(.el-form-item__label) {
  color: var(--text-primary);
}

.dark :deep(.el-input__wrapper) {
  background: var(--bg-secondary);
  box-shadow: 0 0 0 1px var(--border-primary) inset;
}

.dark :deep(.el-input__inner) {
  color: var(--text-primary);
}

.dark :deep(.el-textarea__inner) {
  background: var(--bg-secondary);
  color: var(--text-primary);
  box-shadow: 0 0 0 1px var(--border-primary) inset;
}
</style>
