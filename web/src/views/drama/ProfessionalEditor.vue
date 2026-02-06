<template>
  <div class="professional-editor">
    <!-- 顶部工具栏 -->
    <AppHeader
      :fixed="false"
      :show-logo="false"
      @config-updated="loadVideoModels"
    >
      <template #left>
        <el-button text @click="goBack" class="back-btn">
          <el-icon>
            <ArrowLeft />
          </el-icon>
          <span>{{ $t("editor.backToEpisode") }}</span>
        </el-button>
        <span class="episode-title"
          >{{ drama?.title }} -
          {{ $t("editor.episode", { number: episodeNumber }) }}</span
        >
      </template>
    </AppHeader>

    <!-- 主编辑区域 -->
    <div class="editor-main">
      <!-- 左侧分镜列表 -->
      <div class="storyboard-panel">
        <div class="panel-header">
          <h3>{{ $t("storyboard.scriptStructure") }}</h3>
          <el-button text :icon="Plus" @click="handleAddStoryboard">{{
            $t("storyboard.add")
          }}</el-button>
        </div>

        <div class="storyboard-list">
          <div
            v-for="(shot, index) in storyboards"
            :key="shot.id"
            class="storyboard-item"
            :class="{ active: currentStoryboardId === shot.id }"
            @click="selectStoryboard(shot.id)"
          >
            <div class="shot-content">
              <div class="shot-header">
                <div class="shot-title-row">
                  <span class="shot-number">{{
                    $t("storyboard.shotNumber", {
                      number: shot.storyboard_number,
                    })
                  }}</span>
                  <span class="shot-title">{{
                    shot.title || $t("storyboard.untitled")
                  }}</span>
                </div>
                <div class="shot-actions">
                  <span class="shot-duration">{{ shot.duration }}s</span>
                  <el-button
                    link
                    type="danger"
                    :icon="Delete"
                    @click.stop="handleDeleteStoryboard(shot)"
                    class="delete-btn"
                  />
                </div>
              </div>
              <div class="shot-action" v-if="shot.action">
                {{ shot.action }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间时间线编辑区域 -->
      <div class="timeline-area">
        <VideoTimelineEditor
          ref="timelineEditorRef"
          v-if="storyboards.length > 0"
          :scenes="storyboards"
          :episode-id="episodeId.toString()"
          :drama-id="dramaId.toString()"
          :assets="videoAssets"
          @select-scene="handleTimelineSelect"
          @asset-deleted="loadVideoAssets"
          @merge-completed="handleMergeCompleted"
        />
        <el-empty
          v-else
          :description="$t('storyboard.noStoryboard')"
          class="empty-timeline"
        />
      </div>

      <!-- 右侧编辑面板 -->
      <div class="edit-panel">
        <el-tabs v-model="activeTab" class="edit-tabs">
          <!-- 镜头属性标签 -->
          <el-tab-pane
            :label="$t('storyboard.shotProperties')"
            name="shot"
            v-if="currentStoryboard"
          >
            <div v-if="currentStoryboard" class="shot-editor-new">
              <!-- 场景(Scene) -->
              <div class="scene-section">
                <div class="section-label">
                  {{ $t("storyboard.scene") }} (Scene)
                  <el-button
                    size="small"
                    text
                    @click="showSceneSelector = true"
                    >{{ $t("storyboard.selectScene") }}</el-button
                  >
                </div>
                <div
                  class="scene-preview"
                  v-if="hasImage(currentStoryboard.background)"
                  @click="showSceneImage"
                >
                  <img
                    :src="getImageUrl(currentStoryboard.background)"
                    alt="场景"
                    style="cursor: pointer"
                  />
                  <div class="scene-info">
                    <div>
                      {{ currentStoryboard.background.location }} ·
                      {{ currentStoryboard.background.time }}
                    </div>
                    <div class="scene-id">
                      {{ $t("editor.sceneId") }}:
                      {{ currentStoryboard.scene_id || "N/A" }}
                    </div>
                  </div>
                </div>
                <div class="scene-preview-empty" v-else>
                  <el-icon :size="48" color="#666">
                    <Picture />
                  </el-icon>
                  <div>
                    {{
                      currentStoryboard.background
                        ? $t("editor.sceneGenerating")
                        : $t("editor.noBackground")
                    }}
                  </div>
                </div>
              </div>

              <!-- 登场角色(Cast) -->
              <div class="cast-section">
                <div class="section-label">
                  {{ $t("editor.cast") }} (Cast)
                  <el-button
                    size="small"
                    text
                    :icon="Plus"
                    @click="showCharacterSelector = true"
                    >{{ $t("editor.addCharacter") }}</el-button
                  >
                </div>
                <div class="cast-list">
                  <div
                    v-for="char in currentStoryboardCharacters"
                    :key="char.id"
                    class="cast-item active"
                  >
                    <div class="cast-avatar" @click="showCharacterImage(char)">
                      <img
                        v-if="hasImage(char)"
                        :src="getImageUrl(char)"
                        :alt="char.name"
                      />
                      <span v-else>{{ char.name?.[0] || "?" }}</span>
                    </div>
                    <div class="cast-name">{{ char.name }}</div>
                    <div
                      class="cast-remove"
                      @click.stop="toggleCharacterInShot(char.id)"
                      :title="$t('editor.removeCharacter')"
                    >
                      <el-icon :size="14">
                        <Close />
                      </el-icon>
                    </div>
                  </div>
                  <div
                    v-if="
                      !currentStoryboard?.characters ||
                      currentStoryboard.characters.length === 0
                    "
                    class="cast-empty"
                  >
                    {{ $t("editor.noCharacters") }}
                  </div>
                </div>
              </div>

              <!-- 道具(Props) -->
              <div class="cast-section">
                <div class="section-label">
                  {{ $t("editor.props") }} (Props)
                  <el-button
                    size="small"
                    text
                    :icon="Plus"
                    @click="showPropSelector = true"
                    >{{ $t("editor.addProp") }}</el-button
                  >
                </div>
                <div class="cast-list">
                  <div
                    v-for="prop in currentStoryboardProps"
                    :key="prop.id"
                    class="cast-item active"
                  >
                    <div class="cast-avatar">
                      <img
                        v-if="hasImage(prop)"
                        :src="getImageUrl(prop)"
                        :alt="prop.name"
                      />
                      <el-icon v-else>
                        <Box />
                      </el-icon>
                    </div>
                    <div class="cast-name">{{ prop.name }}</div>
                    <div
                      class="cast-remove"
                      @click.stop="togglePropInShot(prop.id)"
                      title="移除道具"
                    >
                      <el-icon :size="14">
                        <Close />
                      </el-icon>
                    </div>
                  </div>
                  <div
                    v-if="
                      !currentStoryboardProps ||
                      currentStoryboardProps.length === 0
                    "
                    class="cast-empty"
                  >
                    {{ $t("editor.noProps") }}
                  </div>
                </div>
              </div>

              <!-- 视效设置 -->
              <div class="settings-section">
                <div class="section-label">
                  {{ $t("editor.visualSettings") }}
                </div>
                <div class="settings-grid">
                  <div class="setting-item">
                    <label>{{ $t("editor.shotType") }}</label>
                    <el-select
                      v-model="currentStoryboard.shot_type"
                      clearable
                      :placeholder="$t('editor.shotTypePlaceholder')"
                      @change="saveStoryboardField('shot_type')"
                    >
                      <el-option label="大远景" value="大远景" />
                      <el-option label="远景" value="远景" />
                      <el-option label="全景" value="全景" />
                      <el-option label="中全景" value="中全景" />
                      <el-option label="中景" value="中景" />
                      <el-option label="中近景" value="中近景" />
                      <el-option label="近景" value="近景" />
                      <el-option label="特写" value="特写" />
                      <el-option label="大特写" value="大特写" />
                    </el-select>
                  </div>

                  <div class="setting-item">
                    <label>{{ $t("editor.movement") }}</label>
                    <el-select
                      v-model="currentStoryboard.movement"
                      clearable
                      :placeholder="$t('editor.movementPlaceholder')"
                      @change="saveStoryboardField('movement')"
                    >
                      <el-option label="固定镜头" value="固定镜头" />
                      <el-option label="推镜" value="推镜" />
                      <el-option label="拉镜" value="拉镜" />
                      <el-option label="摇镜" value="摇镜" />
                      <el-option label="移镜" value="移镜" />
                      <el-option label="跟镜" value="跟镜" />
                      <el-option label="升降镜头" value="升降镜头" />
                      <el-option label="环绕" value="环绕" />
                      <el-option label="甩镜" value="甩镜" />
                      <el-option label="变焦" value="变焦" />
                      <el-option label="手持晃动" value="手持晃动" />
                      <el-option label="稳定器运动" value="稳定器运动" />
                      <el-option label="轨道推拉" value="轨道推拉" />
                      <el-option label="航拍" value="航拍" />
                    </el-select>
                  </div>

                  <div class="setting-item">
                    <label>{{ $t("editor.angle") }}</label>
                    <el-select
                      v-model="currentStoryboard.angle"
                      clearable
                      :placeholder="$t('editor.anglePlaceholder')"
                      @change="saveStoryboardField('angle')"
                    >
                      <el-option label="平视" value="平视" />
                      <el-option label="俯视" value="俯视" />
                      <el-option label="仰视" value="仰视" />
                      <el-option
                        label="大俯视（鸟瞰）"
                        value="大俯视（鸟瞰）"
                      />
                      <el-option label="大仰视" value="大仰视" />
                      <el-option label="正侧面" value="正侧面" />
                      <el-option label="斜侧面" value="斜侧面" />
                      <el-option label="背面" value="背面" />
                      <el-option
                        label="倾斜（荷兰角）"
                        value="倾斜（荷兰角）"
                      />
                      <el-option label="主观视角" value="主观视角" />
                      <el-option label="过肩" value="过肩" />
                    </el-select>
                  </div>
                </div>
              </div>

              <!-- 叙事内容 -->
              <div class="narrative-section">
                <div class="section-label">
                  {{ $t("editor.action") }} (Action)
                </div>
                <el-input
                  v-model="currentStoryboard.action"
                  type="textarea"
                  :rows="3"
                  :placeholder="$t('editor.actionPlaceholder')"
                  @blur="saveStoryboardField('action')"
                />
              </div>

              <div class="narrative-section">
                <div class="section-label">
                  {{ $t("editor.result") }} (Result)
                </div>
                <el-input
                  v-model="currentStoryboard.result"
                  type="textarea"
                  :rows="2"
                  :placeholder="$t('editor.resultPlaceholder')"
                  @blur="saveStoryboardField('result')"
                />
              </div>

              <div class="dialogue-section">
                <div class="section-label">
                  {{ $t("editor.dialogue") }} (Dialogue)
                </div>
                <el-input
                  v-model="currentStoryboard.dialogue"
                  type="textarea"
                  :rows="3"
                  :placeholder="$t('editor.dialoguePlaceholder')"
                  @blur="saveStoryboardField('dialogue')"
                />
              </div>

              <div class="narrative-section">
                <div class="section-label">
                  {{ $t("editor.description") }} (Description)
                </div>
                <el-input
                  v-model="currentStoryboard.description"
                  type="textarea"
                  :rows="3"
                  :placeholder="$t('editor.descriptionPlaceholder')"
                  @blur="saveStoryboardField('description')"
                />
              </div>

              <!-- 音效设置 -->
              <div class="settings-section">
                <div class="section-label">{{ $t("editor.soundEffects") }}</div>
                <div class="audio-controls">
                  <el-input
                    v-model="currentStoryboard.sound_effect"
                    :placeholder="$t('editor.soundEffectsPlaceholder')"
                    size="small"
                    type="textarea"
                    :rows="2"
                    @blur="saveStoryboardField('sound_effect')"
                  />
                </div>
              </div>

              <!-- 配乐设置 -->
              <div class="settings-section">
                <div class="section-label">{{ $t("editor.bgmPrompt") }}</div>
                <div class="audio-controls">
                  <el-input
                    v-model="currentStoryboard.bgm_prompt"
                    :placeholder="$t('editor.bgmPromptPlaceholder')"
                    size="small"
                    type="textarea"
                    :rows="2"
                    @blur="saveStoryboardField('bgm_prompt')"
                  />
                </div>
              </div>

              <!-- 氛围设置 -->
              <div class="settings-section">
                <div class="section-label">{{ $t("editor.atmosphere") }}</div>
                <div class="audio-controls">
                  <el-input
                    v-model="currentStoryboard.atmosphere"
                    :placeholder="$t('editor.atmospherePlaceholder')"
                    size="small"
                    type="textarea"
                    :rows="2"
                    @blur="saveStoryboardField('atmosphere')"
                  />
                </div>
              </div>
            </div>
            <el-empty v-else :description="$t('editor.noShotSelected')" />
          </el-tab-pane>

          <!-- 图片生成标签 -->
          <el-tab-pane :label="$t('editor.shotImage')" name="image">
            <div class="tab-content" v-if="currentStoryboard">
              <div class="image-generation-section">
                <!-- 帧类型选择 -->
                <div class="frame-type-selector">
                  <div class="section-label">
                    {{ $t("editor.selectFrameType") }}
                  </div>
                  <el-radio-group v-model="selectedFrameType" size="small">
                    <el-radio-button label="first">{{
                      $t("editor.firstFrame")
                    }}</el-radio-button>
                    <el-radio-button label="last">{{
                      $t("editor.lastFrame")
                    }}</el-radio-button>
                    <!-- <el-radio-button label="panel">{{
                      $t("editor.panelFrame")
                    }}</el-radio-button> -->
                    <el-radio-button label="action">{{
                      $t("editor.actionSequence")
                    }}</el-radio-button>
                    <el-radio-button label="key">{{
                      $t("editor.keyFrame")
                    }}</el-radio-button>
                  </el-radio-group>
                  <el-input-number
                    v-if="selectedFrameType === 'panel'"
                    v-model="panelCount"
                    :min="2"
                    :max="6"
                    size="small"
                    class="panel-count-input"
                    style="margin-left: 10px; margin-top: 12px"
                  />
                  <span
                    v-if="selectedFrameType === 'panel'"
                    class="panel-count-label"
                    >{{ $t("editor.panelCount") }}</span
                  >
                </div>

                <!-- 提示词区域 -->
                <div class="prompt-section">
                  <div class="section-label">
                    {{ $t("editor.prompt") }}
                    <el-button
                      size="small"
                      type="primary"
                      :disabled="
                        isGeneratingPrompt(
                          currentStoryboard?.id,
                          selectedFrameType,
                        )
                      "
                      :loading="
                        isGeneratingPrompt(
                          currentStoryboard?.id,
                          selectedFrameType,
                        )
                      "
                      @click="extractFramePrompt"
                      style="margin-left: 10px"
                    >
                      {{ $t("editor.extractPrompt") }}
                    </el-button>
                  </div>
                  <el-input
                    v-model="currentFramePrompt"
                    type="textarea"
                    :rows="8"
                    :placeholder="$t('editor.promptPlaceholder')"
                  />
                </div>

                <!-- 生成控制 -->
                <div class="generation-controls">
                  <el-button
                    type="success"
                    :icon="MagicStick"
                    :loading="generatingImage"
                    :disabled="!currentFramePrompt"
                    @click="generateFrameImage"
                  >
                    {{
                      generatingImage
                        ? $t("editor.generating")
                        : $t("editor.generateImage")
                    }}
                  </el-button>
                  <el-button :icon="Upload" @click="uploadImage">{{
                    $t("editor.uploadImage")
                  }}</el-button>
                </div>

                <!-- 生成结果 -->
                <div
                  class="generation-result"
                  v-if="
                    generatedImages.length > 0 || selectedFrameType === 'action'
                  "
                >
                  <div class="section-label">
                    {{ $t("editor.generationResult") }} ({{
                      generatedImages.length
                    }})
                  </div>
                  <div class="image-grid">
                    <!-- 动作序列入口按钮 -->
                    <div
                      v-if="selectedFrameType === 'action'"
                      class="image-item grid-entry-button"
                      @click="showGridEditor = true"
                    >
                      <div class="grid-entry-placeholder">
                        <el-icon :size="28" style="color: #ccc">
                          <Plus />
                        </el-icon>
                      </div>
                      <!-- <div class="image-info">
                        <span class="frame-type-tag">{{
                          $t("editor.createGridImage")
                          }}</span>
                      </div> -->
                    </div>
                    <div
                      v-for="img in generatedImages"
                      :key="img.id"
                      class="image-item-wrapper"
                    >
                      <div
                        class="image-item"
                        :class="{
                          'action-image-item': img.frame_type === 'action',
                        }"
                      >
                        <el-image
                          v-if="hasImage(img)"
                          :src="getImageUrl(img)"
                          :preview-src-list="
                            generatedImages
                              .filter((i) => hasImage(i))
                              .map((i) => getImageUrl(i)!)
                          "
                          :initial-index="
                            generatedImages
                              .filter((i) => i.image_url)
                              .findIndex((i) => i.id === img.id)
                          "
                          fit="cover"
                          preview-teleported
                        />
                        <div v-else class="image-placeholder">
                          <el-icon :size="32">
                            <Picture />
                          </el-icon>
                          <p>{{ getStatusText(img.status) }}</p>
                        </div>
                        <div class="image-actions" v-if="hasImage(img)">
                          <!-- 动作序列图片裁剪图标 -->
                          <div
                            v-if="img.frame_type === 'action' && hasImage(img)"
                            class="crop-icon-overlay"
                            @click.stop="openCropDialog(img)"
                          >
                            <el-icon :size="18" color="var(--text-primary)">
                              <Crop />
                            </el-icon>
                          </div>
                          <div v-else></div>
                          <!-- 删除按钮 -->
                          <div
                            v-if="hasImage(img)"
                            class="delete-icon-overlay"
                            @click.stop="handleDeleteImage(img)"
                          >
                            <el-icon :size="18" color="red">
                              <DeleteFilled />
                            </el-icon>
                          </div>
                        </div>
                      </div>
                      <!-- <div class="image-status">
                                                <el-tag :type="getStatusType(img.status)" size="small">{{
                                                    getStatusText(img.status)
                                                }}</el-tag>
                                            </div> -->
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else description="未选择镜头" />
          </el-tab-pane>

          <!-- 视频生成标签 -->
          <el-tab-pane :label="$t('video.videoGeneration')" name="video">
            <div class="tab-content" v-if="currentStoryboard">
              <div class="video-generation-section">
                <!-- 生成提示词展示 -->
                <div class="video-prompt-box">
                  {{ currentStoryboard.video_prompt || "暂无提示词" }}
                </div>

                <!-- 视频参数设置 -->
                <div class="video-params-section">
                  <div class="param-row">
                    <span class="param-label">{{ $t("video.model") }}</span>
                    <el-select
                      v-model="selectedVideoModel"
                      :placeholder="$t('video.selectVideoModel')"
                      size="default"
                      style="flex: 1"
                    >
                      <el-option
                        v-for="model in videoModelCapabilities"
                        :key="model.id"
                        :label="model.name"
                        :value="model.id"
                      >
                        <div
                          style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                          "
                        >
                          <span>{{ model.name }}</span>
                          <div class="model-tags">
                            <el-tag
                              v-if="model.supportMultipleImages"
                              size="small"
                              type="success"
                              style="margin-left: 4px"
                              >多图</el-tag
                            >
                            <el-tag
                              v-if="model.supportFirstLastFrame"
                              size="small"
                              type="primary"
                              style="margin-left: 4px"
                              >首尾帧</el-tag
                            >
                            <el-tag
                              size="small"
                              type="info"
                              style="margin-left: 4px"
                              >最多{{ model.maxImages }}张</el-tag
                            >
                          </div>
                        </div>
                      </el-option>
                    </el-select>
                  </div>

                  <!-- 参考图模式选择 -->
                  <div
                    v-if="
                      selectedVideoModel && availableReferenceModes.length > 0
                    "
                    class="param-row"
                  >
                    <span class="param-label">参考图</span>
                    <el-select
                      v-model="selectedReferenceMode"
                      placeholder="请选择参考图模式"
                      size="default"
                      style="flex: 1"
                    >
                      <el-option
                        v-for="mode in availableReferenceModes"
                        :key="mode.value"
                        :label="mode.label"
                        :value="mode.value"
                      >
                        <div
                          style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                          "
                        >
                          <span>{{ mode.label }}</span>
                          <span
                            v-if="mode.description"
                            class="mode-description"
                            >{{ mode.description }}</span
                          >
                        </div>
                      </el-option>
                    </el-select>
                  </div>

                  <div class="param-row">
                    <span class="param-label">{{
                      $t("professionalEditor.duration")
                    }}</span>
                    <div style="flex: 1; display: flex; align-items: center">
                      <el-slider
                        v-model="videoDuration"
                        :min="4"
                        :max="10"
                        :step="1"
                        show-stops
                        style="flex: 1"
                      />
                      <span style="margin-left: 10px; min-width: 40px"
                        >{{ videoDuration
                        }}{{ $t("professionalEditor.seconds") }}</span
                      >
                    </div>
                  </div>
                </div>

                <!-- 选择参考图片 -->
                <div
                  v-if="
                    selectedReferenceMode && selectedReferenceMode !== 'none'
                  "
                  class="reference-images-section"
                  style="margin-top: 0"
                >
                  <div
                    class="frame-type-buttons"
                    style="text-align: center; margin-bottom: 8px"
                  >
                    <el-radio-group
                      v-model="selectedVideoFrameType"
                      size="default"
                    >
                      <el-radio-button label="first">首帧</el-radio-button>
                      <el-radio-button label="last">尾帧</el-radio-button>
                      <!-- <el-radio-button label="panel">分镜板</el-radio-button> -->
                      <el-radio-button label="action">动作序列</el-radio-button>
                      <el-radio-button label="key">关键帧</el-radio-button>
                    </el-radio-group>
                  </div>

                  <div class="frame-type-content">
                    <!-- 首帧 -->
                    <div
                      v-show="selectedVideoFrameType === 'first'"
                      class="image-scroll-container"
                      style="
                        max-height: 280px;
                        overflow-y: auto;
                        overflow-x: hidden;
                      "
                    >
                      <!-- 上一镜头尾帧推荐（紧凑版） -->
                      <div
                        v-if="previousStoryboardLastFrames.length > 0"
                        class="previous-frame-section"
                      >
                        <div
                          style="
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            margin-bottom: 6px;
                          "
                        >
                          <el-tag size="small" type="primary">
                            上一镜头 #{{
                              previousStoryboard?.storyboard_number
                            }}
                            尾帧
                          </el-tag>
                          <span class="hint-text">点击添加为首帧参考</span>
                        </div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap">
                          <div
                            v-for="img in previousStoryboardLastFrames"
                            :key="'prev-' + img.id"
                            class="reference-item"
                            :class="{
                              selected: selectedImagesForVideo.includes(img.id),
                            }"
                            style="
                              position: relative;
                              border: 2px solid #1890ff;
                              border-radius: 4px;
                              overflow: hidden;
                              cursor: pointer;
                            "
                            @click="selectPreviousLastFrame(img)"
                          >
                            <el-image
                              :src="getImageUrl(img)"
                              fit="cover"
                              style="
                                width: 60px;
                                height: 40px;
                                display: block;
                                pointer-events: none;
                              "
                            />
                            <div
                              v-if="selectedImagesForVideo.includes(img.id)"
                              style="
                                position: absolute;
                                top: 0;
                                right: 0;
                                background: #52c41a;
                                color: #fff;
                                font-size: 10px;
                                padding: 1px 4px;
                              "
                            >
                              ✓
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- 当前镜头首帧列表 -->
                      <div
                        class="reference-grid"
                        style="
                          display: grid;
                          grid-template-columns: repeat(4, 1fr);
                          gap: 12px;
                          max-width: 600px;
                        "
                      >
                        <div
                          v-for="img in videoReferenceImages.filter(
                            (i) =>
                              i.status === 'completed' &&
                              i.image_url &&
                              i.frame_type === 'first',
                          )"
                          :key="img.id"
                          class="reference-item"
                          :class="{
                            selected: selectedImagesForVideo.includes(img.id),
                          }"
                          style="position: relative"
                          @click="handleImageSelect(img.id)"
                        >
                          <el-image
                            :src="getImageUrl(img)"
                            fit="cover"
                            style="
                              max-width: 120px;
                              width: 100%;
                              display: block;
                              pointer-events: none;
                            "
                          />
                          <div
                            class="preview-icon"
                            @click.stop="previewImage(getImageUrl(img))"
                            style="
                              position: absolute;
                              top: 4px;
                              right: 4px;
                              width: 24px;
                              height: 24px;
                              background: rgba(0, 0, 0, 0.6);
                              border-radius: 4px;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              cursor: pointer;
                              z-index: 10;
                            "
                          >
                            <el-icon :size="14" color="#fff">
                              <ZoomIn />
                            </el-icon>
                          </div>
                        </div>
                      </div>
                      <el-empty
                        v-if="
                          !videoReferenceImages.some(
                            (i) =>
                              i.status === 'completed' &&
                              i.image_url &&
                              i.frame_type === 'first',
                          ) && previousStoryboardLastFrames.length === 0
                        "
                        description="暂无首帧图片"
                        size="small"
                      />
                    </div>

                    <!-- 关键帧 -->
                    <div
                      v-show="selectedVideoFrameType === 'key'"
                      class="image-scroll-container"
                      style="
                        max-height: 280px;
                        overflow-y: auto;
                        overflow-x: hidden;
                      "
                    >
                      <div
                        class="reference-grid"
                        style="
                          display: grid;
                          grid-template-columns: repeat(4, 1fr);
                          gap: 12px;
                          max-width: 600px;
                        "
                      >
                        <div
                          v-for="img in videoReferenceImages.filter(
                            (i) =>
                              i.status === 'completed' &&
                              i.image_url &&
                              i.frame_type === 'key',
                          )"
                          :key="img.id"
                          class="reference-item"
                          :class="{
                            selected: selectedImagesForVideo.includes(img.id),
                          }"
                          style="position: relative"
                          @click="handleImageSelect(img.id)"
                        >
                          <el-image
                            :src="getImageUrl(img)"
                            fit="cover"
                            style="
                              max-width: 120px;
                              width: 100%;
                              display: block;
                              pointer-events: none;
                            "
                          />
                          <div
                            class="preview-icon"
                            @click.stop="previewImage(getImageUrl(img))"
                            style="
                              position: absolute;
                              top: 4px;
                              right: 4px;
                              width: 24px;
                              height: 24px;
                              background: rgba(0, 0, 0, 0.6);
                              border-radius: 4px;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              cursor: pointer;
                              z-index: 10;
                            "
                          >
                            <el-icon :size="14" color="#fff">
                              <ZoomIn />
                            </el-icon>
                          </div>
                        </div>
                      </div>
                      <el-empty
                        v-if="
                          !videoReferenceImages.some(
                            (i) =>
                              i.status === 'completed' &&
                              i.image_url &&
                              i.frame_type === 'key',
                          )
                        "
                        description="暂无关键帧图片"
                        size="small"
                      />
                    </div>

                    <!-- 尾帧 -->
                    <div
                      v-show="selectedVideoFrameType === 'last'"
                      class="image-scroll-container"
                      style="
                        max-height: 280px;
                        overflow-y: auto;
                        overflow-x: hidden;
                      "
                    >
                      <div
                        class="reference-grid"
                        style="
                          display: grid;
                          grid-template-columns: repeat(4, 1fr);
                          gap: 12px;
                          max-width: 600px;
                        "
                      >
                        <div
                          v-for="img in videoReferenceImages.filter(
                            (i) =>
                              i.status === 'completed' &&
                              i.image_url &&
                              i.frame_type === 'last',
                          )"
                          :key="img.id"
                          class="reference-item"
                          :class="{
                            selected: selectedImagesForVideo.includes(img.id),
                          }"
                          style="position: relative"
                          @click="handleImageSelect(img.id)"
                        >
                          <el-image
                            :src="getImageUrl(img)"
                            fit="cover"
                            style="
                              max-width: 120px;
                              width: 100%;
                              display: block;
                              pointer-events: none;
                            "
                          />
                          <div
                            class="preview-icon"
                            @click.stop="previewImage(getImageUrl(img))"
                            style="
                              position: absolute;
                              top: 4px;
                              right: 4px;
                              width: 24px;
                              height: 24px;
                              background: rgba(0, 0, 0, 0.6);
                              border-radius: 4px;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              cursor: pointer;
                              z-index: 10;
                            "
                          >
                            <el-icon :size="14" color="#fff">
                              <ZoomIn />
                            </el-icon>
                          </div>
                        </div>
                      </div>
                      <el-empty
                        v-if="
                          !videoReferenceImages.some(
                            (i) =>
                              i.status === 'completed' &&
                              i.image_url &&
                              i.frame_type === 'last',
                          )
                        "
                        description="暂无尾帧图片"
                        size="small"
                      />
                    </div>

                    <!-- 分镜板 -->
                    <div
                      v-show="selectedVideoFrameType === 'panel'"
                      class="image-scroll-container"
                      style="
                        max-height: 280px;
                        overflow-y: auto;
                        overflow-x: hidden;
                      "
                    >
                      <div
                        class="reference-grid"
                        style="
                          display: grid;
                          grid-template-columns: repeat(4, 1fr);
                          gap: 12px;
                          max-width: 600px;
                        "
                      >
                        <div
                          v-for="img in videoReferenceImages.filter(
                            (i) =>
                              i.status === 'completed' &&
                              i.image_url &&
                              i.frame_type === 'panel',
                          )"
                          :key="img.id"
                          class="reference-item"
                          :class="{
                            selected: selectedImagesForVideo.includes(img.id),
                          }"
                          style="position: relative"
                          @click="handleImageSelect(img.id)"
                        >
                          <el-image
                            :src="getImageUrl(img)"
                            fit="cover"
                            style="
                              max-width: 120px;
                              width: 100%;
                              display: block;
                              pointer-events: none;
                            "
                          />
                          <div
                            class="preview-icon"
                            @click.stop="previewImage(getImageUrl(img))"
                            style="
                              position: absolute;
                              top: 4px;
                              right: 4px;
                              width: 24px;
                              height: 24px;
                              background: rgba(0, 0, 0, 0.6);
                              border-radius: 4px;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              cursor: pointer;
                              z-index: 10;
                            "
                          >
                            <el-icon :size="14" color="#fff">
                              <ZoomIn />
                            </el-icon>
                          </div>
                        </div>
                      </div>
                      <el-empty
                        v-if="
                          !videoReferenceImages.some(
                            (i) =>
                              i.status === 'completed' &&
                              i.image_url &&
                              i.frame_type === 'panel',
                          )
                        "
                        description="暂无分镜板图片"
                        size="small"
                      />
                    </div>

                    <!-- 动作序列 -->
                    <div
                      v-show="selectedVideoFrameType === 'action'"
                      class="image-scroll-container"
                      style="
                        max-height: 280px;
                        overflow-y: auto;
                        overflow-x: hidden;
                      "
                    >
                      <div
                        class="reference-grid"
                        style="
                          display: grid;
                          grid-template-columns: repeat(4, 1fr);
                          gap: 12px;
                          max-width: 600px;
                        "
                      >
                        <div
                          v-for="img in videoReferenceImages.filter(
                            (i) =>
                              i.status === 'completed' &&
                              i.image_url &&
                              i.frame_type === 'action',
                          )"
                          :key="img.id"
                          class="reference-item"
                          :class="{
                            selected: selectedImagesForVideo.includes(img.id),
                          }"
                          style="position: relative"
                          @click="handleImageSelect(img.id)"
                        >
                          <el-image
                            :src="getImageUrl(img)"
                            fit="cover"
                            style="
                              max-width: 120px;
                              width: 100%;
                              display: block;
                              pointer-events: none;
                            "
                          />
                          <div
                            class="preview-icon"
                            @click.stop="previewImage(getImageUrl(img))"
                            style="
                              position: absolute;
                              top: 4px;
                              right: 4px;
                              width: 24px;
                              height: 24px;
                              background: rgba(0, 0, 0, 0.6);
                              border-radius: 4px;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              cursor: pointer;
                              z-index: 10;
                            "
                          >
                            <el-icon :size="14" color="#fff">
                              <ZoomIn />
                            </el-icon>
                          </div>
                        </div>
                      </div>
                      <el-empty
                        v-if="
                          !videoReferenceImages.some(
                            (i) =>
                              i.status === 'completed' &&
                              i.image_url &&
                              i.frame_type === 'action',
                          )
                        "
                        description="暂无动作序列图片"
                        size="small"
                      />
                    </div>
                  </div>
                </div>

                <!-- 参考图片设置 -->
                <div
                  v-if="
                    selectedReferenceMode && selectedReferenceMode !== 'none'
                  "
                  class="reference-config-section"
                  style="margin-top: 24px"
                >
                  <!-- 图片框配置区 -->
                  <div
                    class="image-slots-container"
                    style="margin-top: 16px; margin-bottom: 24px"
                  >
                    <!-- 单图模式 -->
                    <div
                      v-if="selectedReferenceMode === 'single'"
                      style="text-align: center"
                    >
                      <div class="reference-mode-title">单图参考</div>
                      <div style="display: inline-block">
                        <div
                          class="image-slot"
                          @click="
                            selectedImagesForVideo.length > 0 &&
                            removeSelectedImage(selectedImagesForVideo[0])
                          "
                        >
                          <img
                            v-if="selectedImageObjects[0]"
                            :src="getImageUrl(selectedImageObjects[0])"
                            alt=""
                            style="width: 100%; height: 100%; object-fit: cover"
                          />
                          <div v-else class="image-slot-placeholder">
                            <el-icon :size="32" color="#c0c4cc">
                              <Plus />
                            </el-icon>
                            <div class="slot-hint">点击上方选择图片</div>
                          </div>
                          <div
                            v-if="selectedImageObjects[0]"
                            class="image-slot-remove"
                          >
                            <el-icon :size="16" color="#fff">
                              <Close />
                            </el-icon>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 首尾帧模式 -->
                    <div
                      v-else-if="selectedReferenceMode === 'first_last'"
                      style="text-align: center"
                    >
                      <div class="reference-mode-title">首尾帧</div>
                      <div
                        style="
                          display: flex;
                          gap: 20px;
                          justify-content: center;
                          align-items: center;
                        "
                      >
                        <div>
                          <div class="frame-label">首帧</div>
                          <div
                            class="image-slot"
                            @click="
                              firstFrameSlotImage &&
                              removeSelectedImage(firstFrameSlotImage.id)
                            "
                          >
                            <img
                              v-if="firstFrameSlotImage"
                              :src="firstFrameSlotImage.image_url"
                              alt=""
                              style="
                                width: 100%;
                                height: 100%;
                                object-fit: cover;
                              "
                            />
                            <div v-else class="image-slot-placeholder">
                              <el-icon :size="32" color="#c0c4cc">
                                <Plus />
                              </el-icon>
                              <div class="slot-hint">选择首帧</div>
                            </div>
                            <div
                              v-if="firstFrameSlotImage"
                              class="image-slot-remove"
                            >
                              <el-icon :size="16" color="#fff">
                                <Close />
                              </el-icon>
                            </div>
                          </div>
                        </div>
                        <el-icon :size="24" color="#909399">
                          <Right />
                        </el-icon>
                        <div>
                          <div class="frame-label">尾帧</div>
                          <div
                            class="image-slot"
                            @click="
                              lastFrameSlotImage &&
                              removeSelectedImage(lastFrameSlotImage.id)
                            "
                          >
                            <img
                              v-if="lastFrameSlotImage"
                              :src="lastFrameSlotImage.image_url"
                              alt=""
                              style="
                                width: 100%;
                                height: 100%;
                                object-fit: cover;
                              "
                            />
                            <div v-else class="image-slot-placeholder">
                              <el-icon :size="32" color="#c0c4cc">
                                <Plus />
                              </el-icon>
                              <div class="slot-hint">选择尾帧</div>
                            </div>
                            <div
                              v-if="lastFrameSlotImage"
                              class="image-slot-remove"
                            >
                              <el-icon :size="16" color="#fff">
                                <Close />
                              </el-icon>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 多图模式 -->
                    <div
                      v-else-if="selectedReferenceMode === 'multiple'"
                      style="text-align: center"
                    >
                      <div
                        style="
                          margin-bottom: 12px;
                          font-size: 13px;
                          color: #606266;
                          font-weight: 500;
                        "
                      >
                        多图参考 ({{ selectedImagesForVideo.length }}/{{
                          currentModelCapability?.maxImages || 6
                        }})
                      </div>
                      <div
                        style="
                          display: flex;
                          gap: 12px;
                          justify-content: center;
                          flex-wrap: wrap;
                        "
                      >
                        <div
                          v-for="index in currentModelCapability?.maxImages ||
                          6"
                          :key="index"
                          class="image-slot image-slot-small"
                          style="
                            position: relative;
                            width: 80px;
                            height: 52px;
                            border: 2px dashed #dcdfe6;
                            border-radius: 8px;
                            overflow: hidden;
                            cursor: pointer;
                            background: #fff;
                          "
                          @click="
                            selectedImageObjects[index - 1] &&
                            removeSelectedImage(
                              selectedImageObjects[index - 1].id,
                            )
                          "
                        >
                          <img
                            v-if="selectedImageObjects[index - 1]"
                            :src="selectedImageObjects[index - 1].image_url"
                            alt=""
                            style="width: 100%; height: 100%; object-fit: cover"
                          />
                          <div v-else class="image-slot-placeholder">
                            <el-icon :size="20" color="#c0c4cc">
                              <Plus />
                            </el-icon>
                            <div
                              style="
                                margin-top: 4px;
                                font-size: 10px;
                                color: #909399;
                              "
                            >
                              {{ index }}
                            </div>
                          </div>
                          <div
                            v-if="selectedImageObjects[index - 1]"
                            class="image-slot-remove"
                          >
                            <el-icon :size="14" color="#fff">
                              <Close />
                            </el-icon>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 生成控制 -->
                <div
                  class="generation-controls"
                  style="margin-top: 32px; text-align: center"
                >
                  <el-button
                    type="primary"
                    :icon="VideoCamera"
                    :loading="generatingVideo"
                    :disabled="
                      !selectedVideoModel ||
                      (selectedReferenceMode !== 'none' &&
                        selectedImagesForVideo.length === 0)
                    "
                    @click="generateVideo"
                  >
                    {{ generatingVideo ? "生成中..." : "生成视频" }}
                  </el-button>
                </div>

                <!-- 生成的视频列表 -->
                <div
                  class="generation-result"
                  v-if="generatedVideos.length > 0"
                  style="margin-top: 24px"
                >
                  <div
                    class="section-label"
                    style="
                      font-size: 13px;
                      font-weight: 600;
                      margin-bottom: 12px;
                      display: flex;
                      align-items: center;
                      gap: 6px;
                    "
                  >
                    <span></span>
                    生成结果 ({{ generatedVideos.length }})
                  </div>
                  <div class="image-grid">
                    <div
                      v-for="video in generatedVideos"
                      :key="video.id"
                      class="image-item-wrapper"
                    >
                      <div class="image-item video-item">
                        <div
                          v-if="video.video_url"
                          class="video-thumbnail"
                          @click="playVideo(video)"
                        >
                          <video :src="getVideoUrl(video)" preload="metadata" />
                          <div class="play-overlay">
                            <el-icon :size="40" color="#fff">
                              <VideoPlay />
                            </el-icon>
                          </div>
                        </div>
                        <div v-else class="image-placeholder">
                          <el-icon :size="32">
                            <VideoCamera />
                          </el-icon>
                          <p>{{ getStatusText(video.status) }}</p>
                        </div>
                        <!-- 视频操作按钮 -->
                        <div class="video-actions">
                          <div
                            v-if="video.status === 'completed'"
                            class="add-to-assets-button"
                            @click.stop="addVideoToAssets(video)"
                          >
                            <el-icon
                              :size="18"
                              color="var(--text-primary)"
                              v-if="!addingToAssets.has(video.id)"
                            >
                              <FolderAdd />
                            </el-icon>
                            <el-icon
                              :size="18"
                              color="var(--text-primary)"
                              v-else
                              class="is-loading"
                            >
                              <Loading />
                            </el-icon>
                          </div>
                          <div v-else></div>
                          <!-- 删除按钮 -->
                          <div
                            class="delete-video-button"
                            @click.stop="handleDeleteVideo(video)"
                          >
                            <el-icon :size="18" color="red">
                              <DeleteFilled />
                            </el-icon>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else description="未选择镜头" />
          </el-tab-pane>

          <!-- 音效与配乐标签 -->
          <el-tab-pane :label="$t('video.soundAndMusicTab')" name="audio">
            <div class="tab-content">
              <el-empty :description="$t('video.soundMusicInDev')" />
            </div>
          </el-tab-pane>

          <!-- 视频合成列表标签 -->
          <el-tab-pane :label="$t('video.videoMerge')" name="merges">
            <div class="tab-content">
              <div class="merges-list" v-loading="loadingMerges">
                <el-empty
                  v-if="videoMerges.length === 0"
                  :description="$t('video.noMergeRecords')"
                  :image-size="120"
                >
                  <template #description>
                    <div
                      style="color: #909399; font-size: 14px; margin-top: 12px"
                    >
                      <p style="margin: 0">{{ $t("video.noMergeYet") }}</p>
                      <p style="margin: 8px 0 0 0; font-size: 12px">
                        {{ $t("video.mergeInstructions") }}
                      </p>
                    </div>
                  </template>
                </el-empty>
                <div v-else class="merge-items">
                  <div
                    v-for="merge in videoMerges"
                    :key="merge.id"
                    class="merge-item"
                    :class="'merge-status-' + merge.status"
                  >
                    <!-- 状态指示条 -->
                    <div class="status-indicator"></div>

                    <!-- 主要内容区域 -->
                    <div class="merge-content">
                      <!-- 标题和状态 -->
                      <div class="merge-header">
                        <div class="title-section">
                          <el-icon :size="20" class="title-icon">
                            <VideoCamera v-if="merge.status === 'completed'" />
                            <Loading
                              v-else-if="merge.status === 'processing'"
                              class="rotating"
                            />
                            <WarningFilled
                              v-else-if="merge.status === 'failed'"
                            />
                            <Clock v-else />
                          </el-icon>
                          <h3 class="merge-title">{{ merge.title }}</h3>
                        </div>
                        <el-tag
                          :type="
                            merge.status === 'completed'
                              ? 'success'
                              : merge.status === 'failed'
                                ? 'danger'
                                : 'warning'
                          "
                          effect="dark"
                          size="large"
                          round
                        >
                          {{
                            merge.status === "pending"
                              ? "等待中"
                              : merge.status === "processing"
                                ? "合成中"
                                : merge.status === "completed"
                                  ? "已完成"
                                  : "失败"
                          }}
                        </el-tag>
                      </div>

                      <!-- 详细信息网格 -->
                      <div class="merge-details">
                        <div class="detail-item">
                          <div class="detail-icon">
                            <el-icon :size="16">
                              <Timer />
                            </el-icon>
                          </div>
                          <div class="detail-content">
                            <div class="detail-label">
                              {{ $t("professionalEditor.videoDuration") }}
                            </div>
                            <div class="detail-value">
                              {{
                                merge.duration
                                  ? `${merge.duration}
                              ${$t("professionalEditor.seconds")}`
                                  : "-"
                              }}
                            </div>
                          </div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-icon">
                            <el-icon :size="16">
                              <Calendar />
                            </el-icon>
                          </div>
                          <div class="detail-content">
                            <div class="detail-label">创建时间</div>
                            <div class="detail-value">
                              {{ formatDateTime(merge.created_at) }}
                            </div>
                          </div>
                        </div>
                        <div class="detail-item" v-if="merge.completed_at">
                          <div class="detail-icon">
                            <el-icon :size="16">
                              <Check />
                            </el-icon>
                          </div>
                          <div class="detail-content">
                            <div class="detail-label">完成时间</div>
                            <div class="detail-value">
                              {{ formatDateTime(merge.completed_at) }}
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- 错误提示 -->
                      <div
                        class="merge-error"
                        v-if="merge.status === 'failed' && merge.error_msg"
                      >
                        <el-alert type="error" :closable="false" show-icon>
                          <template #title>
                            <div style="font-size: 13px; line-height: 1.5">
                              {{ merge.error_msg }}
                            </div>
                          </template>
                        </el-alert>
                      </div>

                      <!-- 操作按钮 -->
                      <div class="merge-actions">
                        <template
                          v-if="
                            merge.status === 'completed' && merge.merged_url
                          "
                        >
                          <el-button
                            type="primary"
                            :icon="VideoCamera"
                            @click="
                              downloadVideo(merge.merged_url, merge.title)
                            "
                            round
                          >
                            下载视频
                          </el-button>
                          <el-button
                            :icon="View"
                            @click="previewMergedVideo(merge.merged_url)"
                            round
                          >
                            在线预览
                          </el-button>
                        </template>
                        <el-button
                          type="danger"
                          :icon="Delete"
                          @click="deleteMerge(merge.id)"
                          round
                        >
                          删除
                        </el-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 角色选择器对话框 -->
    <el-dialog
      v-model="showCharacterImagePreview"
      :title="previewCharacter?.name"
      width="600px"
    >
      <div class="character-image-preview" v-if="previewCharacter">
        <img
          v-if="previewCharacter.local_path"
          :src="getImageUrl(previewCharacter)"
          :alt="previewCharacter.name"
        />
        <el-empty v-else description="暂无图片" />
      </div>
      <!-- ... -->
    </el-dialog>

    <!-- 场景大图预览对话框 -->
    <el-dialog
      v-model="showSceneImagePreview"
      :title="
        currentStoryboard?.background
          ? `${currentStoryboard.background.location} · ${currentStoryboard.background.time}`
          : '场景预览'
      "
      width="800px"
    >
      <div
        class="scene-image-preview"
        v-if="currentStoryboard?.background?.image_url"
      >
        <img :src="currentStoryboard.background.image_url" alt="场景" />
      </div>
    </el-dialog>

    <!-- 角色选择对话框 -->
    <el-dialog
      v-model="showCharacterSelector"
      title="添加角色到镜头"
      width="800px"
    >
      <div class="character-selector-grid">
        <div
          v-for="char in availableCharacters"
          :key="char.id"
          class="character-card"
          :class="{ selected: isCharacterInCurrentShot(char.id) }"
          @click="toggleCharacterInShot(char.id)"
        >
          <div class="character-avatar-large">
            <img
              v-if="char.local_path"
              :src="getImageUrl(char)"
              :alt="char.name"
            />
            <span v-else>{{ char.name?.[0] || "?" }}</span>
          </div>
          <div class="character-info">
            <div class="character-name">{{ char.name }}</div>
            <div class="character-role">{{ char.role || "角色" }}</div>
          </div>
          <div class="character-check" v-if="isCharacterInCurrentShot(char.id)">
            <el-icon color="#409eff" :size="24">
              <Check />
            </el-icon>
          </div>
        </div>
        <div v-if="availableCharacters.length === 0" class="empty-characters">
          <el-empty description="暂无角色，请先在剧集中创建角色" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showCharacterSelector = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 道具选择对话框 -->
    <el-dialog
      v-model="showPropSelector"
      :title="$t('editor.addPropToShot')"
      width="800px"
    >
      <div class="character-selector-grid">
        <div
          v-for="prop in availableProps"
          :key="prop.id"
          class="character-card"
          :class="{ selected: isPropInCurrentShot(prop.id) }"
          @click="togglePropInShot(prop.id)"
        >
          <div class="character-avatar-large">
            <img
              v-if="prop.local_path"
              :src="getImageUrl(prop)"
              :alt="prop.name"
            />
            <el-icon v-else :size="32">
              <Box />
            </el-icon>
          </div>
          <div class="character-info">
            <div class="character-name">{{ prop.name }}</div>
            <div class="character-role">
              {{ prop.type || $t("editor.props") }}
            </div>
          </div>
          <div class="character-check" v-if="isPropInCurrentShot(prop.id)">
            <el-icon color="#409eff" :size="24">
              <Check />
            </el-icon>
          </div>
        </div>
        <div v-if="availableProps.length === 0" class="empty-characters">
          <el-empty :description="$t('editor.noPropsAvailable')" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showPropSelector = false">{{
          $t("common.close")
        }}</el-button>
      </template>
    </el-dialog>

    <!-- 场景选择对话框 -->
    <el-dialog v-model="showSceneSelector" title="选择场景背景" width="800px">
      <div class="scene-selector-grid">
        <div
          v-for="scene in availableScenes"
          :key="scene.id"
          class="scene-card"
          :class="{ selected: currentStoryboard?.scene_id === scene.id }"
          @click="selectScene(scene.id)"
        >
          <div class="scene-image">
            <img
              v-if="hasImage(scene)"
              :src="getImageUrl(scene)"
              :alt="scene.location"
            />
            <el-icon v-else :size="48" color="#ccc">
              <Picture />
            </el-icon>
          </div>
          <div class="scene-info">
            <div class="scene-location">{{ scene.location }}</div>
            <div class="scene-time">{{ scene.time }}</div>
          </div>
        </div>
        <div v-if="availableScenes.length === 0" class="empty-scenes">
          <el-empty description="暂无可用场景" />
        </div>
      </div>
    </el-dialog>

    <!-- 视频预览对话框 -->
    <el-dialog
      v-model="showVideoPreview"
      title="视频预览"
      width="800px"
      :close-on-click-modal="true"
      destroy-on-close
    >
      <div class="video-preview-container" v-if="previewVideo">
        <video
          v-if="previewVideo.video_url"
          :src="getVideoUrl(previewVideo)"
          controls
          autoplay
          style="
            width: 100%;
            max-height: 70vh;
            display: block;
            background: #000;
            border-radius: 8px;
          "
        />
        <div v-else style="text-align: center; padding: 40px">
          <el-icon :size="48" color="#ccc">
            <VideoCamera />
          </el-icon>
          <p style="margin-top: 16px; color: #909399">视频生成中...</p>
        </div>
        <div class="video-meta">
          <div
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
            "
          >
            <div>
              <el-tag :type="getStatusType(previewVideo.status)" size="small">{{
                getStatusText(previewVideo.status)
              }}</el-tag>
              <span
                v-if="previewVideo.duration"
                style="margin-left: 12px; color: #606266; font-size: 14px"
                >{{ $t("professionalEditor.duration") }}:
                {{ previewVideo.duration
                }}{{ $t("professionalEditor.seconds") }}</span
              >
            </div>
            <el-button
              v-if="previewVideo.video_url"
              size="small"
              @click="window.open(previewVideo.video_url, '_blank')"
            >
              {{ $t("professionalEditor.downloadVideo") }}
            </el-button>
          </div>
          <div
            v-if="previewVideo.prompt"
            style="
              margin-top: 12px;
              font-size: 12px;
              color: #606266;
              line-height: 1.6;
            "
          >
            <strong>提示词：</strong>{{ previewVideo.prompt }}
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 宫格图片编辑器组件 -->
    <GridImageEditor
      v-model="showGridEditor"
      :storyboard-id="currentStoryboard?.id || 0"
      :drama-id="dramaId"
      :all-images="allGeneratedImages"
      @success="handleGridImageSuccess"
    />

    <!-- 图片裁剪对话框 -->
    <ImageCropDialog
      v-model="showCropDialog"
      :image-url="cropImageUrl"
      @save="handleCropSave"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ArrowLeft,
  Plus,
  Picture,
  VideoPlay,
  VideoPause,
  View,
  Setting,
  Upload,
  MagicStick,
  VideoCamera,
  ZoomIn,
  ZoomOut,
  Top,
  Bottom,
  Check,
  Close,
  Right,
  Timer,
  Calendar,
  Clock,
  Loading,
  WarningFilled,
  Delete,
  Connection,
  Box,
  Crop,
  FolderAdd,
} from "@element-plus/icons-vue";
import { dramaAPI } from "@/api/drama";
import { propAPI } from "@/api/prop";
import { generateFramePrompt, type FrameType } from "@/api/frame";
import { imageAPI } from "@/api/image";
import { videoAPI } from "@/api/video";
import { aiAPI } from "@/api/ai";
import { assetAPI } from "@/api/asset";
import { videoMergeAPI } from "@/api/videoMerge";
import { taskAPI } from "@/api/task";
import type { ImageGeneration } from "@/types/image";
import type { VideoGeneration } from "@/types/video";
import type { AIServiceConfig } from "@/types/ai";
import type { Asset } from "@/types/asset";
import type { VideoMerge } from "@/api/videoMerge";
import VideoTimelineEditor from "@/components/editor/VideoTimelineEditor.vue";
import GridImageEditor from "@/components/editor/GridImageEditor.vue";
import type { Drama, Episode, Storyboard } from "@/types/drama";
import { AppHeader, ImageCropDialog } from "@/components/common";
import { getImageUrl, hasImage, getVideoUrl } from "@/utils/image";

const route = useRoute();
const router = useRouter();
const { t: $t } = useI18n();

const dramaId = Number(route.params.dramaId);
const episodeNumber = Number(route.params.episodeNumber);
const episodeId = ref<number>(0);

const drama = ref<Drama | null>(null);
const episode = ref<Episode | null>(null);
const storyboards = ref<Storyboard[]>([]);
const characters = ref<any[]>([]);
const availableScenes = ref<any[]>([]);
const props = ref<any[]>([]);
const showPropSelector = ref(false);

const currentStoryboardId = ref<string | null>(null);
const activeTab = ref("shot");
const showSceneSelector = ref(false);
const showCharacterSelector = ref(false);
const showCharacterImagePreview = ref(false);
const previewCharacter = ref<any>(null);
const showSceneImagePreview = ref(false);
const showSettings = ref(false);
const showVideoPreview = ref(false);
const previewVideo = ref<VideoGeneration | null>(null);
const addingToAssets = ref<Set<number>>(new Set());

const currentPlayState = ref<"playing" | "paused">("paused");
const currentTime = ref(0);
const totalDuration = computed(() => {
  if (!Array.isArray(storyboards.value)) return 0;
  return storyboards.value.reduce((sum, s) => sum + (s.duration || 0), 0);
});

const selectedCharacters = ref<number[]>([]);
const narrativeTab = ref("shot-prompt");

// 图片生成相关状态
const selectedFrameType = ref<FrameType>("first");
const panelCount = ref(3);
const generatingPromptStates = ref<Record<string, boolean>>({}); // 按 "镜头ID_帧类型" 记录生成状态
const framePrompts = ref<Record<string, string>>({
  key: "",
  first: "",
  last: "",
  panel: "",
});
const currentFramePrompt = ref("");
const generatingImage = ref(false);
const generatedImages = ref<ImageGeneration[]>([]);
const isSwitchingFrameType = ref(false); // 标志位：是否正在切换帧类型
const loadingImages = ref(false);
let pollingTimer: any = null;
let pollingFrameType: FrameType | null = null; // 记录正在轮询的帧类型

// 宫格图片编辑器状态
const showGridEditor = ref(false);

// 所有已生成的图片（用于宫格编辑器选择）
const allGeneratedImages = ref<ImageGeneration[]>([]);

// 图片裁剪对话框状态
const showCropDialog = ref(false);
const cropImageUrl = ref<string>("");
const cropImageData = ref<ImageGeneration | null>(null);

// 视频生成相关状态
const videoDuration = ref(5); // 默认5秒，会根据镜头duration自动更新
const selectedVideoFrameType = ref<FrameType>("first");
const selectedImagesForVideo = ref<number[]>([]);
const selectedLastImageForVideo = ref<number | null>(null);
const generatingVideo = ref(false);
const generatedVideos = ref<VideoGeneration[]>([]);
const videoAssets = ref<Asset[]>([]);
const loadingVideos = ref(false);
const timelineEditorRef = ref<InstanceType<typeof VideoTimelineEditor> | null>(
  null,
);
const videoReferenceImages = ref<ImageGeneration[]>([]);
const selectedVideoModel = ref<string>("");
const selectedReferenceMode = ref<string>(""); // 参考图模式：single, first_last, multiple, none
const previewImageUrl = ref<string>(""); // 预览大图的URL
const videoModelCapabilities = ref<VideoModelCapability[]>([]);
let videoPollingTimer: any = null;
let mergePollingTimer: any = null; // 视频合成列表轮询定时器

// 视频合成列表
const videoMerges = ref<VideoMerge[]>([]);
const loadingMerges = ref(false);

// 视频模型能力配置
interface VideoModelCapability {
  id: string;
  name: string;
  supportMultipleImages: boolean; // 支持多张图片
  supportFirstLastFrame: boolean; // 支持首尾帧
  supportSingleImage: boolean; // 支持单图
  supportTextOnly: boolean; // 支持纯文本
  maxImages: number; // 最多支持几张图片
}

// 模型能力默认配置（作为后备）
const defaultModelCapabilities: Record<
  string,
  Omit<VideoModelCapability, "id" | "name">
> = {
  kling: {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 1,
  },
  runway: {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: true,
    supportTextOnly: true,
    maxImages: 2,
  },
  pika: {
    supportSingleImage: true,
    supportMultipleImages: true,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 6,
  },
  "doubao-seedance-1-5-pro-251215": {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: true,
    supportTextOnly: true,
    maxImages: 2,
  },
  "doubao-seedance-1-0-lite-i2v-250428": {
    supportSingleImage: true,
    supportMultipleImages: true,
    supportFirstLastFrame: true,
    supportTextOnly: false,
    maxImages: 6,
  },
  "doubao-seedance-1-0-lite-t2v-250428": {
    supportSingleImage: false,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 0,
  },
  "doubao-seedance-1-0-pro-250528": {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: true,
    supportTextOnly: true,
    maxImages: 2,
  },
  "doubao-seedance-1-0-pro-fast-251015": {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 1,
  },
  "sora-2": {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 1,
  },
  "sora-2-pro": {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: true,
    supportTextOnly: true,
    maxImages: 2,
  },
  "MiniMax-Hailuo-2.3": {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 1,
  },
  "MiniMax-Hailuo-2.3-Fast": {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 1,
  },
  "MiniMax-Hailuo-02": {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 1,
  },
};

// 从模型名称提取provider
const extractProviderFromModel = (modelName: string): string => {
  if (modelName.startsWith("doubao-") || modelName.startsWith("seedance")) {
    return "doubao";
  }
  if (modelName.startsWith("runway")) {
    return "runway";
  }
  if (modelName.startsWith("pika")) {
    return "pika";
  }
  if (
    modelName.startsWith("MiniMax-") ||
    modelName.toLowerCase().startsWith("minimax") ||
    modelName.startsWith("hailuo")
  ) {
    return "minimax";
  }
  if (modelName.startsWith("sora")) {
    return "openai";
  }
  if (modelName.startsWith("kling")) {
    return "kling";
  }

  // 默认返回doubao
  return "doubao";
};

// 加载视频AI配置
const loadVideoModels = async () => {
  try {
    const configs = await aiAPI.list("video");

    // 只显示启用的配置
    const activeConfigs = configs.filter((c) => c.is_active);

    // 展开模型列表并去重
    const allModels = activeConfigs
      .flatMap((config) => {
        const models = Array.isArray(config.model)
          ? config.model
          : [config.model];
        return models.map((modelName) => ({
          modelName,
          configName: config.name,
          priority: config.priority || 0,
        }));
      })
      .sort((a, b) => b.priority - a.priority);

    // 按模型名称去重
    const modelMap = new Map<
      string,
      { configName: string; priority: number }
    >();
    allModels.forEach((model) => {
      if (!modelMap.has(model.modelName)) {
        modelMap.set(model.modelName, {
          configName: model.configName,
          priority: model.priority,
        });
      }
    });

    // 构建模型能力列表
    videoModelCapabilities.value = Array.from(modelMap.keys()).map(
      (modelName) => {
        const capability = defaultModelCapabilities[modelName] || {
          supportSingleImage: true,
          supportMultipleImages: false,
          supportFirstLastFrame: false,
          supportTextOnly: true,
          maxImages: 1,
        };

        return {
          id: modelName,
          name: modelName,
          ...capability,
        };
      },
    );
  } catch (error: any) {
    console.error("加载视频模型配置失败:", error);
    ElMessage.error("加载视频模型失败");
  }
};

// 加载视频素材库
const loadVideoAssets = async () => {
  try {
    const result = await assetAPI.listAssets({
      drama_id: dramaId.toString(),
      episode_id: episodeId.value,
      type: "video",
      page: 1,
      page_size: 100,
    });
    // 检查数据结构并正确赋值
    videoAssets.value = result.items || [];
  } catch (error: any) {
    console.error("加载视频素材库失败:", error);
  }
};

// 当前模型能力
const currentModelCapability = computed(() => {
  return videoModelCapabilities.value.find(
    (m) => m.id === selectedVideoModel.value,
  );
});

// 当前模型支持的参考图模式
const availableReferenceModes = computed(() => {
  const capability = currentModelCapability.value;
  if (!capability) return [];

  const modes: Array<{ value: string; label: string; description?: string }> =
    [];

  if (capability.supportTextOnly) {
    modes.push({ value: "none", label: "纯文本", description: "不使用参考图" });
  }
  if (capability.supportSingleImage) {
    modes.push({
      value: "single",
      label: "单图",
      description: "使用单张参考图",
    });
  }
  if (capability.supportFirstLastFrame) {
    modes.push({
      value: "first_last",
      label: "首尾帧",
      description: "使用首帧和尾帧",
    });
  }
  if (capability.supportMultipleImages) {
    modes.push({
      value: "multiple",
      label: "多图",
      description: `最多${capability.maxImages}张`,
    });
  }

  return modes;
});

// 帧提示词存储key生成函数
const getPromptStorageKey = (
  storyboardId: number | undefined,
  frameType: FrameType,
) => {
  if (!storyboardId) return null;
  return `frame_prompt_${storyboardId}_${frameType}`;
};

const isCharacterSelected = (charId: number) => {
  return selectedCharacters.value.includes(charId);
};

const toggleCharacter = (charId: number) => {
  const index = selectedCharacters.value.indexOf(charId);
  if (index > -1) {
    selectedCharacters.value.splice(index, 1);
  } else {
    selectedCharacters.value.push(charId);
  }
};

const currentStoryboard = computed(() => {
  if (!currentStoryboardId.value) return null;
  return (
    storyboards.value.find(
      (s) => String(s.id) === String(currentStoryboardId.value),
    ) || null
  );
});

// 获取上一个镜头
const previousStoryboard = computed(() => {
  if (!currentStoryboardId.value || storyboards.value.length < 2) return null;
  const currentIndex = storyboards.value.findIndex(
    (s) => String(s.id) === String(currentStoryboardId.value),
  );
  if (currentIndex <= 0) return null;
  return storyboards.value[currentIndex - 1];
});

// 上一个镜头的尾帧图片列表（支持多个）
const previousStoryboardLastFrames = ref<any[]>([]);

// 加载上一个镜头的尾帧
const loadPreviousStoryboardLastFrame = async () => {
  if (!previousStoryboard.value) {
    previousStoryboardLastFrames.value = [];
    return;
  }
  try {
    const result = await imageAPI.listImages({
      storyboard_id: previousStoryboard.value.id,
      frame_type: "last",
      page: 1,
      page_size: 10,
    });
    const images = result.items || [];
    previousStoryboardLastFrames.value = images.filter(
      (img: any) => img.status === "completed" && img.image_url,
    );
  } catch (error) {
    console.error("加载上一镜头尾帧失败:", error);
    previousStoryboardLastFrames.value = [];
  }
};

// 选择上一镜头尾帧作为首帧参考
const selectPreviousLastFrame = (img: any) => {
  // 检查是否已选中，已选中则取消
  const currentIndex = selectedImagesForVideo.value.indexOf(img.id);
  if (currentIndex > -1) {
    selectedImagesForVideo.value.splice(currentIndex, 1);
    ElMessage.success("已取消首帧参考");
    return;
  }

  // 参考handleImageSelect的逻辑，根据模式处理
  if (
    !selectedReferenceMode.value ||
    selectedReferenceMode.value === "single"
  ) {
    // 单图模式或未选模式：直接替换
    selectedImagesForVideo.value = [img.id];
  } else if (selectedReferenceMode.value === "first_last") {
    // 首尾帧模式：作为首帧参考
    selectedImagesForVideo.value = [img.id];
  } else if (selectedReferenceMode.value === "multiple") {
    // 多图模式：添加到列表
    const capability = currentModelCapability.value;
    if (
      capability &&
      selectedImagesForVideo.value.length >= capability.maxImages
    ) {
      ElMessage.warning(`最多只能选择${capability.maxImages}张图片`);
      return;
    }
    selectedImagesForVideo.value.push(img.id);
  }
  ElMessage.success("已添加为首帧参考");
};

// 监听帧类型切换，从存储中加载或清空
watch(selectedFrameType, (newType) => {
  // 切换帧类型时，停止之前的轮询，避免旧结果覆盖新帧类型
  stopPolling();

  if (!currentStoryboard.value) {
    currentFramePrompt.value = "";
    generatedImages.value = [];
    return;
  }

  // 设置切换标志，防止watch(currentFramePrompt)错误保存
  isSwitchingFrameType.value = true;

  // 优先从 sessionStorage 中加载该帧类型的提示词（确保数据准确）
  const storageKey = `frame_prompt_${currentStoryboard.value.id}_${newType}`;
  const stored = sessionStorage.getItem(storageKey);

  if (stored) {
    currentFramePrompt.value = stored;
    framePrompts.value[newType] = stored;
  } else {
    // 如果 sessionStorage 中没有，再尝试从 framePrompts 对象中读取
    currentFramePrompt.value = framePrompts.value[newType] || "";
  }

  // 重新加载该帧类型的图片
  loadStoryboardImages(currentStoryboard.value.id, newType);

  // 重置切换标志
  setTimeout(() => {
    isSwitchingFrameType.value = false;
  }, 0);
});

// 监听当前分镜切换，重置提示词
watch(currentStoryboard, async (newStoryboard) => {
  if (!newStoryboard) {
    currentFramePrompt.value = "";
    generatedImages.value = [];
    generatedVideos.value = [];
    videoReferenceImages.value = [];
    previousStoryboardLastFrames.value = [];
    return;
  }

  // 设置切换标志
  isSwitchingFrameType.value = true;

  // 清空 framePrompts 对象，避免显示上一个镜头的提示词
  framePrompts.value = {
    key: "",
    first: "",
    last: "",
    panel: "",
  };

  // 加载当前帧类型的提示词
  const storageKey = getPromptStorageKey(
    newStoryboard.id,
    selectedFrameType.value,
  );
  if (storageKey) {
    const stored = sessionStorage.getItem(storageKey);
    currentFramePrompt.value = stored || "";
    // 同时更新 framePrompts 对象
    if (stored) {
      framePrompts.value[selectedFrameType.value] = stored;
    }
  } else {
    currentFramePrompt.value = "";
  }

  // 重置切换标志
  setTimeout(() => {
    isSwitchingFrameType.value = false;
  }, 0);

  // 加载该分镜的图片列表（根据当前选择的帧类型）
  await loadStoryboardImages(newStoryboard.id, selectedFrameType.value);

  // 加载所有已生成的图片（用于宫格编辑器）
  await loadAllGeneratedImages();

  // 加载视频参考图片（所有帧类型）
  await loadVideoReferenceImages(newStoryboard.id);

  // 加载该分镜的视频列表
  await loadStoryboardVideos(newStoryboard.id);

  // 加载上一镜头的尾帧
  await loadPreviousStoryboardLastFrame();
});

// 监听提示词变化，自动保存到sessionStorage
watch(currentFramePrompt, (newPrompt) => {
  // 如果正在切换帧类型或分镜，不要保存（避免错误保存到新帧类型）
  if (isSwitchingFrameType.value) return;
  if (!currentStoryboard.value) return;

  const storageKey = getPromptStorageKey(
    currentStoryboard.value.id,
    selectedFrameType.value,
  );
  if (storageKey) {
    if (newPrompt) {
      sessionStorage.setItem(storageKey, newPrompt);
    } else {
      sessionStorage.removeItem(storageKey);
    }
  }
});

// 监听视频模型切换，清空已选图片和参考图模式
watch(selectedVideoModel, () => {
  selectedImagesForVideo.value = [];
  selectedLastImageForVideo.value = null;
  selectedReferenceMode.value = "";
});

// 监听镜头切换，自动更新视频时长
watch(currentStoryboard, (newStoryboard) => {
  if (newStoryboard?.duration) {
    // 如果镜头有duration字段，使用镜头的时长
    videoDuration.value = Math.round(newStoryboard.duration);
  } else {
    // 否则使用默认值5秒
    videoDuration.value = 5;
  }
});

// 监听参考图模式切换，清空已选图片
watch(selectedReferenceMode, () => {
  selectedImagesForVideo.value = [];
  selectedLastImageForVideo.value = null;
});

// 当前分镜的角色列表
const currentStoryboardCharacters = computed(() => {
  if (!currentStoryboard.value?.characters) return [];

  // currentStoryboard.characters 是角色对象数组
  if (
    Array.isArray(currentStoryboard.value.characters) &&
    currentStoryboard.value.characters.length > 0
  ) {
    const firstItem = currentStoryboard.value.characters[0];
    // 如果是对象数组（包含id和name），直接返回
    if (typeof firstItem === "object" && firstItem.id) {
      return currentStoryboard.value.characters;
    }
    // 如果是ID数组，从characters中查找匹配的角色
    if (typeof firstItem === "number") {
      return characters.value.filter((c) =>
        currentStoryboard.value.characters.includes(c.id),
      );
    }
  }

  return [];
});

// 可选择的角色列表
const availableCharacters = computed(() => {
  return characters.value || [];
});

// 可选择的道具列表
const availableProps = computed(() => {
  return props.value || [];
});

// 当前分镜的道具列表
const currentStoryboardProps = computed(() => {
  if (!currentStoryboard.value?.props) return [];
  return currentStoryboard.value.props;
});

// 检查道具是否在当前镜头中
const isPropInCurrentShot = (propId: number) => {
  if (!currentStoryboard.value?.props) return false;
  return currentStoryboard.value.props.some((p: any) => p.id === propId);
};

// 切换道具在镜头中的状态
const togglePropInShot = async (propId: number) => {
  if (!currentStoryboard.value) return;

  let newProps = [...(currentStoryboard.value.props || [])];
  if (isPropInCurrentShot(propId)) {
    newProps = newProps.filter((p: any) => p.id !== propId);
  } else {
    const prop = props.value.find((p) => p.id === propId);
    if (prop) {
      newProps.push(prop);
    }
  }

  // 乐观更新
  currentStoryboard.value.props = newProps;

  try {
    const propIds = newProps.map((p: any) => p.id);
    await propAPI.associateWithStoryboard(
      Number(currentStoryboard.value.id),
      propIds,
    );
  } catch (error) {
    ElMessage.error($t("editor.updatePropFailed"));
  }
};

// 检查角色是否已在当前镜头中
const isCharacterInCurrentShot = (charId: number) => {
  if (!currentStoryboard.value?.characters) return false;

  if (
    Array.isArray(currentStoryboard.value.characters) &&
    currentStoryboard.value.characters.length > 0
  ) {
    const firstItem = currentStoryboard.value.characters[0];
    if (typeof firstItem === "object" && firstItem.id) {
      return currentStoryboard.value.characters.some((c) => c.id === charId);
    }
    if (typeof firstItem === "number") {
      return currentStoryboard.value.characters.includes(charId);
    }
  }

  return false;
};

// 切换角色在镜头中的状态
const showCharacterImage = (char: any) => {
  previewCharacter.value = char;
  showCharacterImagePreview.value = true;
};

// 展示场景大图
const showSceneImage = () => {
  if (currentStoryboard.value?.background?.image_url) {
    showSceneImagePreview.value = true;
  }
};

// 保存分镜字段
const saveStoryboardField = async (fieldName: string) => {
  if (!currentStoryboard.value) return;
  try {
    const updateData: any = {};
    updateData[fieldName] = currentStoryboard.value[fieldName];

    await dramaAPI.updateStoryboard(
      currentStoryboard.value.id.toString(),
      updateData,
    );
  } catch (error: any) {
    ElMessage.error("保存失败: " + (error.message || "未知错误"));
  }
};

// 提取帧提示词
// 提取帧提示词
const extractFramePrompt = async () => {
  if (!currentStoryboard.value) return;

  const storyboardId = currentStoryboard.value.id;
  // 记录点击时的帧类型，后续任务完成时用于判断是否需要更新当前显示
  const targetFrameType = selectedFrameType.value;

  if (targetFrameType === "panel") {
    // 如果是分镜板模式，还需要捕获当前的panelCount
    // 注意：这里简单起见使用当前的panelCount，理想情况下应该传递参数或锁定UI
  }

  // 设置当前镜头的生成状态为true
  const stateKey = `${storyboardId}_${targetFrameType}`;
  generatingPromptStates.value[stateKey] = true;

  try {
    const params: any = { frame_type: targetFrameType };
    if (targetFrameType === "panel") {
      params.panel_count = panelCount.value;
    }

    const { task_id } = await generateFramePrompt(storyboardId, params);

    // 轮询任务状态（独立函数，不依赖组件当前状态）
    const pollTask = async () => {
      while (true) {
        const task = await taskAPI.getStatus(task_id);
        if (task.status === "completed") {
          let result = task.result;
          if (typeof result === "string") {
            try {
              result = JSON.parse(result);
            } catch (e) {
              console.error("Failed to parse task result", e);
              throw new Error("解析任务结果失败");
            }
          }
          return result.response;
        } else if (task.status === "failed") {
          throw new Error(task.message || task.error || "生成失败");
        }
        // 等待1秒后继续轮询
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };

    const result = await pollTask();

    // 根据返回结果构建提示词字符串
    let extractedPrompt = "";
    if (result.single_frame) {
      extractedPrompt = result.single_frame.prompt;
    } else if (result.multi_frame && result.multi_frame.frames) {
      // 多帧情况，将所有帧的prompt合并
      extractedPrompt = result.multi_frame.frames
        .map((frame: any) => frame.prompt)
        .join("\n\n");
    }

    // 更新存储（这一步必须做，无论用户是否还在当前页面）
    // 更新 session storage
    const storageKey = getPromptStorageKey(storyboardId, targetFrameType);
    if (storageKey) {
      sessionStorage.setItem(storageKey, extractedPrompt);
    }

    // 如果任务完成时，用户当前的选中状态正好是该镜头+该类型，则立即更新显示
    if (
      currentStoryboard.value &&
      currentStoryboard.value.id === storyboardId &&
      selectedFrameType.value === targetFrameType
    ) {
      currentFramePrompt.value = extractedPrompt;
      framePrompts.value[targetFrameType] = extractedPrompt;
    }

    // 更新内存缓存（稍微复杂点，framePrompts 是响应式的且绑定当前镜头，这里只做sessionStorage持久化即可，
    // 因为切换镜头时会重新读取sessionStorage。
    // 但为了确保如果用户没切走也能看到，上面已经更新了 currentFramePrompt

    ElMessage.success(`${getFrameTypeLabel(targetFrameType)}提示词提取成功`);
  } catch (error: any) {
    ElMessage.error("提取失败: " + (error.message || "未知错误"));
  } finally {
    // 清除该镜头的生成状态
    const stateKey = `${storyboardId}_${targetFrameType}`;
    if (generatingPromptStates.value[stateKey]) {
      generatingPromptStates.value[stateKey] = false;
    }
  }
};

// 检查是否正在生成提示词
const isGeneratingPrompt = (
  storyboardId: number | undefined,
  frameType: string,
) => {
  if (!storyboardId) return false;
  return !!generatingPromptStates.value[`${storyboardId}_${frameType}`];
};

// 获取帧类型的中文标签
const getFrameTypeLabel = (frameType: string): string => {
  const labels: Record<string, string> = {
    key: "关键帧",
    first: "首帧",
    last: "尾帧",
    panel: "分镜版",
  };
  return labels[frameType] || frameType;
};

// 加载分镜的图片列表
const loadStoryboardImages = async (
  storyboardId: string | number,
  frameType?: string,
) => {
  loadingImages.value = true;
  try {
    const params: any = {
      storyboard_id: storyboardId,
      page: 1,
      page_size: 50,
    };
    // 如果指定了帧类型，添加过滤
    if (frameType) {
      params.frame_type = frameType;
    }
    const result = await imageAPI.listImages(params);
    generatedImages.value = result.items || [];

    // 如果有进行中的任务，启动轮询
    const hasPendingOrProcessing = generatedImages.value.some(
      (img) => img.status === "pending" || img.status === "processing",
    );
    if (hasPendingOrProcessing) {
      startPolling();
    }
  } catch (error: any) {
    console.error("加载图片列表失败:", error);
  } finally {
    loadingImages.value = false;
  }
};

// 启动状态轮询
const startPolling = () => {
  if (pollingTimer) return;

  // 记录开始轮询时的帧类型
  pollingFrameType = selectedFrameType.value;

  pollingTimer = setInterval(async () => {
    if (!currentStoryboard.value) {
      stopPolling();
      return;
    }

    // 如果帧类型已切换，停止轮询（防止更新到错误的帧类型）
    if (selectedFrameType.value !== pollingFrameType) {
      stopPolling();
      return;
    }

    try {
      const params: any = {
        storyboard_id: currentStoryboard.value.id,
        page: 1,
        page_size: 50,
      };
      // 使用轮询开始时记录的帧类型
      if (pollingFrameType) {
        params.frame_type = pollingFrameType;
      }
      const result = await imageAPI.listImages(params);

      // 再次检查帧类型是否仍然匹配，避免竞态条件
      if (selectedFrameType.value === pollingFrameType) {
        generatedImages.value = result.items || [];
      }

      // 如果没有进行中的任务，停止轮询并刷新视频参考图片
      const hasPendingOrProcessing = (result.items || []).some(
        (img: any) => img.status === "pending" || img.status === "processing",
      );
      if (!hasPendingOrProcessing) {
        stopPolling();
        // 刷新视频参考图片列表
        if (currentStoryboard.value) {
          loadVideoReferenceImages(currentStoryboard.value.id);
        }
      }
    } catch (error) {
      console.error("轮询图片状态失败:", error);
    }
  }, 3000); // 每3秒轮询一次
};

// 停止轮询
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  pollingFrameType = null;
};

// 生成图片
const generateFrameImage = async () => {
  if (!currentStoryboard.value || !currentFramePrompt.value) return;

  generatingImage.value = true;
  try {
    // 收集参考图片的 local_path
    const referenceImages: string[] = [];

    // 1. 添加场景图片（从background字段获取 local_path）
    if (currentStoryboard.value.background?.local_path) {
      referenceImages.push(currentStoryboard.value.background.local_path);
    }

    // 2. 添加当前镜头登场的角色图片（使用 local_path）
    const storyboardCharacters = currentStoryboardCharacters.value;
    if (storyboardCharacters && storyboardCharacters.length > 0) {
      storyboardCharacters.forEach((char: any) => {
        if (char.local_path) {
          referenceImages.push(char.local_path);
        }
      });
    }

    const result = await imageAPI.generateImage({
      drama_id: dramaId.toString(),
      prompt: currentFramePrompt.value,
      storyboard_id: currentStoryboard.value.id,
      image_type: "storyboard",
      frame_type: selectedFrameType.value,
      reference_images:
        referenceImages.length > 0 ? referenceImages : undefined,
    });

    generatedImages.value.unshift(result);

    // 提示信息
    const refMsg =
      referenceImages.length > 0
        ? ` (已添加${referenceImages.length}张参考图)`
        : "";
    ElMessage.success(`图片生成任务已提交${refMsg}`);

    // 启动轮询
    startPolling();
  } catch (error: any) {
    ElMessage.error("生成失败: " + (error.message || "未知错误"));
  } finally {
    generatingImage.value = false;
  }
};

// 获取状态标签类型
const getStatusType = (status: string) => {
  const statusMap: Record<string, any> = {
    pending: "info",
    processing: "warning",
    completed: "success",
    failed: "danger",
  };
  return statusMap[status] || "info";
};

// 播放视频
const playVideo = (video: VideoGeneration) => {
  previewVideo.value = video;
  showVideoPreview.value = true;
};

// 添加视频到素材库
const addVideoToAssets = async (video: VideoGeneration) => {
  if (video.status !== "completed" || !video.video_url) {
    ElMessage.warning("只能添加已完成的视频到素材库");
    return;
  }

  addingToAssets.value.add(video.id);

  try {
    // 检查该镜头是否已存在素材
    let isReplacing = false;
    if (video.storyboard_id) {
      const existingAsset = videoAssets.value.find(
        (asset: any) => asset.storyboard_id === video.storyboard_id,
      );

      if (existingAsset) {
        isReplacing = true;
        // 自动替换：先删除旧素材
        try {
          await assetAPI.deleteAsset(existingAsset.id);
        } catch (error) {
          console.error("删除旧素材失败:", error);
        }
      }
    }

    // 添加新素材
    await assetAPI.importFromVideo(video.id);
    ElMessage.success("已添加到素材库");

    // 重新加载素材库列表
    await loadVideoAssets();

    // 如果是替换操作，更新时间线中使用该分镜的所有视频片段
    if (isReplacing && video.storyboard_id && video.video_url) {
      console.log("=== 视频替换，准备更新时间线 ===");
      console.log("timelineEditorRef.value:", timelineEditorRef.value);
      console.log("video.storyboard_id:", video.storyboard_id);
      console.log("video.video_url:", video.video_url);

      if (timelineEditorRef.value) {
        timelineEditorRef.value.updateClipsByStoryboardId(
          video.storyboard_id,
          video.video_url,
        );
      } else {
        console.warn("⚠️ timelineEditorRef.value 为空，无法更新时间线");
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || "添加失败");
  } finally {
    addingToAssets.value.delete(video.id);
  }
};

// 删除视频
const handleDeleteVideo = async (video: VideoGeneration) => {
  if (!currentStoryboard.value) return;

  try {
    await ElMessageBox.confirm(
      "确定要删除这个视频吗？删除后无法恢复。",
      "确认删除",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    await videoAPI.deleteVideo(video.id);
    ElMessage.success("删除成功");

    // 重新加载当前镜头的视频列表
    await loadStoryboardVideos(Number(currentStoryboard.value.id));
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除视频失败:", error);
      ElMessage.error(error.message || "删除失败");
    }
  }
};

// 获取状态中文文本
const getStatusText = (status: string) => {
  const statusTextMap: Record<string, string> = {
    pending: "等待中",
    processing: "生成中",
    completed: "已完成",
    failed: "失败",
  };
  return statusTextMap[status] || status;
};

// 获取帧类型中文文本
const getFrameTypeText = (frameType?: string) => {
  if (!frameType) return "";
  const frameTypeMap: Record<string, string> = {
    first: "首帧",
    key: "关键帧",
    last: "尾帧",
    panel: "分镜板",
    action: "动作序列",
  };
  return frameTypeMap[frameType] || frameType;
};

// 获取分镜缩略图
const getStoryboardThumbnail = (storyboard: any) => {
  // 优先使用composed_image
  if (storyboard.composed_image) {
    return storyboard.composed_image;
  }

  // 如果没有composed_image，从image_url字段获取
  if (storyboard.image_url) {
    return storyboard.image_url;
  }

  return null;
};

// 处理图片选择（根据模型能力）
const handleImageSelect = (imageId: number) => {
  if (!selectedReferenceMode.value) {
    ElMessage.warning("请先选择参考图模式");
    return;
  }

  if (!currentModelCapability.value) {
    ElMessage.warning("请先选择视频生成模型");
    return;
  }

  const capability = currentModelCapability.value;
  const currentIndex = selectedImagesForVideo.value.indexOf(imageId);

  // 已选中，则取消选择
  if (currentIndex > -1) {
    selectedImagesForVideo.value.splice(currentIndex, 1);
    return;
  }

  // 获取当前点击的图片对象
  const clickedImage = videoReferenceImages.value.find(
    (img) => img.id === imageId,
  );
  if (!clickedImage) return;

  // 根据选择的参考图模式处理
  switch (selectedReferenceMode.value) {
    case "single":
      // 单图模式：只能选1张，直接替换
      selectedImagesForVideo.value = [imageId];
      break;

    case "first_last":
      // 首尾帧模式：根据图片类型分别处理
      const frameType = clickedImage.frame_type;

      if (
        frameType === "first" ||
        frameType === "panel" ||
        frameType === "key"
      ) {
        // 首帧：直接替换
        selectedImagesForVideo.value = [imageId];
      } else if (frameType === "last") {
        // 尾帧：设置到单独的变量
        selectedLastImageForVideo.value = imageId;
      } else {
        ElMessage.warning("首尾帧模式下，请选择首帧或尾帧类型的图片");
      }
      break;

    case "multiple":
      // 多图模式：检查是否超出最大数量
      if (selectedImagesForVideo.value.length >= capability.maxImages) {
        ElMessage.warning(`最多只能选择${capability.maxImages}张图片`);
        return;
      }
      selectedImagesForVideo.value.push(imageId);
      break;

    default:
      ElMessage.warning("未知的参考图模式");
  }
};

// 预览图片（使用已导入的 getImageUrl 工具函数来获取正确的图片URL）
const previewImage = (url: string) => {
  // 使用Element Plus的图片预览
  const viewer = document.createElement("div");
  viewer.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
      <img src="${url}" style="max-width: 90vw; max-height: 90vh; object-fit: contain;" onclick="event.stopPropagation();" />
    </div>
  `;
  document.body.appendChild(viewer);
};

// 获取已选图片对象列表
const selectedImageObjects = computed(() => {
  return selectedImagesForVideo.value
    .map((id) => videoReferenceImages.value.find((img) => img.id === id))
    .filter((img) => img && img.image_url);
});

// 首尾帧模式：获取首帧图片
const firstFrameSlotImage = computed(() => {
  if (selectedImagesForVideo.value.length === 0) return null;
  const firstImageId = selectedImagesForVideo.value[0];
  // 同时搜索当前镜头图片和上一镜头尾帧
  return (
    videoReferenceImages.value.find((img) => img.id === firstImageId) ||
    previousStoryboardLastFrames.value.find((img) => img.id === firstImageId)
  );
});

// 首尾帧模式：获取尾帧图片
const lastFrameSlotImage = computed(() => {
  if (!selectedLastImageForVideo.value) return null;
  // 同时搜索当前镜头图片和上一镜头尾帧
  return (
    videoReferenceImages.value.find(
      (img) => img.id === selectedLastImageForVideo.value,
    ) ||
    previousStoryboardLastFrames.value.find(
      (img) => img.id === selectedLastImageForVideo.value,
    )
  );
});

// 移除已选择的图片
const removeSelectedImage = (imageId: number) => {
  // 检查是否是尾帧
  if (selectedLastImageForVideo.value === imageId) {
    selectedLastImageForVideo.value = null;
    return;
  }

  // 检查是否是首帧或其他图片
  const index = selectedImagesForVideo.value.indexOf(imageId);
  if (index > -1) {
    selectedImagesForVideo.value.splice(index, 1);
  }
};

// 生成视频
const generateVideo = async () => {
  if (!selectedVideoModel.value) {
    ElMessage.warning("请先选择视频生成模型");
    return;
  }

  if (!currentStoryboard.value) {
    ElMessage.warning("请先选择分镜");
    return;
  }

  // 检查参考图模式
  if (
    selectedReferenceMode.value !== "none" &&
    selectedImagesForVideo.value.length === 0
  ) {
    ElMessage.warning("请选择参考图片");
    return;
  }

  // 获取第一张选中的图片（仅在需要图片的模式下）
  let selectedImage = null;
  if (
    selectedReferenceMode.value !== "none" &&
    selectedImagesForVideo.value.length > 0
  ) {
    // 同时搜索当前镜头图片和上一镜头尾帧
    selectedImage =
      videoReferenceImages.value.find(
        (img) => img.id === selectedImagesForVideo.value[0],
      ) ||
      previousStoryboardLastFrames.value.find(
        (img) => img.id === selectedImagesForVideo.value[0],
      );
    if (!selectedImage || !selectedImage.image_url) {
      ElMessage.error("请选择有效的参考图片");
      return;
    }
  }

  generatingVideo.value = true;
  try {
    // 从模型名称提取正确的provider
    const provider = extractProviderFromModel(selectedVideoModel.value);

    // 构建请求参数
    const requestParams: any = {
      drama_id: dramaId.toString(),
      storyboard_id: currentStoryboard.value.id,
      prompt:
        currentStoryboard.value.video_prompt ||
        currentStoryboard.value.action ||
        currentStoryboard.value.description ||
        "",
      duration: videoDuration.value,
      provider: provider,
      model: selectedVideoModel.value,
      reference_mode: selectedReferenceMode.value,
    };

    // 根据参考图模式设置参数
    switch (selectedReferenceMode.value) {
      case "single":
        // 单图模式 - 优先使用 local_path
        if (selectedImage.local_path) {
          requestParams.image_local_path = selectedImage.local_path;
        } else if (selectedImage.image_url) {
          requestParams.image_url = selectedImage.image_url;
        }
        requestParams.image_gen_id = selectedImage.id;
        break;

      case "first_last":
        // 首尾帧模式（同时搜索当前镜头图片和上一镜头尾帧）
        const firstImage =
          videoReferenceImages.value.find(
            (img) => img.id === selectedImagesForVideo.value[0],
          ) ||
          previousStoryboardLastFrames.value.find(
            (img) => img.id === selectedImagesForVideo.value[0],
          );
        const lastImage =
          videoReferenceImages.value.find(
            (img) => img.id === selectedLastImageForVideo.value,
          ) ||
          previousStoryboardLastFrames.value.find(
            (img) => img.id === selectedLastImageForVideo.value,
          );

        // 优先使用 local_path
        if (firstImage?.local_path) {
          requestParams.first_frame_local_path = firstImage.local_path;
        } else if (firstImage?.image_url) {
          requestParams.first_frame_url = firstImage.image_url;
        }
        if (lastImage?.local_path) {
          requestParams.last_frame_local_path = lastImage.local_path;
        } else if (lastImage?.image_url) {
          requestParams.last_frame_url = lastImage.image_url;
        }
        break;

      case "multiple":
        // 多图模式 - 优先使用 local_path
        const selectedImages = selectedImagesForVideo.value
          .map((id) => videoReferenceImages.value.find((img) => img.id === id))
          .filter((img) => img?.local_path || img?.image_url)
          .map((img) => img!.local_path || img!.image_url);
        requestParams.reference_image_urls = selectedImages;
        break;

      case "none":
        // 无参考图模式
        break;
    }

    const result = await videoAPI.generateVideo(requestParams);

    generatedVideos.value.unshift(result);
    ElMessage.success("视频生成任务已提交");

    // 启动视频轮询
    startVideoPolling();
  } catch (error: any) {
    ElMessage.error("生成失败: " + (error.message || "未知错误"));
  } finally {
    generatingVideo.value = false;
  }
};

// 加载分镜的视频参考图片（所有帧类型）
const loadVideoReferenceImages = async (storyboardId: number) => {
  try {
    const result = await imageAPI.listImages({
      storyboard_id: storyboardId,
      page: 1,
      page_size: 100,
    });
    videoReferenceImages.value = result.items || [];
  } catch (error: any) {
    console.error("加载视频参考图片失败:", error);
  }
};

// 加载分镜的视频列表
const loadStoryboardVideos = async (storyboardId: number) => {
  loadingVideos.value = true;
  try {
    const result = await videoAPI.listVideos({
      storyboard_id: storyboardId.toString(),
      page: 1,
      page_size: 50,
    });
    generatedVideos.value = result.items || [];

    // 如果有进行中的任务，启动轮询
    const hasPendingOrProcessing = generatedVideos.value.some(
      (v) => v.status === "pending" || v.status === "processing",
    );
    if (hasPendingOrProcessing) {
      startVideoPolling();
    }
  } catch (error: any) {
    console.error("加载视频列表失败:", error);
  } finally {
    loadingVideos.value = false;
  }
};

// 启动视频状态轮询
const startVideoPolling = () => {
  if (videoPollingTimer) return;

  videoPollingTimer = setInterval(async () => {
    if (!currentStoryboard.value) {
      stopVideoPolling();
      return;
    }

    try {
      // 保存旧的视频列表用于对比
      const oldVideos = [...generatedVideos.value];

      const result = await videoAPI.listVideos({
        storyboard_id: currentStoryboard.value.id.toString(),
        page: 1,
        page_size: 50,
      });
      generatedVideos.value = result.items || [];

      // 检测是否有视频从 processing 变为 completed
      const hasNewlyCompleted = generatedVideos.value.some((newVideo) => {
        const oldVideo = oldVideos.find((v) => v.id === newVideo.id);
        return (
          oldVideo &&
          (oldVideo.status === "pending" || oldVideo.status === "processing") &&
          newVideo.status === "completed"
        );
      });

      // 如果有视频完成，重新加载分镜列表以更新 duration
      if (hasNewlyCompleted && episodeId.value) {
        try {
          const storyboardsRes = await dramaAPI.getStoryboards(
            episodeId.value.toString(),
          );
          storyboards.value = storyboardsRes?.storyboards || [];
        } catch (error) {
          console.error("重新加载分镜列表失败:", error);
        }
      }

      // 如果没有进行中的任务，停止轮询
      const hasPendingOrProcessing = generatedVideos.value.some(
        (v) => v.status === "pending" || v.status === "processing",
      );
      if (!hasPendingOrProcessing) {
        stopVideoPolling();
      }
    } catch (error) {
      console.error("轮询视频状态失败:", error);
    }
  }, 5000); // 每5秒轮询一次
};

// 停止视频轮询
const stopVideoPolling = () => {
  if (videoPollingTimer) {
    clearInterval(videoPollingTimer);
    videoPollingTimer = null;
  }
};

const toggleCharacterInShot = async (charId: number) => {
  if (!currentStoryboard.value) return;

  // 初始化characters数组
  if (!currentStoryboard.value.characters) {
    currentStoryboard.value.characters = [];
  }

  const char = characters.value.find((c) => c.id === charId);
  if (!char) return;

  // 检查是否已存在
  const existIndex = currentStoryboard.value.characters.findIndex((c) =>
    typeof c === "object" ? c.id === charId : c === charId,
  );

  if (existIndex > -1) {
    // 移除角色
    currentStoryboard.value.characters.splice(existIndex, 1);
  } else {
    // 添加角色（作为对象）
    currentStoryboard.value.characters.push(char);
  }

  // 保存到后端
  try {
    const characterIds = currentStoryboard.value.characters.map((c) =>
      typeof c === "object" ? c.id : c,
    );

    await dramaAPI.updateStoryboard(currentStoryboard.value.id.toString(), {
      character_ids: characterIds,
    });

    if (existIndex > -1) {
      ElMessage.success(`已移除角色: ${char.name}`);
    } else {
      ElMessage.success(`已添加角色: ${char.name}`);
    }
  } catch (error: any) {
    ElMessage.error("保存失败: " + (error.message || "未知错误"));
    // 回滚操作
    if (existIndex > -1) {
      currentStoryboard.value.characters.push(char);
    } else {
      currentStoryboard.value.characters.splice(
        currentStoryboard.value.characters.length - 1,
        1,
      );
    }
  }
};

const removeCharacterFromShot = async (charId: number) => {
  if (!currentStoryboard.value) return;

  // 初始化characters数组
  if (!currentStoryboard.value.characters) {
    currentStoryboard.value.characters = [];
  }

  const char = characters.value.find((c) => c.id === charId);
  if (!char) return;

  // 检查是否已存在
  const existIndex = currentStoryboard.value.characters.findIndex((c) =>
    typeof c === "object" ? c.id === charId : c === charId,
  );

  if (existIndex > -1) {
    // 移除角色
    currentStoryboard.value.characters.splice(existIndex, 1);
  }

  // 保存到后端
  try {
    const characterIds = currentStoryboard.value.characters.map((c) =>
      typeof c === "object" ? c.id : c,
    );

    await dramaAPI.updateStoryboard(currentStoryboard.value.id.toString(), {
      character_ids: characterIds,
    });

    ElMessage.success(`已移除角色: ${char.name}`);
  } catch (error: any) {
    ElMessage.error("保存失败: " + (error.message || "未知错误"));
    // 回滚操作
    currentStoryboard.value.characters.push(char);
  }
};

const loadData = async () => {
  try {
    // 加载剧集信息
    const dramaRes = await dramaAPI.get(dramaId.toString());
    drama.value = dramaRes;

    // 找到当前章节
    const ep = dramaRes.episodes?.find(
      (e) => e.episode_number === episodeNumber,
    );
    if (!ep) {
      ElMessage.error("章节不存在");
      router.back();
      return;
    }

    episode.value = ep;
    episodeId.value = ep.id;

    // 加载分镜列表
    const storyboardsRes = await dramaAPI.getStoryboards(ep.id.toString());

    // API返回格式: {storyboards: [...], total: number}
    storyboards.value = storyboardsRes?.storyboards || [];

    // 默认选中第一个分镜
    if (storyboards.value.length > 0 && !currentStoryboardId.value) {
      currentStoryboardId.value = storyboards.value[0].id;
    }

    // 加载角色列表
    characters.value = dramaRes.characters || [];

    // 加载可用场景列表
    availableScenes.value = dramaRes.scenes || [];

    // 加载道具列表
    props.value = dramaRes.props || [];

    // 加载视频素材库
    await loadVideoAssets();
  } catch (error: any) {
    ElMessage.error("加载数据失败: " + (error.message || "未知错误"));
  }
};

const selectScene = async (sceneId: number) => {
  if (!currentStoryboard.value) return;

  try {
    // TODO: 调用API更新分镜的scene_id
    await dramaAPI.updateStoryboard(currentStoryboard.value.id.toString(), {
      scene_id: sceneId,
    });

    // 重新加载数据
    await loadData();
    showSceneSelector.value = false;
    ElMessage.success("场景关联成功");
  } catch (error: any) {
    ElMessage.error(error.message || "场景关联失败");
  }
};

const selectStoryboard = (id: string) => {
  currentStoryboardId.value = id;
};

const handleTimelineSelect = (sceneId: number) => {
  selectStoryboard(String(sceneId));
};

const togglePlay = () => {
  if (currentPlayState.value === "playing") {
    currentPlayState.value = "paused";
  } else {
    currentPlayState.value = "playing";
  }
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const zoomIn = () => {
  ElMessage.info("时间线缩放功能开发中");
};

const zoomOut = () => {
  ElMessage.info("时间线缩放功能开发中");
};

const generateImage = async () => {
  if (!currentStoryboard.value) return;

  try {
    ElMessage.info("图片生成功能开发中");
  } catch (error: any) {
    ElMessage.error(error.message || "生成失败");
  }
};

const uploadImage = () => {
  if (!currentStoryboard.value) {
    ElMessage.warning("请先选择镜头");
    return;
  }

  // 创建隐藏的文件输入
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.error("图片大小不能超过 10MB");
      return;
    }

    try {
      // 创建 FormData
      const formData = new FormData();
      formData.append("file", file);

      // 上传到服务器
      const response = await fetch("/api/v1/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("上传失败");
      }

      const result = await response.json();
      const imageUrl = result.data?.url;

      if (imageUrl && currentStoryboard.value) {
        // 创建图片生成记录（关联到当前镜头和帧类型）
        await imageAPI.uploadImage({
          storyboard_id: currentStoryboard.value.id,
          drama_id: parseInt(dramaId),
          frame_type: selectedFrameType.value || "first",
          image_url: imageUrl,
          prompt: currentFramePrompt.value || "用户上传图片",
        });

        // 刷新图片列表
        await loadStoryboardImages(
          currentStoryboard.value.id,
          selectedFrameType.value,
        );

        ElMessage.success("图片上传成功");
      }
    } catch (error: any) {
      console.error("上传图片失败:", error);
      ElMessage.error(error.message || "上传失败");
    }
  };
  input.click();
};

// 删除图片
const handleDeleteImage = async (img: ImageGeneration) => {
  if (!currentStoryboard.value) return;

  try {
    await ElMessageBox.confirm("确定要删除这张图片吗？", "确认删除", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    await imageAPI.deleteImage(img.id);
    ElMessage.success("删除成功");

    // 重新加载当前帧类型的图片列表
    await loadStoryboardImages(
      currentStoryboard.value.id,
      selectedFrameType.value,
    );
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除图片失败:", error);
      ElMessage.error(error.message || "删除失败");
    }
  }
};

// 加载所有已生成的图片（用于宫格编辑器）
const loadAllGeneratedImages = async () => {
  if (!currentStoryboard.value) return;

  try {
    const result = await imageAPI.listImages({
      storyboard_id: currentStoryboard.value.id,
      page: 1,
      page_size: 100,
    });
    allGeneratedImages.value = result.items || [];
  } catch (error: any) {
    console.error("加载所有图片失败:", error);
  }
};

// 处理宫格图片创建成功
const handleGridImageSuccess = async () => {
  if (currentStoryboard.value) {
    // 刷新动作序列图片列表
    await loadStoryboardImages(currentStoryboard.value.id, "action");
    // 重新加载所有图片
    await loadAllGeneratedImages();
  }
};

// 打开裁剪对话框
const openCropDialog = (img: ImageGeneration) => {
  cropImageData.value = img;
  cropImageUrl.value = getImageUrl(img) || "";
  showCropDialog.value = true;
};

// 处理裁剪保存
const handleCropSave = async (images: { blob: Blob; frameType: string }[]) => {
  if (!currentStoryboard.value || !cropImageData.value) return;

  try {
    // 将 Blob 转换为 base64 data URL
    const convertBlobToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    // 上传裁剪后的图片并创建新的图片生成记录
    for (const img of images) {
      // 将 Blob 转换为 base64
      const imageUrl = await convertBlobToBase64(img.blob);

      // 调用上传接口
      await imageAPI.uploadImage({
        storyboard_id: currentStoryboard.value.id,
        drama_id: Number(dramaId),
        frame_type: img.frameType,
        image_url: imageUrl,
        prompt: cropImageData.value.prompt || "",
      });
    }

    ElMessage.success("裁剪图片保存成功");

    // 刷新图片列表 - 刷新所有帧类型的图片，确保新裁剪的图片能在视频生成tab中被选择到
    if (currentStoryboard.value) {
      // 刷新当前镜头的所有图片（不限制帧类型）
      await loadStoryboardImages(currentStoryboard.value.id);
      // 刷新所有生成的图片列表
      await loadAllGeneratedImages();
    }
  } catch (error) {
    console.error("Failed to save cropped images:", error);
    ElMessage.error("保存裁剪图片失败");
  }
};

const goBack = () => {
  router.replace({
    name: "EpisodeWorkflowNew",
    params: { id: dramaId, episodeNumber },
  });
};

const handleAddStoryboard = async () => {
  if (!episodeId.value) return;

  try {
    const nextShotNumber =
      storyboards.value.length > 0
        ? Math.max(...storyboards.value.map((s) => s.storyboard_number)) + 1
        : 1;

    await dramaAPI.createStoryboard({
      episode_id: parseInt(episodeId.value),
      storyboard_number: nextShotNumber,
      title: `镜头 ${nextShotNumber}`,
      description: "新镜头描述",
      action: "动作描述",
      dialogue: "",
      duration: 5,
      scene_id:
        storyboards.value.length > 0
          ? storyboards.value[storyboards.value.length - 1].scene_id
          : undefined,
    });

    ElMessage.success("添加分镜成功");
    await loadData(); // Refresh list

    // Select the new storyboard (the last one)
    if (storyboards.value.length > 0) {
      selectStoryboard(storyboards.value[storyboards.value.length - 1].id);
    }
  } catch (error: any) {
    console.error("添加分镜失败:", error);
    ElMessage.error(error.message || "添加分镜失败");
  }
};

const handleDeleteStoryboard = async (storyboard: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除镜头 ${storyboard.storyboard_number} 吗？此操作不可恢复。`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    await dramaAPI.deleteStoryboard(storyboard.id);
    ElMessage.success("删除分镜成功");

    // If deleted current storyboard, clear selection or select another
    if (currentStoryboardId.value === storyboard.id) {
      currentStoryboardId.value = undefined;
      currentStoryboard.value = undefined;
    }

    await loadData();
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除分镜失败:", error);
      ElMessage.error(error.message || "删除分镜失败");
    }
  }
};

// 加载视频合成列表
const loadVideoMerges = async () => {
  if (!episodeId.value) return;

  try {
    loadingMerges.value = true;
    const result = await videoMergeAPI.listMerges({
      episode_id: episodeId.value.toString(),
      page: 1,
      page_size: 20,
    });
    videoMerges.value = result.merges;

    // 检查是否有进行中的任务
    const hasProcessingTasks = result.merges.some(
      (merge: any) =>
        merge.status === "pending" || merge.status === "processing",
    );

    if (hasProcessingTasks) {
      startMergePolling();
    } else {
      stopMergePolling();
    }
  } catch (error: any) {
    console.error("加载视频合成列表失败:", error);
    ElMessage.error("加载视频合成列表失败");
  } finally {
    loadingMerges.value = false;
  }
};

// 启动视频合成列表轮询
const startMergePolling = () => {
  if (mergePollingTimer) return;

  mergePollingTimer = setInterval(async () => {
    if (!episodeId.value) {
      stopMergePolling();
      return;
    }

    try {
      const result = await videoMergeAPI.listMerges({
        episode_id: episodeId.value.toString(),
        page: 1,
        page_size: 20,
      });
      videoMerges.value = result.merges;

      // 检查是否还有进行中的任务
      const hasProcessingTasks = result.merges.some(
        (merge: any) =>
          merge.status === "pending" || merge.status === "processing",
      );

      if (!hasProcessingTasks) {
        stopMergePolling();
      }
    } catch (error) {}
  }, 3000); // 每3秒轮询一次
};

// 停止视频合成列表轮询
const stopMergePolling = () => {
  if (mergePollingTimer) {
    clearInterval(mergePollingTimer);
    mergePollingTimer = null;
  }
};

// 处理视频合成完成事件
const handleMergeCompleted = async (mergeId: number) => {
  // 刷新视频合成列表
  await loadVideoMerges();
  // 切换到视频合成标签页
  activeTab.value = "merges";
};

// 下载视频
const downloadVideo = async (url: string, title: string) => {
  try {
    const loadingMsg = ElMessage.info({
      message: "正在准备下载...",
      duration: 0,
    });

    // 处理相对路径，添加 /static/ 前缀
    const videoUrl = url.startsWith("http") ? url : `/static/${url}`;

    // 使用fetch获取视频blob
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    // 创建下载链接
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${title}.mp4`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    // 清理
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 100);

    loadingMsg.close();
    ElMessage.success("视频下载已开始");
  } catch (error) {
    console.error("下载视频失败:", error);
    ElMessage.error("视频下载失败，请稍后重试");
  }
};

// 预览合成视频
const previewMergedVideo = (url: string) => {
  // 处理相对路径，添加 /static/ 前缀
  const videoUrl = url.startsWith("http") ? url : `/static/${url}`;
  window.open(videoUrl, "_blank");
};

// 删除视频合成记录
const deleteMerge = async (mergeId: number) => {
  try {
    await ElMessageBox.confirm(
      "确定要删除此合成记录吗？此操作不可恢复。",
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    await videoMergeAPI.deleteMerge(mergeId);
    ElMessage.success("删除成功");
    // 刷新列表
    await loadVideoMerges();
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除失败:", error);
      ElMessage.error(error.response?.data?.message || "删除失败");
    }
  }
};

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  // 超过7天显示完整日期
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
};

onMounted(async () => {
  await loadData();
  await loadVideoModels();
  await loadVideoMerges();
});

// 组件卸载时停止轮询
onBeforeUnmount(() => {
  stopPolling();
  stopVideoPolling();
  stopMergePolling();
});
</script>

<style scoped lang="scss">
// 镜头列表项样式
.storyboard-item {
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  border: 1px solid var(--border-primary);
  margin-bottom: 8px;
  display: flex;
  gap: 10px;
  align-items: center;
  background: var(--bg-card);

  &:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-secondary);
  }

  &.active {
    background: var(--accent);
    border-color: var(--accent);

    .shot-number,
    .shot-title {
      color: var(--text-inverse) !important;
    }

    .shot-duration {
      background: rgba(255, 255, 255, 0.2);
      color: var(--text-inverse);
    }
  }

  .shot-thumbnail {
    width: 80px;
    height: 50px;
    border-radius: 4px;
    overflow: hidden;
    background: var(--bg-secondary);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .shot-content {
    flex: 1;
    min-width: 0;

    .shot-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;

      .shot-number {
        font-size: 11px;
        color: var(--text-secondary);
        font-weight: 500;
      }

      .shot-duration {
        font-size: 11px;
        color: var(--text-secondary);
        background: var(--bg-secondary);
        padding: 2px 6px;
        border-radius: 3px;
      }
    }

    .shot-title {
      font-size: 13px;
      color: var(--text-primary);
      font-weight: 500;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

// 视频合成列表样式
.merges-list {
  padding: 16px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  background: var(--bg-secondary);

  .merge-items {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .merge-item {
    position: relative;
    background: var(--bg-card);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--border-primary);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
      border-color: var(--accent);
    }

    .status-indicator {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      transition: all 0.3s;
    }

    &.merge-status-completed .status-indicator {
      background: linear-gradient(to bottom, #67c23a, #85ce61);
    }

    &.merge-status-processing .status-indicator {
      background: linear-gradient(to bottom, #e6a23c, #f0c78a);
      animation: pulse 2s ease-in-out infinite;
    }

    &.merge-status-failed .status-indicator {
      background: linear-gradient(to bottom, #f56c6c, #f89898);
    }

    &.merge-status-pending .status-indicator {
      background: linear-gradient(to bottom, #909399, #b1b3b8);
    }

    .merge-content {
      padding: 20px 24px;
      padding-left: 28px;
    }

    .merge-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border-primary);

      .title-section {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;

        .title-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          transition: all 0.3s;
        }

        .merge-title {
          margin: 0;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-secondary);
          line-height: 1.4;
        }
      }

      :deep(.el-tag) {
        font-weight: 500;
        padding: 4px 12px;
        font-size: 12px;
      }
    }

    &.merge-status-completed .title-icon {
      background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
      color: #fff;
    }

    &.merge-status-processing .title-icon {
      background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
      color: #fff;
    }

    &.merge-status-failed .title-icon {
      background: linear-gradient(135deg, #f56c6c 0%, #f89898 100%);
      color: #fff;
    }

    .merge-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 16px;

      .detail-item {
        display: flex;
        gap: 10px;
        padding: 12px 14px;
        background: var(--bg-secondary);
        border-radius: 8px;
        border: 1px solid var(--border-primary);
        transition: all 0.3s;

        &:hover {
          border-color: var(--accent);
          transform: translateY(-1px);
        }

        .detail-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: var(--bg-card);
          color: var(--accent);
          flex-shrink: 0;
        }

        .detail-content {
          flex: 1;
          min-width: 0;

          .detail-label {
            font-size: 11px;
            color: var(--text-muted);
            margin-bottom: 3px;
            font-weight: 500;
          }

          .detail-value {
            font-size: 13px;
            color: var(--text-primary);
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }
    }

    .merge-error {
      margin-bottom: 12px;

      :deep(.el-alert) {
        border-radius: 8px;
        border: none;
        padding: 8px 12px;
        font-size: 12px;
      }
    }

    .merge-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;

      :deep(.el-button) {
        flex: 1;
        max-width: 160px;
        font-weight: 500;
        padding: 8px 15px;
        font-size: 13px;
      }
    }
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

.rotating {
  animation: rotating 2s linear infinite;
}

// 脉冲动画
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.6;
  }
}

// 白色主题样式
.shot-editor-new {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  // background: #fff;

  .section-label {
    font-size: 12px;
    color: #666;
    margin-bottom: 8px;
  }

  // 场景预览
  .scene-section {
    margin-bottom: 20px;
  }

  .scene-preview {
    width: 100%;
    height: 80px;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    background: #f5f5f5;
    border: 1px solid var(--border-primary);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .scene-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 6px 8px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
      font-size: 11px;
      color: #fff;

      .scene-id {
        font-size: 10px;
        color: #e0e0e0;
        margin-top: 2px;
      }
    }
  }

  .scene-preview-empty {
    width: 100%;
    height: 80px;
    border-radius: 6px;
    border: 1px dashed #d0d0d0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: #fafafa;

    .el-icon {
      font-size: 32px !important;
      color: #c0c0c0;
    }

    div {
      font-size: 11px;
      color: #999;
    }
  }

  // 角色列表
  .cast-section {
    margin-bottom: 20px;
  }

  .cast-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 8px;

    .cast-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        .cast-avatar {
          border-color: #409eff;
        }

        .cast-remove {
          opacity: 1;
          visibility: visible;
        }
      }

      &.active {
        .cast-avatar {
          border-color: #409eff;
          background: #409eff;
        }
      }

      .cast-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid #e0e0e0;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f5f5f5;
        font-size: 14px;
        font-weight: 500;
        color: #666;
        transition: all 0.2s;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }

      .cast-name {
        font-size: 10px;
        color: #666;
        max-width: 36px;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cast-remove {
        position: absolute;
        top: -3px;
        right: -3px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #f56c6c;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        z-index: 10;
        opacity: 0;
        visibility: hidden;
        font-size: 12px;

        &:hover {
          background: #f23030;
          transform: scale(1.1);
        }
      }
    }

    .cast-empty {
      width: 100%;
      text-align: center;
      padding: 15px;
      color: var(--text-muted);
      font-size: 11px;
    }
  }

  // 视效设置
  .settings-section {
    margin-bottom: 16px;

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;

      .setting-item {
        label {
          display: block;
          font-size: 11px;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
      }
    }

    .audio-controls {
      margin-top: 8px;
    }
  }

  // 叙事内容
  .narrative-section {
    margin-bottom: 14px;
  }

  .dialogue-section {
    margin-bottom: 14px;
  }
}

// 场景选择对话框样式
.scene-selector-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding: 10px;

  .scene-card {
    border: 2px solid var(--border-primary);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    &.selected {
      border-color: var(--accent);
      background: var(--accent-light);
    }

    .scene-image {
      width: 100%;
      height: 150px;
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .scene-info {
      padding: 12px;
      background: var(--bg-card);

      .scene-location {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 4px;
      }

      .scene-time {
        font-size: 12px;
        color: var(--text-muted);
      }
    }
  }

  .empty-scenes {
    grid-column: 1 / -1;
    padding: 40px 0;
  }
}

// 更新section-label样式以支持按钮
.section-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

// 角色选择对话框样式
.character-selector-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding: 12px;

  .character-card {
    position: relative;
    border: 2px solid var(--border-primary);
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    &:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    &.selected {
      border-color: var(--accent);
      background: var(--accent-light);
    }

    .character-avatar-large {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-secondary);
      font-size: 32px;
      font-weight: 600;
      color: var(--accent);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .character-info {
      text-align: center;

      .character-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 4px;
      }

      .character-role {
        font-size: 12px;
        color: var(--text-muted);
      }
    }

    .character-check {
      position: absolute;
      top: 8px;
      right: 8px;
    }
  }

  .empty-characters {
    grid-column: 1 / -1;
    padding: 40px 0;
  }
}

// 角色大图预览样式
.character-image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;

  img {
    max-width: 100%;
    max-height: 500px;
    border-radius: 8px;
    object-fit: contain;
  }
}

// 场景大图预览样式
.scene-image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 450px;
  background: var(--bg-secondary);
  border-radius: 8px;

  img {
    max-width: 100%;
    max-height: 600px;
    border-radius: 8px;
    object-fit: contain;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

// 设置部分样式
.settings-section {
  margin-bottom: 20px;

  .section-label {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    .setting-item {
      label {
        display: block;
        font-size: 11px;
        color: var(--text-secondary);
        margin-bottom: 6px;
      }
    }
  }

  .audio-controls {
    :deep(.el-textarea__inner) {
      background: var(--bg-card);
      border-color: var(--border-primary);
      color: var(--text-primary);

      &::placeholder {
        color: var(--text-muted);
      }
    }

    :deep(.el-select) {
      width: 100%;
    }

    :deep(.el-slider__runway) {
      background: #e4e7ed;
    }

    :deep(.el-slider__bar) {
      background: #409eff;
    }

    :deep(.el-slider__button) {
      border-color: #409eff;
    }
  }
}

.professional-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border-primary);

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .back-btn {
        color: var(--text-secondary);

        &:hover {
          color: var(--accent);
        }
      }

      .episode-title {
        font-size: 14px;
        color: var(--text-primary);
      }
    }

    .toolbar-right {
      display: flex;
      gap: 8px;
    }
  }

  .editor-main {
    flex: 1;
    display: flex;
    overflow: hidden;
    height: calc(100vh - 60px);

    .storyboard-panel {
      width: 280px;
      background: var(--bg-card);
      border-right: 1px solid var(--border-primary);
      display: flex;
      flex-direction: column;

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid var(--border-primary);

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
        }
      }

      .storyboard-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;

        .storyboard-item {
          display: flex;
          flex-direction: column;
          padding: 12px;
          margin-bottom: 8px;
          background: var(--bg-secondary);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: var(--bg-card-hover);
          }

          &.active {
            background: var(--accent-light);
            border-left: 3px solid var(--accent);

            .shot-content {
              .shot-number,
              .shot-title {
                color: var(--accent) !important;
              }

              .shot-action {
                color: var(--text-primary) !important;
              }

              .shot-duration {
                background: var(--accent-light);
                color: var(--accent);
              }
            }
          }

          .shot-content {
            width: 100%;

            .shot-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 6px;
              gap: 8px;

              .shot-title-row {
                display: flex;
                align-items: baseline;
                gap: 8px;
                flex: 1;
                min-width: 0;

                .shot-number {
                  font-size: 12px;
                  font-weight: 600;
                  color: var(--text-secondary);
                  flex-shrink: 0;
                }

                .shot-title {
                  font-size: 13px;
                  font-weight: 500;
                  color: var(--text-primary);
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
              }

              .shot-duration {
                font-size: 11px;
                color: var(--text-muted);
                background: var(--bg-card-hover);
                padding: 2px 8px;
                border-radius: 4px;
                flex-shrink: 0;
              }
            }

            .shot-action {
              font-size: 11px;
              color: var(--text-secondary);
              line-height: 1.5;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }
          }
        }
      }
    }

    .timeline-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--bg-secondary);
      overflow: hidden;

      .empty-timeline {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    .edit-panel {
      width: 520px;
      background: var(--bg-card);
      border-left: 1px solid var(--border-primary);
      overflow: hidden;
      flex-shrink: 0;

      .edit-tabs {
        height: 100%;

        :deep(.el-tabs__header) {
          margin: 0;
          background: var(--bg-secondary);
          padding: 0 16px;
          border-bottom: 1px solid var(--border-primary);
        }

        :deep(.el-tabs__content) {
          height: calc(100% - 55px);
          overflow-y: auto;
        }

        .tab-content {
          padding: 16px;
        }

        .scene-editor,
        .shot-editor {
          .el-form-item {
            margin-bottom: 16px;
          }
        }
      }
    }
  }
}

// 通用参数行样式
.param-row {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.param-label {
  min-width: 50px;
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

// 图片生成界面样式
.image-generation-section {
  .frame-type-selector {
    margin-bottom: 20px;

    .section-label {
      font-size: 13px;
      color: var(--text-primary);
      font-weight: 500;
      margin-bottom: 12px;
    }

    :deep(.el-radio-group) {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .panel-count-input {
      width: 80px;
    }
  }

  .prompt-section {
    margin-bottom: 20px;

    .section-label {
      font-size: 13px;
      color: var(--text-primary);
      font-weight: 500;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }

    :deep(.el-textarea__inner) {
      font-family: "Monaco", "Menlo", "Consolas", monospace;
      font-size: 12px;
      line-height: 1.6;
    }
  }

  .generation-controls {
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
  }

  .generation-result {
    .section-label {
      font-size: 13px;
      color: var(--text-primary);
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;

      &::before {
        content: "";
        width: 3px;
        height: 14px;
        background: linear-gradient(
          to bottom,
          var(--accent),
          var(--accent-hover)
        );
        border-radius: 2px;
      }
    }

    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;

      .image-item-wrapper {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .image-item {
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        background: var(--bg-card);
        border: 1px solid var(--border-primary);
        transition: all 0.2s ease;
        cursor: pointer;
        box-shadow: var(--shadow-sm);
        height: 150px;

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          // border-color: var(--accent);

          .image-actions {
            transform: translateY(0);
            opacity: 0.7;
          }
        }

        :deep(.el-image) {
          width: 100%;
          aspect-ratio: 16 / 9;
          background: var(--bg-secondary);
          display: block;
          height: 100%;
        }

        .image-placeholder {
          width: 100%;
          aspect-ratio: 16 / 9;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--bg-secondary);
          color: var(--text-muted);
          position: relative;
          overflow: hidden;
          height: 100%;

          &::before {
            content: "";
            position: absolute;
            width: 200%;
            height: 200%;
            background: linear-gradient(
              45deg,
              transparent 30%,
              var(--border-secondary) 50%,
              transparent 70%
            );
            animation: shimmer 2s infinite;
            top: -50%;
            left: -50%;
          }

          .el-icon {
            position: relative;
            z-index: 1;
            font-size: 24px !important;
          }

          p {
            margin: 0;
            font-size: 11px;
            font-weight: 500;
            position: relative;
            z-index: 1;
          }
        }

        .image-actions {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--bg-primary);
          opacity: 0;
          padding: 0 8px;
          height: 32px;
          transform: translateY(100%);
          transition:
            transform 0.3s ease,
            opacity 0.2s ease;

          .crop-icon-overlay,
          .delete-icon-overlay {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s ease;

            &:hover {
              cursor: pointer;
              background: var(--bg-secondary);
              transform: scale(1.1);
            }
          }
        }
      }

      .image-status {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 2px 0;

        :deep(.el-tag) {
          font-size: 10px;
          height: 20px;
          padding: 0 6px;
        }
      }
    }

    @keyframes shimmer {
      0% {
        transform: translateX(-100%) translateY(-100%) rotate(45deg);
      }

      100% {
        transform: translateX(100%) translateY(100%) rotate(45deg);
      }
    }
  }

  .panel-count-label {
    margin-left: 5px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .model-tags {
    font-size: 12px;
    color: var(--text-muted);
  }

  .mode-description {
    font-size: 12px;
    color: var(--text-muted);
  }
}

// 视频生成样式
.video-generation-section {
  .section-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
    padding-left: 8px;
    border-left: 3px solid var(--accent);
  }

  // 视频生成结果样式
  .generation-result {
    margin-top: 24px;

    .section-label {
      font-size: 13px;
      color: #303133;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;

      // &::before {
      //   content: '';
      //   width: 3px;
      //   height: 14px;
      //   background: linear-gradient(to bottom, #409eff, #66b1ff);
      //   border-radius: 2px;
      // }
    }

    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;

      .image-item {
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        background: #fff;
        border: 1px solid #e8e8e8;
        transition: all 0.2s ease;
        cursor: pointer;
        height: 150px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

          .video-actions {
            transform: translateY(0);
            opacity: 0.7;
          }
        }

        .image-placeholder {
          width: 100%;
          aspect-ratio: 16 / 9;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf0 100%);
          color: #909399;
          position: relative;
          overflow: hidden;
          height: 100%;

          &::before {
            content: "";
            position: absolute;
            width: 200%;
            height: 200%;
            background: linear-gradient(
              45deg,
              transparent 30%,
              var(--border-secondary) 50%,
              transparent 70%
            );
            animation: shimmer 2s infinite;
            top: -50%;
            left: -50%;
          }

          .el-icon {
            position: relative;
            z-index: 1;
            font-size: 24px !important;
          }

          p {
            margin: 0;
            font-size: 11px;
            font-weight: 500;
            position: relative;
            z-index: 1;
          }
        }

        .image-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 6px 8px;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.75),
            rgba(0, 0, 0, 0.2) 70%,
            transparent
          );
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 4px;

          :deep(.el-tag) {
            backdrop-filter: blur(8px);
            font-size: 10px;
            height: 20px;
            padding: 0 6px;
          }

          .frame-type-tag {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            background: rgba(255, 255, 255, 0.25);
            color: white;
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
        }

        // 视频缩略图特殊样式
        &.video-item .video-thumbnail {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          cursor: pointer;

          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            pointer-events: none;
          }

          .play-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.3);
            opacity: 0;
            transition: opacity 0.2s ease;

            .el-icon {
              filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
            }
          }

          &:hover .play-overlay {
            opacity: 1;
          }
        }

        .video-actions {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--bg-primary);
          opacity: 0;
          padding: 0 8px;
          height: 32px;
          transform: translateY(100%);
          transition:
            transform 0.3s ease,
            opacity 0.2s ease;

          .add-to-assets-button,
          .delete-video-button {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s ease;

            &:hover {
              background: var(--bg-secondary);
              transform: scale(1.1);
            }

            .is-loading {
              animation: rotate 1s linear infinite;
            }
          }
        }
      }
    }
  }

  .reference-mode-title {
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 500;
  }

  .frame-label {
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .slot-hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .image-slot {
    position: relative;
    width: 140px;
    height: 90px;
    border: 2px dashed var(--border-primary);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    background: var(--bg-card);
    // display: flex;
    // align-items: center;
    // justify-content: center;

    &:hover {
      border-color: var(--accent);
    }
  }

  .video-params-section {
    margin-bottom: 16px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
    border: 1px solid var(--border-primary);
  }

  .image-slots-container {
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
    border: 1px dashed var(--border-primary);
  }

  .image-slot {
    position: relative;
    width: 140px;
    height: 90px;
    border: 2px dashed var(--border-primary);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s;
    background: var(--bg-card);

    &:hover {
      border-color: var(--accent);
      box-shadow: var(--shadow-md);
    }

    &.image-slot-small {
      width: 80px;
      height: 52px;
    }
  }

  .image-slot-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  .image-slot-remove {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 73, 73, 0.9);
      transform: scale(1.1);
    }
  }

  .reference-images-section {
    margin-top: 12px;

    .frame-type-buttons {
      margin-bottom: 12px;
      text-align: center;

      :deep(.el-radio-group) {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 0;
      }

      :deep(.el-radio-button) {
        overflow: hidden;

        &:first-child .el-radio-button__inner {
          border-radius: 6px 0 0 6px;
        }

        &:last-child .el-radio-button__inner {
          border-radius: 0 6px 6px 0;
        }
      }

      :deep(.el-radio-button__inner) {
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 500;
        border-color: var(--border-primary);
        transition: all 0.2s;

        &:hover {
          // color: var(--accent);
          border-color: var(--accent);
        }
      }

      :deep(.el-radio-button.is-active .el-radio-button__inner) {
        background: var(--accent);
        border-color: var(--accent);
        box-shadow: 0 2px 6px rgba(14, 165, 233, 0.25);
      }
    }

    .frame-type-content {
      padding: 4px 10px;
      background: var(--bg-card);
      border-radius: 8px;
      border: 1px solid var(--border-primary);
      min-height: 160px;
    }

    .image-scroll-container {
      max-height: 220px;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 4px;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;

        &:hover {
          background: #a8a8a8;
        }
      }
    }

    .previous-frame-section {
      margin-bottom: 12px;
      padding: 8px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 6px;

      .hint-text {
        color: var(--text-muted);
        font-size: 11px;
      }
    }

    .reference-grid {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 8px !important;

      .reference-item {
        // padding-top: 4px;
        margin-top: 6px;
        position: relative;
        border-radius: 6px;
        overflow: hidden;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s ease;
        width: 100% !important;
        max-width: 120px !important;
        background: var(--bg-card);

        &:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: var(--shadow-lg);
          border-color: var(--accent);
        }

        &.selected {
          border-color: var(--accent);
          box-shadow: var(--shadow-glow);
        }

        img {
          width: 100%;
          max-width: 180px;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          display: block;
          transition: transform 0.3s;
        }

        &:hover img {
          transform: scale(1.05);
        }

        .reference-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 4px 8px;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
          color: white;
          font-size: 10px;
          text-align: center;
        }
      }
    }
  }

  .generation-controls {
    margin-top: 40px;
    padding-top: 0;
    text-align: center;

    :deep(.el-button) {
      padding: 12px 32px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
      }
    }
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }

    100% {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }
}

// 视频合成列表样式
.merges-list {
  min-height: 300px;

  .merge-items {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .merge-item {
    position: relative;
    background: var(--bg-card);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--border-primary);
    box-shadow: var(--shadow-sm);

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      border-color: var(--accent-light);
    }

    // 状态指示条
    .status-indicator {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      transition: all 0.3s ease;
    }

    &.merge-status-pending .status-indicator {
      background: linear-gradient(to bottom, #909399, #b1b3b8);
    }

    &.merge-status-processing .status-indicator {
      background: linear-gradient(to bottom, #e6a23c, #f0c78a);
      animation: pulse 2s ease-in-out infinite;
    }

    &.merge-status-completed .status-indicator {
      background: linear-gradient(to bottom, #67c23a, #95d475);
    }

    &.merge-status-failed .status-indicator {
      background: linear-gradient(to bottom, #f56c6c, #f89898);
    }

    .merge-content {
      padding: 20px 20px 20px 24px;
    }

    .merge-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      gap: 12px;

      .title-section {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;

        .title-icon {
          color: #409eff;
          flex-shrink: 0;

          &.rotating {
            animation: rotate 1.5s linear infinite;
          }
        }

        .merge-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      :deep(.el-tag) {
        flex-shrink: 0;
        font-weight: 500;
        letter-spacing: 0.3px;
      }
    }

    .merge-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 8px;
      border: 1px solid var(--border-primary);

      .detail-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;

        .detail-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--bg-card);
          border-radius: 8px;
          color: var(--accent);
          flex-shrink: 0;
          box-shadow: var(--shadow-xs);
        }

        .detail-content {
          flex: 1;
          min-width: 0;

          .detail-label {
            font-size: 12px;
            color: var(--text-muted);
            margin-bottom: 4px;
            font-weight: 500;
          }

          .detail-value {
            font-size: 14px;
            color: var(--text-primary);
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }

    .merge-error {
      margin-bottom: 16px;

      :deep(.el-alert) {
        border-radius: 8px;
        border-left: 4px solid #f56c6c;
      }
    }

    .merge-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      padding-top: 16px;
      border-top: 1px solid var(--border-primary);

      :deep(.el-button) {
        font-weight: 500;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-1px);
        }

        &.el-button--primary {
          box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);

          &:hover {
            box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
          }
        }
      }
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.6;
    }
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }
}

.video-meta {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
}
</style>
<style>
.video-prompt-box {
  margin-bottom: 10px;
  padding: 8px 10px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--border-primary);
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

/* 动作序列图片裁剪图标样式 */
.action-image-item {
  position: relative;
}

/* .crop-icon-overlay {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 10;
} */

.action-image-item:hover .crop-icon-overlay {
  opacity: 1;
}

.crop-icon-overlay:hover {
  /* background: var(--accent); */
  transform: scale(1.1);
}

/* 删除按钮样式 */
/* .delete-icon-overlay {
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: 28px;
  height: 28px;
  background: rgba(220, 38, 38, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 10;
} */

.image-item:hover .delete-icon-overlay {
  opacity: 1;
}

.delete-icon-overlay:hover {
  /* background: rgba(220, 38, 38, 1); */
  transform: scale(1.1);
}

/* 宫格图片入口按钮样式 */
.grid-entry-button {
  cursor: pointer;
  transition: all 0.3s ease;
  border: none !important;
  min-height: 88px;
}

.grid-entry-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

.grid-entry-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 2px dashed var(--border-primary);
  border-radius: 8px;
  background: var(--bg-secondary);
  transition: all 0.3s ease;
}

.grid-entry-button:hover .grid-entry-placeholder {
  border-color: var(--accent);
  background: var(--bg-card);
}

/* 宫格图片编辑器样式 */
.creation-mode-selector,
.grid-type-selector {
  margin-bottom: 16px;
}

.grid-editor {
  margin-bottom: 20px;
}

.grid-container {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
}

.grid-container.grid-4 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-container.grid-6 {
  grid-template-columns: repeat(3, 1fr);
}

.grid-container.grid-9 {
  grid-template-columns: repeat(3, 1fr);
}

.grid-cell {
  position: relative;
  aspect-ratio: 1;
  border: 2px dashed var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--bg-card);
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

.grid-cell-placeholder p {
  margin-top: 8px;
  font-size: 12px;
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

.grid-controls {
  display: flex;
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
