<template>
  <div class="page-container">
    <div class="content-wrapper animate-fade-in">
      <AppHeader :fixed="false" :show-logo="false">
        <template #left>
          <el-button text @click="$router.back()" class="back-btn">
            <el-icon><ArrowLeft /></el-icon>
            <span>{{ $t("workflow.backToProject") }}</span>
          </el-button>
          <h1 class="header-title">
            {{ $t("workflow.episodeProduction", { number: episodeNumber }) }}
          </h1>
        </template>
        <template #center>
          <div class="custom-steps">
            <div
              class="step-item"
              :class="{ active: currentStep >= 0, current: currentStep === 0 }"
            >
              <div class="step-circle">1</div>
              <span class="step-text">{{ $t("workflow.steps.content") }}</span>
            </div>
            <el-icon class="step-arrow"><ArrowRight /></el-icon>
            <div
              class="step-item"
              :class="{ active: currentStep >= 1, current: currentStep === 1 }"
            >
              <div class="step-circle">2</div>
              <span class="step-text">{{
                $t("workflow.steps.generateImages")
              }}</span>
            </div>
            <el-icon class="step-arrow"><ArrowRight /></el-icon>
            <div
              class="step-item"
              :class="{ active: currentStep >= 2, current: currentStep === 2 }"
            >
              <div class="step-circle">3</div>
              <span class="step-text">{{
                $t("workflow.steps.splitStoryboard")
              }}</span>
            </div>
          </div>
        </template>
        <template #right>
          <el-button
            :icon="Setting"
            @click="showModelConfigDialog"
            :title="$t('workflow.modelConfig')"
          >
            图文配置
          </el-button>
        </template>
      </AppHeader>

      <div class="content-container">
        <!-- 阶段 0: 章节内容 + 提取角色场景 -->
        <el-card
          v-show="currentStep === 0"
          shadow="never"
          class="stage-card stage-card-fullscreen"
        >
          <div class="stage-body stage-body-fullscreen">
            <!-- 未保存时显示输入�?-->
            <div v-if="!hasScript" class="generation-form">
              <el-input
                v-model="scriptContent"
                type="textarea"
                :placeholder="$t('workflow.scriptPlaceholder')"
                class="script-textarea script-textarea-fullscreen"
              />

              <div class="action-buttons-inline">
                <el-button
                  type="primary"
                  size="default"
                  @click="saveChapterScript"
                  :disabled="!scriptContent.trim() || generatingScript"
                >
                  <el-icon><Check /></el-icon>
                  <span>{{ $t("workflow.saveChapter") }}</span>
                </el-button>
              </div>
            </div>

            <!-- 已保存时显示内容 -->
            <div v-if="hasScript" class="overview-section">
              <div class="episode-info">
                <h3>
                  {{ $t("workflow.chapterContent", { number: episodeNumber }) }}
                </h3>
                <el-tag type="success" size="large">{{
                  $t("workflow.saved")
                }}</el-tag>
              </div>
              <div class="overview-content">
                <el-input
                  v-model="scriptContent"
                  type="textarea"
                  :rows="15"
                  :placeholder="$t('workflow.scriptPlaceholder')"
                  class="script-textarea script-textarea-fullscreen"
                />
              </div>

              <div class="action-buttons-inline">
                <el-button
                  type="primary"
                  size="default"
                  @click="saveChapterScript"
                  :loading="generatingScript"
                  :disabled="!scriptContent.trim() || generatingScript"
                >
                  <el-icon><Check /></el-icon>
                  <span>{{ $t("workflow.saveChapter") }}</span>
                </el-button>
              </div>

              <el-divider />

              <!-- 显示已提取的角色和场�?-->
              <div v-if="hasExtractedData" class="extracted-info">
                <el-alert
                  type="success"
                  :closable="false"
                  style="margin-bottom: 16px"
                >
                  <template #title>
                    <div style="display: flex; align-items: center; gap: 16px">
                      <span>�?{{ $t("workflow.extractedData") }}</span>
                      <el-tag v-if="hasCharacters" type="success"
                        >{{ $t("workflow.characters") }}:
                        {{ charactersCount }}</el-tag
                      >
                      <el-tag v-if="currentEpisode?.scenes" type="success"
                        >{{ $t("workflow.scenes") }}:
                        {{ currentEpisode.scenes.length }}</el-tag
                      >
                    </div>
                  </template>
                </el-alert>

                <!-- 角色列表 -->
                <div v-if="hasCharacters" style="margin-bottom: 16px">
                  <h4 class="extracted-title">
                    {{ $t("workflow.extractedCharacters") }}�?
                  </h4>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px">
                    <el-tag
                      v-for="char in currentEpisode?.characters"
                      :key="char.id"
                      type="info"
                    >
                      {{ char.name }}
                      <span v-if="char.role" class="secondary-text"
                        >({{ char.role }})</span
                      >
                    </el-tag>
                  </div>
                </div>

                <!-- 场景列表 -->
                <div
                  v-if="
                    currentEpisode?.scenes && currentEpisode.scenes.length > 0
                  "
                >
                  <h4 class="extracted-title">
                    {{ $t("workflow.extractedScenes") }}�?
                  </h4>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px">
                    <el-tag
                      v-for="scene in currentEpisode.scenes"
                      :key="scene.id"
                      type="warning"
                    >
                      {{ scene.location }}
                      <span class="secondary-text">· {{ scene.time }}</span>
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 阶段 1: 生成图片 -->
        <el-card v-show="currentStep === 1" class="workflow-card">
          <div class="stage-body">
            <!-- 角色图片生成 -->
            <div class="image-gen-section">
              <div class="section-header">
                <div class="section-title">
                  <h3>
                    <el-icon><User /></el-icon>
                    {{ $t("workflow.characterImages") }}
                  </h3>
                  <el-alert type="info" :closable="false" style="margin: 0">
                    {{
                      $t("workflow.characterCount", { count: charactersCount })
                    }}
                  </el-alert>
                </div>
                <div class="section-actions">
                  <el-checkbox
                    v-model="selectAllCharacters"
                    @change="toggleSelectAllCharacters"
                    style="margin-right: 12px"
                  >
                    {{ $t("workflow.selectAll") }}
                  </el-checkbox>
                  <el-button
                    type="primary"
                    @click="batchGenerateCharacterImages"
                    :loading="batchGeneratingCharacters"
                    :disabled="selectedCharacterIds.length === 0"
                    size="default"
                  >
                    {{ $t("workflow.batchGenerate") }} ({{
                      selectedCharacterIds.length
                    }})
                  </el-button>
                </div>
              </div>

              <div class="character-image-list">
                <div
                  v-for="char in currentEpisode?.characters"
                  :key="char.id"
                  class="character-item"
                >
                  <el-card shadow="hover" class="fixed-card">
                    <div class="card-header">
                      <el-checkbox
                        v-model="selectedCharacterIds"
                        :value="char.id"
                        style="margin-right: 8px"
                      />
                      <div class="header-left">
                        <h4>{{ char.name }}</h4>
                        <el-tag size="small">{{ char.role }}</el-tag>
                      </div>
                      <el-button
                        type="danger"
                        size="small"
                        :icon="Delete"
                        circle
                        @click="deleteCharacter(char.id)"
                        :title="$t('workflow.deleteCharacter')"
                      />
                    </div>

                    <div class="card-image-container">
                      <div v-if="hasImage(char)" class="char-image">
                        <el-image :src="getImageUrl(char)" fit="cover" />
                      </div>
                      <div
                        v-else-if="
                          char.image_generation_status === 'pending' ||
                          char.image_generation_status === 'processing' ||
                          generatingCharacterImages[char.id]
                        "
                        class="char-placeholder generating"
                      >
                        <el-icon :size="64" class="rotating"
                          ><Loading
                        /></el-icon>
                        <span>{{ $t("common.generating") }}</span>
                        <el-tag
                          type="warning"
                          size="small"
                          style="margin-top: 8px"
                          >{{
                            char.image_generation_status === "pending"
                              ? $t("common.queuing")
                              : $t("common.processing")
                          }}</el-tag
                        >
                      </div>
                      <div
                        v-else-if="char.image_generation_status === 'failed'"
                        class="char-placeholder failed"
                      >
                        <el-icon :size="64"><WarningFilled /></el-icon>
                        <span>{{ $t("common.generateFailed") }}</span>
                        <el-tag
                          type="danger"
                          size="small"
                          style="margin-top: 8px"
                          >{{ $t("common.clickToRegenerate") }}</el-tag
                        >
                      </div>
                      <div v-else class="char-placeholder">
                        <el-icon :size="64"><User /></el-icon>
                        <span>{{ $t("common.notGenerated") }}</span>
                      </div>
                    </div>

                    <div class="card-actions">
                      <el-tooltip
                        :content="$t('tooltip.editPrompt')"
                        placement="top"
                      >
                        <el-button
                          size="small"
                          @click="openPromptDialog(char, 'character')"
                          :icon="Edit"
                          circle
                        />
                      </el-tooltip>
                      <el-tooltip
                        :content="$t('tooltip.aiGenerate')"
                        placement="top"
                      >
                        <el-button
                          type="primary"
                          size="small"
                          @click="generateCharacterImage(char.id)"
                          :loading="generatingCharacterImages[char.id]"
                          :icon="MagicStick"
                          circle
                        />
                      </el-tooltip>
                      <el-tooltip
                        :content="$t('tooltip.uploadImage')"
                        placement="top"
                      >
                        <el-button
                          size="small"
                          @click="uploadCharacterImage(char.id)"
                          :icon="Upload"
                          circle
                        />
                      </el-tooltip>
                      <el-tooltip
                        :content="$t('tooltip.selectFromLibrary')"
                        placement="top"
                      >
                        <el-button
                          size="small"
                          @click="selectFromLibrary(char.id)"
                          :icon="Picture"
                          circle
                        />
                      </el-tooltip>
                      <el-tooltip
                        :content="$t('workflow.addToLibrary')"
                        placement="top"
                      >
                        <el-button
                          size="small"
                          @click="addToCharacterLibrary(char)"
                          :icon="FolderAdd"
                          :disabled="!char.image_url"
                          circle
                        />
                      </el-tooltip>
                    </div>
                  </el-card>
                </div>
              </div>
            </div>

            <el-divider />

            <!-- 场景图片生成 -->
            <div class="image-gen-section">
              <div class="section-header">
                <div class="section-title">
                  <h3>
                    <el-icon><Place /></el-icon>
                    {{ $t("workflow.sceneImages") }}
                  </h3>
                  <el-alert type="info" :closable="false" style="margin: 0">
                    {{
                      $t("workflow.sceneCount", {
                        count: currentEpisode?.scenes?.length || 0,
                      })
                    }}
                  </el-alert>
                </div>
                <div class="section-actions">
                  <!-- <el-button
                  :icon="Document"
                  @click="openExtractSceneDialog"
                  size="default"
                >
                  {{ $t("workflow.extractFromScript") }}
                </el-button> -->
                  <el-checkbox
                    v-model="selectAllScenes"
                    @change="toggleSelectAllScenes"
                    style="margin-left: 12px; margin-right: 12px"
                  >
                    {{ $t("workflow.selectAll") }}
                  </el-checkbox>
                  <el-button
                    type="primary"
                    @click="batchGenerateSceneImages"
                    :loading="batchGeneratingScenes"
                    :disabled="selectedSceneIds.length === 0"
                    size="default"
                  >
                    {{ $t("workflow.batchGenerateSelected") }} ({{
                      selectedSceneIds.length
                    }})
                  </el-button>

                  <el-button
                    :icon="Plus"
                    @click="openAddSceneDialog"
                    size="default"
                  >
                    {{ $t("workflow.addScene") }}
                  </el-button>
                </div>
              </div>

              <div class="scene-image-list">
                <div
                  v-for="scene in currentEpisode?.scenes"
                  :key="scene.id"
                  class="scene-item"
                >
                  <el-card shadow="hover" class="fixed-card">
                    <div class="card-header">
                      <el-checkbox
                        v-model="selectedSceneIds"
                        :value="scene.id"
                        style="margin-right: 8px"
                      />
                      <div class="header-left">
                        <h4>{{ scene.location }}</h4>
                        <el-tag size="small">{{ scene.time }}</el-tag>
                      </div>
                    </div>

                    <div class="card-image-container">
                      <div v-if="hasImage(scene)" class="scene-image">
                        <el-image :src="getImageUrl(scene)" fit="cover" />
                      </div>
                      <div
                        v-else-if="
                          scene.image_generation_status === 'pending' ||
                          scene.image_generation_status === 'processing' ||
                          generatingSceneImages[scene.id]
                        "
                        class="scene-placeholder generating"
                      >
                        <el-icon :size="64" class="rotating"
                          ><Loading
                        /></el-icon>
                        <span>{{ $t("common.generating") }}</span>
                        <el-tag
                          type="warning"
                          size="small"
                          style="margin-top: 8px"
                          >{{
                            scene.image_generation_status === "pending"
                              ? $t("common.queuing")
                              : $t("common.processing")
                          }}</el-tag
                        >
                      </div>
                      <div
                        v-else-if="scene.image_generation_status === 'failed'"
                        class="scene-placeholder failed"
                        @click="generateSceneImage(scene.id)"
                        style="cursor: pointer"
                      >
                        <el-icon :size="64"><WarningFilled /></el-icon>
                        <span>{{ $t("common.generateFailed") }}</span>
                        <el-tag
                          type="danger"
                          size="small"
                          style="margin-top: 8px"
                          >{{ $t("common.clickToRegenerate") }}</el-tag
                        >
                      </div>
                      <div v-else class="scene-placeholder">
                        <el-icon :size="64"><Place /></el-icon>
                        <span>{{ $t("common.notGenerated") }}</span>
                      </div>
                    </div>

                    <div class="card-actions">
                      <el-tooltip
                        :content="$t('tooltip.editPrompt')"
                        placement="top"
                      >
                        <el-button
                          size="small"
                          @click="openPromptDialog(scene, 'scene')"
                          :icon="Edit"
                          circle
                        />
                      </el-tooltip>
                      <el-tooltip
                        :content="$t('tooltip.aiGenerate')"
                        placement="top"
                      >
                        <el-button
                          type="primary"
                          size="small"
                          @click="generateSceneImage(scene.id)"
                          :loading="generatingSceneImages[scene.id]"
                          :icon="MagicStick"
                          circle
                        />
                      </el-tooltip>
                      <el-tooltip
                        :content="$t('tooltip.uploadImage')"
                        placement="top"
                      >
                        <el-button
                          size="small"
                          @click="uploadSceneImage(scene.id)"
                          :icon="Upload"
                          circle
                        />
                      </el-tooltip>
                    </div>
                  </el-card>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 阶段 2: 拆分分镜 -->
        <el-card v-show="currentStep === 2" shadow="never" class="stage-card">
          <div class="stage-body">
            <!-- 分镜列表 -->
            <div
              v-if="
                currentEpisode?.storyboards &&
                currentEpisode.storyboards.length > 0
              "
              class="shots-list"
            >
              <div class="shots-header">
                <h3>{{ $t("workflow.shotList") }}</h3>
              </div>

              <el-table
                :data="currentEpisode.storyboards"
                border
                stripe
                style="margin-top: 16px"
              >
                <el-table-column
                  type="index"
                  :label="$t('storyboard.table.number')"
                  width="60"
                />
                <el-table-column
                  :label="$t('storyboard.table.title')"
                  width="120"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    {{ row.title || "-" }}
                  </template>
                </el-table-column>
                <el-table-column
                  :label="$t('storyboard.table.shotType')"
                  width="80"
                >
                  <template #default="{ row }">
                    {{ row.shot_type || "-" }}
                  </template>
                </el-table-column>
                <el-table-column
                  :label="$t('storyboard.table.movement')"
                  width="80"
                >
                  <template #default="{ row }">
                    {{ row.movement || "-" }}
                  </template>
                </el-table-column>
                <el-table-column
                  :label="$t('storyboard.table.location')"
                  width="150"
                >
                  <template #default="{ row }">
                    <el-popover
                      placement="right"
                      :width="300"
                      trigger="hover"
                      :content="row.action || '-'"
                    >
                      <template #reference>
                        <!-- 单行打点 -->
                        <span class="overflow-tooltip">{{
                          row.location || "-"
                        }}</span>
                      </template>
                    </el-popover>
                  </template>
                </el-table-column>
                <el-table-column
                  :label="$t('storyboard.table.character')"
                  width="100"
                >
                  <template #default="{ row }">
                    <span v-if="row.characters && row.characters.length > 0">
                      {{ row.characters.map((c) => c.name || c).join(", ") }}
                    </span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <el-table-column :label="$t('storyboard.table.action')">
                  <template #default="{ row }">
                    <el-popover
                      placement="right"
                      :width="300"
                      trigger="hover"
                      :content="row.action || '-'"
                    >
                      <template #reference>
                        <!-- 单行打点 -->
                        <span class="overflow-tooltip">{{
                          row.action || "-"
                        }}</span>
                      </template>
                    </el-popover>
                  </template>
                </el-table-column>
                <el-table-column
                  :label="$t('storyboard.table.duration')"
                  width="80"
                >
                  <template #default="{ row }">
                    {{
                      row.duration
                        ? `${row.duration}${$t("professionalEditor.seconds")}`
                        : "-"
                    }}
                  </template>
                </el-table-column>
                <el-table-column
                  :label="$t('storyboard.table.operations')"
                  width="100"
                  fixed="right"
                >
                  <template #default="{ row, $index }">
                    <el-button
                      type="primary"
                      size="small"
                      @click="editShot(row, $index)"
                    >
                      {{ $t("common.edit") }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 未拆分时显示 -->
            <div v-else class="empty-shots">
              <el-empty :description="$t('workflow.splitStoryboardFirst')">
                <el-button
                  type="primary"
                  @click="generateShots"
                  :loading="generatingShots"
                  :icon="MagicStick"
                >
                  {{
                    generatingShots
                      ? $t("workflow.aiSplitting")
                      : $t("workflow.aiAutoSplit")
                  }}
                </el-button>

                <!-- 任务进度显示 -->
                <div
                  v-if="generatingShots"
                  style="
                    margin-top: 24px;
                    max-width: 400px;
                    margin-left: auto;
                    margin-right: auto;
                  "
                >
                  <el-progress
                    :percentage="taskProgress"
                    :status="taskProgress === 100 ? 'success' : undefined"
                  >
                    <template #default="{ percentage }">
                      <span style="font-size: 12px">{{ percentage }}%</span>
                    </template>
                  </el-progress>
                  <div class="task-message">
                    {{ taskMessage }}
                  </div>
                </div>
              </el-empty>
            </div>
          </div>
        </el-card>
      </div>

      <div class="actions-container">
        <div class="action-buttons" v-show="currentStep === 0">
          <el-button
            type="primary"
            size="large"
            @click="handleExtractCharactersAndBackgrounds"
            :loading="extractingCharactersAndBackgrounds"
            :disabled="!hasScript"
          >
            <el-icon><MagicStick /></el-icon>
            {{
              hasExtractedData
                ? $t("workflow.reExtract")
                : $t("workflow.extractCharactersAndScenes")
            }}
          </el-button>
          <el-button
            type="success"
            size="large"
            @click="nextStep"
            :disabled="!hasExtractedData"
          >
            {{ $t("workflow.nextStepGenerateImages") }}
            <el-icon><ArrowRight /></el-icon>
          </el-button>
          <div v-if="!hasExtractedData" style="margin-top: 8px">
            <el-alert
              type="warning"
              :closable="false"
              style="display: inline-block"
            >
              <template #title>
                <span style="font-size: 12px">
                  {{ $t("workflow.extractWarning") }}
                </span>
              </template>
            </el-alert>
          </div>
        </div>

        <div class="action-buttons" v-show="currentStep === 1">
          <el-button size="large" @click="prevStep">
            <el-icon><ArrowLeft /></el-icon>
            {{ $t("workflow.prevStep") }}
          </el-button>
          <el-button
            type="success"
            size="large"
            @click="nextStep"
            :disabled="!allImagesGenerated"
          >
            {{ $t("workflow.nextStepSplitShots") }}
            <el-icon><ArrowRight /></el-icon>
          </el-button>
          <div v-if="!allImagesGenerated" style="margin-top: 8px">
            <el-alert
              type="warning"
              :closable="false"
              style="display: inline-block"
            >
              <template #title>
                <span style="font-size: 12px">
                  {{ $t("workflow.generateAllImagesFirst") }}
                </span>
              </template>
            </el-alert>
          </div>
        </div>

        <div class="action-buttons" v-show="currentStep === 2">
          <el-button size="large" @click="prevStep">
            <el-icon><ArrowLeft /></el-icon>
            {{ $t("workflow.prevStep") }}
          </el-button>
          <el-button size="large" @click="regenerateShots" :icon="MagicStick">
            {{ $t("workflow.reSplitShots") }}
          </el-button>
          <el-button type="success" size="large" @click="goToProfessionalUI">
            {{ $t("workflow.enterProfessional") }}
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <div class="components-box">
      <!-- 镜头编辑对话�?-->
      <el-dialog
        v-model="shotEditDialogVisible"
        :title="$t('workflow.editShot')"
        width="800px"
        :close-on-click-modal="false"
      >
        <el-form v-if="editingShot" label-width="100px" size="default">
          <el-form-item :label="$t('workflow.shotTitle')">
            <el-input
              v-model="editingShot.title"
              :placeholder="$t('workflow.shotTitlePlaceholder')"
            />
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item :label="$t('workflow.shotType')">
                <el-select
                  v-model="editingShot.shot_type"
                  :placeholder="$t('workflow.selectShotType')"
                >
                  <el-option :label="$t('workflow.longShot')" value="远景" />
                  <el-option :label="$t('workflow.fullShot')" value="全景" />
                  <el-option :label="$t('workflow.mediumShot')" value="中景" />
                  <el-option :label="$t('workflow.closeUp')" value="近景" />
                  <el-option
                    :label="$t('workflow.extremeCloseUp')"
                    value="特写"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="$t('workflow.cameraAngle')">
                <el-select
                  v-model="editingShot.angle"
                  :placeholder="$t('workflow.selectAngle')"
                >
                  <el-option :label="$t('workflow.eyeLevel')" value="平视" />
                  <el-option :label="$t('workflow.lowAngle')" value="仰视" />
                  <el-option :label="$t('workflow.highAngle')" value="俯视" />
                  <el-option :label="$t('workflow.sideView')" value="侧面" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="$t('workflow.cameraMovement')">
                <el-select
                  v-model="editingShot.movement"
                  :placeholder="$t('workflow.selectMovement')"
                >
                  <el-option
                    :label="$t('workflow.staticShot')"
                    value="固定镜头"
                  />
                  <el-option :label="$t('workflow.pushIn')" value="推镜" />
                  <el-option :label="$t('workflow.pullOut')" value="拉镜" />
                  <el-option :label="$t('workflow.followShot')" value="跟镜" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="$t('workflow.location')">
                <el-input
                  v-model="editingShot.location"
                  :placeholder="$t('workflow.locationPlaceholder')"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('workflow.time')">
                <el-input
                  v-model="editingShot.time"
                  :placeholder="$t('workflow.timeSetting')"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item :label="$t('workflow.shotDescription')">
            <el-input
              v-model="editingShot.description"
              type="textarea"
              :rows="2"
              :placeholder="$t('workflow.shotDescriptionPlaceholder')"
            />
          </el-form-item>

          <el-form-item :label="$t('workflow.actionDescription')">
            <el-input
              v-model="editingShot.action"
              type="textarea"
              :rows="3"
              :placeholder="$t('workflow.detailedAction')"
            />
          </el-form-item>

          <el-form-item :label="$t('workflow.dialogue')">
            <el-input
              v-model="editingShot.dialogue"
              type="textarea"
              :rows="2"
              :placeholder="$t('workflow.characterDialogue')"
            />
          </el-form-item>

          <el-form-item :label="$t('workflow.result')">
            <el-input
              v-model="editingShot.result"
              type="textarea"
              :rows="2"
              :placeholder="$t('workflow.actionResult')"
            />
          </el-form-item>

          <el-form-item :label="$t('workflow.atmosphere')">
            <el-input
              v-model="editingShot.atmosphere"
              type="textarea"
              :rows="2"
              :placeholder="$t('workflow.atmosphereDescription')"
            />
          </el-form-item>

          <el-form-item :label="$t('workflow.imagePrompt')">
            <el-input
              v-model="editingShot.image_prompt"
              type="textarea"
              :rows="3"
              :placeholder="$t('workflow.imagePromptPlaceholder')"
            />
          </el-form-item>

          <el-form-item :label="$t('workflow.videoPrompt')">
            <el-input
              v-model="editingShot.video_prompt"
              type="textarea"
              :rows="3"
              :placeholder="$t('workflow.videoPromptPlaceholder')"
            />
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="$t('workflow.bgmHint')">
                <el-input
                  v-model="editingShot.bgm_prompt"
                  :placeholder="$t('workflow.bgmAtmosphere')"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('workflow.soundEffect')">
                <el-input
                  v-model="editingShot.sound_effect"
                  :placeholder="$t('workflow.soundEffectDescription')"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item :label="$t('workflow.durationSeconds')">
            <el-input-number
              v-model="editingShot.duration"
              :min="1"
              :max="60"
            />
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="shotEditDialogVisible = false">{{
            $t("common.cancel")
          }}</el-button>
          <el-button
            type="primary"
            @click="saveShotEdit"
            :loading="savingShot"
            >{{ $t("common.save") }}</el-button
          >
        </template>
      </el-dialog>

      <!-- 提示词编辑对话框 -->
      <el-dialog
        v-model="promptDialogVisible"
        :title="$t('workflow.editPrompt')"
        width="600px"
      >
        <el-form label-width="80px">
          <el-form-item :label="$t('common.name')">
            <el-input v-model="currentEditItem.name" disabled />
          </el-form-item>
          <el-form-item
            v-if="currentEditType === 'scene'"
            :label="$t('workflow.time')"
          >
            <el-input
              v-model="currentEditItem.time"
              :placeholder="$t('workflow.timePlaceholder')"
            />
          </el-form-item>
          <el-form-item :label="$t('workflow.imagePrompt')">
            <el-input
              v-model="editPrompt"
              type="textarea"
              :rows="6"
              :placeholder="$t('workflow.imagePromptPlaceholder')"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="promptDialogVisible = false">{{
            $t("common.cancel")
          }}</el-button>
          <el-button type="primary" @click="savePrompt">{{
            $t("common.save")
          }}</el-button>
        </template>
      </el-dialog>

      <!-- 角色库选择对话�?-->
      <el-dialog
        v-model="libraryDialogVisible"
        :title="$t('workflow.selectFromLibrary')"
        width="800px"
      >
        <div class="library-grid">
          <div
            v-for="item in libraryItems"
            :key="item.id"
            class="library-item"
            @click="selectLibraryItem(item)"
          >
            <el-image :src="getImageUrl(item)" fit="cover" />
            <div class="library-item-name">{{ item.name }}</div>
          </div>
        </div>
        <div v-if="libraryItems.length === 0" class="empty-library">
          <el-empty :description="$t('workflow.emptyLibrary')" />
        </div>
      </el-dialog>

      <!-- AI模型配置对话�?-->
      <el-dialog
        v-model="modelConfigDialogVisible"
        :title="$t('workflow.aiModelConfig')"
        width="600px"
        :close-on-click-modal="false"
      >
        <el-form label-width="120px">
          <el-form-item :label="$t('workflow.textGenModel')">
            <el-select
              v-model="selectedTextModel"
              :placeholder="$t('workflow.selectTextModel')"
              style="width: 100%"
            >
              <el-option
                v-for="model in textModels"
                :key="model.modelName"
                :label="model.modelName"
                :value="model.modelName"
              />
            </el-select>
            <div class="model-tip">
              {{ $t("workflow.textModelTip") }}
            </div>
          </el-form-item>

          <el-form-item :label="$t('workflow.imageGenModel')">
            <el-select
              v-model="selectedImageModel"
              :placeholder="$t('workflow.selectImageModel')"
              style="width: 100%"
            >
              <el-option
                v-for="model in imageModels"
                :key="model.modelName"
                :label="model.modelName"
                :value="model.modelName"
              />
            </el-select>
            <div class="model-tip">
              {{ $t("workflow.modelConfigTip") }}
            </div>
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="modelConfigDialogVisible = false">{{
            $t("common.cancel")
          }}</el-button>
          <el-button type="primary" @click="saveModelConfig">{{
            $t("common.saveConfig")
          }}</el-button>
        </template>
      </el-dialog>

      <!-- 图片上传对话�?-->
      <el-dialog
        v-model="uploadDialogVisible"
        :title="$t('tooltip.uploadImage')"
        width="500px"
      >
        <el-upload
          class="upload-area"
          drag
          :action="uploadAction"
          :headers="uploadHeaders"
          :on-success="handleUploadSuccess"
          :on-error="handleUploadError"
          :show-file-list="false"
          accept="image/jpeg,image/png,image/jpg"
        >
          <el-icon class="el-icon--upload"><Upload /></el-icon>
          <div class="el-upload__text">
            {{ $t("workflow.dragFilesHere")
            }}<em>{{ $t("workflow.clickToUpload") }}</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              {{ $t("workflow.uploadFormatTip") }}
            </div>
          </template>
        </el-upload>
      </el-dialog>

      <!-- 添加场景对话�?-->
      <el-dialog
        v-model="addSceneDialogVisible"
        :title="$t('workflow.addScene')"
        width="600px"
      >
        <el-form :model="newScene" label-width="100px">
          <el-form-item :label="$t('workflow.sceneImage')">
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
          <el-form-item :label="$t('workflow.sceneName')">
            <el-input
              v-model="newScene.location"
              :placeholder="$t('workflow.sceneNamePlaceholder')"
            />
          </el-form-item>
          <el-form-item :label="$t('workflow.time')">
            <el-input
              v-model="newScene.time"
              :placeholder="$t('workflow.timePlaceholder')"
            />
          </el-form-item>
          <el-form-item :label="$t('workflow.sceneDescription')">
            <el-input
              v-model="newScene.prompt"
              type="textarea"
              :rows="4"
              :placeholder="$t('workflow.sceneDescriptionPlaceholder')"
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

      <!-- 从剧本提取场景对话框 -->
      <el-dialog
        v-model="extractScenesDialogVisible"
        :title="$t('workflow.extractSceneDialogTitle')"
        width="500px"
      >
        <el-alert type="info" :closable="false" style="margin-bottom: 16px">
          {{ $t("workflow.extractSceneDialogTip") }}
        </el-alert>
        <template #footer>
          <el-button @click="extractScenesDialogVisible = false">
            {{ $t("common.cancel") }}
          </el-button>
          <el-button
            type="primary"
            @click="handleExtractScenes"
            :loading="extractingScenes"
          >
            {{ $t("workflow.startExtract") }}
          </el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  User,
  Location,
  Picture,
  MagicStick,
  ArrowRight,
  ArrowLeft,
  Place,
  Film,
  Edit,
  More,
  Upload,
  Delete,
  FolderAdd,
  Setting,
  Loading,
  WarningFilled,
  Document,
  Plus,
} from "@element-plus/icons-vue";
import { dramaAPI } from "@/api/drama";
import { generationAPI } from "@/api/generation";
import { characterLibraryAPI } from "@/api/character-library";
import { aiAPI } from "@/api/ai";
import type { AIServiceConfig } from "@/types/ai";
import { imageAPI } from "@/api/image";
import type { Drama } from "@/types/drama";
import { AppHeader } from "@/components/common";
import { getImageUrl, hasImage } from "@/utils/image";

const route = useRoute();
const router = useRouter();
const { t: $t } = useI18n();
const dramaId = route.params.id as string;
const episodeNumber = parseInt(route.params.episodeNumber as string);

const drama = ref<Drama>();

// 生成 localStorage key
const getStepStorageKey = () =>
  `episode_workflow_step_${dramaId}_${episodeNumber}`;

// �?localStorage 恢复步骤，如果没有则默认�?0
const savedStep = localStorage.getItem(getStepStorageKey());
const currentStep = ref(savedStep ? parseInt(savedStep) : 0);
const scriptContent = ref("");
const generatingScript = ref(false);
const generatingShots = ref(false);
const extractingCharactersAndBackgrounds = ref(false);
const batchGeneratingCharacters = ref(false);
const batchGeneratingScenes = ref(false);
const generatingCharacterImages = ref<Record<number, boolean>>({});
const generatingSceneImages = ref<Record<string, boolean>>({});

// 选择状�?
const selectedCharacterIds = ref<number[]>([]);
const selectedSceneIds = ref<number[]>([]);
const selectAllCharacters = ref(false);
const selectAllScenes = ref(false);

// 对话框状�?
const promptDialogVisible = ref(false);
const libraryDialogVisible = ref(false);
const uploadDialogVisible = ref(false);
const modelConfigDialogVisible = ref(false);
const addSceneDialogVisible = ref(false);
const extractScenesDialogVisible = ref(false);
const currentEditItem = ref<any>({ name: "" });
const currentEditType = ref<"character" | "scene">("character");
const editPrompt = ref("");
const libraryItems = ref<any[]>([]);
const currentUploadTarget = ref<any>(null);

// 添加场景相关
const newScene = ref<any>({
  location: "",
  time: "",
  prompt: "",
  image_url: "",
  local_path: "",
});
const extractingScenes = ref(false);
const uploadAction = computed(() => "/api/v1/upload/image");
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
}));

// AI模型配置
interface ModelOption {
  modelName: string;
  configName: string;
  configId: number;
  priority: number;
}

const textModels = ref<ModelOption[]>([]);
const imageModels = ref<ModelOption[]>([]);
const selectedTextModel = ref<string>("");
const selectedImageModel = ref<string>("");

const hasScript = computed(() => {
  const currentEp = currentEpisode.value;
  return (
    currentEp && currentEp.script_content && currentEp.script_content.length > 0
  );
});

const currentEpisode = computed(() => {
  if (!drama.value?.episodes) return null;
  return drama.value.episodes.find((ep) => ep.episode_number === episodeNumber);
});

const hasCharacters = computed(() => {
  return (
    currentEpisode.value?.characters &&
    currentEpisode.value.characters.length > 0
  );
});

const charactersCount = computed(() => {
  return currentEpisode.value?.characters?.length || 0;
});

const hasExtractedData = computed(() => {
  const hasScenes =
    currentEpisode.value?.scenes && currentEpisode.value.scenes.length > 0;
  // 只要有角色或场景，就认为已经提取过数�?
  return hasCharacters.value || hasScenes;
});

const allImagesGenerated = computed(() => {
  // 如果没有提取任何数据，允许跳过（可能是空章节或用户想直接进入拆解分镜�?
  if (!hasExtractedData.value) return true;

  const characters = currentEpisode.value?.characters || [];
  const scenes = currentEpisode.value?.scenes || [];

  // 如果角色和场景都为空，允许跳�?
  if (characters.length === 0 && scenes.length === 0) return true;

  // 检查所有有数据的项是否都已生成图片
  const allCharsHaveImages =
    characters.length === 0 || characters.every((char) => char.image_url);
  const allScenesHaveImages =
    scenes.length === 0 || scenes.every((scene) => scene.image_url);

  return allCharsHaveImages && allScenesHaveImages;
});

const goBack = () => {
  // 使用 replace 避免在历史记录中留下当前页面
  router.replace(`/dramas/${dramaId}`);
};

// 加载AI模型配置
const loadAIConfigs = async () => {
  try {
    const [textList, imageList] = await Promise.all([
      aiAPI.list("text"),
      aiAPI.list("image"),
    ]);

    // 只使用激活的配置
    const activeTextList = textList.filter((c) => c.is_active);
    const activeImageList = imageList.filter((c) => c.is_active);

    // 展开模型列表并去重（保留优先级最高的�?
    const allTextModels = activeTextList
      .flatMap((config) => {
        const models = Array.isArray(config.model)
          ? config.model
          : [config.model];
        return models.map((modelName) => ({
          modelName,
          configName: config.name,
          configId: config.id,
          priority: config.priority || 0,
        }));
      })
      .sort((a, b) => b.priority - a.priority);

    // 按模型名称去重，保留优先级最高的（已排序，第一个就是优先级最高的�?
    const textModelMap = new Map<string, ModelOption>();
    allTextModels.forEach((model) => {
      if (!textModelMap.has(model.modelName)) {
        textModelMap.set(model.modelName, model);
      }
    });
    textModels.value = Array.from(textModelMap.values());

    const allImageModels = activeImageList
      .flatMap((config) => {
        const models = Array.isArray(config.model)
          ? config.model
          : [config.model];
        return models.map((modelName) => ({
          modelName,
          configName: config.name,
          configId: config.id,
          priority: config.priority || 0,
        }));
      })
      .sort((a, b) => b.priority - a.priority);

    // 按模型名称去重，保留优先级最高的
    const imageModelMap = new Map<string, ModelOption>();
    allImageModels.forEach((model) => {
      if (!imageModelMap.has(model.modelName)) {
        imageModelMap.set(model.modelName, model);
      }
    });
    imageModels.value = Array.from(imageModelMap.values());

    // 设置默认选择（优先级最高的�?
    if (textModels.value.length > 0 && !selectedTextModel.value) {
      selectedTextModel.value = textModels.value[0].modelName;
    }
    if (imageModels.value.length > 0 && !selectedImageModel.value) {
      // 优先选择包含 nano 的模�?
      const nanoModel = imageModels.value.find((m) =>
        m.modelName.toLowerCase().includes("nano"),
      );
      selectedImageModel.value = nanoModel
        ? nanoModel.modelName
        : imageModels.value[0].modelName;
    }

    // 验证已选择的模型是否还在可用列表中，如果不在则重置为默认�?
    const availableTextModelNames = textModels.value.map((m) => m.modelName);
    const availableImageModelNames = imageModels.value.map((m) => m.modelName);

    if (
      selectedTextModel.value &&
      !availableTextModelNames.includes(selectedTextModel.value)
    ) {
      console.warn(
        `��ѡ����ı�ģ�� ${selectedTextModel.value} ���ڿ����б��У�����ΪĬ��ֵ`,
      );
      selectedTextModel.value =
        textModels.value.length > 0 ? textModels.value[0].modelName : "";
      // 更新 localStorage
      if (selectedTextModel.value) {
        localStorage.setItem(
          `ai_text_model_${dramaId}`,
          selectedTextModel.value,
        );
      }
    }

    if (
      selectedImageModel.value &&
      !availableImageModelNames.includes(selectedImageModel.value)
    ) {
      console.warn(
        `��ѡ���ͼƬģ�� ${selectedImageModel.value} ���ڿ����б��У�����ΪĬ��ֵ`,
      );
      // 优先选择包含 nano 的模�?
      const nanoModel = imageModels.value.find((m) =>
        m.modelName.toLowerCase().includes("nano"),
      );
      selectedImageModel.value =
        imageModels.value.length > 0
          ? nanoModel
            ? nanoModel.modelName
            : imageModels.value[0].modelName
          : "";
      // 更新 localStorage
      if (selectedImageModel.value) {
        localStorage.setItem(
          `ai_image_model_${dramaId}`,
          selectedImageModel.value,
        );
      }
    }
  } catch (error: any) {
    console.error("加载AI配置失败:", error);
  }
};

// 显示模型配置对话�?
const showModelConfigDialog = () => {
  modelConfigDialogVisible.value = true;
  loadAIConfigs();
};

// 保存模型配置
const saveModelConfig = () => {
  if (!selectedTextModel.value || !selectedImageModel.value) {
    ElMessage.warning($t("workflow.pleaseSelectModels"));
    return;
  }

  // 保存模型名称到localStorage
  localStorage.setItem(`ai_text_model_${dramaId}`, selectedTextModel.value);
  localStorage.setItem(`ai_image_model_${dramaId}`, selectedImageModel.value);

  ElMessage.success($t("workflow.modelConfigSaved"));
  modelConfigDialogVisible.value = false;
};

const nextStep = () => {
  if (currentStep.value < 3) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

// 从localStorage加载已保存的模型配置
const loadSavedModelConfig = () => {
  const savedTextModel = localStorage.getItem(`ai_text_model_${dramaId}`);
  const savedImageModel = localStorage.getItem(`ai_image_model_${dramaId}`);

  if (savedTextModel) {
    selectedTextModel.value = savedTextModel;
  }
  if (savedImageModel) {
    selectedImageModel.value = savedImageModel;
  }
};

const loadDramaData = async () => {
  try {
    const data = await dramaAPI.get(dramaId);
    drama.value = data;

    scriptContent.value = currentEpisode.value?.script_content || "";

    if (!hasScript.value) {
            // ���û�о籾���ݣ����õ���һ��
      currentStep.value = 0;
    }

    // 检查是否有生成中的角色或场景，自动启动轮询
    await checkAndStartPolling();
  } catch (error: any) {
    ElMessage.error(error.message || "加载项目数据失败");
  }
};

// 检查并启动轮询
const checkAndStartPolling = async () => {
  if (!currentEpisode.value) return;

  // 检查角色的生成状�?
  for (const char of currentEpisode.value.characters || []) {
    if (
      char.image_generation_status === "pending" ||
      char.image_generation_status === "processing"
    ) {
      // 查找对应的image_generation记录
      try {
        const imageGenList = await imageAPI.listImages({
          drama_id: dramaId,
          status: char.image_generation_status as any,
        });

        // 找到这个角色的image_generation记录
        const charImageGen = imageGenList.items.find(
          (img) =>
            img.character_id === char.id &&
            (img.status === "pending" || img.status === "processing"),
        );

        if (charImageGen) {
          // 启动轮询
          generatingCharacterImages.value[char.id] = true;
          pollImageStatus(charImageGen.id, async () => {
            await loadDramaData();
            ElMessage.success(`${char.name}的图片生成完成！`);
          }).finally(() => {
            generatingCharacterImages.value[char.id] = false;
          });
        }
      } catch (error) {
        console.error("[轮询] 查询角色图片生成记录失败:", error);
      }
    }
  }

  // 检查场景的生成状�?
  for (const scene of currentEpisode.value.scenes || []) {
    if (
      scene.image_generation_status === "pending" ||
      scene.image_generation_status === "processing"
    ) {
      // 查找对应的image_generation记录
      try {
        const imageGenList = await imageAPI.listImages({
          drama_id: dramaId,
          status: scene.image_generation_status as any,
        });

        // 找到这个场景的image_generation记录
        const sceneImageGen = imageGenList.items.find(
          (img) =>
            img.scene_id === scene.id &&
            (img.status === "pending" || img.status === "processing"),
        );

        if (sceneImageGen) {
          // 启动轮询
          generatingSceneImages.value[scene.id] = true;
          pollImageStatus(sceneImageGen.id, async () => {
            await loadDramaData();
            ElMessage.success(`${scene.location}的图片生成完成！`);
          }).finally(() => {
            generatingSceneImages.value[scene.id] = false;
          });
        }
      } catch (error) {
        console.error("[轮询] 查询场景图片生成记录失败:", error);
      }
    }
  }
};

const saveChapterScript = async () => {
  if (!scriptContent.value.trim()) {
    return;
  }

  generatingScript.value = true;
  try {
    const existingEpisodes = drama.value?.episodes || [];

    // 查找当前章节
    const episodeIndex = existingEpisodes.findIndex(
      (ep) => ep.episode_number === episodeNumber,
    );

    let updatedEpisodes;
    if (episodeIndex >= 0) {
      // 更新已有章节
      updatedEpisodes = [...existingEpisodes];
      updatedEpisodes[episodeIndex] = {
        ...updatedEpisodes[episodeIndex],
        script_content: scriptContent.value,
      };
    } else {
      // 创建新章�?
      const newEpisode = {
        episode_number: episodeNumber,
        title: $t("workflow.chapterTitle", { number: episodeNumber }),
        script_content: scriptContent.value,
      };
      updatedEpisodes = [...existingEpisodes, newEpisode];
    }

    await dramaAPI.saveEpisodes(dramaId, updatedEpisodes);
    ElMessage.success($t("workflow.chapterSavedSuccess"));
    await loadDramaData();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    generatingScript.value = false;
  }
};

const editCurrentEpisodeScript = () => {
  scriptContent.value = currentEpisode.value?.script_content || "";
};

const handleExtractCharactersAndBackgrounds = async () => {
  // 如果已经提取过，显示确认对话�?
  if (hasExtractedData.value) {
    try {
      await ElMessageBox.confirm(
        $t("workflow.reExtractConfirmMessage"),
        $t("workflow.reExtractConfirmTitle"),
        {
          confirmButtonText: $t("common.confirm"),
          cancelButtonText: $t("common.cancel"),
          type: "warning",
          distinguishCancelAndClose: true,
        },
      );
    } catch {
      ElMessage.info($t("workflow.extractCancelled"));
      return;
    }
  }

  // 显示即将开始的提示
  if (hasExtractedData.value) {
    ElMessage.info($t("workflow.startReExtracting"));
  }

  await extractCharactersAndBackgrounds();
};

// 轮询检查图片生成状�?
const pollImageStatus = async (
  imageGenId: number,
  onComplete: () => Promise<void>,
) => {
  const maxAttempts = 100; // 最多轮�?00�?
  const pollInterval = 6000; // �?秒轮询一�?

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const imageGen = await imageAPI.getImage(imageGenId);

      if (imageGen.status === "completed") {
        // 生成成功
        await onComplete();
        return;
      } else if (imageGen.status === "failed") {
        // 生成失败
        ElMessage.error(`图片生成失败: ${imageGen.error_msg || "未知错误"}`);
        return;
      }
      // 如果是pending或processing，继续轮�?
    } catch (error: any) {
      console.error("[轮询] 检查图片状态失�?", error);
      // 继续轮询，不中断
    }
  }

  // 超时
  ElMessage.warning("图片生成超时，请稍后刷新页面查看结果");
};

const extractCharactersAndBackgrounds = async () => {
  if (!currentEpisode.value?.id) {
    ElMessage.error("�½���Ϣ������");
    return;
  }

  extractingCharactersAndBackgrounds.value = true;

  try {
    const episodeId = currentEpisode.value.id;

    // 并行创建异步任务
    const [characterTask, backgroundTask] = await Promise.all([
      generationAPI.generateCharacters({
        drama_id: dramaId.toString(),
        episode_id: Number(episodeId),
        outline: currentEpisode.value.script_content || "",
        count: 0,
        model: selectedTextModel.value, // 传递用户选择的文本模�?
      }),
      dramaAPI.extractBackgrounds(
        episodeId.toString(),
        selectedTextModel.value,
      ), // 传递用户选择的文本模�?
    ]);

    ElMessage.success($t("workflow.extractTaskCreated"));

    // 并行轮询两个任务
    await Promise.all([
      pollExtractTask(characterTask.task_id, "character"),
      pollExtractTask(backgroundTask.task_id, "background"),
    ]);

    ElMessage.success($t("workflow.charactersAndScenesExtractSuccess"));
    await loadDramaData();
  } catch (error: any) {
    console.error($t("workflow.charactersAndScenesExtractFailed") + ":", error);

    const errorData = error.response?.data?.error;
    const errorMsg = errorData?.message || error.message || "提取失败";

    if (
      errorMsg.includes("no config found") ||
      errorMsg.includes("AI client") ||
      errorMsg.includes("failed to get AI client")
    ) {
      ElMessage({
        type: "warning",
        message: '未配置AI服务，请前往"设置 > AI服务配置"添加文本生成服务',
        duration: 5000,
        showClose: true,
      });
    } else {
      ElMessage.error(errorMsg);
    }
  } finally {
    extractingCharactersAndBackgrounds.value = false;
  }
};

// 轮询提取任务状�?
const pollExtractTask = async (
  taskId: string,
  type: "character" | "background",
) => {
  const maxAttempts = 60; // 最多轮�?0次（2分钟�?
  const interval = 2000; // �?秒查询一�?

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    try {
      const task = await generationAPI.getTaskStatus(taskId);

      if (task.status === "completed") {
        // 任务完成
        if (type === "character" && task.result) {
          // 解析角色数据并保�?
          const result =
            typeof task.result === "string"
              ? JSON.parse(task.result)
              : task.result;
          if (result.characters && result.characters.length > 0) {
            await dramaAPI.saveCharacters(
              dramaId,
              result.characters,
              currentEpisode.value?.id,
            );
          }
        }
        return;
      } else if (task.status === "failed") {
        // 任务失败
        throw new Error(
          task.error ||
            (type === "character"
              ? $t("workflow.characterGenerationFailed")
              : $t("workflow.sceneExtractionFailed")),
        );
      }
      // 否则继续轮询
    } catch (error: any) {
      console.error(`轮询${type}任务状态失�?`, error);
      throw error;
    }
  }

  throw new Error(
    type === "character"
      ? $t("workflow.characterGenerationTimeout")
      : $t("workflow.sceneExtractionTimeout"),
  );
};

const generateCharacterImage = async (characterId: number) => {
  generatingCharacterImages.value[characterId] = true;

  try {
    // 获取用户选择的图片生成模�?
    const model = selectedImageModel.value || undefined;
    const response = await characterLibraryAPI.generateCharacterImage(
      characterId.toString(),
      model,
    );
    const imageGenId = response.image_generation?.id;

    if (imageGenId) {
      ElMessage.info("角色图片生成中，请稍�?..");
      // 轮询检查生成状�?
      await pollImageStatus(imageGenId, async () => {
        await loadDramaData();
        ElMessage.success($t("workflow.characterImageComplete"));
      });
    } else {
      ElMessage.success($t("workflow.characterImageStarted"));
      await loadDramaData();
    }
  } catch (error: any) {
    ElMessage.error(error.message || "生成失败");
  } finally {
    generatingCharacterImages.value[characterId] = false;
  }
};

const toggleSelectAllCharacters = () => {
  if (selectAllCharacters.value) {
    selectedCharacterIds.value =
      currentEpisode.value?.characters?.map((char) => char.id) || [];
  } else {
    selectedCharacterIds.value = [];
  }
};

const toggleSelectAllScenes = () => {
  if (selectAllScenes.value) {
      selectedSceneIds.value =
        currentEpisode.value?.scenes?.map((scene) => Number(scene.id)) || [];
  } else {
    selectedSceneIds.value = [];
  }
};

const batchGenerateCharacterImages = async () => {
  if (selectedCharacterIds.value.length === 0) {
    ElMessage.warning("请先选择要生成的角色");
    return;
  }

  batchGeneratingCharacters.value = true;
  try {
    // 获取用户选择的图片生成模�?
    const model = selectedImageModel.value || undefined;

    // 使用批量生成API
    await characterLibraryAPI.batchGenerateCharacterImages(
      selectedCharacterIds.value.map((id) => id.toString()),
      model,
    );

    ElMessage.success($t("workflow.batchTaskSubmitted"));
    await loadDramaData();
  } catch (error: any) {
    ElMessage.error(error.message || $t("workflow.batchGenerateFailed"));
  } finally {
    batchGeneratingCharacters.value = false;
  }
};

const generateSceneImage = async (sceneId: string) => {
  generatingSceneImages.value[sceneId] = true;

  try {
    // 获取用户选择的图片生成模�?
    const model = selectedImageModel.value || undefined;
    const response = await dramaAPI.generateSceneImage({
      scene_id: parseInt(sceneId),
      model,
    });
    const imageGenId = response.image_generation?.id;

    if (imageGenId) {
      ElMessage.info($t("workflow.sceneImageGenerating"));
      // 轮询检查生成状�?
      await pollImageStatus(imageGenId, async () => {
        await loadDramaData();
        ElMessage.success($t("workflow.sceneImageComplete"));
      });
    } else {
      ElMessage.success($t("workflow.sceneImageStarted"));
      await loadDramaData();
    }
  } catch (error: any) {
    ElMessage.error(error.message || "生成失败");
  } finally {
    generatingSceneImages.value[sceneId] = false;
  }
};

const batchGenerateSceneImages = async () => {
  if (selectedSceneIds.value.length === 0) {
    ElMessage.warning("请先选择要生成的场景");
    return;
  }

  batchGeneratingScenes.value = true;
  try {
    const promises = selectedSceneIds.value.map((sceneId) =>
      generateSceneImage(sceneId.toString()),
    );
    const results = await Promise.allSettled(promises);

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.filter((r) => r.status === "rejected").length;

    if (failCount === 0) {
      ElMessage.success(
        $t("workflow.batchCompleteSuccess", { count: successCount }),
      );
    } else {
      ElMessage.warning(
        $t("workflow.batchCompletePartial", {
          success: successCount,
          fail: failCount,
        }),
      );
    }
  } catch (error: any) {
    ElMessage.error(error.message || $t("workflow.batchGenerateFailed"));
  } finally {
    batchGeneratingScenes.value = false;
  }
};

const taskProgress = ref(0);
const taskMessage = ref("");
let pollTimer: any = null;

const generateShots = async () => {
  if (generatingShots.value) {
    return;
  }

  if (!currentEpisode.value?.id) {
    ElMessage.error("�½���Ϣ������");
    return;
  }

  generatingShots.value = true;
  taskProgress.value = 0;
  taskMessage.value = "初始化任�?..";

  try {
    const episodeId = currentEpisode.value.id.toString();

    // 【调试日志】输出当前操作的集数信息
    console.log("=== 开始生成分�?===");
    console.log("当前 episodeNumber (路由参数):", episodeNumber);
    console.log("当前 episodeId (�?currentEpisode 获取):", episodeId);
    console.log("currentEpisode 完整信息:", {
      id: currentEpisode.value?.id,
      episode_number: currentEpisode.value?.episode_number,
      title: currentEpisode.value?.title,
    });
    console.log(
      "所有剧集列�?",
      drama.value?.episodes?.map((ep) => ({
        id: ep.id,
        episode_number: ep.episode_number,
        title: ep.title,
      })),
    );

    // 创建异步任务
    const response = await generationAPI.generateStoryboard(
      episodeId,
      selectedTextModel.value,
    );

    taskMessage.value = response.message || "�����Ѵ���";

    // 开始轮询任务状�?
    await pollTaskStatus(response.task_id);
  } catch (error: any) {
    ElMessage.error(error.message || "拆分失败");
    generatingShots.value = false;
  }
};

const pollTaskStatus = async (taskId: string) => {
  const checkStatus = async (): Promise<boolean> => {
    try {
      const task = await generationAPI.getTaskStatus(taskId);

      taskProgress.value = task.progress;
      taskMessage.value = task.message || `处理�?.. ${task.progress}%`;

      if (task.status === "completed") {
        // 任务完成
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        generatingShots.value = false;

        ElMessage.success($t("workflow.splitSuccess"));

        // 跳转到专业编辑器页面
        router.push({
          name: "ProfessionalEditor",
          params: {
            dramaId: dramaId,
            episodeNumber: episodeNumber,
          },
        });
        return true;
      } else if (task.status === "failed") {
        // 任务失败
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        generatingShots.value = false;
        const failReason =
          task.message ||
          task.error ||
          (typeof task.result === "string" ? task.result : "") ||
          "分镜拆分失败";
        ElMessage.error(failReason);
        return true;
      }

      // 否则继续轮询
      return false;
    } catch (error: any) {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      generatingShots.value = false;
      ElMessage.error("查询任务状态失�? " + error.message);
      return true;
    }
  };

  // 立即检查一�?
  const done = await checkStatus();
  if (done) {
    return;
  }

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  // �?秒轮询一�?
  pollTimer = setInterval(async () => {
    const finished = await checkStatus();
    if (finished && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }, 2000);
};

const regenerateShots = async () => {
  await ElMessageBox.confirm($t("workflow.reSplitConfirm"), $t("common.tip"), {
    type: "warning",
  });

  await generateShots();
};

const shotEditDialogVisible = ref(false);
const editingShot = ref<any>(null);
const editingShotIndex = ref<number>(-1);
const savingShot = ref(false);

const editShot = (shot: any, index: number) => {
  editingShot.value = { ...shot };
  editingShotIndex.value = index;
  shotEditDialogVisible.value = true;
};

const saveShotEdit = async () => {
  if (!editingShot.value) return;

  try {
    savingShot.value = true;

    // 调用API更新镜头
    await dramaAPI.updateStoryboard(
      editingShot.value.id.toString(),
      editingShot.value,
    );

    // 更新本地数据
    if (currentEpisode.value?.storyboards) {
      currentEpisode.value.storyboards[editingShotIndex.value] = {
        ...editingShot.value,
      };
    }

    ElMessage.success($t("workflow.shotUpdated"));
    shotEditDialogVisible.value = false;
  } catch (error: any) {
    ElMessage.error("保存失败: " + (error.message || "未知错误"));
  } finally {
    savingShot.value = false;
  }
};

// 对话框相关方�?
const openPromptDialog = (item: any, type: "character" | "scene") => {
  currentEditItem.value = item;
  currentEditItem.value.name = item.name || item.location;
  currentEditType.value = type;
  editPrompt.value = item.prompt || item.appearance || item.description || "";
  promptDialogVisible.value = true;
};

const savePrompt = async () => {
  try {
    if (currentEditType.value === "character") {
      await characterLibraryAPI.updateCharacter(currentEditItem.value.id, {
        appearance: editPrompt.value,
      });
      await generateCharacterImage(currentEditItem.value.id);
    } else {
      // 保存场景提示词和时间（合并到一�?API 调用�?
      await dramaAPI.updateScene(currentEditItem.value.id.toString(), {
        prompt: editPrompt.value,
        time: currentEditItem.value.time || "",
      });

      ElMessage.success($t("workflow.promptSaved"));
      await loadDramaData();
    }
    promptDialogVisible.value = false;
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  }
};

const uploadCharacterImage = (characterId: number) => {
  currentUploadTarget.value = { id: characterId, type: "character" };
  uploadDialogVisible.value = true;
};

const uploadSceneImage = (sceneId: string) => {
  currentUploadTarget.value = { id: sceneId, type: "scene" };
  uploadDialogVisible.value = true;
};

const selectFromLibrary = async (characterId: number) => {
  try {
    const result = await characterLibraryAPI.list({ page_size: 50 });
    libraryItems.value = result.items || [];
    currentUploadTarget.value = characterId;
    libraryDialogVisible.value = true;
  } catch (error: any) {
    ElMessage.error(error.message || $t("workflow.loadLibraryFailed"));
  }
};

const addToCharacterLibrary = async (character: any) => {
  if (!character.image_url) {
    ElMessage.warning($t("workflow.generateImageFirst"));
    return;
  }

  try {
    await ElMessageBox.confirm(
      $t("workflow.addToLibraryConfirm", { name: character.name }),
      $t("workflow.addToLibrary"),
      {
        confirmButtonText: $t("common.confirm"),
        cancelButtonText: $t("common.cancel"),
        type: "info",
      },
    );

    await characterLibraryAPI.addCharacterToLibrary(character.id.toString());
    ElMessage.success($t("workflow.addedToLibrary"));
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error.message || $t("workflow.addFailed"));
    }
  }
};

const selectLibraryItem = async (item: any) => {
  try {
    if (currentUploadTarget.value?.type === "character") {
      await characterLibraryAPI.applyFromLibrary(
        currentUploadTarget.value.id.toString(),
        item.id,
      );
      ElMessage.success($t("workflow.characterApplied"));
      await loadDramaData();
      libraryDialogVisible.value = false;
    }
  } catch (error: any) {
    ElMessage.error(error.message || "应用失败");
  }
};

const handleUploadSuccess = async (response: any) => {
  try {
    const imageUrl = response.url || response.data?.url;
    const localPath = response.local_path || response.data?.local_path;

    if (!imageUrl && !localPath) {
      ElMessage.error("上传失败：未获取到图片地址");
      return;
    }

    if (currentUploadTarget.value?.type === "character") {
      await characterLibraryAPI.updateCharacter(
        currentUploadTarget.value.id.toString(),
        {
          image_url: imageUrl,
          local_path: localPath,
        },
      );
      ElMessage.success($t("workflow.uploadSuccess"));
    } else if (currentUploadTarget.value?.type === "scene") {
      // 更新场景图片
      await dramaAPI.updateScene(currentUploadTarget.value.id.toString(), {
        image_url: imageUrl,
        local_path: localPath,
      });
      ElMessage.success($t("workflow.sceneImageUploadSuccess"));
    }

    await loadDramaData();
    uploadDialogVisible.value = false;
  } catch (error: any) {
    ElMessage.error(error.message || "上传失败");
  }
};

const handleUploadError = () => {
  ElMessage.error("上传失败，请重试");
};

const deleteCharacter = async (characterId: number) => {
  try {
    await ElMessageBox.confirm(
      $t("workflow.deleteCharacterConfirm"),
      $t("workflow.deleteConfirmTitle"),
      {
        type: "warning",
        confirmButtonText: $t("workflow.confirmButtonText"),
        cancelButtonText: $t("workflow.cancelButtonText"),
      },
    );

    await characterLibraryAPI.deleteCharacter(characterId);
    ElMessage.success($t("workflow.characterDeleted"));
    await loadDramaData();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error.message || "删除失败");
    }
  }
};

const goToProfessionalUI = () => {
  if (!currentEpisode.value?.id) {
    ElMessage.error("�½���Ϣ������");
    return;
  }

  router.push({
    name: "ProfessionalEditor",
    params: {
      dramaId: dramaId,
      episodeNumber: episodeNumber,
    },
  });
};

const goToCompose = () => {
  if (!currentEpisode.value?.id) {
    ElMessage.error("�½���Ϣ������");
    return;
  }

  router.push({
    name: "SceneComposition",
    params: {
      id: dramaId,
      episodeId: currentEpisode.value.id,
    },
  });
};

// 打开添加场景对话�?
const openAddSceneDialog = () => {
  newScene.value = {
    location: "",
    time: "",
    prompt: "",
    image_url: "",
    local_path: "",
  };
  addSceneDialogVisible.value = true;
};

// 保存场景
const saveScene = async () => {
  if (!newScene.value.location) {
    ElMessage.warning($t("workflow.pleaseEnterSceneName"));
    return;
  }

  if (!currentEpisode.value?.id) {
    ElMessage.error($t("workflow.chapterInfoNotExist"));
    return;
  }

  try {
    // 创建场景，关联到当前章节
    await dramaAPI.createScene({
      drama_id: parseInt(dramaId),
      episode_id: parseInt(currentEpisode.value.id),
      location: newScene.value.location,
      time: newScene.value.time || "",
      prompt: newScene.value.prompt,
      image_url: newScene.value.image_url,
      local_path: newScene.value.local_path,
    });

    ElMessage.success($t("workflow.sceneAddSuccess"));
    addSceneDialogVisible.value = false;

    // 重新加载数据以更新场景列�?
    await loadDramaData();
  } catch (error: any) {
    ElMessage.error(error.message || $t("workflow.sceneAddFailed"));
  }
};

// 处理场景图片上传成功
const handleSceneImageSuccess = (response: any) => {
  console.log("场景图片上传响应:", response);

  // 处理不同的响应结�?
  const imageUrl = response.url || response.data?.url;
  const localPath = response.local_path || response.data?.local_path;

  if (imageUrl) {
    newScene.value.image_url = imageUrl;
  }
  if (localPath) {
    newScene.value.local_path = localPath;
  }

  console.log("更新后的 newScene:", newScene.value);

  if (imageUrl || localPath) {
    ElMessage.success($t("workflow.imageUploadSuccess"));
  } else {
    ElMessage.warning($t("workflow.imageUploadSuccessNoUrl"));
  }
};

// 图片上传前的校验
const beforeAvatarUpload = (file: File) => {
  const isImage = file.type.startsWith("image/");
  const isLt10M = file.size / 1024 / 1024 < 10;

  if (!isImage) {
    ElMessage.error("只能上传图片文件!");
    return false;
  }
  if (!isLt10M) {
    ElMessage.error("图片大小不能超过 10MB!");
    return false;
  }
  return true;
};

// 打开从剧本提取场景对话框
const openExtractSceneDialog = () => {
  extractScenesDialogVisible.value = true;
};

// 从剧本提取场�?
const handleExtractScenes = async () => {
  if (!currentEpisode.value?.id) {
    ElMessage.error($t("workflow.chapterInfoNotExist"));
    return;
  }

  try {
    extractingScenes.value = true;
    await dramaAPI.extractBackgrounds(currentEpisode.value.id.toString());

    ElMessage.success($t("workflow.sceneExtractSubmitted"));
    extractScenesDialogVisible.value = false;

    // 自动刷新几次
    let checkCount = 0;
    const maxChecks = 5;
    const checkInterval = setInterval(async () => {
      checkCount++;
      await loadDramaData();

      if (checkCount >= maxChecks) {
        clearInterval(checkInterval);
      }
    }, 3000);
  } catch (error: any) {
    ElMessage.error(error.message || $t("workflow.sceneExtractFailed"));
  } finally {
    extractingScenes.value = false;
  }
};

// 监听步骤变化，保存到 localStorage
watch(currentStep, (newStep) => {
  localStorage.setItem(getStepStorageKey(), newStep.toString());
});

onMounted(() => {
  loadDramaData();
  loadSavedModelConfig();
  loadAIConfigs();
});

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});
</script>

<style scoped lang="scss">
/* ========================================
   Page Layout / 页面布局 - 紧凑边距
   ======================================== */
.page-container {
  min-height: 100vh;
  background: var(--bg-primary);
  // padding: var(--space-2) var(--space-3);
  transition: background var(--transition-normal);
}

@media (min-width: 768px) {
  .page-container {
    // padding: var(--space-3) var(--space-4);
  }
}

@media (min-width: 1024px) {
  .page-container {
    // padding: var(--space-4) var(--space-5);
  }
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin: 0 auto;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.content-container {
  height: calc(100% - 134px);
  overflow-y: auto;
}

.actions-container {
  height: 70px;
  background: var(--bg-card);
  overflow: hidden;
}

/* Header styles matching PageHeader component */
.page-header {
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-primary);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-shrink: 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;

  &:hover {
    background: var(--bg-card-hover);
    color: var(--text-primary);
    border-color: var(--border-secondary);
  }
}

.nav-divider {
  width: 1px;
  height: 2rem;
  background: var(--border-primary);
}

.header-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.025em;
  line-height: 1.2;
  white-space: nowrap;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.header-right {
  flex-shrink: 0;
}

.workflow-card {
  height: calc(100% - 24px);
  margin: 12px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-primary);

  :deep(.el-card__body) {
    padding: 0;
  }
}

.custom-steps {
  display: flex;
  align-items: center;
  gap: 12px;

  .step-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 20px;
    background: var(--bg-card-hover);
    transition: all 0.3s;

    &.active {
      background: var(--accent-light);

      .step-circle {
        background: var(--accent);
        color: var(--text-inverse);
      }
    }

    &.current {
      background: var(--accent);
      color: var(--text-inverse);

      .step-circle {
        background: var(--bg-card);
        color: var(--accent);
      }

      .step-text {
        color: var(--text-inverse);
      }
    }

    .step-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--border-secondary);
      color: var(--text-secondary);
      font-weight: 600;
      transition: all 0.3s;
    }

    .step-text {
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
    }
  }

  .step-arrow {
    color: var(--border-secondary);
  }
}

.stage-card {
  margin: 12px;

  &.stage-card-fullscreen {
    .stage-body-fullscreen {
      min-height: calc(100vh - 200px);
    }
  }
}

.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .header-info {
      h2 {
        margin: 0 0 4px 0;
        font-size: 20px;
      }

      p {
        margin: 0;
        color: var(--text-muted);
        font-size: 14px;
      }
    }
  }
}

.stage-body {
  background: var(--bg-card);
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin: 12px 0;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.action-buttons-inline {
  display: flex;
  gap: 12px;
}

.script-textarea {
  margin: 16px 0;

  &.script-textarea-fullscreen {
    :deep(textarea) {
      min-height: 500px;
      font-size: 14px;
      line-height: 1.8;
    }
  }
}

.image-gen-section {
  margin-bottom: 32px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 16px;
    background: var(--bg-secondary);
    // border-radius: 8px;
    // border: 1px solid var(--border-primary);

    .section-title {
      display: flex;
      align-items: center;
      gap: 16px;

      h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);

        .el-icon {
          color: var(--accent);
          font-size: 18px;
        }
      }

      .el-alert {
        border-radius: 4px;
      }
    }

    .section-actions {
      display: flex;
      align-items: center;
    }
  }
}

.empty-shots {
  padding: 60px 0;
  text-align: center;
}

.extracted-title {
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.secondary-text {
  color: var(--text-muted);
  margin-left: 4px;
}

.task-message {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.model-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.fixed-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-card);
  transition: all 0.2s;

  &:hover {
    box-shadow: var(--shadow-card-hover);
  }

  :deep(.el-card__body) {
    flex: 1;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .card-header {
    padding: 14px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-left {
      flex: 1;
      min-width: 0;

      h4 {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .el-tag {
        margin-top: 0;
      }
    }
  }

  .card-image-container {
    flex: 1;
    width: 100%;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary);

    .char-image,
    .scene-image {
      width: 100%;
      height: 100%;
      position: relative;
      z-index: 1;

      .el-image {
        width: 100%;
        height: 100%;
        border-radius: 0;
      }
    }

    .char-placeholder,
    .scene-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      padding: 20px;

      &.generating {
        color: var(--warning);
        background: var(--warning-light);

        .rotating {
          animation: rotating 2s linear infinite;
        }
      }

      &.failed {
        color: var(--error);
        background: var(--error-light);
      }
      position: relative;
      z-index: 1;

      .el-icon {
        opacity: 0.5;
      }

      span {
        margin-top: 10px;
        font-size: 12px;
      }
    }
  }

  .card-actions {
    padding: 10px;
    background: var(--bg-card);
    border-top: 1px solid var(--border-primary);
    display: flex;
    justify-content: center;
    gap: 8px;

    .el-button {
      margin: 0;
    }
  }
}

.character-image-list,
.scene-image-list {
  padding: 5px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 16px;

  .character-item,
  .scene-item {
    min-height: 360px;
  }
}

// 角色库选择对话�?
.library-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding: 8px;

  .library-item {
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s;

    &:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }

    .el-image {
      width: 100%;
      height: 150px;
    }

    .library-item-name {
      padding: 8px;
      text-align: center;
      font-size: 12px;
      background: var(--bg-secondary);
      color: var(--text-primary);
    }
  }
}

.empty-library {
  padding: 40px 0;
}

// 上传区域
.upload-area {
  :deep(.el-upload-dragger) {
    width: 100%;
    height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
}

// 旋转动画
@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ========================================
   Dark Mode / 深色模式
   ======================================== */
:deep(.el-card) {
  background: var(--bg-card);
  border-color: var(--border-primary);
}

:deep(.el-card__header) {
  background: var(--bg-secondary);
  border-color: var(--border-primary);
}

:deep(.el-table) {
  --el-table-bg-color: var(--bg-card);
  --el-table-header-bg-color: var(--bg-secondary);
  --el-table-tr-bg-color: var(--bg-card);
  --el-table-row-hover-bg-color: var(--bg-card-hover);
  --el-table-border-color: var(--border-primary);
  --el-table-text-color: var(--text-primary);
  background: var(--bg-card);
}

:deep(.el-table th.el-table__cell),
:deep(.el-table td.el-table__cell) {
  background: var(--bg-card);
  border-color: var(--border-primary);
}

:deep(
  .el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell
) {
  background: var(--bg-secondary);
}

:deep(.el-table__header-wrapper th) {
  background: var(--bg-secondary) !important;
  color: var(--text-secondary);
}

:deep(.el-dialog) {
  background: var(--bg-card);
}

:deep(.el-dialog__header) {
  background: var(--bg-card);
}

:deep(.el-form-item__label) {
  color: var(--text-primary);
}

:deep(.el-input__wrapper) {
  background: var(--bg-secondary);
  box-shadow: 0 0 0 1px var(--border-primary) inset;
}

:deep(.el-input__inner) {
  color: var(--text-primary);
}

:deep(.el-textarea__inner) {
  background: var(--bg-secondary);
  color: var(--text-primary);
  box-shadow: 0 0 0 1px var(--border-primary) inset;
}

:deep(.el-select-dropdown) {
  background: var(--bg-elevated);
  border-color: var(--border-primary);
}

:deep(.el-upload-dragger) {
  background: var(--bg-secondary);
  border-color: var(--border-primary);
}
</style>




