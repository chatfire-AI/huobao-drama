package services

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	models "github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/infrastructure/storage"
	"github.com/drama-generator/backend/pkg/ai"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/image"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/utils"
	"gorm.io/gorm"
)

type ImageGenerationService struct {
	db              *gorm.DB
	aiService       *AIService
	transferService *ResourceTransferService
	localStorage    *storage.LocalStorage
	log             *logger.Logger
	config          *config.Config
	promptI18n      *PromptI18n
	taskService     *TaskService
}

// truncateImageURL 截断图片 URL，避免 base64 格式的 URL 占满日志
func truncateImageURL(url string) string {
	if url == "" {
		return ""
	}
	// 如果是 data URI 格式（base64），只显示前缀
	if strings.HasPrefix(url, "data:") {
		if len(url) > 50 {
			return url[:50] + "...[base64 data]"
		}
	}
	// 普通 URL 如果过长也截断
	if len(url) > 100 {
		return url[:100] + "..."
	}
	return url
}

func NewImageGenerationService(db *gorm.DB, cfg *config.Config, transferService *ResourceTransferService, localStorage *storage.LocalStorage, log *logger.Logger) *ImageGenerationService {
	return &ImageGenerationService{
		db:              db,
		aiService:       NewAIService(db, log),
		transferService: transferService,
		localStorage:    localStorage,
		config:          cfg,
		promptI18n:      NewPromptI18n(cfg),
		log:             log,
		taskService:     NewTaskService(db, log),
	}
}

// GetDB 获取数据库连接
func (s *ImageGenerationService) GetDB() *gorm.DB {
	return s.db
}

type GenerateImageRequest struct {
	StoryboardID    *uint    `json:"storyboard_id"`
	DramaID         string   `json:"drama_id" binding:"required"`
	SceneID         *uint    `json:"scene_id"`
	CharacterID     *uint    `json:"character_id"`
	PropID          *uint    `json:"prop_id"`
	ImageType       string   `json:"image_type"` // character, scene, storyboard
	FrameType       *string  `json:"frame_type"` // first, key, last, panel, action
	Prompt          string   `json:"prompt" binding:"required,min=5,max=2000"`
	NegativePrompt  *string  `json:"negative_prompt"`
	Provider        string   `json:"provider"`
	Model           string   `json:"model"`
	Size            string   `json:"size"`
	Quality         string   `json:"quality"`
	Style           *string  `json:"style"`
	Steps           *int     `json:"steps"`
	CfgScale        *float64 `json:"cfg_scale"`
	Seed            *int64   `json:"seed"`
	Width           *int     `json:"width"`
	Height          *int     `json:"height"`
	ImageLocalPath  *string  `json:"image_local_path"` // 本地图片路径，用于图生图
	ReferenceImages []string `json:"reference_images"` // 参考图片URL列表
}

func (s *ImageGenerationService) GenerateImage(request *GenerateImageRequest) (*models.ImageGeneration, error) {
	var drama models.Drama
	if err := s.db.Where("id = ? ", request.DramaID).First(&drama).Error; err != nil {
		return nil, fmt.Errorf("drama not found")
	}
	// 注意：SceneID可能指向Scene或Storyboard表，调用方已经做过权限验证，这里不再重复验证

	provider := request.Provider
	if provider == "" {
		provider = "openai"
	}

	// 序列化参考图片
	var referenceImagesJSON []byte
	if len(request.ReferenceImages) > 0 {
		referenceImagesJSON, _ = json.Marshal(request.ReferenceImages)
	}

	// 转换DramaID
	dramaIDParsed, err := strconv.ParseUint(request.DramaID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid drama ID")
	}

	// 设置默认图片类型
	imageType := request.ImageType
	if imageType == "" {
		imageType = string(models.ImageTypeStoryboard)
	}

	imageGen := &models.ImageGeneration{
		StoryboardID:    request.StoryboardID,
		DramaID:         uint(dramaIDParsed),
		SceneID:         request.SceneID,
		CharacterID:     request.CharacterID,
		PropID:          request.PropID,
		ImageType:       imageType,
		FrameType:       request.FrameType,
		Provider:        provider,
		Prompt:          request.Prompt,
		NegPrompt:       request.NegativePrompt,
		Model:           request.Model,
		Size:            request.Size,
		ReferenceImages: referenceImagesJSON,
		Quality:         request.Quality,
		Style:           request.Style,
		Steps:           request.Steps,
		CfgScale:        request.CfgScale,
		Seed:            request.Seed,
		Width:           request.Width,
		Height:          request.Height,
		LocalPath:       request.ImageLocalPath,
		Status:          models.ImageStatusPending,
	}

	if err := s.db.Create(imageGen).Error; err != nil {
		return nil, fmt.Errorf("failed to create record: %w", err)
	}

	go s.ProcessImageGeneration(imageGen.ID)

	return imageGen, nil
}

func (s *ImageGenerationService) ProcessImageGeneration(imageGenID uint) {
	var imageGen models.ImageGeneration
	imageRatio := "16:9"
	if err := s.db.First(&imageGen, imageGenID).Error; err != nil {
		s.log.Errorw("Failed to load image generation", "error", err, "id", imageGenID)
		return
	}

	// 获取drama的style信息
	var drama models.Drama
	if err := s.db.First(&drama, imageGen.DramaID).Error; err != nil {
		s.log.Warnw("Failed to load drama for style", "error", err, "drama_id", imageGen.DramaID)
	}

	s.db.Model(&imageGen).Update("status", models.ImageStatusProcessing)

	// 如果关联了background，同步更新background为generating状态
	if imageGen.StoryboardID != nil {
		if err := s.db.Model(&models.Scene{}).Where("id = ?", *imageGen.StoryboardID).Update("status", "generating").Error; err != nil {
			s.log.Warnw("Failed to update background status to generating", "scene_id", *imageGen.StoryboardID, "error", err)
		} else {
			s.log.Infow("Background status updated to generating", "scene_id", *imageGen.StoryboardID)
		}
	}

	client, err := s.getImageClientWithModel(imageGen.Provider, imageGen.Model)
	if err != nil {
		s.log.Errorw("Failed to get image client", "error", err, "provider", imageGen.Provider, "model", imageGen.Model)
		s.updateImageGenError(imageGenID, err.Error())
		return
	}

	// 解析参考图片
	var referenceImagePaths []string
	if len(imageGen.ReferenceImages) > 0 {
		if err := json.Unmarshal(imageGen.ReferenceImages, &referenceImagePaths); err == nil {
			s.log.Infow("Using reference images for generation",
				"id", imageGenID,
				"reference_count", len(referenceImagePaths),
				"references", referenceImagePaths)
		}
	}

	// 如果有 local_path，添加到参考图片列表的开头
	if imageGen.LocalPath != nil && *imageGen.LocalPath != "" {
		referenceImagePaths = append([]string{*imageGen.LocalPath}, referenceImagePaths...)
	}

	// 将所有参考图片路径转换为 base64（如果是本地路径）或保持原样（如果是 URL）
	var referenceImages []string
	for _, imgPath := range referenceImagePaths {
		// 判断是否为 HTTP/HTTPS URL
		if strings.HasPrefix(imgPath, "http://") || strings.HasPrefix(imgPath, "https://") {
			// 保持 URL 原样
			referenceImages = append(referenceImages, imgPath)
		} else {
			// 视为本地路径，转换为 base64
			base64Image, err := s.loadImageAsBase64(imgPath)
			if err != nil {
				s.log.Warnw("Failed to load local image as base64",
					"error", err,
					"id", imageGenID,
					"local_path", imgPath)
			} else {
				referenceImages = append(referenceImages, base64Image)
				s.log.Infow("Loaded local image for generation",
					"id", imageGenID,
					"local_path", imgPath)
			}
		}
	}

	s.log.Infow("Starting image generation", "id", imageGenID, "prompt", imageGen.Prompt, "provider", imageGen.Provider)

	var opts []image.ImageOption
	if imageGen.NegPrompt != nil && *imageGen.NegPrompt != "" {
		opts = append(opts, image.WithNegativePrompt(*imageGen.NegPrompt))
	}
	if imageGen.Size != "" {
		opts = append(opts, image.WithSize(imageGen.Size))
	}
	if imageGen.Quality != "" {
		opts = append(opts, image.WithQuality(imageGen.Quality))
	}
	if imageGen.Style != nil && *imageGen.Style != "" {
		opts = append(opts, image.WithStyle(*imageGen.Style))
	}
	if imageGen.Steps != nil {
		opts = append(opts, image.WithSteps(*imageGen.Steps))
	}
	if imageGen.CfgScale != nil {
		opts = append(opts, image.WithCfgScale(*imageGen.CfgScale))
	}
	if imageGen.Seed != nil {
		opts = append(opts, image.WithSeed(*imageGen.Seed))
	}
	if imageGen.Model != "" {
		opts = append(opts, image.WithModel(imageGen.Model))
	}
	if imageGen.Width != nil && imageGen.Height != nil {
		opts = append(opts, image.WithDimensions(*imageGen.Width, *imageGen.Height))
	}
	// 添加参考图片
	if len(referenceImages) > 0 {
		opts = append(opts, image.WithReferenceImages(referenceImages))
	}

	// 构建完整的提示词：风格提示词 + 用户提示词
	prompt := imageGen.Prompt

	// 如果drama有风格设置，添加风格提示词
	if drama.Style != "" && drama.Style != "realistic" {
		stylePrompt := s.promptI18n.GetStylePrompt(drama.Style)
		if stylePrompt != "" {
			// 将风格提示词作为系统级约束添加到提示词前面
			prompt = stylePrompt + "\n\n" + prompt
			s.log.Infow("Added style prompt to image generation",
				"id", imageGenID,
				"style", drama.Style,
				"style_prompt_length", len(stylePrompt))
		}
	}

	prompt += ", imageRatio:" + imageRatio

	// 如果有参考图，在提示词末尾添加参考图一致性说明
	if len(referenceImages) > 0 {
		prompt += "\n\n**重要：**\n**必须严格**遵守参考图内的内容元素，保持场景和角色的**一致性**"
		s.log.Infow("Added reference image consistency instruction to prompt",
			"id", imageGenID,
			"reference_count", len(referenceImages))
	}
	result, err := client.GenerateImage(prompt, opts...)
	if err != nil {
		s.log.Errorw("Image generation API call failed", "error", err, "id", imageGenID, "prompt", imageGen.Prompt)
		s.updateImageGenError(imageGenID, err.Error())
		return
	}

	s.log.Infow("Image generation API call completed", "id", imageGenID, "completed", result.Completed, "has_url", result.ImageURL != "")

	if !result.Completed {
		s.db.Model(&imageGen).Updates(map[string]interface{}{
			"status":  models.ImageStatusProcessing,
			"task_id": result.TaskID,
		})
		go s.pollTaskStatus(imageGenID, client, result.TaskID)
		return
	}

	s.completeImageGeneration(imageGenID, result)
}

func (s *ImageGenerationService) pollTaskStatus(imageGenID uint, client image.ImageClient, taskID string) {
	maxAttempts := 60
	pollInterval := 5 * time.Second

	for i := 0; i < maxAttempts; i++ {
		time.Sleep(pollInterval)

		result, err := client.GetTaskStatus(taskID)
		if err != nil {
			s.log.Errorw("Failed to get task status", "error", err, "task_id", taskID)
			continue
		}

		if result.Completed {
			s.completeImageGeneration(imageGenID, result)
			return
		}

		if result.Error != "" {
			s.updateImageGenError(imageGenID, result.Error)
			return
		}
	}

	s.updateImageGenError(imageGenID, "timeout: image generation took too long")
}

func (s *ImageGenerationService) completeImageGeneration(imageGenID uint, result *image.ImageResult) {
	now := time.Now()

	// 下载图片到本地存储并保存相对路径到数据库
	var localPath *string
	if s.localStorage != nil && result.ImageURL != "" &&
		(strings.HasPrefix(result.ImageURL, "http://") || strings.HasPrefix(result.ImageURL, "https://")) {
		downloadResult, err := s.localStorage.DownloadFromURLWithPath(result.ImageURL, "images")
		if err != nil {
			errStr := err.Error()
			if len(errStr) > 200 {
				errStr = errStr[:200] + "..."
			}
			s.log.Warnw("Failed to download image to local storage",
				"error", errStr,
				"id", imageGenID,
				"original_url", truncateImageURL(result.ImageURL))
		} else {
			localPath = &downloadResult.RelativePath
			s.log.Infow("Image downloaded to local storage",
				"id", imageGenID,
				"original_url", truncateImageURL(result.ImageURL),
				"local_path", downloadResult.RelativePath)
		}
	}

	// 数据库中保存原始URL和本地路径
	updates := map[string]interface{}{
		"status":       models.ImageStatusCompleted,
		"image_url":    result.ImageURL,
		"local_path":   localPath,
		"completed_at": now,
	}

	if result.Width > 0 {
		updates["width"] = result.Width
	}
	if result.Height > 0 {
		updates["height"] = result.Height
	}

	// 更新image_generation记录
	var imageGen models.ImageGeneration
	if err := s.db.Where("id = ?", imageGenID).First(&imageGen).Error; err != nil {
		s.log.Errorw("Failed to load image generation", "error", err, "id", imageGenID)
		return
	}

	// 使用 Updates 更新基本字段
	if err := s.db.Model(&models.ImageGeneration{}).Where("id = ?", imageGenID).Updates(updates).Error; err != nil {
		s.log.Errorw("Failed to update image generation", "error", err, "id", imageGenID)
		return
	}

	// 单独更新 local_path 字段（即使为 nil 也要更新）
	if err := s.db.Model(&models.ImageGeneration{}).Where("id = ?", imageGenID).Update("local_path", localPath).Error; err != nil {
		s.log.Errorw("Failed to update local_path", "error", err, "id", imageGenID)
	}

	s.log.Infow("Image generation completed", "id", imageGenID)

	// 如果关联了storyboard，同步更新storyboard的composed_image
	if imageGen.StoryboardID != nil {
		if err := s.db.Model(&models.Storyboard{}).Where("id = ?", *imageGen.StoryboardID).Update("composed_image", result.ImageURL).Error; err != nil {
			s.log.Errorw("Failed to update storyboard composed_image", "error", err, "storyboard_id", *imageGen.StoryboardID)
		} else {
			s.log.Infow("Storyboard updated with composed image",
				"storyboard_id", *imageGen.StoryboardID,
				"composed_image", truncateImageURL(result.ImageURL))
		}
	}

	// 如果关联了scene，同步更新scene的image_url、local_path和status（仅当ImageType是scene时）
	if imageGen.SceneID != nil && imageGen.ImageType == string(models.ImageTypeScene) {
		sceneUpdates := map[string]interface{}{
			"status":    "generated",
			"image_url": result.ImageURL,
		}
		if localPath != nil {
			sceneUpdates["local_path"] = localPath
		}
		if err := s.db.Model(&models.Scene{}).Where("id = ?", *imageGen.SceneID).Updates(sceneUpdates).Error; err != nil {
			s.log.Errorw("Failed to update scene", "error", err, "scene_id", *imageGen.SceneID)
		} else {
			s.log.Infow("Scene updated with generated image",
				"scene_id", *imageGen.SceneID,
				"image_url", truncateImageURL(result.ImageURL),
				"local_path", localPath)
		}
	}

	// 如果关联了角色，同步更新角色的image_url和local_path
	if imageGen.CharacterID != nil {
		characterUpdates := map[string]interface{}{
			"image_url": result.ImageURL,
		}
		if localPath != nil {
			characterUpdates["local_path"] = localPath
		}
		if err := s.db.Model(&models.Character{}).Where("id = ?", *imageGen.CharacterID).Updates(characterUpdates).Error; err != nil {
			s.log.Errorw("Failed to update character", "error", err, "character_id", *imageGen.CharacterID)
		} else {
			s.log.Infow("Character updated with generated image",
				"character_id", *imageGen.CharacterID,
				"image_url", truncateImageURL(result.ImageURL),
				"local_path", localPath)
		}
	}

	// 如果关联了道具，同步更新道具的image_url和local_path
	if imageGen.PropID != nil {
		propUpdates := map[string]interface{}{
			"image_url": result.ImageURL,
		}
		if localPath != nil {
			propUpdates["local_path"] = localPath
		}
		if err := s.db.Model(&models.Prop{}).Where("id = ?", *imageGen.PropID).Updates(propUpdates).Error; err != nil {
			s.log.Errorw("Failed to update prop", "error", err, "prop_id", *imageGen.PropID)
		} else {
			s.log.Infow("Prop updated with generated image",
				"prop_id", *imageGen.PropID,
				"image_url", truncateImageURL(result.ImageURL),
				"local_path", localPath)
		}
	}
}

func (s *ImageGenerationService) updateImageGenError(imageGenID uint, errorMsg string) {
	// 先获取image_generation记录
	var imageGen models.ImageGeneration
	if err := s.db.Where("id = ?", imageGenID).First(&imageGen).Error; err != nil {
		s.log.Errorw("Failed to load image generation", "error", err, "id", imageGenID)
		return
	}

	// 更新image_generation状态
	s.db.Model(&models.ImageGeneration{}).Where("id = ?", imageGenID).Updates(map[string]interface{}{
		"status":    models.ImageStatusFailed,
		"error_msg": errorMsg,
	})
	s.log.Errorw("Image generation failed", "id", imageGenID, "error", errorMsg)

	// 如果关联了scene，同步更新scene为失败状态
	if imageGen.SceneID != nil {
		s.db.Model(&models.Scene{}).Where("id = ?", *imageGen.SceneID).Update("status", "failed")
		s.log.Warnw("Scene marked as failed", "scene_id", *imageGen.SceneID)
	}
}

func (s *ImageGenerationService) getImageClient(provider string) (image.ImageClient, error) {
	config, err := s.aiService.GetDefaultConfig("image")
	if err != nil {
		return nil, fmt.Errorf("no image AI config found: %w", err)
	}

	// 使用第一个模型
	model := ""
	if len(config.Model) > 0 {
		model = config.Model[0]
	}

	// 使用配置中的 provider，如果没有则使用传入的 provider
	actualProvider := config.Provider
	if actualProvider == "" {
		actualProvider = provider
	}

	// 根据 provider 自动设置默认端点
	var endpoint string
	var queryEndpoint string

	switch actualProvider {
	case "openai", "dalle":
		endpoint = "/images/generations"
		return image.NewOpenAIImageClient(config.BaseURL, config.APIKey, model, endpoint), nil
	case "chatfire":
		endpoint = "/images/generations"
		return image.NewOpenAIImageClient(config.BaseURL, config.APIKey, model, endpoint), nil
	case "volcengine", "volces", "doubao":
		endpoint = "/images/generations"
		queryEndpoint = ""
		return image.NewVolcEngineImageClient(config.BaseURL, config.APIKey, model, endpoint, queryEndpoint), nil
	case "gemini", "google":
		endpoint = "/v1beta/models/{model}:generateContent"
		return image.NewGeminiImageClient(config.BaseURL, config.APIKey, model, endpoint), nil
	default:
		endpoint = "/images/generations"
		return image.NewOpenAIImageClient(config.BaseURL, config.APIKey, model, endpoint), nil
	}
}

// getImageClientWithModel 根据模型名称获取图片客户端
func (s *ImageGenerationService) getImageClientWithModel(provider string, modelName string) (image.ImageClient, error) {
	var config *models.AIServiceConfig
	var err error

	// 如果指定了模型，尝试获取对应的配置
	if modelName != "" {
		config, err = s.aiService.GetConfigForModel("image", modelName)
		if err != nil {
			s.log.Warnw("Failed to get config for model, using default", "model", modelName, "error", err)
			config, err = s.aiService.GetDefaultConfig("image")
			if err != nil {
				return nil, fmt.Errorf("no image AI config found: %w", err)
			}
		}
	} else {
		config, err = s.aiService.GetDefaultConfig("image")
		if err != nil {
			return nil, fmt.Errorf("no image AI config found: %w", err)
		}
	}

	// 使用指定的模型或配置中的第一个模型
	model := modelName
	if model == "" && len(config.Model) > 0 {
		model = config.Model[0]
	}

	// 使用配置中的 provider，如果没有则使用传入的 provider
	actualProvider := config.Provider
	if actualProvider == "" {
		actualProvider = provider
	}

	// 根据 provider 自动设置默认端点
	var endpoint string
	var queryEndpoint string

	switch actualProvider {
	case "openai", "dalle":
		endpoint = "/images/generations"
		return image.NewOpenAIImageClient(config.BaseURL, config.APIKey, model, endpoint), nil
	case "chatfire":
		endpoint = "/images/generations"
		return image.NewOpenAIImageClient(config.BaseURL, config.APIKey, model, endpoint), nil
	case "volcengine", "volces", "doubao":
		endpoint = "/images/generations"
		queryEndpoint = ""
		return image.NewVolcEngineImageClient(config.BaseURL, config.APIKey, model, endpoint, queryEndpoint), nil
	case "gemini", "google":
		endpoint = "/v1beta/models/{model}:generateContent"
		return image.NewGeminiImageClient(config.BaseURL, config.APIKey, model, endpoint), nil
	default:
		endpoint = "/images/generations"
		return image.NewOpenAIImageClient(config.BaseURL, config.APIKey, model, endpoint), nil
	}
}

func (s *ImageGenerationService) GetImageGeneration(imageGenID uint) (*models.ImageGeneration, error) {
	var imageGen models.ImageGeneration
	if err := s.db.Where("id = ? ", imageGenID).First(&imageGen).Error; err != nil {
		return nil, err
	}
	return &imageGen, nil
}

func (s *ImageGenerationService) ListImageGenerations(dramaID *uint, sceneID *uint, storyboardID *uint, frameType string, status string, page, pageSize int) ([]models.ImageGeneration, int64, error) {
	query := s.db.Model(&models.ImageGeneration{})

	if dramaID != nil {
		query = query.Where("drama_id = ?", *dramaID)
	}

	if sceneID != nil {
		query = query.Where("scene_id = ?", *sceneID)
	}

	if storyboardID != nil {
		query = query.Where("storyboard_id = ?", *storyboardID)
	}

	if frameType != "" {
		query = query.Where("frame_type = ?", frameType)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var images []models.ImageGeneration
	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&images).Error; err != nil {
		return nil, 0, err
	}

	return images, total, nil
}

func (s *ImageGenerationService) DeleteImageGeneration(imageGenID uint) error {
	result := s.db.Where("id = ? ", imageGenID).Delete(&models.ImageGeneration{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("image generation not found")
	}
	return nil
}

// UploadImageRequest 上传图片请求
type UploadImageRequest struct {
	StoryboardID uint   `json:"storyboard_id"`
	DramaID      uint   `json:"drama_id"`
	FrameType    string `json:"frame_type"`
	ImageURL     string `json:"image_url"`
	Prompt       string `json:"prompt"`
}

// CreateImageFromUpload 从上传的图片URL创建图片生成记录
func (s *ImageGenerationService) CreateImageFromUpload(req *UploadImageRequest) (*models.ImageGeneration, error) {
	// 验证storyboard存在
	var storyboard models.Storyboard
	if err := s.db.First(&storyboard, req.StoryboardID).Error; err != nil {
		return nil, fmt.Errorf("storyboard not found")
	}

	// 验证drama存在
	var drama models.Drama
	if err := s.db.First(&drama, req.DramaID).Error; err != nil {
		return nil, fmt.Errorf("drama not found")
	}

	prompt := req.Prompt
	if prompt == "" {
		prompt = "用户上传图片"
	}

	now := time.Now()
	imageGen := &models.ImageGeneration{
		StoryboardID: &req.StoryboardID,
		DramaID:      req.DramaID,
		ImageType:    string(models.ImageTypeStoryboard),
		FrameType:    &req.FrameType,
		Provider:     "upload",
		Prompt:       prompt,
		Model:        "upload",
		ImageURL:     &req.ImageURL,
		Status:       models.ImageStatusCompleted,
		CompletedAt:  &now,
	}

	if err := s.db.Create(imageGen).Error; err != nil {
		return nil, fmt.Errorf("failed to create image record: %w", err)
	}

	s.log.Infow("Image created from upload",
		"id", imageGen.ID,
		"storyboard_id", req.StoryboardID,
		"frame_type", req.FrameType)

	return imageGen, nil
}

func (s *ImageGenerationService) GenerateImagesForScene(sceneID string) ([]*models.ImageGeneration, error) {
	// 转换sceneID
	sid, err := strconv.ParseUint(sceneID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid scene ID")
	}
	sceneIDUint := uint(sid)

	var scene models.Scene
	if err := s.db.Where("id = ?", sceneIDUint).First(&scene).Error; err != nil {
		return nil, fmt.Errorf("scene not found")
	}

	// 构建场景图片生成提示词
	prompt := scene.Prompt
	if prompt == "" {
		// 如果Prompt为空，使用Location和Time构建
		prompt = fmt.Sprintf("%s场景，%s", scene.Location, scene.Time)
	}

	req := &GenerateImageRequest{
		SceneID:   &sceneIDUint,
		DramaID:   fmt.Sprintf("%d", scene.DramaID),
		ImageType: string(models.ImageTypeScene),
		Prompt:    prompt,
	}

	imageGen, err := s.GenerateImage(req)
	if err != nil {
		return nil, err
	}

	return []*models.ImageGeneration{imageGen}, nil
}

// BackgroundInfo 背景信息结构
type BackgroundInfo struct {
	Location          string `json:"location"`
	Time              string `json:"time"`
	Atmosphere        string `json:"atmosphere"`
	Prompt            string `json:"prompt"`
	StoryboardNumbers []int  `json:"storyboard_numbers"`
	SceneIDs          []uint `json:"scene_ids"`
	StoryboardCount   int    `json:"scene_count"`
}

func (s *ImageGenerationService) BatchGenerateImagesForEpisode(episodeID string) ([]*models.ImageGeneration, error) {
	var ep models.Episode
	if err := s.db.Preload("Drama").Where("id = ?", episodeID).First(&ep).Error; err != nil {
		return nil, fmt.Errorf("episode not found")
	}
	// 从数据库读取已保存的场景
	var scenes []models.Storyboard
	if err := s.db.Where("episode_id = ?", episodeID).Find(&scenes).Error; err != nil {
		return nil, fmt.Errorf("failed to get scenes: %w", err)
	}

	backgrounds := s.extractUniqueBackgrounds(scenes)
	s.log.Infow("Extracted unique backgrounds",
		"episode_id", episodeID,
		"background_count", len(backgrounds))

	// 为每个背景生成图片
	var results []*models.ImageGeneration
	for _, bg := range scenes {
		if bg.ImagePrompt == nil || *bg.ImagePrompt == "" {
			s.log.Warnw("Background has no prompt, skipping", "scene_id", bg.ID)
			continue
		}

		// 更新背景状态为处理中
		s.db.Model(bg).Update("status", "generating")

		req := &GenerateImageRequest{
			StoryboardID: &bg.ID,
			DramaID:      fmt.Sprintf("%d", ep.DramaID),
			Prompt:       *bg.ImagePrompt,
		}

		imageGen, err := s.GenerateImage(req)
		if err != nil {
			s.log.Errorw("Failed to generate image for background",
				"scene_id", bg.ID,
				"location", bg.Location,
				"error", err)
			s.db.Model(bg).Update("status", "failed")
			continue
		}

		s.log.Infow("Background image generation started",
			"scene_id", bg.ID,
			"image_gen_id", imageGen.ID,
			"location", bg.Location,
			"time", bg.Time)

		results = append(results, imageGen)
	}

	return results, nil
}

// GetScencesForEpisode 获取项目的场景列表（项目级）
func (s *ImageGenerationService) GetScencesForEpisode(episodeID string) ([]*models.Scene, error) {
	var episode models.Episode
	if err := s.db.Preload("Drama").Where("id = ?", episodeID).First(&episode).Error; err != nil {
		return nil, fmt.Errorf("episode not found")
	}

	// 场景是项目级的，通过drama_id查询
	var scenes []*models.Scene
	if err := s.db.Where("drama_id = ?", episode.DramaID).Order("location ASC, time ASC").Find(&scenes).Error; err != nil {
		return nil, fmt.Errorf("failed to load scenes: %w", err)
	}

	return scenes, nil
}

// ExtractBackgroundsForEpisode 从剧本内容中提取场景并保存到项目级别数据库
func (s *ImageGenerationService) ExtractBackgroundsForEpisode(episodeID string, model string, style string) (string, error) {
	var episode models.Episode
	if err := s.db.Preload("Storyboards").First(&episode, episodeID).Error; err != nil {
		return "", fmt.Errorf("episode not found")
	}

	// 如果没有剧本内容，无法提取场景
	if episode.ScriptContent == nil || *episode.ScriptContent == "" {
		return "", fmt.Errorf("episode has no script content")
	}

	// 创建任务
	task, err := s.taskService.CreateTask("background_extraction", episodeID)
	if err != nil {
		s.log.Errorw("Failed to create background extraction task", "error", err, "episode_id", episodeID)
		return "", fmt.Errorf("创建任务失败: %w", err)
	}

	// 异步处理场景提取
	go s.processBackgroundExtraction(task.ID, episodeID, model, style)

	s.log.Infow("Background extraction task created", "task_id", task.ID, "episode_id", episodeID)
	return task.ID, nil
}

// processBackgroundExtraction 异步处理场景提取
func (s *ImageGenerationService) processBackgroundExtraction(taskID string, episodeID string, model string, style string) {
	// 更新任务状态为处理中
	s.taskService.UpdateTaskStatus(taskID, "processing", 0, "正在提取场景信息...")

	var episode models.Episode
	if err := s.db.Preload("Storyboards").First(&episode, episodeID).Error; err != nil {
		s.log.Errorw("Episode not found during background extraction", "error", err, "episode_id", episodeID)
		s.taskService.UpdateTaskStatus(taskID, "failed", 0, "剧集信息不存在")
		return
	}

	if episode.ScriptContent == nil || *episode.ScriptContent == "" {
		s.log.Errorw("Episode has no script content during background extraction", "episode_id", episodeID)
		s.taskService.UpdateTaskStatus(taskID, "failed", 0, "剧本内容为空")
		return
	}

	s.log.Infow("Extracting backgrounds from script", "episode_id", episodeID, "model", model, "task_id", taskID)
	dramaID := episode.DramaID

	// 使用AI从剧本内容中提取场景
	backgroundsInfo, err := s.extractBackgroundsFromScript(*episode.ScriptContent, dramaID, model, style)
	if err != nil {
		s.log.Errorw("Failed to extract backgrounds from script", "error", err, "task_id", taskID)
		s.taskService.UpdateTaskStatus(taskID, "failed", 0, "AI提取场景失败: "+err.Error())
		return
	}

	// 保存到数据库（不涉及Storyboard关联，因为此时还没有生成分镜）
	var scenes []*models.Scene
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// 先删除该章节的所有场景（实现重新提取覆盖功能）
		if err := tx.Where("episode_id = ?", episode.ID).Delete(&models.Scene{}).Error; err != nil {
			s.log.Errorw("Failed to delete old scenes", "error", err, "task_id", taskID)
			return err
		}
		s.log.Infow("Deleted old scenes for re-extraction", "episode_id", episode.ID, "task_id", taskID)

		// 创建新提取的场景
		for _, bgInfo := range backgroundsInfo {
			// 保存新场景到数据库（章节级）
			episodeIDVal := episode.ID
			scene := &models.Scene{
				DramaID:         dramaID,
				EpisodeID:       &episodeIDVal,
				Location:        bgInfo.Location,
				Time:            bgInfo.Time,
				Prompt:          bgInfo.Prompt,
				StoryboardCount: 1, // 默认为1
				Status:          "pending",
			}
			if err := tx.Create(scene).Error; err != nil {
				return err
			}
			scenes = append(scenes, scene)

			s.log.Infow("Created new scene from script",
				"scene_id", scene.ID,
				"location", scene.Location,
				"time", scene.Time,
				"task_id", taskID)
		}

		return nil
	})

	if err != nil {
		s.log.Errorw("Failed to save scenes to database", "error", err, "task_id", taskID)
		s.taskService.UpdateTaskStatus(taskID, "failed", 0, "保存场景信息失败: "+err.Error())
		return
	}

	// 更新任务状态为完成
	resultData := map[string]interface{}{
		"scenes":     scenes,
		"count":      len(scenes),
		"episode_id": episodeID,
		"drama_id":   dramaID,
	}
	s.taskService.UpdateTaskResult(taskID, resultData)

	s.log.Infow("Background extraction completed",
		"task_id", taskID,
		"episode_id", episodeID,
		"total_storyboards", len(episode.Storyboards),
		"unique_scenes", len(scenes))
}

// extractBackgroundsFromScript 从剧本内容中使用AI提取场景信息
func (s *ImageGenerationService) extractBackgroundsFromScript(scriptContent string, dramaID uint, model string, style string) ([]BackgroundInfo, error) {
	if scriptContent == "" {
		return []BackgroundInfo{}, nil
	}

	// 获取AI客户端（如果指定了模型则使用指定的模型）
	var client ai.AIClient
	var err error
	if model != "" {
		s.log.Infow("Using specified model for background extraction", "model", model)
		client, err = s.aiService.GetAIClientForModel("text", model)
		if err != nil {
			s.log.Warnw("Failed to get client for specified model, using default", "model", model, "error", err)
			client, err = s.aiService.GetAIClient("text")
		}
	} else {
		client, err = s.aiService.GetAIClient("text")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get AI client: %w", err)
	}

	// 使用国际化提示词
	systemPrompt := s.promptI18n.GetSceneExtractionPrompt(style)
	contentLabel := s.promptI18n.FormatUserPrompt("script_content_label")

	// 根据语言构建不同的格式说明
	var formatInstructions string
	if s.promptI18n.IsEnglish() {
		formatInstructions = `[Output JSON Format]
{
  "backgrounds": [
    {
      "location": "Location name (English)",
      "time": "Time description (English)",
      "atmosphere": "Atmosphere description (English)",
      "prompt": "A cinematic anime-style pure background scene depicting [location description] at [time]. The scene shows [environment details, architecture, objects, lighting, no characters]. Style: rich details, high quality, atmospheric lighting. Mood: [environment mood description]."
    }
  ]
}

[Example]
Correct example (note: no characters):
{
  "backgrounds": [
    {
      "location": "Repair Shop Interior",
      "time": "Late Night",
      "atmosphere": "Dim, lonely, industrial",
      "prompt": "A cinematic anime-style pure background scene depicting a messy repair shop interior at late night. Under dim fluorescent lights, the workbench is scattered with various wrenches, screwdrivers and mechanical parts, oil-stained tool boards and faded posters hang on walls, oil stains on the floor, used tires piled in corners. Style: rich details, high quality, dim atmosphere. Mood: lonely, industrial."
    },
    {
      "location": "City Street",
      "time": "Dusk",
      "atmosphere": "Warm, busy, lively",
      "prompt": "A cinematic anime-style pure background scene depicting a bustling city street at dusk. Sunset afterglow shines on the asphalt road, neon lights of shops on both sides begin to light up, bicycle racks and bus stops on the street, high-rise buildings in the distance, sky showing orange-red gradient. Style: rich details, high quality, warm atmosphere. Mood: lively, busy."
    }
  ]
}

[Wrong Examples (containing characters, forbidden)]:
❌ "Depicting protagonist standing on the street" - contains character
❌ "People hurrying by" - contains characters
❌ "Character moving in the room" - contains character

Please strictly follow the JSON format and ensure all fields use English.`
	} else {
		formatInstructions = `【输出JSON格式】
{
  "backgrounds": [
    {
      "location": "地点名称（中文）",
      "time": "时间描述（中文）",
      "atmosphere": "氛围描述（中文）",
      "prompt": "一个电影感的动漫风格纯背景场景，展现[地点描述]在[时间]的环境。画面呈现[环境细节、建筑、物品、光线等，不包含人物]。风格：细节丰富，高质量，氛围光照。情绪：[环境情绪描述]。"
    }
  ]
}

【示例】
正确示例（注意：不包含人物）：
{
  "backgrounds": [
    {
      "location": "维修店内部",
      "time": "深夜",
      "atmosphere": "昏暗、孤独、工业感",
      "prompt": "一个电影感的动漫风格纯背景场景，展现凌乱的维修店内部在深夜的环境。昏暗的日光灯照射下，工作台上散落着各种扳手、螺丝刀和机械零件，墙上挂着油污斑斑的工具挂板和褪色海报，地面有油渍痕迹，角落堆放着废旧轮胎。风格：细节丰富，高质量，昏暗氛围。情绪：孤独、工业感。"
    },
    {
      "location": "城市街道",
      "time": "黄昏",
      "atmosphere": "温暖、繁忙、生活气息",
      "prompt": "一个电影感的动漫风格纯背景场景，展现繁华的城市街道在黄昏时分的环境。夕阳的余晖洒在街道的沥青路面上，两旁的商铺霓虹灯开始点亮，街边有自行车停靠架和公交站牌，远处高楼林立，天空呈现橙红色渐变。风格：细节丰富，高质量，温暖氛围。情绪：生活气息、繁忙。"
    }
  ]
}

【错误示例（包含人物，禁止）】：
❌ "展现主角站在街道上的场景" - 包含人物
❌ "人们匆匆而过" - 包含人物
❌ "角色在房间里活动" - 包含人物

请严格按照JSON格式输出，确保所有字段都使用中文。`
	}

	prompt := fmt.Sprintf(`%s

%s
%s

%s`, systemPrompt, contentLabel, scriptContent, formatInstructions)

	// 打印完整提示词用于调试
	s.log.Infow("=== AI Prompt for Background Extraction (extractBackgroundsFromScript) ===",
		"language", s.promptI18n.GetLanguage(),
		"prompt_length", len(prompt),
		"full_prompt", prompt)

	response, err := client.GenerateText(prompt, "", ai.WithTemperature(0.7))
	if err != nil {
		s.log.Errorw("Failed to extract backgrounds with AI", "error", err)
		return nil, fmt.Errorf("AI提取场景失败: %w", err)
	}

	// 打印AI返回的原始响应
	s.log.Infow("=== AI Response for Background Extraction (extractBackgroundsFromScript) ===",
		"response_length", len(response),
		"raw_response", response)

	// 解析AI返回的JSON
	var backgrounds []BackgroundInfo

	// 先尝试解析为数组格式
	if err := utils.SafeParseAIJSON(response, &backgrounds); err == nil {
		s.log.Infow("Parsed backgrounds as array format", "count", len(backgrounds))
	} else {
		// 尝试解析为对象格式
		var result struct {
			Backgrounds []BackgroundInfo `json:"backgrounds"`
		}
		if err := utils.SafeParseAIJSON(response, &result); err != nil {
			s.log.Errorw("Failed to parse AI response in both formats", "error", err, "response", response[:min(len(response), 500)])
			return nil, fmt.Errorf("解析AI响应失败: %w", err)
		}
		backgrounds = result.Backgrounds
		s.log.Infow("Parsed backgrounds as object format", "count", len(backgrounds))
	}

	s.log.Infow("Extracted backgrounds from script",
		"drama_id", dramaID,
		"backgrounds_count", len(backgrounds))

	return backgrounds, nil
}

// extractBackgroundsWithAI 使用AI智能分析场景并提取唯一背景
func (s *ImageGenerationService) extractBackgroundsWithAI(storyboards []models.Storyboard, style string) ([]BackgroundInfo, error) {
	if len(storyboards) == 0 {
		return []BackgroundInfo{}, nil
	}

	// 构建场景列表文本，使用SceneNumber而不是索引
	var scenesText string
	for _, storyboard := range storyboards {
		location := ""
		if storyboard.Location != nil {
			location = *storyboard.Location
		}
		time := ""
		if storyboard.Time != nil {
			time = *storyboard.Time
		}
		action := ""
		if storyboard.Action != nil {
			action = *storyboard.Action
		}
		description := ""
		if storyboard.Description != nil {
			description = *storyboard.Description
		}

		scenesText += fmt.Sprintf("镜头%d:\n地点: %s\n时间: %s\n动作: %s\n描述: %s\n\n",
			storyboard.StoryboardNumber, location, time, action, description)
	}

	// 使用国际化提示词
	systemPrompt := s.promptI18n.GetSceneExtractionPrompt(style)
	storyboardLabel := s.promptI18n.FormatUserPrompt("storyboard_list_label")

	// 根据语言构建不同的提示词
	var formatInstructions string
	if s.promptI18n.IsEnglish() {
		formatInstructions = `[Output JSON Format]
{
  "backgrounds": [
    {
      "location": "Location name (English)",
      "time": "Time description (English)",
      "prompt": "A cinematic anime-style background depicting [location description] at [time]. The scene shows [detail description]. Style: rich details, high quality, atmospheric lighting. Mood: [mood description].",
      "scene_numbers": [1, 2, 3]
    }
  ]
}

[Example]
Correct example:
{
  "backgrounds": [
    {
      "location": "Repair Shop",
      "time": "Late Night",
      "prompt": "A cinematic anime-style background depicting a messy repair shop interior at late night. Under dim lighting, the workbench is scattered with various tools and parts, with greasy posters hanging on the walls. Style: rich details, high quality, dim atmosphere. Mood: lonely, industrial.",
      "scene_numbers": [1, 5, 6, 10, 15]
    },
    {
      "location": "City Panorama",
      "time": "Late Night with Acid Rain",
      "prompt": "A cinematic anime-style background depicting a coastal city panorama in late night acid rain. Neon lights blur in the rain, skyscrapers shrouded in gray-green rain curtain, streets reflecting colorful lights. Style: rich details, high quality, cyberpunk atmosphere. Mood: oppressive, sci-fi, apocalyptic.",
      "scene_numbers": [2, 7]
    }
  ]
}

Please strictly follow the JSON format and ensure:
1. prompt field uses English
2. scene_numbers includes all scene numbers using this background
3. All scenes are assigned to a background`
	} else {
		formatInstructions = `【输出JSON格式】
{
  "backgrounds": [
    {
      "location": "地点名称（中文）",
      "time": "时间描述（中文）",
      "prompt": "一个电影感的动漫风格背景，展现[地点描述]在[时间]的场景。画面呈现[细节描述]。风格：细节丰富，高质量，氛围光照。情绪：[情绪描述]。",
      "scene_numbers": [1, 2, 3]
    }
  ]
}

【示例】
正确示例：
{
  "backgrounds": [
    {
      "location": "维修店",
      "time": "深夜",
      "prompt": "一个电影感的动漫风格背景，展现凌乱的维修店内部在深夜的场景。昏暗的灯光下，工作台上散落着各种工具和零件，墙上挂着油污的海报。风格：细节丰富，高质量，昏暗氛围。情绪：孤独、工业感。",
      "scene_numbers": [1, 5, 6, 10, 15]
    },
    {
      "location": "城市全景",
      "time": "深夜·酸雨",
      "prompt": "一个电影感的动漫风格背景，展现沿海城市全景在深夜酸雨中的场景。霓虹灯在雨中模糊，高楼大厦笼罩在灰绿色的雨幕中，街道反射着五颜六色的光。风格：细节丰富，高质量，赛博朋克氛围。情绪：压抑、科幻、末世感。",
      "scene_numbers": [2, 7]
    }
  ]
}

请严格按照JSON格式输出，确保：
1. prompt字段使用中文
2. scene_numbers包含所有使用该背景的场景编号
3. 所有场景都被分配到某个背景`
	}

	prompt := fmt.Sprintf(`%s

%s
%s

%s`, systemPrompt, storyboardLabel, scenesText, formatInstructions)

	// 打印完整提示词用于调试
	s.log.Infow("=== AI Prompt for Background Extraction (extractBackgroundsWithAI) ===",
		"language", s.promptI18n.GetLanguage(),
		"prompt_length", len(prompt),
		"full_prompt", prompt)

	// 调用AI服务
	text, err := s.aiService.GenerateText(prompt, "")
	if err != nil {
		return nil, fmt.Errorf("AI analysis failed: %w", err)
	}

	// 打印AI返回的原始响应
	s.log.Infow("=== AI Response for Background Extraction ===",
		"response_length", len(text),
		"raw_response", text)

	// 解析AI返回的JSON
	var result struct {
		Scenes []struct {
			Location         string `json:"location"`
			Time             string `json:"time"`
			Prompt           string `json:"prompt"`
			StoryboardNumber []int  `json:"storyboard_number"`
		} `json:"backgrounds"`
	}

	if err := utils.SafeParseAIJSON(text, &result); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	// 构建场景编号到场景ID的映射
	storyboardNumberToID := make(map[int]uint)
	for _, scene := range storyboards {
		storyboardNumberToID[scene.StoryboardNumber] = scene.ID
	}

	// 转换为BackgroundInfo
	var backgrounds []BackgroundInfo
	for _, bg := range result.Scenes {
		// 将场景编号转换为场景ID
		var sceneIDs []uint
		for _, storyboardNum := range bg.StoryboardNumber {
			if storyboardID, ok := storyboardNumberToID[storyboardNum]; ok {
				sceneIDs = append(sceneIDs, storyboardID)
			}
		}

		backgrounds = append(backgrounds, BackgroundInfo{
			Location:          bg.Location,
			Time:              bg.Time,
			Prompt:            bg.Prompt,
			StoryboardNumbers: bg.StoryboardNumber,
			SceneIDs:          sceneIDs,
			StoryboardCount:   len(sceneIDs),
		})
	}

	s.log.Infow("AI extracted backgrounds",
		"total_scenes", len(storyboards),
		"extracted_backgrounds", len(backgrounds))

	return backgrounds, nil
}

// extractUniqueBackgrounds 从分镜头中提取唯一背景（代码逻辑，作为AI提取的备份）
func (s *ImageGenerationService) extractUniqueBackgrounds(scenes []models.Storyboard) []BackgroundInfo {
	backgroundMap := make(map[string]*BackgroundInfo)

	for _, scene := range scenes {
		if scene.Location == nil || scene.Time == nil {
			continue
		}

		// 使用 location + time 作为唯一标识
		key := *scene.Location + "|" + *scene.Time

		if bg, exists := backgroundMap[key]; exists {
			// 背景已存在，添加scene ID
			bg.SceneIDs = append(bg.SceneIDs, scene.ID)
			bg.StoryboardCount++
		} else {
			// 新背景 - 使用ImagePrompt构建背景提示词
			prompt := ""
			if scene.ImagePrompt != nil {
				prompt = *scene.ImagePrompt
			}
			backgroundMap[key] = &BackgroundInfo{
				Location:        *scene.Location,
				Time:            *scene.Time,
				Prompt:          prompt,
				SceneIDs:        []uint{scene.ID},
				StoryboardCount: 1,
			}
		}
	}

	// 转换为切片
	var backgrounds []BackgroundInfo
	for _, bg := range backgroundMap {
		backgrounds = append(backgrounds, *bg)
	}

	return backgrounds
}

// loadImageAsBase64 读取本地图片文件并转换为 base64 格式的 data URI
func (s *ImageGenerationService) loadImageAsBase64(localPath string) (string, error) {
	// 构建完整的文件路径
	var fullPath string
	if filepath.IsAbs(localPath) {
		fullPath = localPath
	} else {
		// 如果是相对路径，拼接存储根目录
		if s.localStorage != nil {
			fullPath = s.localStorage.GetAbsolutePath(localPath)
		} else {
			fullPath = filepath.Join(s.config.Storage.LocalPath, localPath)
		}
	}

	// 读取文件
	fileData, err := os.ReadFile(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to read image file: %w", err)
	}

	// 根据文件扩展名确定 MIME 类型
	ext := strings.ToLower(filepath.Ext(fullPath))
	mimeType := "image/jpeg" // 默认
	switch ext {
	case ".png":
		mimeType = "image/png"
	case ".jpg", ".jpeg":
		mimeType = "image/jpeg"
	case ".gif":
		mimeType = "image/gif"
	case ".webp":
		mimeType = "image/webp"
	}

	// 转换为 base64
	base64Data := base64.StdEncoding.EncodeToString(fileData)

	// 构建 data URI
	dataURI := fmt.Sprintf("data:%s;base64,%s", mimeType, base64Data)

	return dataURI, nil
}
