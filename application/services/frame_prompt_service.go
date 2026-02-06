package services

import (
	"fmt"
	"strings"

	"github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"gorm.io/gorm"
)

// FramePromptService 处理帧提示词生成
type FramePromptService struct {
	db          *gorm.DB
	aiService   *AIService
	log         *logger.Logger
	config      *config.Config
	promptI18n  *PromptI18n
	taskService *TaskService
}

// NewFramePromptService 创建帧提示词服务
func NewFramePromptService(db *gorm.DB, cfg *config.Config, log *logger.Logger) *FramePromptService {
	return &FramePromptService{
		db:          db,
		aiService:   NewAIService(db, log),
		log:         log,
		config:      cfg,
		promptI18n:  NewPromptI18n(cfg),
		taskService: NewTaskService(db, log),
	}
}

// FrameType 帧类型
type FrameType string

const (
	FrameTypeFirst  FrameType = "first"  // 首帧
	FrameTypeKey    FrameType = "key"    // 关键帧
	FrameTypeLast   FrameType = "last"   // 尾帧
	FrameTypePanel  FrameType = "panel"  // 分镜板（3格组合）
	FrameTypeAction FrameType = "action" // 动作序列（5格）
)

// GenerateFramePromptRequest 生成帧提示词请求
type GenerateFramePromptRequest struct {
	StoryboardID string    `json:"storyboard_id"`
	FrameType    FrameType `json:"frame_type"`
	// 可选参数
	PanelCount int `json:"panel_count,omitempty"` // 分镜板格数，默认3
}

// FramePromptResponse 帧提示词响应
type FramePromptResponse struct {
	FrameType   FrameType          `json:"frame_type"`
	SingleFrame *SingleFramePrompt `json:"single_frame,omitempty"` // 单帧提示词
	MultiFrame  *MultiFramePrompt  `json:"multi_frame,omitempty"`  // 多帧提示词
}

// SingleFramePrompt 单帧提示词
type SingleFramePrompt struct {
	Prompt      string `json:"prompt"`
	Description string `json:"description"`
}

// MultiFramePrompt 多帧提示词
type MultiFramePrompt struct {
	Layout string              `json:"layout"` // horizontal_3, grid_2x2 等
	Frames []SingleFramePrompt `json:"frames"`
}

// GenerateFramePrompt 生成指定类型的帧提示词并保存到frame_prompts表
func (s *FramePromptService) GenerateFramePrompt(req GenerateFramePromptRequest, model string) (string, error) {
	// 查询分镜信息
	var storyboard models.Storyboard
	if err := s.db.Preload("Characters").First(&storyboard, req.StoryboardID).Error; err != nil {
		return "", fmt.Errorf("storyboard not found: %w", err)
	}

	// 创建任务
	task, err := s.taskService.CreateTask("frame_prompt_generation", req.StoryboardID)
	if err != nil {
		s.log.Errorw("Failed to create frame prompt generation task", "error", err, "storyboard_id", req.StoryboardID)
		return "", fmt.Errorf("创建任务失败: %w", err)
	}

	// 异步处理帧提示词生成
	go s.processFramePromptGeneration(task.ID, req, model)

	s.log.Infow("Frame prompt generation task created", "task_id", task.ID, "storyboard_id", req.StoryboardID, "frame_type", req.FrameType)
	return task.ID, nil
}

// processFramePromptGeneration 异步处理帧提示词生成
func (s *FramePromptService) processFramePromptGeneration(taskID string, req GenerateFramePromptRequest, model string) {
	// 更新任务状态为处理中
	s.taskService.UpdateTaskStatus(taskID, "processing", 0, "正在生成帧提示词...")

	// 查询分镜信息
	var storyboard models.Storyboard
	if err := s.db.Preload("Characters").First(&storyboard, req.StoryboardID).Error; err != nil {
		s.log.Errorw("Storyboard not found during frame prompt generation", "error", err, "storyboard_id", req.StoryboardID)
		s.taskService.UpdateTaskStatus(taskID, "failed", 0, "分镜信息不存在")
		return
	}

	// 获取场景信息
	var scene *models.Scene
	if storyboard.SceneID != nil {
		scene = &models.Scene{}
		if err := s.db.First(scene, *storyboard.SceneID).Error; err != nil {
			s.log.Warnw("Scene not found during frame prompt generation", "scene_id", *storyboard.SceneID, "task_id", taskID)
			scene = nil
		}
	}

	// 获取 drama 的 style 信息
	var episode models.Episode
	if err := s.db.Preload("Drama").First(&episode, storyboard.EpisodeID).Error; err != nil {
		s.log.Warnw("Failed to load episode and drama", "error", err, "episode_id", storyboard.EpisodeID)
	}
	dramaStyle := episode.Drama.Style

	response := &FramePromptResponse{
		FrameType: req.FrameType,
	}

	// 生成提示词
	switch req.FrameType {
	case FrameTypeFirst:
		response.SingleFrame = s.generateFirstFrame(storyboard, scene, dramaStyle, model)
		// 保存单帧提示词
		s.saveFramePrompt(req.StoryboardID, string(req.FrameType), response.SingleFrame.Prompt, response.SingleFrame.Description, "")
	case FrameTypeKey:
		response.SingleFrame = s.generateKeyFrame(storyboard, scene, dramaStyle, model)
		s.saveFramePrompt(req.StoryboardID, string(req.FrameType), response.SingleFrame.Prompt, response.SingleFrame.Description, "")
	case FrameTypeLast:
		response.SingleFrame = s.generateLastFrame(storyboard, scene, dramaStyle, model)
		s.saveFramePrompt(req.StoryboardID, string(req.FrameType), response.SingleFrame.Prompt, response.SingleFrame.Description, "")
	case FrameTypePanel:
		count := req.PanelCount
		if count == 0 {
			count = 3
		}
		response.MultiFrame = s.generatePanelFrames(storyboard, scene, count, dramaStyle, model)
		// 保存多帧提示词（合并为一条记录）
		var prompts []string
		for _, frame := range response.MultiFrame.Frames {
			prompts = append(prompts, frame.Prompt)
		}
		combinedPrompt := strings.Join(prompts, "\n---\n")
		s.saveFramePrompt(req.StoryboardID, string(req.FrameType), combinedPrompt, "分镜板组合提示词", response.MultiFrame.Layout)
	case FrameTypeAction:
		response.MultiFrame = s.generateActionSequence(storyboard, scene, dramaStyle, model)
		var prompts []string
		for _, frame := range response.MultiFrame.Frames {
			prompts = append(prompts, frame.Prompt)
		}
		combinedPrompt := strings.Join(prompts, "\n---\n")
		s.saveFramePrompt(req.StoryboardID, string(req.FrameType), combinedPrompt, "动作序列组合提示词", response.MultiFrame.Layout)
	default:
		s.log.Errorw("Unsupported frame type during frame prompt generation", "frame_type", req.FrameType, "task_id", taskID)
		s.taskService.UpdateTaskStatus(taskID, "failed", 0, "不支持的帧类型")
		return
	}

	// 更新任务状态为完成
	s.taskService.UpdateTaskResult(taskID, map[string]interface{}{
		"response":      response,
		"storyboard_id": req.StoryboardID,
		"frame_type":    string(req.FrameType),
	})

	s.log.Infow("Frame prompt generation completed", "task_id", taskID, "storyboard_id", req.StoryboardID, "frame_type", req.FrameType)
}

// saveFramePrompt 保存帧提示词到数据库
func (s *FramePromptService) saveFramePrompt(storyboardID, frameType, prompt, description, layout string) {
	framePrompt := models.FramePrompt{
		StoryboardID: uint(mustParseUint(storyboardID)),
		FrameType:    frameType,
		Prompt:       prompt,
	}

	if description != "" {
		framePrompt.Description = &description
	}
	if layout != "" {
		framePrompt.Layout = &layout
	}

	// 先删除同类型的旧记录（保持最新）
	s.db.Where("storyboard_id = ? AND frame_type = ?", storyboardID, frameType).Delete(&models.FramePrompt{})

	// 插入新记录
	if err := s.db.Create(&framePrompt).Error; err != nil {
		s.log.Warnw("Failed to save frame prompt", "error", err, "storyboard_id", storyboardID, "frame_type", frameType)
	}
}

// mustParseUint 辅助函数
func mustParseUint(s string) uint64 {
	var result uint64
	fmt.Sscanf(s, "%d", &result)
	return result
}

// generateFirstFrame 生成首帧提示词
func (s *FramePromptService) generateFirstFrame(sb models.Storyboard, scene *models.Scene, dramaStyle string, model string) *SingleFramePrompt {
	// 构建上下文信息
	contextInfo := s.buildStoryboardContext(sb, scene)

	// 使用国际化提示词
	systemPrompt := s.promptI18n.GetFirstFramePrompt(dramaStyle)
	userPrompt := s.promptI18n.FormatUserPrompt("frame_info", contextInfo)

	// 调用AI生成（如果指定了模型则使用指定的模型）
	var aiResponse string
	var err error
	if model != "" {
		client, getErr := s.aiService.GetAIClientForModel("text", model)
		if getErr != nil {
			s.log.Warnw("Failed to get client for specified model, using default", "model", model, "error", getErr)
			aiResponse, err = s.aiService.GenerateText(userPrompt, systemPrompt)
		} else {
			aiResponse, err = client.GenerateText(userPrompt, systemPrompt)
		}
	} else {
		aiResponse, err = s.aiService.GenerateText(userPrompt, systemPrompt)
	}
	if err != nil {
		s.log.Warnw("AI generation failed, using fallback", "error", err)
		// 降级方案：使用简单拼接
		fallbackPrompt := s.buildFallbackPrompt(sb, scene, "first frame, static shot")
		return &SingleFramePrompt{
			Prompt:      fallbackPrompt,
			Description: "镜头开始的静态画面，展示初始状态",
		}
	}

	// 解析AI返回的JSON
	result := s.parseFramePromptJSON(aiResponse)
	if result == nil {
		// JSON解析失败，使用降级方案
		s.log.Warnw("Failed to parse AI JSON response, using fallback", "storyboard_id", sb.ID, "response", aiResponse)
		fallbackPrompt := s.buildFallbackPrompt(sb, scene, "first frame, static shot")
		return &SingleFramePrompt{
			Prompt:      fallbackPrompt,
			Description: "镜头开始的静态画面，展示初始状态",
		}
	}

	return result
}

// generateKeyFrame 生成关键帧提示词
func (s *FramePromptService) generateKeyFrame(sb models.Storyboard, scene *models.Scene, dramaStyle string, model string) *SingleFramePrompt {
	// 构建上下文信息
	contextInfo := s.buildStoryboardContext(sb, scene)

	// 使用国际化提示词
	systemPrompt := s.promptI18n.GetKeyFramePrompt(dramaStyle)
	userPrompt := s.promptI18n.FormatUserPrompt("key_frame_info", contextInfo)

	// 调用AI生成（如果指定了模型则使用指定的模型）
	var aiResponse string
	var err error
	if model != "" {
		client, getErr := s.aiService.GetAIClientForModel("text", model)
		if getErr != nil {
			s.log.Warnw("Failed to get client for specified model, using default", "model", model, "error", getErr)
			aiResponse, err = s.aiService.GenerateText(userPrompt, systemPrompt)
		} else {
			aiResponse, err = client.GenerateText(userPrompt, systemPrompt)
		}
	} else {
		aiResponse, err = s.aiService.GenerateText(userPrompt, systemPrompt)
	}
	if err != nil {
		s.log.Warnw("AI generation failed, using fallback", "error", err)
		fallbackPrompt := s.buildFallbackPrompt(sb, scene, "key frame, dynamic action")
		return &SingleFramePrompt{
			Prompt:      fallbackPrompt,
			Description: "动作高潮瞬间，展示关键动作",
		}
	}

	// 解析AI返回的JSON
	result := s.parseFramePromptJSON(aiResponse)
	if result == nil {
		// JSON解析失败，使用降级方案
		s.log.Warnw("Failed to parse AI JSON response, using fallback", "storyboard_id", sb.ID, "response", aiResponse)
		fallbackPrompt := s.buildFallbackPrompt(sb, scene, "key frame, dynamic action")
		return &SingleFramePrompt{
			Prompt:      fallbackPrompt,
			Description: "动作高潮瞬间，展示关键动作",
		}
	}

	return result
}

// generateLastFrame 生成尾帧提示词
func (s *FramePromptService) generateLastFrame(sb models.Storyboard, scene *models.Scene, dramaStyle string, model string) *SingleFramePrompt {
	// 构建上下文信息
	contextInfo := s.buildStoryboardContext(sb, scene)

	// 使用国际化提示词
	systemPrompt := s.promptI18n.GetLastFramePrompt(dramaStyle)
	userPrompt := s.promptI18n.FormatUserPrompt("last_frame_info", contextInfo)

	// 调用AI生成（如果指定了模型则使用指定的模型）
	var aiResponse string
	var err error
	if model != "" {
		client, getErr := s.aiService.GetAIClientForModel("text", model)
		if getErr != nil {
			s.log.Warnw("Failed to get client for specified model, using default", "model", model, "error", getErr)
			aiResponse, err = s.aiService.GenerateText(userPrompt, systemPrompt)
		} else {
			aiResponse, err = client.GenerateText(userPrompt, systemPrompt)
		}
	} else {
		aiResponse, err = s.aiService.GenerateText(userPrompt, systemPrompt)
	}
	if err != nil {
		s.log.Warnw("AI generation failed, using fallback", "error", err)
		fallbackPrompt := s.buildFallbackPrompt(sb, scene, "last frame, final state")
		return &SingleFramePrompt{
			Prompt:      fallbackPrompt,
			Description: "镜头结束画面，展示最终状态和结果",
		}
	}

	// 解析AI返回的JSON
	result := s.parseFramePromptJSON(aiResponse)
	if result == nil {
		// JSON解析失败，使用降级方案
		s.log.Warnw("Failed to parse AI JSON response, using fallback", "storyboard_id", sb.ID, "response", aiResponse)
		fallbackPrompt := s.buildFallbackPrompt(sb, scene, "last frame, final state")
		return &SingleFramePrompt{
			Prompt:      fallbackPrompt,
			Description: "镜头结束画面，展示最终状态和结果",
		}
	}

	return result
}

// generatePanelFrames 生成分镜板提示词（多格组合）
func (s *FramePromptService) generatePanelFrames(sb models.Storyboard, scene *models.Scene, count int, dramaStyle string, model string) *MultiFramePrompt {
	layout := fmt.Sprintf("horizontal_%d", count)

	frames := make([]SingleFramePrompt, count)

	// 固定生成：首帧 -> 关键帧 -> 尾帧
	if count == 3 {
		frames[0] = *s.generateFirstFrame(sb, scene, dramaStyle, model)
		frames[0].Description = "第1格：初始状态"

		frames[1] = *s.generateKeyFrame(sb, scene, dramaStyle, model)
		frames[1].Description = "第2格：动作高潮"

		frames[2] = *s.generateLastFrame(sb, scene, dramaStyle, model)
		frames[2].Description = "第3格：最终状态"
	} else if count == 4 {
		// 4格：首帧 -> 中间帧1 -> 中间帧2 -> 尾帧
		frames[0] = *s.generateFirstFrame(sb, scene, dramaStyle, model)
		frames[1] = *s.generateKeyFrame(sb, scene, dramaStyle, model)
		frames[2] = *s.generateKeyFrame(sb, scene, dramaStyle, model)
		frames[3] = *s.generateLastFrame(sb, scene, dramaStyle, model)
	}

	return &MultiFramePrompt{
		Layout: layout,
		Frames: frames,
	}
}

// generateActionSequence 生成动作序列提示词（3x3宫格）
func (s *FramePromptService) generateActionSequence(sb models.Storyboard, scene *models.Scene, dramaStyle string, model string) *MultiFramePrompt {
	// 构建上下文信息
	contextInfo := s.buildStoryboardContext(sb, scene)

	// 使用国际化提示词 - 专门为动作序列设计的提示词
	systemPrompt := s.promptI18n.GetActionSequenceFramePrompt(dramaStyle)
	userPrompt := s.promptI18n.FormatUserPrompt("frame_info", contextInfo)

	// 调用AI生成（如果指定了模型则使用指定的模型）
	var aiResponse string
	var err error
	if model != "" {
		client, getErr := s.aiService.GetAIClientForModel("text", model)
		if getErr != nil {
			s.log.Warnw("Failed to get client for specified model, using default", "model", model, "error", getErr)
			aiResponse, err = s.aiService.GenerateText(userPrompt, systemPrompt)
		} else {
			aiResponse, err = client.GenerateText(userPrompt, systemPrompt)
		}
	} else {
		aiResponse, err = s.aiService.GenerateText(userPrompt, systemPrompt)
	}

	if err != nil {
		s.log.Warnw("AI generation failed for action sequence, using fallback", "error", err)
		// 降级方案：使用简单拼接
		fallbackPrompt := s.buildFallbackPrompt(sb, scene, "3x3 storyboard grid action sequence, character consistency, continuous movement progression")
		return &MultiFramePrompt{
			Layout: "grid_3x3",
			Frames: []SingleFramePrompt{
				{
					Prompt:      fallbackPrompt,
					Description: "3x3宫格动作序列，展示连贯的动作演进",
				},
			},
		}
	}

	// 解析AI返回的JSON
	result := s.parseFramePromptJSON(aiResponse)
	if result == nil {
		// JSON解析失败，使用降级方案
		s.log.Warnw("Failed to parse AI JSON response for action sequence, using fallback", "storyboard_id", sb.ID, "response", aiResponse)
		fallbackPrompt := s.buildFallbackPrompt(sb, scene, "3x3 storyboard grid action sequence, character consistency, continuous movement progression")
		return &MultiFramePrompt{
			Layout: "grid_3x3",
			Frames: []SingleFramePrompt{
				{
					Prompt:      fallbackPrompt,
					Description: "3x3宫格动作序列，展示连贯的动作演进",
				},
			},
		}
	}

	// 动作序列是一个整体的3x3宫格图片，所以只返回一个prompt
	return &MultiFramePrompt{
		Layout: "grid_3x3",
		Frames: []SingleFramePrompt{*result},
	}
}

// buildStoryboardContext 构建镜头上下文信息
func (s *FramePromptService) buildStoryboardContext(sb models.Storyboard, scene *models.Scene) string {
	var parts []string

	// 镜头描述（最重要）
	if sb.Description != nil && *sb.Description != "" {
		parts = append(parts, s.promptI18n.FormatUserPrompt("shot_description_label", *sb.Description))
	}

	// 场景信息
	if scene != nil {
		parts = append(parts, s.promptI18n.FormatUserPrompt("scene_label", scene.Location, scene.Time))
	} else if sb.Location != nil && sb.Time != nil {
		parts = append(parts, s.promptI18n.FormatUserPrompt("scene_label", *sb.Location, *sb.Time))
	}

	// 角色
	if len(sb.Characters) > 0 {
		var charNames []string
		for _, char := range sb.Characters {
			charNames = append(charNames, char.Name)
		}
		parts = append(parts, s.promptI18n.FormatUserPrompt("characters_label", strings.Join(charNames, ", ")))
	}

	// 动作
	if sb.Action != nil && *sb.Action != "" {
		parts = append(parts, s.promptI18n.FormatUserPrompt("action_label", *sb.Action))
	}

	// 结果
	if sb.Result != nil && *sb.Result != "" {
		parts = append(parts, s.promptI18n.FormatUserPrompt("result_label", *sb.Result))
	}

	// 对白
	if sb.Dialogue != nil && *sb.Dialogue != "" {
		parts = append(parts, s.promptI18n.FormatUserPrompt("dialogue_label", *sb.Dialogue))
	}

	// 氛围
	if sb.Atmosphere != nil && *sb.Atmosphere != "" {
		parts = append(parts, s.promptI18n.FormatUserPrompt("atmosphere_label", *sb.Atmosphere))
	}

	// 镜头参数
	if sb.ShotType != nil {
		parts = append(parts, s.promptI18n.FormatUserPrompt("shot_type_label", *sb.ShotType))
	}
	if sb.Angle != nil {
		parts = append(parts, s.promptI18n.FormatUserPrompt("angle_label", *sb.Angle))
	}
	if sb.Movement != nil {
		parts = append(parts, s.promptI18n.FormatUserPrompt("movement_label", *sb.Movement))
	}

	return strings.Join(parts, "\n")
}

// buildFallbackPrompt 构建降级提示词（AI失败时使用）
func (s *FramePromptService) buildFallbackPrompt(sb models.Storyboard, scene *models.Scene, suffix string) string {
	var parts []string

	// 场景
	if scene != nil {
		parts = append(parts, fmt.Sprintf("%s, %s", scene.Location, scene.Time))
	}

	// 角色
	if len(sb.Characters) > 0 {
		for _, char := range sb.Characters {
			parts = append(parts, char.Name)
		}
	}

	// 氛围
	if sb.Atmosphere != nil {
		parts = append(parts, *sb.Atmosphere)
	}

	parts = append(parts, "anime style", suffix)
	return strings.Join(parts, ", ")
}
