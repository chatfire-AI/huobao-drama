<template>
  <div class="professional-editor">
    <!-- 顶部工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-button link @click="goBack" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
          返回剧集编辑
        </el-button>
        <el-divider direction="vertical" />
        <span class="episode-title">{{ drama?.title }} - 第{{ episodeNumber }}集</span>
      </div>
      
      <div class="toolbar-right">
        <el-button :icon="Setting" circle @click="showSettings = true" />
      </div>
    </div>

    <!-- 主编辑区域 -->
    <div class="editor-main">
      <!-- 左侧分镜列表 -->
      <div class="storyboard-panel">
        <div class="panel-header">
          <h3>剧本结构</h3>
          <el-button text :icon="Plus" @click="handleAddStoryboard">添加</el-button>
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
                  <span class="shot-number">镜头 {{ shot.storyboard_number }}</span>
                  <span class="shot-title">{{ shot.title || '未命名镜头' }}</span>
                </div>
                <div class="shot-duration">{{ shot.duration }}s</div>
              </div>
              <div class="shot-action" v-if="shot.action">{{ shot.action }}</div>
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
        <el-empty v-else description="暂无分镜" class="empty-timeline" />
      </div>

      <!-- 右侧编辑面板 -->
      <div class="edit-panel">
        <el-tabs v-model="activeTab" class="edit-tabs">
          <!-- 镜头属性标签 -->
          <el-tab-pane label="镜头属性" name="shot" v-if="currentStoryboard">
            <div v-if="currentStoryboard" class="shot-editor-new">
                <!-- 场景(Scene) -->
                <div class="scene-section">
                  <div class="section-label">
                    场景 (Scene)
                    <el-button size="small" text @click="showSceneSelector = true">选择场景</el-button>
                  </div>
                  <div class="scene-preview" v-if="currentStoryboard.background?.image_url" @click="showSceneImage">
                    <img :src="currentStoryboard.background.image_url" alt="场景" style="cursor: pointer;" />
                    <div class="scene-info">
                      <div>{{ currentStoryboard.background.location }} · {{ currentStoryboard.background.time }}</div>
                      <div class="scene-id">场景ID: {{ currentStoryboard.scene_id || 'N/A' }}</div>
                    </div>
                  </div>
                  <div class="scene-preview-empty" v-else>
                    <el-icon :size="48" color="#666"><Picture /></el-icon>
                    <div>{{ currentStoryboard.background ? '场景图片生成中...' : '未关联背景' }}</div>
                  </div>
                </div>

                <!-- 登场角色(Cast) -->
                <div class="cast-section">
                  <div class="section-label">
                    登场角色 (Cast)
                    <el-button size="small" text :icon="Plus" @click="showCharacterSelector = true">添加角色</el-button>
                  </div>
                  <div class="cast-list">
                    <div 
                      v-for="char in currentStoryboardCharacters" 
                      :key="char.id"
                      class="cast-item active"
                    >
                      <div class="cast-avatar" @click="showCharacterImage(char)">
                        <img v-if="char.image_url" :src="char.image_url" :alt="char.name" />
                        <span v-else>{{ char.name?.[0] || '?' }}</span>
                      </div>
                      <div class="cast-name">{{ char.name }}</div>
                      <div class="cast-remove" @click.stop="toggleCharacterInShot(char.id)" title="移除角色">
                        <el-icon :size="14"><Close /></el-icon>
                      </div>
                    </div>
                    <div v-if="!currentStoryboard?.characters || currentStoryboard.characters.length === 0" class="cast-empty">
                      未指定角色
                    </div>
                  </div>
                </div>

                <!-- 视效设置 -->
                <div class="settings-section">
                  <div class="section-label">视效设置</div>
                  <div class="settings-grid">
                    <div class="setting-item">
                      <label>景别</label>
                      <el-select v-model="currentStoryboard.shot_type" size="small" placeholder="选择景别" @change="saveStoryboardField('shot_type')">
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
                      <label>运镜方式</label>
                      <el-select v-model="currentStoryboard.movement" size="small" placeholder="运镜方式" @change="saveStoryboardField('movement')">
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
                      <label>镜头角度</label>
                      <el-select v-model="currentStoryboard.angle" size="small" placeholder="镜头角度" @change="saveStoryboardField('angle')">
                        <el-option label="平视" value="平视" />
                        <el-option label="俯视" value="俯视" />
                        <el-option label="仰视" value="仰视" />
                        <el-option label="大俯视（鸟瞰）" value="大俯视（鸟瞰）" />
                        <el-option label="大仰视" value="大仰视" />
                        <el-option label="正侧面" value="正侧面" />
                        <el-option label="斜侧面" value="斜侧面" />
                        <el-option label="背面" value="背面" />
                        <el-option label="倾斜（荷兰角）" value="倾斜（荷兰角）" />
                        <el-option label="主观视角" value="主观视角" />
                        <el-option label="过肩" value="过肩" />
                      </el-select>
                    </div>
                  </div>
                </div>

                <!-- 叙事内容 -->
                <div class="narrative-section">
                  <div class="section-label">动作描述 (Action)</div>
                  <el-input 
                    v-model="currentStoryboard.action" 
                    type="textarea" 
                    :rows="3"
                    placeholder="描述角色的动作过程..."
                  />
                </div>

                <div class="narrative-section">
                  <div class="section-label">动作结果 (Result)</div>
                  <el-input 
                    v-model="currentStoryboard.result" 
                    type="textarea" 
                    :rows="2"
                    placeholder="描述动作完成后的状态..."
                  />
                </div>

                <div class="dialogue-section">
                  <div class="section-label">对白 (Dialogue)</div>
                  <el-input 
                    v-model="currentStoryboard.dialogue" 
                    type="textarea" 
                    :rows="3"
                    placeholder="角色对白内容..."
                  />
                </div>

                <div class="narrative-section">
                  <div class="section-label">镜头描述 (Description)</div>
                  <el-input 
                    v-model="currentStoryboard.description" 
                    type="textarea" 
                    :rows="3"
                    placeholder="整体镜头描述..."
                  />
                </div>

                <!-- 音效设置 -->
                <div class="settings-section">
                  <div class="section-label">音效</div>
                  <div class="audio-controls">
                    <el-input 
                      v-model="currentStoryboard.sound_effect" 
                      placeholder="描述音效，如：脚步声、关门声等"
                      size="small"
                      type="textarea"
                      :rows="2"
                    />
                  </div>
                </div>

                <!-- 配乐设置 -->
                <div class="settings-section">
                  <div class="section-label">配乐提示</div>
                  <div class="audio-controls">
                    <el-input 
                      v-model="currentStoryboard.bgm_prompt" 
                      placeholder="描述配乐氛围，如：紧张激烈的背景音乐"
                      size="small"
                      type="textarea"
                      :rows="2"
                    />
                  </div>
                </div>

                <!-- 氛围设置 -->
                <div class="settings-section">
                  <div class="section-label">环境氛围</div>
                  <div class="audio-controls">
                    <el-input 
                      v-model="currentStoryboard.atmosphere" 
                      placeholder="描述环境氛围，如：昏暗压抑、明亮温馨"
                      size="small"
                      type="textarea"
                      :rows="2"
                    />
                  </div>
                </div>
              </div>
              <el-empty v-else description="未选择镜头" />
          </el-tab-pane>

          <!-- 图片生成标签 -->
          <el-tab-pane label="镜头图片" name="image">
            <div class="tab-content" v-if="currentStoryboard">
              <div class="image-generation-section">
                <!-- 帧类型选择 -->
                <div class="frame-type-selector">
                  <div class="section-label">选择帧类型</div>
                  <el-radio-group v-model="selectedFrameType" size="small">
                    <el-radio-button label="first">首帧</el-radio-button>
                    <el-radio-button label="last">尾帧</el-radio-button>
                    <el-radio-button label="panel">分镜板</el-radio-button>
                    <el-radio-button label="action">动作序列</el-radio-button>
                    <el-radio-button label="key">关键帧</el-radio-button>
                  </el-radio-group>
                  <el-input-number 
                    v-if="selectedFrameType === 'panel'" 
                    v-model="panelCount" 
                    :min="2" 
                    :max="6" 
                    size="small" 
                    class="panel-count-input"
                    style="margin-left: 10px; margin-top: 12px;"
                  />
                  <span v-if="selectedFrameType === 'panel'" style="margin-left: 5px; font-size: 12px; color: #999;">格数</span>
                </div>

                <!-- 提示词区域 -->
                <div class="prompt-section">
                  <div class="section-label">
                    提示词
                    <el-button 
                      size="small" 
                      type="primary" 
                      :disabled="generatingPrompt"
                      :loading="generatingPrompt"
                      @click="extractFramePrompt"
                      style="margin-left: 10px;"
                    >
                      提取提示词
                    </el-button>
                  </div>
                  <el-input 
                    v-model="currentFramePrompt" 
                    type="textarea" 
                    :rows="8"
                    placeholder="点击提取提示词按钮，系统将根据分镜内容生成图片提示词..."
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
                    {{ generatingImage ? '生成中...' : '生成图片' }}
                  </el-button>
                  <el-button :icon="Upload" @click="uploadImage">上传图片</el-button>
                </div>

                <!-- 生成结果 -->
                <div class="generation-result" v-if="generatedImages.length > 0">
                  <div class="section-label">生成结果 ({{ generatedImages.length }})</div>
                  <div class="image-grid">
                    <div 
                      v-for="img in generatedImages" 
                      :key="img.id" 
                      class="image-item"
                    >
                      <el-image 
                        v-if="img.image_url"
                        :src="img.image_url" 
                        :preview-src-list="generatedImages.filter(i => i.image_url).map(i => i.image_url!)"
                        :initial-index="generatedImages.filter(i => i.image_url).findIndex(i => i.id === img.id)"
                        fit="cover"
                        preview-teleported
                      />
                      <div v-else class="image-placeholder">
                        <el-icon :size="32"><Picture /></el-icon>
                        <p>生成中...</p>
                      </div>
                      <div class="image-info">
                        <el-tag :type="getStatusType(img.status)" size="small">{{ getStatusText(img.status) }}</el-tag>
                        <span v-if="img.frame_type" class="frame-type-tag">{{ getFrameTypeText(img.frame_type) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else description="未选择镜头" />
          </el-tab-pane>

          <!-- 视频生成标签 -->
          <el-tab-pane label="视频生成" name="video">
            <div class="tab-content" v-if="currentStoryboard">
              <div class="video-generation-section">
                <!-- 生成提示词展示 -->
                <div style="margin-bottom: 12px; padding: 10px; background: #f5f7fa; border-radius: 6px; border: 1px solid #e4e7ed; font-size: 12px; line-height: 1.6; color: #606266; word-break: break-word; max-height: 120px; overflow-y: auto;">
                  {{ currentStoryboard.video_prompt || '暂无提示词' }}
                </div>

                <!-- 视频参数设置 -->
                <div class="video-params-section">
                  <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                    <span style="min-width: 60px; font-size: 14px; color: #606266;">模型</span>
                    <el-select v-model="selectedVideoModel" placeholder="请选择视频生成模型" size="default" style="flex: 1;">
                      <el-option
                        v-for="model in videoModelCapabilities"
                        :key="model.id"
                        :label="model.name"
                        :value="model.id"
                      >
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span>{{ model.name }}</span>
                          <div style="font-size: 12px; color: #909399;">
                            <el-tag v-if="model.supportMultipleImages" size="small" type="success" style="margin-left: 4px;">多图</el-tag>
                            <el-tag v-if="model.supportFirstLastFrame" size="small" type="primary" style="margin-left: 4px;">首尾帧</el-tag>
                            <el-tag size="small" type="info" style="margin-left: 4px;">最多{{ model.maxImages }}张</el-tag>
                          </div>
                        </div>
                      </el-option>
                    </el-select>
                  </div>
                  
                  <!-- 参考图模式选择 -->
                  <div v-if="selectedVideoModel && availableReferenceModes.length > 0" style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                    <span style="min-width: 60px; font-size: 14px; color: #606266;">参考图</span>
                    <el-select v-model="selectedReferenceMode" placeholder="请选择参考图模式" size="default" style="flex: 1;">
                      <el-option
                        v-for="mode in availableReferenceModes"
                        :key="mode.value"
                        :label="mode.label"
                        :value="mode.value"
                      >
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span>{{ mode.label }}</span>
                          <span v-if="mode.description" style="font-size: 12px; color: #909399;">{{ mode.description }}</span>
                        </div>
                      </el-option>
                    </el-select>
                  </div>
                  
                  <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 12px;">
                    <span style="min-width: 60px; font-size: 14px; color: #606266;">时长</span>
                    <div style="flex: 1; display: flex; align-items: center;">
                      <el-slider v-model="videoDuration" :min="4" :max="10" :step="1" show-stops style="flex: 1;" />
                      <span style="margin-left: 10px; min-width: 40px;">{{ videoDuration }}秒</span>
                    </div>
                  </div>
                </div>

                <!-- 选择参考图片 -->
                <div v-if="selectedReferenceMode && selectedReferenceMode !== 'none'" class="reference-images-section" style="margin-top: 0;">
                  <div class="frame-type-buttons" style="text-align: center; margin-bottom: 8px;">
                    <el-radio-group v-model="selectedVideoFrameType" size="default">
                      <el-radio-button label="first">首帧</el-radio-button>
                      <el-radio-button label="last">尾帧</el-radio-button>
                      <el-radio-button label="panel">分镜板</el-radio-button>
                      <el-radio-button label="action">动作序列</el-radio-button>
                      <el-radio-button label="key">关键帧</el-radio-button>
                    </el-radio-group>
                  </div>
                  
                  <div class="frame-type-content">
                    <!-- 首帧 -->
                    <div v-show="selectedVideoFrameType === 'first'" class="image-scroll-container" style="max-height: 280px; overflow-y: auto; overflow-x: hidden;">
                      <div class="reference-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 600px;">
                        <div 
                          v-for="img in videoReferenceImages.filter(i => i.status === 'completed' && i.image_url && i.frame_type === 'first')" 
                          :key="img.id"
                          class="reference-item"
                          :class="{ selected: selectedImagesForVideo.includes(img.id) }"
                          style="position: relative;"
                          @click="handleImageSelect(img.id)"
                        >
                          <el-image :src="img.image_url" fit="cover" style="max-width: 120px; width: 100%; display: block; pointer-events: none;" />
                          <div class="preview-icon" @click.stop="previewImage(img.image_url)" style="position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; background: rgba(0,0,0,0.6); border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10;">
                            <el-icon :size="14" color="#fff"><ZoomIn /></el-icon>
                          </div>
                        </div>
                      </div>
                      <el-empty v-if="!videoReferenceImages.some(i => i.status === 'completed' && i.image_url && i.frame_type === 'first')" 
                        description="暂无首帧图片" size="small" />
                    </div>

                    <!-- 关键帧 -->
                    <div v-show="selectedVideoFrameType === 'key'" class="image-scroll-container" style="max-height: 280px; overflow-y: auto; overflow-x: hidden;">
                      <div class="reference-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 600px;">
                        <div 
                          v-for="img in videoReferenceImages.filter(i => i.status === 'completed' && i.image_url && i.frame_type === 'key')" 
                          :key="img.id"
                          class="reference-item"
                          :class="{ selected: selectedImagesForVideo.includes(img.id) }"
                          style="position: relative;"
                          @click="handleImageSelect(img.id)"
                        >
                          <el-image :src="img.image_url" fit="cover" style="max-width: 120px; width: 100%; display: block; pointer-events: none;" />
                          <div class="preview-icon" @click.stop="previewImage(img.image_url)" style="position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; background: rgba(0,0,0,0.6); border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10;">
                            <el-icon :size="14" color="#fff"><ZoomIn /></el-icon>
                          </div>
                        </div>
                      </div>
                      <el-empty v-if="!videoReferenceImages.some(i => i.status === 'completed' && i.image_url && i.frame_type === 'key')" 
                        description="暂无关键帧图片" size="small" />
                    </div>

                    <!-- 尾帧 -->
                    <div v-show="selectedVideoFrameType === 'last'" class="image-scroll-container" style="max-height: 280px; overflow-y: auto; overflow-x: hidden;">
                      <div class="reference-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 600px;">
                        <div 
                          v-for="img in videoReferenceImages.filter(i => i.status === 'completed' && i.image_url && i.frame_type === 'last')" 
                          :key="img.id"
                          class="reference-item"
                          :class="{ selected: selectedImagesForVideo.includes(img.id) }"
                          style="position: relative;"
                          @click="handleImageSelect(img.id)"
                        >
                          <el-image :src="img.image_url" fit="cover" style="max-width: 120px; width: 100%; display: block; pointer-events: none;" />
                          <div class="preview-icon" @click.stop="previewImage(img.image_url)" style="position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; background: rgba(0,0,0,0.6); border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10;">
                            <el-icon :size="14" color="#fff"><ZoomIn /></el-icon>
                          </div>
                        </div>
                      </div>
                      <el-empty v-if="!videoReferenceImages.some(i => i.status === 'completed' && i.image_url && i.frame_type === 'last')" 
                        description="暂无尾帧图片" size="small" />
                    </div>

                    <!-- 分镜板 -->
                    <div v-show="selectedVideoFrameType === 'panel'" class="image-scroll-container" style="max-height: 280px; overflow-y: auto; overflow-x: hidden;">
                      <div class="reference-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 600px;">
                        <div 
                          v-for="img in videoReferenceImages.filter(i => i.status === 'completed' && i.image_url && i.frame_type === 'panel')" 
                          :key="img.id"
                          class="reference-item"
                          :class="{ selected: selectedImagesForVideo.includes(img.id) }"
                          style="position: relative;"
                          @click="handleImageSelect(img.id)"
                        >
                          <el-image :src="img.image_url" fit="cover" style="max-width: 120px; width: 100%; display: block; pointer-events: none;" />
                          <div class="preview-icon" @click.stop="previewImage(img.image_url)" style="position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; background: rgba(0,0,0,0.6); border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10;">
                            <el-icon :size="14" color="#fff"><ZoomIn /></el-icon>
                          </div>
                        </div>
                      </div>
                      <el-empty v-if="!videoReferenceImages.some(i => i.status === 'completed' && i.image_url && i.frame_type === 'panel')" 
                        description="暂无分镜板图片" size="small" />
                    </div>

                    <!-- 动作序列 -->
                    <div v-show="selectedVideoFrameType === 'action'" class="image-scroll-container" style="max-height: 280px; overflow-y: auto; overflow-x: hidden;">
                      <div class="reference-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 600px;">
                        <div 
                          v-for="img in videoReferenceImages.filter(i => i.status === 'completed' && i.image_url && i.frame_type === 'action')" 
                          :key="img.id"
                          class="reference-item"
                          :class="{ selected: selectedImagesForVideo.includes(img.id) }"
                          style="position: relative;"
                          @click="handleImageSelect(img.id)"
                        >
                          <el-image :src="img.image_url" fit="cover" style="max-width: 120px; width: 100%; display: block; pointer-events: none;" />
                          <div class="preview-icon" @click.stop="previewImage(img.image_url)" style="position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; background: rgba(0,0,0,0.6); border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10;">
                            <el-icon :size="14" color="#fff"><ZoomIn /></el-icon>
                          </div>
                        </div>
                      </div>
                      <el-empty v-if="!videoReferenceImages.some(i => i.status === 'completed' && i.image_url && i.frame_type === 'action')" 
                        description="暂无动作序列图片" size="small" />
                    </div>
                  </div>
                </div>

                <!-- 参考图片设置 -->
                <div v-if="selectedReferenceMode && selectedReferenceMode !== 'none'" class="reference-config-section" style="margin-top: 24px;">
                  <!-- 图片框配置区 -->
                  <div class="image-slots-container" style="margin-top: 16px; margin-bottom: 24px;">
                    <!-- 单图模式 -->
                    <div v-if="selectedReferenceMode === 'single'" 
                         style="text-align: center;">
                      <div style="margin-bottom: 12px; font-size: 13px; color: #606266; font-weight: 500;">单图参考</div>
                      <div style="display: inline-block;">
                        <div class="image-slot" style="position: relative; width: 140px; height: 90px; border: 2px dashed #dcdfe6; border-radius: 8px; overflow: hidden; cursor: pointer; background: #fff;" @click="selectedImagesForVideo.length > 0 && removeSelectedImage(selectedImagesForVideo[0])">
                          <img v-if="selectedImageObjects[0]" :src="selectedImageObjects[0].image_url" alt="" style="width: 100%; height: 100%; object-fit: cover;" />
                          <div v-else class="image-slot-placeholder">
                            <el-icon :size="32" color="#c0c4cc"><Plus /></el-icon>
                            <div style="margin-top: 8px; font-size: 12px; color: #909399;">点击上方选择图片</div>
                          </div>
                          <div v-if="selectedImageObjects[0]" class="image-slot-remove">
                            <el-icon :size="16" color="#fff"><Close /></el-icon>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- 首尾帧模式 -->
                    <div v-else-if="selectedReferenceMode === 'first_last'" style="text-align: center;">
                      <div style="margin-bottom: 12px; font-size: 13px; color: #606266; font-weight: 500;">首尾帧</div>
                      <div style="display: flex; gap: 20px; justify-content: center; align-items: center;">
                        <div>
                          <div style="margin-bottom: 8px; font-size: 12px; color: #909399;">首帧</div>
                          <div class="image-slot" style="position: relative; width: 140px; height: 90px; border: 2px dashed #dcdfe6; border-radius: 8px; overflow: hidden; cursor: pointer; background: #fff;" @click="firstFrameSlotImage && removeSelectedImage(firstFrameSlotImage.id)">
                            <img v-if="firstFrameSlotImage" :src="firstFrameSlotImage.image_url" alt="" style="width: 100%; height: 100%; object-fit: cover;" />
                            <div v-else class="image-slot-placeholder">
                              <el-icon :size="32" color="#c0c4cc"><Plus /></el-icon>
                              <div style="margin-top: 8px; font-size: 12px; color: #909399;">选择首帧</div>
                            </div>
                            <div v-if="firstFrameSlotImage" class="image-slot-remove">
                              <el-icon :size="16" color="#fff"><Close /></el-icon>
                            </div>
                          </div>
                        </div>
                        <el-icon :size="24" color="#909399"><Right /></el-icon>
                        <div>
                          <div style="margin-bottom: 8px; font-size: 12px; color: #909399;">尾帧</div>
                          <div class="image-slot" style="position: relative; width: 140px; height: 90px; border: 2px dashed #dcdfe6; border-radius: 8px; overflow: hidden; cursor: pointer; background: #fff;" @click="lastFrameSlotImage && removeSelectedImage(lastFrameSlotImage.id)">
                            <img v-if="lastFrameSlotImage" :src="lastFrameSlotImage.image_url" alt="" style="width: 100%; height: 100%; object-fit: cover;" />
                            <div v-else class="image-slot-placeholder">
                              <el-icon :size="32" color="#c0c4cc"><Plus /></el-icon>
                              <div style="margin-top: 8px; font-size: 12px; color: #909399;">选择尾帧</div>
                            </div>
                            <div v-if="lastFrameSlotImage" class="image-slot-remove">
                              <el-icon :size="16" color="#fff"><Close /></el-icon>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- 多图模式 -->
                    <div v-else-if="selectedReferenceMode === 'multiple'" style="text-align: center;">
                      <div style="margin-bottom: 12px; font-size: 13px; color: #606266; font-weight: 500;">
                        多图参考 ({{ selectedImagesForVideo.length }}/{{ currentModelCapability?.maxImages || 6 }})
                      </div>
                      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <div v-for="index in (currentModelCapability?.maxImages || 6)" :key="index" 
                             class="image-slot image-slot-small"
                             style="position: relative; width: 80px; height: 52px; border: 2px dashed #dcdfe6; border-radius: 8px; overflow: hidden; cursor: pointer; background: #fff;"
                             @click="selectedImageObjects[index - 1] && removeSelectedImage(selectedImageObjects[index - 1].id)">
                          <img v-if="selectedImageObjects[index - 1]" 
                               :src="selectedImageObjects[index - 1].image_url" 
                               alt="" 
                               style="width: 100%; height: 100%; object-fit: cover;" />
                          <div v-else class="image-slot-placeholder">
                            <el-icon :size="20" color="#c0c4cc"><Plus /></el-icon>
                            <div style="margin-top: 4px; font-size: 10px; color: #909399;">{{ index }}</div>
                          </div>
                          <div v-if="selectedImageObjects[index - 1]" class="image-slot-remove">
                            <el-icon :size="14" color="#fff"><Close /></el-icon>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 生成控制 -->
                <div class="generation-controls" style="margin-top: 32px; text-align: center;">
                  <el-button 
                    type="primary" 
                    :icon="VideoCamera" 
                    :loading="generatingVideo"
                    :disabled="!selectedVideoModel || (selectedReferenceMode !== 'none' && selectedImagesForVideo.length === 0)"
                    @click="generateVideo"
                  >
                    {{ generatingVideo ? '生成中...' : '生成视频' }}
                  </el-button>
                </div>

                <!-- 生成的视频列表 -->
                <div class="generation-result" v-if="generatedVideos.length > 0" style="margin-top: 24px;">
                  <div class="section-label" style="font-size: 13px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    <span style="width: 3px; height: 14px; background: linear-gradient(to bottom, #409eff, #66b1ff); border-radius: 2px;"></span>
                    生成结果 ({{ generatedVideos.length }})
                  </div>
                  <div class="image-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;">
                    <div 
                      v-for="video in generatedVideos" 
                      :key="video.id" 
                      class="image-item video-item"
                      style="position: relative; border-radius: 8px; overflow: hidden; background: #fff; border: 1px solid #e8e8e8; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06); cursor: pointer; transition: all 0.2s ease;"
                    >
                      <div class="video-thumbnail" v-if="video.video_url" style="position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden; cursor: pointer;"
                        @mouseenter="(e) => e.currentTarget.querySelector('.play-overlay').style.opacity = '1'"
                        @mouseleave="(e) => e.currentTarget.querySelector('.play-overlay').style.opacity = '0'"
                        @click="playVideo(video)">
                        <video 
                          :src="video.video_url" 
                          preload="metadata"
                          style="width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none;"
                        />
                        <div class="play-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.3); opacity: 0; transition: opacity 0.2s;">
                          <el-icon :size="32" color="#fff" style="filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));"><VideoPlay /></el-icon>
                        </div>
                      </div>
                      <div v-else class="image-placeholder" style="width: 100%; aspect-ratio: 16/9; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf0 100%); color: #909399;">
                        <el-icon :size="32"><VideoCamera /></el-icon>
                        <p style="margin: 0; font-size: 11px;">生成中...</p>
                      </div>
                      <div class="image-info" style="position: absolute; bottom: 0; left: 0; right: 0; padding: 6px 8px; background: linear-gradient(to top, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.2) 70%, transparent); display: flex; justify-content: space-between; align-items: center; gap: 4px;">
                        <div style="display: flex; align-items: center; gap: 4px;">
                          <el-tag :type="getStatusType(video.status)" size="small" style="font-size: 10px; height: 20px; padding: 0 6px;">{{ getStatusText(video.status) }}</el-tag>
                        </div>
                        <div style="display: flex; gap: 4px;">
                          <el-button 
                            v-if="video.status === 'completed' && video.video_url" 
                            type="success" 
                            size="small" 
                            :loading="addingToAssets.has(video.id)"
                            @click.stop="addVideoToAssets(video)"
                          >
                            {{ addingToAssets.has(video.id) ? '添加中...' : '添加到素材库' }}
                          </el-button>
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
          <el-tab-pane label="音效与配乐" name="audio">
            <div class="tab-content">
              <el-empty description="音效与配乐功能开发中" />
            </div>
          </el-tab-pane>

          <!-- 视频合成列表标签 -->
          <el-tab-pane label="视频合成" name="merges">
            <div class="tab-content">
              <div class="merges-list" v-loading="loadingMerges">
                <el-empty v-if="videoMerges.length === 0" description="暂无视频合成记录" :image-size="120">
                  <template #description>
                    <div style="color: #909399; font-size: 14px; margin-top: 12px;">
                      <p style="margin: 0;">还没有合成过视频</p>
                      <p style="margin: 8px 0 0 0; font-size: 12px;">在时间线编辑器中排列好视频后点击"合成视频"即可</p>
                    </div>
                  </template>
                </el-empty>
                <div v-else class="merge-items">
                  <div v-for="merge in videoMerges" :key="merge.id" class="merge-item" :class="'merge-status-' + merge.status">
                    <!-- 状态指示条 -->
                    <div class="status-indicator"></div>
                    
                    <!-- 主要内容区域 -->
                    <div class="merge-content">
                      <!-- 标题和状态 -->
                      <div class="merge-header">
                        <div class="title-section">
                          <el-icon :size="20" class="title-icon">
                            <VideoCamera v-if="merge.status === 'completed'" />
                            <Loading v-else-if="merge.status === 'processing'" class="rotating" />
                            <WarningFilled v-else-if="merge.status === 'failed'" />
                            <Clock v-else />
                          </el-icon>
                          <h3 class="merge-title">{{ merge.title }}</h3>
                        </div>
                        <el-tag 
                          :type="merge.status === 'completed' ? 'success' : merge.status === 'failed' ? 'danger' : 'warning'"
                          effect="dark"
                          size="large"
                          round
                        >
                          {{ merge.status === 'pending' ? '等待中' : merge.status === 'processing' ? '合成中' : merge.status === 'completed' ? '已完成' : '失败' }}
                        </el-tag>
                      </div>

                      <!-- 详细信息网格 -->
                      <div class="merge-details">
                        <div class="detail-item">
                          <div class="detail-icon">
                            <el-icon :size="16"><Timer /></el-icon>
                          </div>
                          <div class="detail-content">
                            <div class="detail-label">视频时长</div>
                            <div class="detail-value">{{ merge.duration ? `${merge.duration} 秒` : '-' }}</div>
                          </div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-icon">
                            <el-icon :size="16"><Calendar /></el-icon>
                          </div>
                          <div class="detail-content">
                            <div class="detail-label">创建时间</div>
                            <div class="detail-value">{{ formatDateTime(merge.created_at) }}</div>
                          </div>
                        </div>
                        <div class="detail-item" v-if="merge.completed_at">
                          <div class="detail-icon">
                            <el-icon :size="16"><Check /></el-icon>
                          </div>
                          <div class="detail-content">
                            <div class="detail-label">完成时间</div>
                            <div class="detail-value">{{ formatDateTime(merge.completed_at) }}</div>
                          </div>
                        </div>
                      </div>

                      <!-- 错误提示 -->
                      <div class="merge-error" v-if="merge.status === 'failed' && merge.error_msg">
                        <el-alert 
                          type="error" 
                          :closable="false" 
                          show-icon
                        >
                          <template #title>
                            <div style="font-size: 13px; line-height: 1.5;">{{ merge.error_msg }}</div>
                          </template>
                        </el-alert>
                      </div>

                      <!-- 操作按钮 -->
                      <div class="merge-actions">
                        <template v-if="merge.status === 'completed' && merge.merged_url">
                          <el-button type="primary" :icon="VideoCamera" @click="downloadVideo(merge.merged_url, merge.title)" round>
                            下载视频
                          </el-button>
                          <el-button :icon="View" @click="previewMergedVideo(merge.merged_url)" round>
                            在线预览
                          </el-button>
                        </template>
                        <el-button 
                          v-if="merge.status === 'failed'"
                          type="danger" 
                          :icon="Close" 
                          @click="deleteMerge(merge.id)"
                          plain
                          round
                        >
                          删除记录
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
    <el-dialog v-model="showCharacterImagePreview" :title="previewCharacter?.name" width="600px">
      <div class="character-image-preview" v-if="previewCharacter">
        <img v-if="previewCharacter.image_url" :src="previewCharacter.image_url" :alt="previewCharacter.name" />
        <el-empty v-else description="暂无图片" />
      </div>
  <!-- ... -->
    </el-dialog>

    <!-- 场景大图预览对话框 -->
    <el-dialog 
      v-model="showSceneImagePreview" 
      :title="currentStoryboard?.background ? `${currentStoryboard.background.location} · ${currentStoryboard.background.time}` : '场景预览'" 
      width="800px"
    >
      <div class="scene-image-preview" v-if="currentStoryboard?.background?.image_url">
        <img :src="currentStoryboard.background.image_url" alt="场景" />
      </div>
    </el-dialog>

    <!-- 角色选择对话框 -->
    <el-dialog v-model="showCharacterSelector" title="添加角色到镜头" width="800px">
      <div class="character-selector-grid">
        <div 
          v-for="char in availableCharacters" 
          :key="char.id"
          class="character-card"
          :class="{ selected: isCharacterInCurrentShot(char.id) }"
          @click="toggleCharacterInShot(char.id)"
        >
          <div class="character-avatar-large">
            <img v-if="char.image_url" :src="char.image_url" :alt="char.name" />
            <span v-else>{{ char.name?.[0] || '?' }}</span>
          </div>
          <div class="character-info">
            <div class="character-name">{{ char.name }}</div>
            <div class="character-role">{{ char.role || '角色' }}</div>
          </div>
          <div class="character-check" v-if="isCharacterInCurrentShot(char.id)">
            <el-icon color="#409eff" :size="24"><Check /></el-icon>
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
            <img v-if="scene.image_url" :src="scene.image_url" :alt="scene.location" />
            <el-icon v-else :size="48" color="#ccc"><Picture /></el-icon>
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
          :src="previewVideo.video_url" 
          controls
          autoplay
          style="width: 100%; max-height: 70vh; display: block; background: #000; border-radius: 8px;"
        />
        <div v-else style="text-align: center; padding: 40px;">
          <el-icon :size="48" color="#ccc"><VideoCamera /></el-icon>
          <p style="margin-top: 16px; color: #909399;">视频生成中...</p>
        </div>
        <div class="video-meta" style="margin-top: 16px; padding: 12px; background: #f5f7fa; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <el-tag :type="getStatusType(previewVideo.status)" size="small">{{ getStatusText(previewVideo.status) }}</el-tag>
              <span v-if="previewVideo.duration" style="margin-left: 12px; color: #606266; font-size: 14px;">时长: {{ previewVideo.duration }}秒</span>
            </div>
            <el-button v-if="previewVideo.video_url" size="small" @click="window.open(previewVideo.video_url, '_blank')">
              下载视频
            </el-button>
          </div>
          <div v-if="previewVideo.prompt" style="margin-top: 12px; font-size: 12px; color: #606266; line-height: 1.6;">
            <strong>提示词：</strong>{{ previewVideo.prompt }}
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, Plus, Picture, VideoPlay, VideoPause, View, Setting,
  Upload, MagicStick, VideoCamera, ZoomIn, ZoomOut, Top, Bottom, Check, Close, Right,
  Timer, Calendar, Clock, Loading, WarningFilled
} from '@element-plus/icons-vue'
import { dramaAPI } from '@/api/drama'
import { generateFramePrompt, type FrameType } from '@/api/frame'
import { imageAPI } from '@/api/image'
import { videoAPI } from '@/api/video'
import { aiAPI } from '@/api/ai'
import { assetAPI } from '@/api/asset'
import { videoMergeAPI } from '@/api/videoMerge'
import type { ImageGeneration } from '@/types/image'
import type { VideoGeneration } from '@/types/video'
import type { AIServiceConfig } from '@/types/ai'
import type { Asset } from '@/types/asset'
import type { VideoMerge } from '@/api/videoMerge'
import VideoTimelineEditor from '@/components/editor/VideoTimelineEditor.vue'
import type { Drama, Episode, Storyboard } from '@/types/drama'

const route = useRoute()
const router = useRouter()

const dramaId = Number(route.params.dramaId)
const episodeNumber = Number(route.params.episodeNumber)
const episodeId = ref<number>(0)

const drama = ref<Drama | null>(null)
const episode = ref<Episode | null>(null)
const storyboards = ref<Storyboard[]>([])
const characters = ref<any[]>([])
const availableScenes = ref<any[]>([])

const currentStoryboardId = ref<number | null>(null)
const activeTab = ref('shot')
const showSceneSelector = ref(false)
const showCharacterSelector = ref(false)
const showCharacterImagePreview = ref(false)
const previewCharacter = ref<any>(null)
const showSceneImagePreview = ref(false)
const showSettings = ref(false)
const showVideoPreview = ref(false)
const previewVideo = ref<VideoGeneration | null>(null)
const addingToAssets = ref<Set<number>>(new Set())

const currentPlayState = ref<'playing' | 'paused'>('paused')
const currentTime = ref(0)
const totalDuration = computed(() => {
  if (!Array.isArray(storyboards.value)) return 0
  return storyboards.value.reduce((sum, s) => sum + (s.duration || 0), 0)
})

const selectedCharacters = ref<number[]>([])
const narrativeTab = ref('shot-prompt')

// 图片生成相关状态
const selectedFrameType = ref<FrameType>('first')
const panelCount = ref(3)
const generatingPrompt = ref(false)
const framePrompts = ref<Record<string, string>>({
  key: '',
  first: '',
  last: '',
  panel: ''
})
const currentFramePrompt = ref('')
const generatingImage = ref(false)
const generatedImages = ref<ImageGeneration[]>([])
const isSwitchingFrameType = ref(false) // 标志位：是否正在切换帧类型
const loadingImages = ref(false)
let pollingTimer: any = null

// 视频生成相关状态
const videoDuration = ref(5)  // 默认5秒，会根据镜头duration自动更新
const selectedVideoFrameType = ref<FrameType>('first')
const selectedImagesForVideo = ref<number[]>([])
const selectedLastImageForVideo = ref<number | null>(null)
const generatingVideo = ref(false)
const generatedVideos = ref<VideoGeneration[]>([])
const videoAssets = ref<Asset[]>([])
const loadingVideos = ref(false)
const timelineEditorRef = ref<InstanceType<typeof VideoTimelineEditor> | null>(null)
const videoReferenceImages = ref<ImageGeneration[]>([])
const selectedVideoModel = ref<string>('')
const selectedReferenceMode = ref<string>('')  // 参考图模式：single, first_last, multiple, none
const previewImageUrl = ref<string>('')  // 预览大图的URL
const videoModelCapabilities = ref<VideoModelCapability[]>([])
let videoPollingTimer: any = null
let mergePollingTimer: any = null  // 视频合成列表轮询定时器

// 视频合成列表
const videoMerges = ref<VideoMerge[]>([])
const loadingMerges = ref(false)

// 视频模型能力配置
interface VideoModelCapability {
  id: string
  name: string
  supportMultipleImages: boolean  // 支持多张图片
  supportFirstLastFrame: boolean  // 支持首尾帧
  supportSingleImage: boolean     // 支持单图
  supportTextOnly: boolean        // 支持纯文本
  maxImages: number  // 最多支持几张图片
}


// 模型能力默认配置（作为后备）
const defaultModelCapabilities: Record<string, Omit<VideoModelCapability, 'id' | 'name'>> = {
  'kling': {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 1
  },
  'runway': {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: true,
    supportTextOnly: true,
    maxImages: 2
  },
  'pika': {
    supportSingleImage: true,
    supportMultipleImages: true,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 6
  },
  'doubao-seedance-1-5-pro-251215': {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: true,
    supportTextOnly: true,
    maxImages: 2
  },
  'doubao-seedance-1-0-lite-i2v-250428': {
    supportSingleImage: true,
    supportMultipleImages: true,
    supportFirstLastFrame: true,
    supportTextOnly: false,
    maxImages: 6
  },
  'doubao-seedance-1-0-lite-t2v-250428': {
    supportSingleImage: false,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 0
  },
  'doubao-seedance-1-0-pro-250528': {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: true,
    supportTextOnly: true,
    maxImages: 2
  },
  'doubao-seedance-1-0-pro-fast-251015': {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 1
  },
  'sora-2': {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 1
  },
  'sora-2-pro': {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: true,
    supportTextOnly: true,
    maxImages: 2
  },
  'MiniMax-Hailuo-2.3': {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 1
  },
  'MiniMax-Hailuo-2.3-Fast': {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 1
  },
  'MiniMax-Hailuo-02': {
    supportSingleImage: true,
    supportMultipleImages: false,
    supportFirstLastFrame: false,
    supportTextOnly: true,
    maxImages: 1
  }
}

// 从模型名称提取provider
const extractProviderFromModel = (modelName: string): string => {
  if (modelName.startsWith('doubao-') || modelName.startsWith('seedance')) {
    return 'doubao'
  }
  if (modelName.startsWith('runway')) {
    return 'runway'
  }
  if (modelName.startsWith('pika')) {
    return 'pika'
  }
  if (modelName.startsWith('MiniMax-') || modelName.toLowerCase().startsWith('minimax') || modelName.startsWith('hailuo')) {
    return 'minimax'
  }
  if (modelName.startsWith('sora')) {
    return 'openai'
  }
  if (modelName.startsWith('kling')) {
    return 'kling'
  }
  
  // 默认返回doubao
  return 'doubao'
}

// 加载视频AI配置
const loadVideoModels = async () => {
  try {
    const configs = await aiAPI.list('video')
    
    // 只显示启用的配置
    const activeConfigs = configs.filter(c => c.is_active)
    
    // 展开模型列表并去重
    const allModels = activeConfigs.flatMap(config => {
      const models = Array.isArray(config.model) ? config.model : [config.model]
      return models.map(modelName => ({
        modelName,
        configName: config.name,
        priority: config.priority || 0
      }))
    }).sort((a, b) => b.priority - a.priority)
    
    // 按模型名称去重
    const modelMap = new Map<string, { configName: string, priority: number }>()
    allModels.forEach(model => {
      if (!modelMap.has(model.modelName)) {
        modelMap.set(model.modelName, { configName: model.configName, priority: model.priority })
      }
    })
    
    // 构建模型能力列表
    videoModelCapabilities.value = Array.from(modelMap.keys()).map(modelName => {
      const capability = defaultModelCapabilities[modelName] || {
        supportSingleImage: true,
        supportMultipleImages: false,
        supportFirstLastFrame: false,
        supportTextOnly: true,
        maxImages: 1
      }
      
      return {
        id: modelName,
        name: modelName,
        ...capability
      }
    })
  } catch (error: any) {
    console.error('加载视频模型配置失败:', error)
    ElMessage.error('加载视频模型失败')
  }
}

// 加载视频素材库
const loadVideoAssets = async () => {
  try {
    const result = await assetAPI.listAssets({
      drama_id: dramaId.toString(),
      episode_id: episodeId.value,
      type: 'video',
      page: 1,
      page_size: 100
    })
    // 检查数据结构并正确赋值
    videoAssets.value = result.items || []
  } catch (error: any) {
    console.error('加载视频素材库失败:', error)
  }
}

// 当前模型能力
const currentModelCapability = computed(() => {
  return videoModelCapabilities.value.find(m => m.id === selectedVideoModel.value)
})

// 当前模型支持的参考图模式
const availableReferenceModes = computed(() => {
  const capability = currentModelCapability.value
  if (!capability) return []
  
  const modes: Array<{value: string, label: string, description?: string}> = []
  
  if (capability.supportTextOnly) {
    modes.push({ value: 'none', label: '纯文本', description: '不使用参考图' })
  }
  if (capability.supportSingleImage) {
    modes.push({ value: 'single', label: '单图', description: '使用单张参考图' })
  }
  if (capability.supportFirstLastFrame) {
    modes.push({ value: 'first_last', label: '首尾帧', description: '使用首帧和尾帧' })
  }
  if (capability.supportMultipleImages) {
    modes.push({ value: 'multiple', label: '多图', description: `最多${capability.maxImages}张` })
  }
  
  return modes
})

// 帧提示词存储key生成函数
const getPromptStorageKey = (storyboardId: number | undefined, frameType: FrameType) => {
  if (!storyboardId) return null
  return `frame_prompt_${storyboardId}_${frameType}`
}

const isCharacterSelected = (charId: number) => {
  return selectedCharacters.value.includes(charId)
}

const toggleCharacter = (charId: number) => {
  const index = selectedCharacters.value.indexOf(charId)
  if (index > -1) {
    selectedCharacters.value.splice(index, 1)
  } else {
    selectedCharacters.value.push(charId)
  }
}

const currentStoryboard = computed(() => {
  if (!currentStoryboardId.value) return null
  return storyboards.value.find(s => String(s.id) === String(currentStoryboardId.value)) || null
})

// 监听帧类型切换，从存储中加载或清空
watch(selectedFrameType, (newType) => {
  if (!currentStoryboard.value) {
    currentFramePrompt.value = ''
    generatedImages.value = []
    return
  }
  
  // 设置切换标志，防止watch(currentFramePrompt)错误保存
  isSwitchingFrameType.value = true
  
  // 从 framePrompts 对象中加载该帧类型的提示词
  currentFramePrompt.value = framePrompts.value[newType] || ''
  
  // 从 sessionStorage 中加载该帧类型之前的提示词（如果framePrompts中没有）
  if (!currentFramePrompt.value) {
    const storageKey = `frame_prompt_${currentStoryboard.value.id}_${newType}`
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
      currentFramePrompt.value = stored
      framePrompts.value[newType] = stored
    }
  }
  
  // 重新加载该帧类型的图片
  loadStoryboardImages(currentStoryboard.value.id, newType)
  
  // 重置切换标志
  setTimeout(() => {
    isSwitchingFrameType.value = false
  }, 0)
})

// 监听当前分镜切换，重置提示词
watch(currentStoryboard, async (newStoryboard) => {
  if (!newStoryboard) {
    currentFramePrompt.value = ''
    generatedImages.value = []
    generatedVideos.value = []
    videoReferenceImages.value = []
    return
  }
  
  // 设置切换标志
  isSwitchingFrameType.value = true
  
  // 加载当前帧类型的提示词
  const storageKey = getPromptStorageKey(newStoryboard.id, selectedFrameType.value)
  if (storageKey) {
    const stored = sessionStorage.getItem(storageKey)
    currentFramePrompt.value = stored || ''
  } else {
    currentFramePrompt.value = ''
  }
  
  // 重置切换标志
  setTimeout(() => {
    isSwitchingFrameType.value = false
  }, 0)
  
  // 加载该分镜的图片列表（根据当前选择的帧类型）
  await loadStoryboardImages(newStoryboard.id, selectedFrameType.value)
  
  // 加载视频参考图片（所有帧类型）
  await loadVideoReferenceImages(newStoryboard.id)
  
  // 加载该分镜的视频列表
  await loadStoryboardVideos(newStoryboard.id)
})

// 监听提示词变化，自动保存到sessionStorage
watch(currentFramePrompt, (newPrompt) => {
  // 如果正在切换帧类型或分镜，不要保存（避免错误保存到新帧类型）
  if (isSwitchingFrameType.value) return
  if (!currentStoryboard.value) return
  
  const storageKey = getPromptStorageKey(currentStoryboard.value.id, selectedFrameType.value)
  if (storageKey) {
    if (newPrompt) {
      sessionStorage.setItem(storageKey, newPrompt)
    } else {
      sessionStorage.removeItem(storageKey)
    }
  }
})

// 监听视频模型切换，清空已选图片和参考图模式
watch(selectedVideoModel, () => {
  selectedImagesForVideo.value = []
  selectedLastImageForVideo.value = null
  selectedReferenceMode.value = ''
})

// 监听镜头切换，自动更新视频时长
watch(currentStoryboard, (newStoryboard) => {
  if (newStoryboard?.duration) {
    // 如果镜头有duration字段，使用镜头的时长
    videoDuration.value = Math.round(newStoryboard.duration)
  } else {
    // 否则使用默认值5秒
    videoDuration.value = 5
  }
})

// 监听参考图模式切换，清空已选图片
watch(selectedReferenceMode, () => {
  selectedImagesForVideo.value = []
  selectedLastImageForVideo.value = null
})

// 当前分镜的角色列表
const currentStoryboardCharacters = computed(() => {
  if (!currentStoryboard.value?.characters) return []
  
  // currentStoryboard.characters 是角色对象数组
  if (Array.isArray(currentStoryboard.value.characters) && currentStoryboard.value.characters.length > 0) {
    const firstItem = currentStoryboard.value.characters[0]
    // 如果是对象数组（包含id和name），直接返回
    if (typeof firstItem === 'object' && firstItem.id) {
      return currentStoryboard.value.characters
    }
    // 如果是ID数组，从characters中查找匹配的角色
    if (typeof firstItem === 'number') {
      return characters.value.filter(c => currentStoryboard.value.characters.includes(c.id))
    }
  }
  
  return []
})

// 可选择的角色列表
const availableCharacters = computed(() => {
  return characters.value || []
})

// 检查角色是否已在当前镜头中
const isCharacterInCurrentShot = (charId: number) => {
  if (!currentStoryboard.value?.characters) return false
  
  if (Array.isArray(currentStoryboard.value.characters) && currentStoryboard.value.characters.length > 0) {
    const firstItem = currentStoryboard.value.characters[0]
    if (typeof firstItem === 'object' && firstItem.id) {
      return currentStoryboard.value.characters.some(c => c.id === charId)
    }
    if (typeof firstItem === 'number') {
      return currentStoryboard.value.characters.includes(charId)
    }
  }
  
  return false
}

// 切换角色在镜头中的状态
const showCharacterImage = (char: any) => {
  previewCharacter.value = char
  showCharacterImagePreview.value = true
}

// 展示场景大图
const showSceneImage = () => {
  if (currentStoryboard.value?.background?.image_url) {
    showSceneImagePreview.value = true
  }
}

// 保存分镜字段
const saveStoryboardField = async (fieldName: string) => {
  if (!currentStoryboard.value) return
  
  try {
    const updateData: any = {}
    updateData[fieldName] = currentStoryboard.value[fieldName]
    
    await dramaAPI.updateStoryboard(currentStoryboard.value.id.toString(), updateData)
  } catch (error: any) {
    ElMessage.error('保存失败: ' + (error.message || '未知错误'))
  }
}

// 提取帧提示词
const extractFramePrompt = async () => {
  if (!currentStoryboard.value) return
  
  // 记录点击时的帧类型，避免切换tab后提示词显示错位
  const targetFrameType = selectedFrameType.value
  
  generatingPrompt.value = true
  try {
    const params: any = { frame_type: targetFrameType }
    if (targetFrameType === 'panel') {
      params.panel_count = panelCount.value
    }
    
    const result = await generateFramePrompt(currentStoryboard.value.id, params)
    
    // 根据记录的帧类型提取prompt，确保更新到正确的位置
    let extractedPrompt = ''
    if (result.single_frame) {
      extractedPrompt = result.single_frame.prompt
    } else if (result.multi_frame && result.multi_frame.frames) {
      // 多帧情况，将所有帧的prompt合并
      extractedPrompt = result.multi_frame.frames
        .map((frame: any, index: number) => `${frame.description}: ${frame.prompt}`)
        .join('\n\n')
    }
    
    // 只在当前仍然选中该帧类型时才更新显示
    if (selectedFrameType.value === targetFrameType) {
      currentFramePrompt.value = extractedPrompt
    }
    
    // 存储到对应帧类型的提示词中
    framePrompts.value[targetFrameType] = extractedPrompt
    
    ElMessage.success(`${getFrameTypeLabel(targetFrameType)}提示词提取成功`)
  } catch (error: any) {
    ElMessage.error('提取失败: ' + (error.message || '未知错误'))
  } finally {
    generatingPrompt.value = false
  }
}

// 获取帧类型的中文标签
const getFrameTypeLabel = (frameType: string): string => {
  const labels: Record<string, string> = {
    key: '关键帧',
    first: '首帧',
    last: '尾帧',
    panel: '分镜版'
  }
  return labels[frameType] || frameType
}

// 加载分镜的图片列表
const loadStoryboardImages = async (storyboardId: number, frameType?: string) => {
  loadingImages.value = true
  try {
    const params: any = {
      storyboard_id: storyboardId,
      page: 1,
      page_size: 50
    }
    // 如果指定了帧类型，添加过滤
    if (frameType) {
      params.frame_type = frameType
    }
    const result = await imageAPI.listImages(params)
    generatedImages.value = result.items || []
    
    // 如果有进行中的任务，启动轮询
    const hasPendingOrProcessing = generatedImages.value.some(
      img => img.status === 'pending' || img.status === 'processing'
    )
    if (hasPendingOrProcessing) {
      startPolling()
    }
  } catch (error: any) {
    console.error('加载图片列表失败:', error)
  } finally {
    loadingImages.value = false
  }
}

// 启动状态轮询
const startPolling = () => {
  if (pollingTimer) return
  
  pollingTimer = setInterval(async () => {
    if (!currentStoryboard.value) {
      stopPolling()
      return
    }
    
    try {
      const params: any = {
        storyboard_id: currentStoryboard.value.id,
        page: 1,
        page_size: 50
      }
      // 根据当前选择的帧类型过滤
      if (selectedFrameType.value) {
        params.frame_type = selectedFrameType.value
      }
      const result = await imageAPI.listImages(params)
      generatedImages.value = result.items || []
      
      // 如果没有进行中的任务，停止轮询
      const hasPendingOrProcessing = generatedImages.value.some(
        img => img.status === 'pending' || img.status === 'processing'
      )
      if (!hasPendingOrProcessing) {
        stopPolling()
      }
    } catch (error) {
      console.error('轮询图片状态失败:', error)
    }
  }, 3000) // 每3秒轮询一次
}

// 停止轮询
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// 生成图片
const generateFrameImage = async () => {
  if (!currentStoryboard.value || !currentFramePrompt.value) return
  
  generatingImage.value = true
  try {
    // 收集参考图片URL
    const referenceImages: string[] = []
    
    // 1. 添加场景图片（从background字段获取）
    if (currentStoryboard.value.background?.image_url) {
      referenceImages.push(currentStoryboard.value.background.image_url)
    }
    
    // 2. 添加当前镜头登场的角色图片
    const storyboardCharacters = currentStoryboardCharacters.value
    if (storyboardCharacters && storyboardCharacters.length > 0) {
      storyboardCharacters.forEach((char: any) => {
        if (char.image_url) {
          referenceImages.push(char.image_url)
        }
      })
    }
    
    const result = await imageAPI.generateImage({
      drama_id: dramaId.toString(),
      prompt: currentFramePrompt.value,
      storyboard_id: currentStoryboard.value.id,
      image_type: 'storyboard',
      frame_type: selectedFrameType.value,
      reference_images: referenceImages.length > 0 ? referenceImages : undefined
    })
    
    generatedImages.value.unshift(result)
    
    // 提示信息
    const refMsg = referenceImages.length > 0 
      ? ` (已添加${referenceImages.length}张参考图)` 
      : ''
    ElMessage.success(`图片生成任务已提交${refMsg}`)
    
    // 启动轮询
    startPolling()
  } catch (error: any) {
    ElMessage.error('生成失败: ' + (error.message || '未知错误'))
  } finally {
    generatingImage.value = false
  }
}

// 获取状态标签类型
const getStatusType = (status: string) => {
  const statusMap: Record<string, any> = {
    pending: 'info',
    processing: 'warning',
    completed: 'success',
    failed: 'danger'
  }
  return statusMap[status] || 'info'
}

// 播放视频
const playVideo = (video: VideoGeneration) => {
  previewVideo.value = video
  showVideoPreview.value = true
}

// 添加视频到素材库
const addVideoToAssets = async (video: VideoGeneration) => {
  if (video.status !== 'completed' || !video.video_url) {
    ElMessage.warning('只能添加已完成的视频到素材库')
    return
  }

  addingToAssets.value.add(video.id)
  
  try {
    // 检查该镜头是否已存在素材
    let isReplacing = false
    if (video.storyboard_id) {
      const existingAsset = videoAssets.value.find(
        (asset: any) => asset.storyboard_id === video.storyboard_id
      )

      if (existingAsset) {
        isReplacing = true
        // 自动替换：先删除旧素材
        try {
          await assetAPI.deleteAsset(existingAsset.id)
        } catch (error) {
          console.error('删除旧素材失败:', error)
        }
      }
    }

    // 添加新素材
    await assetAPI.importFromVideo(video.id)
    ElMessage.success('已添加到素材库')
    
    // 重新加载素材库列表
    await loadVideoAssets()
    
    // 如果是替换操作，更新时间线中使用该分镜的所有视频片段
    if (isReplacing && video.storyboard_id && video.video_url) {
      console.log('=== 视频替换，准备更新时间线 ===')
      console.log('timelineEditorRef.value:', timelineEditorRef.value)
      console.log('video.storyboard_id:', video.storyboard_id)
      console.log('video.video_url:', video.video_url)
      
      if (timelineEditorRef.value) {
        timelineEditorRef.value.updateClipsByStoryboardId(
          video.storyboard_id,
          video.video_url
        )
      } else {
        console.warn('⚠️ timelineEditorRef.value 为空，无法更新时间线')
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '添加失败')
  } finally {
    addingToAssets.value.delete(video.id)
  }
}

// 获取状态中文文本
const getStatusText = (status: string) => {
  const statusTextMap: Record<string, string> = {
    pending: '等待中',
    processing: '生成中',
    completed: '已完成',
    failed: '失败'
  }
  return statusTextMap[status] || status
}

// 获取帧类型中文文本
const getFrameTypeText = (frameType?: string) => {
  if (!frameType) return ''
  const frameTypeMap: Record<string, string> = {
    first: '首帧',
    key: '关键帧',
    last: '尾帧',
    panel: '分镜板',
    action: '动作序列'
  }
  return frameTypeMap[frameType] || frameType
}

// 获取分镜缩略图
const getStoryboardThumbnail = (storyboard: any) => {
  // 优先使用composed_image
  if (storyboard.composed_image) {
    return storyboard.composed_image
  }
  
  // 如果没有composed_image，从image_url字段获取
  if (storyboard.image_url) {
    return storyboard.image_url
  }
  
  return null
}

// 处理图片选择（根据模型能力）
const handleImageSelect = (imageId: number) => {
  if (!selectedReferenceMode.value) {
    ElMessage.warning('请先选择参考图模式')
    return
  }
  
  if (!currentModelCapability.value) {
    ElMessage.warning('请先选择视频生成模型')
    return
  }
  
  const capability = currentModelCapability.value
  const currentIndex = selectedImagesForVideo.value.indexOf(imageId)
  
  // 已选中，则取消选择
  if (currentIndex > -1) {
    selectedImagesForVideo.value.splice(currentIndex, 1)
    return
  }
  
  // 获取当前点击的图片对象
  const clickedImage = videoReferenceImages.value.find(img => img.id === imageId)
  if (!clickedImage) return
  
  // 根据选择的参考图模式处理
  switch (selectedReferenceMode.value) {
    case 'single':
      // 单图模式：只能选1张，直接替换
      selectedImagesForVideo.value = [imageId]
      break
      
    case 'first_last':
      // 首尾帧模式：根据图片类型分别处理
      const frameType = clickedImage.frame_type
      
      if (frameType === 'first' || frameType === 'panel' || frameType === 'key') {
        // 首帧：直接替换
        selectedImagesForVideo.value = [imageId]
      } else if (frameType === 'last') {
        // 尾帧：设置到单独的变量
        selectedLastImageForVideo.value = imageId
      } else {
        ElMessage.warning('首尾帧模式下，请选择首帧或尾帧类型的图片')
      }
      break
      
    case 'multiple':
      // 多图模式：检查是否超出最大数量
      if (selectedImagesForVideo.value.length >= capability.maxImages) {
        ElMessage.warning(`最多只能选择${capability.maxImages}张图片`)
        return
      }
      selectedImagesForVideo.value.push(imageId)
      break
      
    default:
      ElMessage.warning('未知的参考图模式')
  }
}

// 预览图片
const previewImage = (url: string) => {
  // 使用Element Plus的图片预览
  const viewer = document.createElement('div')
  viewer.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
      <img src="${url}" style="max-width: 90vw; max-height: 90vh; object-fit: contain;" onclick="event.stopPropagation();" />
    </div>
  `
  document.body.appendChild(viewer)
}

// 获取已选图片对象列表
const selectedImageObjects = computed(() => {
  return selectedImagesForVideo.value
    .map(id => videoReferenceImages.value.find(img => img.id === id))
    .filter(img => img && img.image_url)
})

// 首尾帧模式：获取首帧图片
const firstFrameSlotImage = computed(() => {
  if (selectedImagesForVideo.value.length === 0) return null
  const firstImageId = selectedImagesForVideo.value[0]
  return videoReferenceImages.value.find(img => img.id === firstImageId)
})

// 首尾帧模式：获取尾帧图片
const lastFrameSlotImage = computed(() => {
  if (!selectedLastImageForVideo.value) return null
  return videoReferenceImages.value.find(img => img.id === selectedLastImageForVideo.value)
})

// 移除已选择的图片
const removeSelectedImage = (imageId: number) => {
  // 检查是否是尾帧
  if (selectedLastImageForVideo.value === imageId) {
    selectedLastImageForVideo.value = null
    return
  }
  
  // 检查是否是首帧或其他图片
  const index = selectedImagesForVideo.value.indexOf(imageId)
  if (index > -1) {
    selectedImagesForVideo.value.splice(index, 1)
  }
}

// 生成视频
const generateVideo = async () => {
  if (!selectedVideoModel.value) {
    ElMessage.warning('请先选择视频生成模型')
    return
  }
  
  if (!currentStoryboard.value) {
    ElMessage.warning('请先选择分镜')
    return
  }
  
  // 检查参考图模式
  if (selectedReferenceMode.value !== 'none' && selectedImagesForVideo.value.length === 0) {
    ElMessage.warning('请选择参考图片')
    return
  }
  
  // 获取第一张选中的图片（仅在需要图片的模式下）
  let selectedImage = null
  if (selectedReferenceMode.value !== 'none' && selectedImagesForVideo.value.length > 0) {
    selectedImage = videoReferenceImages.value.find(img => img.id === selectedImagesForVideo.value[0])
    if (!selectedImage || !selectedImage.image_url) {
      ElMessage.error('请选择有效的参考图片')
      return
    }
  }
  
  generatingVideo.value = true
  try {
    // 从模型名称提取正确的provider
    const provider = extractProviderFromModel(selectedVideoModel.value)
    
    // 构建请求参数
    const requestParams: any = {
      drama_id: dramaId.toString(),
      storyboard_id: currentStoryboard.value.id,
      prompt: currentStoryboard.value.video_prompt || currentStoryboard.value.action || currentStoryboard.value.description || '',
      duration: videoDuration.value,
      provider: provider,
      model: selectedVideoModel.value,
      reference_mode: selectedReferenceMode.value
    }
    
    // 根据参考图模式设置参数
    switch (selectedReferenceMode.value) {
      case 'single':
        // 单图模式
        requestParams.image_url = selectedImage.image_url
        requestParams.image_gen_id = selectedImage.id
        break
      
      case 'first_last':
        // 首尾帧模式
        const firstImage = videoReferenceImages.value.find(img => img.id === selectedImagesForVideo.value[0])
        const lastImage = videoReferenceImages.value.find(img => img.id === selectedLastImageForVideo.value)
        
        if (firstImage?.image_url) {
          requestParams.first_frame_url = firstImage.image_url
        }
        if (lastImage?.image_url) {
          requestParams.last_frame_url = lastImage.image_url
        }
        break
      
      case 'multiple':
        // 多图模式
        const selectedImages = selectedImagesForVideo.value
          .map(id => videoReferenceImages.value.find(img => img.id === id))
          .filter(img => img?.image_url)
          .map(img => img!.image_url)
        requestParams.reference_image_urls = selectedImages
        break
      
      case 'none':
        // 无参考图模式
        break
    }
    
    const result = await videoAPI.generateVideo(requestParams)
    
    generatedVideos.value.unshift(result)
    ElMessage.success('视频生成任务已提交')
    
    // 启动视频轮询
    startVideoPolling()
  } catch (error: any) {
    ElMessage.error('生成失败: ' + (error.message || '未知错误'))
  } finally {
    generatingVideo.value = false
  }
}

// 加载分镜的视频参考图片（所有帧类型）
const loadVideoReferenceImages = async (storyboardId: number) => {
  try {
    const result = await imageAPI.listImages({
      storyboard_id: storyboardId,
      page: 1,
      page_size: 100
    })
    videoReferenceImages.value = result.items || []
  } catch (error: any) {
    console.error('加载视频参考图片失败:', error)
  }
}

// 加载分镜的视频列表
const loadStoryboardVideos = async (storyboardId: number) => {
  loadingVideos.value = true
  try {
    const result = await videoAPI.listVideos({
      storyboard_id: storyboardId.toString(),
      page: 1,
      page_size: 50
    })
    generatedVideos.value = result.items || []
    
    // 如果有进行中的任务，启动轮询
    const hasPendingOrProcessing = generatedVideos.value.some(
      v => v.status === 'pending' || v.status === 'processing'
    )
    if (hasPendingOrProcessing) {
      startVideoPolling()
    }
  } catch (error: any) {
    console.error('加载视频列表失败:', error)
  } finally {
    loadingVideos.value = false
  }
}

// 启动视频状态轮询
const startVideoPolling = () => {
  if (videoPollingTimer) return
  
  videoPollingTimer = setInterval(async () => {
    if (!currentStoryboard.value) {
      stopVideoPolling()
      return
    }
    
    try {
      const result = await videoAPI.listVideos({
        storyboard_id: currentStoryboard.value.id.toString(),
        page: 1,
        page_size: 50
      })
      generatedVideos.value = result.items || []
      
      // 如果没有进行中的任务，停止轮询
      const hasPendingOrProcessing = generatedVideos.value.some(
        v => v.status === 'pending' || v.status === 'processing'
      )
      if (!hasPendingOrProcessing) {
        stopVideoPolling()
      }
    } catch (error) {
      console.error('轮询视频状态失败:', error)
    }
  }, 5000) // 每5秒轮询一次
}

// 停止视频轮询
const stopVideoPolling = () => {
  if (videoPollingTimer) {
    clearInterval(videoPollingTimer)
    videoPollingTimer = null
  }
}

const toggleCharacterInShot = async (charId: number) => {
  if (!currentStoryboard.value) return
  
  // 初始化characters数组
  if (!currentStoryboard.value.characters) {
    currentStoryboard.value.characters = []
  }
  
  const char = characters.value.find(c => c.id === charId)
  if (!char) return
  
  // 检查是否已存在
  const existIndex = currentStoryboard.value.characters.findIndex(c => 
    typeof c === 'object' ? c.id === charId : c === charId
  )
  
  if (existIndex > -1) {
    // 移除角色
    currentStoryboard.value.characters.splice(existIndex, 1)
  } else {
    // 添加角色（作为对象）
    currentStoryboard.value.characters.push(char)
  }
  
  // 保存到后端
  try {
    const characterIds = currentStoryboard.value.characters.map(c => 
      typeof c === 'object' ? c.id : c
    )
    
    await dramaAPI.updateStoryboard(currentStoryboard.value.id.toString(), {
      character_ids: characterIds
    })
    
    if (existIndex > -1) {
      ElMessage.success(`已移除角色: ${char.name}`)
    } else {
      ElMessage.success(`已添加角色: ${char.name}`)
    }
  } catch (error: any) {
    ElMessage.error('保存失败: ' + (error.message || '未知错误'))
    // 回滚操作
    if (existIndex > -1) {
      currentStoryboard.value.characters.push(char)
    } else {
      currentStoryboard.value.characters.splice(currentStoryboard.value.characters.length - 1, 1)
    }
  }
}

const removeCharacterFromShot = async (charId: number) => {
  if (!currentStoryboard.value) return
  
  // 初始化characters数组
  if (!currentStoryboard.value.characters) {
    currentStoryboard.value.characters = []
  }
  
  const char = characters.value.find(c => c.id === charId)
  if (!char) return
  
  // 检查是否已存在
  const existIndex = currentStoryboard.value.characters.findIndex(c => 
    typeof c === 'object' ? c.id === charId : c === charId
  )
  
  if (existIndex > -1) {
    // 移除角色
    currentStoryboard.value.characters.splice(existIndex, 1)
  }
  
  // 保存到后端
  try {
    const characterIds = currentStoryboard.value.characters.map(c => 
      typeof c === 'object' ? c.id : c
    )
    
    await dramaAPI.updateStoryboard(currentStoryboard.value.id.toString(), {
      character_ids: characterIds
    })
    
    ElMessage.success(`已移除角色: ${char.name}`)
  } catch (error: any) {
    ElMessage.error('保存失败: ' + (error.message || '未知错误'))
    // 回滚操作
    currentStoryboard.value.characters.push(char)
  }
}

const loadData = async () => {
  try {
    // 加载剧集信息
    const dramaRes = await dramaAPI.get(dramaId.toString())
    drama.value = dramaRes
    
    // 找到当前章节
    const ep = dramaRes.episodes?.find(e => e.episode_number === episodeNumber)
    if (!ep) {
      ElMessage.error('章节不存在')
      router.back()
      return
    }
    
    episode.value = ep
    episodeId.value = ep.id
    
    // 加载分镜列表
    const storyboardsRes = await dramaAPI.getStoryboards(ep.id.toString())
    
    // API返回格式: {storyboards: [...], total: number}
    storyboards.value = storyboardsRes?.storyboards || []
    
    // 默认选中第一个分镜
    if (storyboards.value.length > 0 && !currentStoryboardId.value) {
      currentStoryboardId.value = storyboards.value[0].id
    }
    
    // 加载角色列表
    characters.value = dramaRes.characters || []
    
    // 加载可用场景列表
    availableScenes.value = dramaRes.scenes || []
    
    // 加载视频素材库
    await loadVideoAssets()
    
  } catch (error: any) {
    ElMessage.error('加载数据失败: ' + (error.message || '未知错误'))
  }
}

const selectScene = async (sceneId: number) => {
  if (!currentStoryboard.value) return
  
  try {
    // TODO: 调用API更新分镜的scene_id
    await dramaAPI.updateScene(currentStoryboard.value.id.toString(), {
      scene_id: sceneId
    })
    
    // 重新加载数据
    await loadData()
    showSceneSelector.value = false
    ElMessage.success('场景关联成功')
  } catch (error: any) {
    ElMessage.error(error.message || '场景关联失败')
  }
}

const selectStoryboard = (id: number) => {
  currentStoryboardId.value = id
}

const handleTimelineSelect = (sceneId: number) => {
  selectStoryboard(sceneId)
}

const handleAddStoryboard = async () => {
  ElMessage.info('添加分镜功能开发中')
}

const togglePlay = () => {
  if (currentPlayState.value === 'playing') {
    currentPlayState.value = 'paused'
  } else {
    currentPlayState.value = 'playing'
  }
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const zoomIn = () => {
  ElMessage.info('时间线缩放功能开发中')
}

const zoomOut = () => {
  ElMessage.info('时间线缩放功能开发中')
}

const generateImage = async () => {
  if (!currentStoryboard.value) return
  
  try {
    ElMessage.info('图片生成功能开发中')
  } catch (error: any) {
    ElMessage.error(error.message || '生成失败')
  }
}

const uploadImage = () => {
  ElMessage.info('上传图片功能开发中')
}

const goBack = () => {
  router.replace({
    name: 'EpisodeWorkflowNew',
    params: { id: dramaId, episodeNumber }
  })
}

// 加载视频合成列表
const loadVideoMerges = async () => {
  if (!episodeId.value) return
  
  try {
    loadingMerges.value = true
    const result = await videoMergeAPI.listMerges({
      episode_id: episodeId.value.toString(),
      page: 1,
      page_size: 20
    })
    videoMerges.value = result.merges

    // 检查是否有进行中的任务
    const hasProcessingTasks = result.merges.some(
      (merge: any) => merge.status === 'pending' || merge.status === 'processing'
    )
    
    if (hasProcessingTasks) {
      startMergePolling()
    } else {
      stopMergePolling()
    }
  } catch (error: any) {
    console.error('加载视频合成列表失败:', error)
    ElMessage.error('加载视频合成列表失败')
  } finally {
    loadingMerges.value = false
  }
}

// 启动视频合成列表轮询
const startMergePolling = () => {
  if (mergePollingTimer) return
  
  mergePollingTimer = setInterval(async () => {
    if (!episodeId.value) {
      stopMergePolling()
      return
    }
    
    try {
      const result = await videoMergeAPI.listMerges({
        episode_id: episodeId.value.toString(),
        page: 1,
        page_size: 20
      })
      videoMerges.value = result.merges
      
      // 检查是否还有进行中的任务
      const hasProcessingTasks = result.merges.some(
        (merge: any) => merge.status === 'pending' || merge.status === 'processing'
      )
      
      if (!hasProcessingTasks) {
        stopMergePolling()
      }
    } catch (error) {
    }
  }, 3000) // 每3秒轮询一次
}

// 停止视频合成列表轮询
const stopMergePolling = () => {
  if (mergePollingTimer) {
    clearInterval(mergePollingTimer)
    mergePollingTimer = null
  }
}

// 处理视频合成完成事件
const handleMergeCompleted = async (mergeId: number) => {
  // 刷新视频合成列表
  await loadVideoMerges()
  // 切换到视频合成标签页
  activeTab.value = 'merges'
}

// 下载视频
const downloadVideo = async (url: string, title: string) => {
  try {
    const loadingMsg = ElMessage.info({
      message: '正在准备下载...',
      duration: 0
    })
    
    // 使用fetch获取视频blob
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    
    // 创建下载链接
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `${title}.mp4`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    }, 100)
    
    loadingMsg.close()
    ElMessage.success('视频下载已开始')
  } catch (error) {
    console.error('下载视频失败:', error)
    ElMessage.error('视频下载失败，请稍后重试')
  }
}

// 预览合成视频
const previewMergedVideo = (url: string) => {
  window.open(url, '_blank')
}

// 删除视频合成记录
const deleteMerge = async (mergeId: number) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此合成记录吗？此操作不可恢复。',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await videoMergeAPI.deleteMerge(mergeId)
    ElMessage.success('删除成功')
    // 刷新列表
    await loadVideoMerges()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  // 超过7天显示完整日期
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

onMounted(async () => {
  await loadData()
  await loadVideoModels()
  await loadVideoMerges()
})

// 组件卸载时停止轮询
onBeforeUnmount(() => {
  stopPolling()
  stopVideoPolling()
  stopMergePolling()
})
</script>

<style scoped lang="scss">
// 镜头列表项样式 - 白色主题
.storyboard-item {
    padding: 8px;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
    border: 1px solid #e0e0e0;
    margin-bottom: 8px;
    display: flex;
    gap: 10px;
    align-items: center;
    background: #fff;

    &:hover {
        background: #f5f5f5;
        border-color: #d0d0d0;
    }

    &.active {
        background: #409eff;
        border-color: #409eff;

        .shot-number,
        .shot-title {
            color: #fff !important;
        }

        .shot-duration {
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
        }
    }

    .shot-thumbnail {
        width: 80px;
        height: 50px;
        border-radius: 4px;
        overflow: hidden;
        background: #f0f0f0;
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
                color: #666;
                font-weight: 500;
            }

            .shot-duration {
                font-size: 11px;
                color: #666;
                background: #f0f0f0;
                padding: 2px 6px;
                border-radius: 3px;
            }
        }

        .shot-title {
            font-size: 13px;
            color: #333;
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
  background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);

  .merge-items {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .merge-item {
    position: relative;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.02);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(64, 158, 255, 0.3);
      border-color: rgba(64, 158, 255, 0.2);
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
      border-bottom: 1px solid #f0f2f5;

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
          background: linear-gradient(135deg, #f5f7fa 0%, #e8eaf0 100%);
          color: #606266;
          transition: all 0.3s;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }

        .merge-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #303133;
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
      box-shadow: 0 2px 8px rgba(103, 194, 58, 0.25);
    }

    &.merge-status-processing .title-icon {
      background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
      color: #fff;
      box-shadow: 0 2px 8px rgba(230, 162, 60, 0.25);
    }

    &.merge-status-failed .title-icon {
      background: linear-gradient(135deg, #f56c6c 0%, #f89898 100%);
      color: #fff;
      box-shadow: 0 2px 8px rgba(245, 108, 108, 0.25);
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
        background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
        border-radius: 8px;
        border: 1px solid transparent;
        transition: all 0.3s;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

        &:hover {
          background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border-color: rgba(64, 158, 255, 0.15);
        }

        .detail-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #fff;
          color: #409eff;
          flex-shrink: 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .detail-content {
          flex: 1;
          min-width: 0;

          .detail-label {
            font-size: 11px;
            color: #909399;
            margin-bottom: 3px;
            font-weight: 500;
          }

          .detail-value {
            font-size: 13px;
            color: #303133;
            font-weight: 600;
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
        box-shadow: 0 1px 4px rgba(245, 108, 108, 0.12);
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
  0%, 100% {
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
  background: #fff;

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
    border: 1px solid #e0e0e0;

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
      color: #999;
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
          color: #666;
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

  .scene-card {
    border: 2px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #409eff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    &.selected {
      border-color: #409eff;
      background: #ecf5ff;
    }

    .scene-image {
      width: 100%;
      height: 150px;
      background: #f5f5f5;
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
      background: #fff;

      .scene-location {
        font-size: 14px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 4px;
      }

      .scene-time {
        font-size: 12px;
        color: #909399;
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

  .character-card {
    position: relative;
    border: 2px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    &:hover {
      border-color: #409eff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    &.selected {
      border-color: #409eff;
      background: #ecf5ff;
    }

    .character-avatar-large {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      font-size: 32px;
      font-weight: 600;
      color: #409eff;

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
        color: #303133;
        margin-bottom: 4px;
      }

      .character-role {
        font-size: 12px;
        color: #909399;
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
  background: #f5f5f5;
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
    color: #666;
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
        color: #666;
        margin-bottom: 6px;
      }
    }
  }

  .audio-controls {
    :deep(.el-textarea__inner) {
      background: #fff;
      border-color: #dcdfe6;
      color: #333;
      
      &::placeholder {
        color: #999;
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
  background: #f5f5f5;
  color: #333;

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: #fff;
    border-bottom: 1px solid #e0e0e0;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .back-btn {
        color: #333;
        &:hover {
          color: #409eff;
        }
      }

      .episode-title {
        font-size: 14px;
        color: #333;
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
      background: #fff;
      border-right: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid #e0e0e0;

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
          background: #f9f9f9;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: #f0f0f0;
          }

          &.active {
            background: #e6f7ff;
            border-left: 3px solid #409eff;

            .shot-content {
              .shot-number,
              .shot-title {
                color: #0066cc !important;
              }

              .shot-action {
                color: #333 !important;
              }

              .shot-duration {
                background: rgba(64, 158, 255, 0.15);
                color: #409eff;
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
                  color: #666;
                  flex-shrink: 0;
                }

                .shot-title {
                  font-size: 13px;
                  font-weight: 500;
                  color: #333;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
              }

              .shot-duration {
                font-size: 11px;
                color: #999;
                background: #f0f0f0;
                padding: 2px 8px;
                border-radius: 4px;
                flex-shrink: 0;
              }
            }

            .shot-action {
              font-size: 11px;
              color: #666;
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
      background: #fafafa;
      overflow: hidden;

      .empty-timeline {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    .edit-panel {
      width: 420px;
      background: #fff;
      border-left: 1px solid #e0e0e0;
      overflow: hidden;
      flex-shrink: 0;

      .edit-tabs {
        height: 100%;

        :deep(.el-tabs__header) {
          margin: 0;
          background: #f9f9f9;
          padding: 0 16px;
          border-bottom: 1px solid #e0e0e0;
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

// 图片生成界面样式
.image-generation-section {
  .frame-type-selector {
    margin-bottom: 20px;
    
    .section-label {
      font-size: 13px;
      color: #333;
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
      color: #333;
      font-weight: 500;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }

    :deep(.el-textarea__inner) {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
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
      color: #303133;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;

      &::before {
        content: '';
        width: 3px;
        height: 14px;
        background: linear-gradient(to bottom, #409eff, #66b1ff);
        border-radius: 2px;
      }
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
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #409eff;
        }

        :deep(.el-image) {
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #f5f7fa;
          display: block;
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

          &::before {
            content: '';
            position: absolute;
            width: 200%;
            height: 200%;
            background: linear-gradient(
              45deg,
              transparent 30%,
              rgba(255, 255, 255, 0.3) 50%,
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
          background: linear-gradient(to top, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.2) 70%, transparent);
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

  // 视频生成样式
  .video-generation-section {
    .section-label {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 12px;
      padding-left: 8px;
      border-left: 3px solid #409eff;
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

        &::before {
          content: '';
          width: 3px;
          height: 14px;
          background: linear-gradient(to bottom, #409eff, #66b1ff);
          border-radius: 2px;
        }
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
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-color: #409eff;
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

            &::before {
              content: '';
              position: absolute;
              width: 200%;
              height: 200%;
              background: linear-gradient(
                45deg,
                transparent 30%,
                rgba(255, 255, 255, 0.3) 50%,
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
            background: linear-gradient(to top, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.2) 70%, transparent);
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
            aspect-ratio: 16 / 9;
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
        }
      }
    }

    .video-params-section {
      margin-bottom: 24px;
      padding: 20px;
      background: linear-gradient(135deg, #f5f7fa 0%, #f9f9f9 100%);
      border-radius: 12px;
      border: 1px solid #e4e7ed;
    }

    .reference-images-section {
      margin-top: 24px;

      .image-slots-container {
        padding: 20px;
        background: #fafafa;
        border-radius: 12px;
        border: 1px dashed #dcdfe6;
      }

      .image-slot {
        position: relative;
        width: 140px;
        height: 90px;
        border: 2px dashed #dcdfe6;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s;
        background: #fff;

        &:hover {
          border-color: #409eff;
          box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
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
        color: #909399;
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

      .frame-type-buttons {
        margin-bottom: 20px;
        text-align: center;
        
        :deep(.el-radio-group) {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        :deep(.el-radio-button) {
          border-radius: 6px;
          overflow: hidden;
          
          &:first-child .el-radio-button__inner {
            border-radius: 6px 0 0 6px;
          }
          
          &:last-child .el-radio-button__inner {
            border-radius: 0 6px 6px 0;
          }
        }

        :deep(.el-radio-button__inner) {
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 500;
          border-color: #dcdfe6;
          transition: all 0.2s;
          
          &:hover {
            color: #409eff;
            border-color: #409eff;
          }
        }

        :deep(.el-radio-button.is-active .el-radio-button__inner) {
          background: linear-gradient(135deg, #409eff 0%, #5eabff 100%);
          border-color: #409eff;
          box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
        }
      }

      .frame-type-content {
        padding: 20px;
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid #e4e7ed;
        min-height: 200px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }

      .image-scroll-container {
        max-height: 280px;
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

      .reference-grid {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 12px !important;
        
        .reference-item {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          border: 3px solid transparent;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100% !important;
          max-width: 180px !important;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

          &:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
            border-color: #409eff;
          }

          &.selected {
            border-color: #409eff;
            box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
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
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid #e4e7ed;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
        border-color: #c6e2ff;
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
            color: #303133;
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
        background: linear-gradient(135deg, #f5f7fa 0%, #fafbfc 100%);
        border-radius: 8px;
        border: 1px solid #ebeef5;

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
            background: white;
            border-radius: 8px;
            color: #409eff;
            flex-shrink: 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }

          .detail-content {
            flex: 1;
            min-width: 0;

            .detail-label {
              font-size: 12px;
              color: #909399;
              margin-bottom: 4px;
              font-weight: 500;
            }

            .detail-value {
              font-size: 14px;
              color: #303133;
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
        border-top: 1px solid #ebeef5;

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
      0%, 100% {
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

}
</style>
