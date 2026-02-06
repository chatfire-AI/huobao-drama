package handlers

import (
	"strconv"

	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/infrastructure/storage"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ImageGenerationHandler struct {
	imageService *services.ImageGenerationService
	taskService  *services.TaskService
	log          *logger.Logger
	config       *config.Config
	db           *gorm.DB
}

func NewImageGenerationHandler(db *gorm.DB, cfg *config.Config, log *logger.Logger, transferService *services.ResourceTransferService, localStorage *storage.LocalStorage) *ImageGenerationHandler {
	return &ImageGenerationHandler{
		imageService: services.NewImageGenerationService(db, cfg, transferService, localStorage, log),
		taskService:  services.NewTaskService(db, log),
		log:          log,
		config:       cfg,
		db:           db,
	}
}

func (h *ImageGenerationHandler) GenerateImage(c *gin.Context) {

	var req services.GenerateImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	imageGen, err := h.imageService.GenerateImage(&req)
	if err != nil {
		h.log.Errorw("Failed to generate image", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, imageGen)
}

func (h *ImageGenerationHandler) GenerateImagesForScene(c *gin.Context) {

	sceneID := c.Param("scene_id")

	images, err := h.imageService.GenerateImagesForScene(sceneID)
	if err != nil {
		h.log.Errorw("Failed to generate images for scene", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, images)
}

func (h *ImageGenerationHandler) GetBackgroundsForEpisode(c *gin.Context) {

	episodeID := c.Param("episode_id")

	backgrounds, err := h.imageService.GetScencesForEpisode(episodeID)
	if err != nil {
		h.log.Errorw("Failed to get backgrounds", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, backgrounds)
}

func (h *ImageGenerationHandler) ExtractBackgroundsForEpisode(c *gin.Context) {
	episodeID := c.Param("episode_id")

	// 接收可选的 model 和 style 参数
	var req struct {
		Model string `json:"model"`
		Style string `json:"style"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		// 如果没有提供body或者解析失败，使用空字符串（使用默认模型和风格）
		req.Model = ""
		req.Style = ""
	}
	// 如果style为空，从episode获取drama的style
	if req.Style == "" {
		var episode models.Episode
		if err := h.db.Preload("Drama").First(&episode, episodeID).Error; err == nil {
			req.Style = episode.Drama.Style
		}
	}

	// 直接调用服务层的异步方法，该方法会创建任务并返回任务ID
	taskID, err := h.imageService.ExtractBackgroundsForEpisode(episodeID, req.Model, req.Style)
	if err != nil {
		h.log.Errorw("Failed to extract backgrounds", "error", err, "episode_id", episodeID)
		response.InternalError(c, err.Error())
		return
	}

	// 立即返回任务ID
	response.Success(c, gin.H{
		"task_id": taskID,
		"status":  "pending",
		"message": "场景提取任务已创建，正在后台处理...",
	})
}

func (h *ImageGenerationHandler) BatchGenerateForEpisode(c *gin.Context) {

	episodeID := c.Param("episode_id")

	images, err := h.imageService.BatchGenerateImagesForEpisode(episodeID)
	if err != nil {
		h.log.Errorw("Failed to batch generate images", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, images)
}

func (h *ImageGenerationHandler) GetImageGeneration(c *gin.Context) {

	imageGenID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	imageGen, err := h.imageService.GetImageGeneration(uint(imageGenID))
	if err != nil {
		response.NotFound(c, "图片生成记录不存在")
		return
	}

	response.Success(c, imageGen)
}

func (h *ImageGenerationHandler) ListImageGenerations(c *gin.Context) {
	var sceneID *uint
	if sceneIDStr := c.Query("scene_id"); sceneIDStr != "" {
		id, err := strconv.ParseUint(sceneIDStr, 10, 32)
		if err == nil {
			uid := uint(id)
			sceneID = &uid
		}
	}

	var storyboardID *uint
	if storyboardIDStr := c.Query("storyboard_id"); storyboardIDStr != "" {
		id, err := strconv.ParseUint(storyboardIDStr, 10, 32)
		if err == nil {
			uid := uint(id)
			storyboardID = &uid
		}
	}

	frameType := c.Query("frame_type")
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var dramaIDUint *uint
	if dramaIDStr := c.Query("drama_id"); dramaIDStr != "" {
		did, _ := strconv.ParseUint(dramaIDStr, 10, 32)
		didUint := uint(did)
		dramaIDUint = &didUint
	}

	images, total, err := h.imageService.ListImageGenerations(dramaIDUint, sceneID, storyboardID, frameType, status, page, pageSize)

	if err != nil {
		h.log.Errorw("Failed to list images", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.SuccessWithPagination(c, images, total, page, pageSize)
}

func (h *ImageGenerationHandler) DeleteImageGeneration(c *gin.Context) {

	imageGenID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	if err := h.imageService.DeleteImageGeneration(uint(imageGenID)); err != nil {
		h.log.Errorw("Failed to delete image", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// UploadImage 上传图片并创建图片生成记录
func (h *ImageGenerationHandler) UploadImage(c *gin.Context) {
	var req struct {
		StoryboardID uint   `json:"storyboard_id" binding:"required"`
		DramaID      uint   `json:"drama_id" binding:"required"`
		FrameType    string `json:"frame_type" binding:"required"`
		ImageURL     string `json:"image_url" binding:"required"`
		Prompt       string `json:"prompt"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	imageGen, err := h.imageService.CreateImageFromUpload(&services.UploadImageRequest{
		StoryboardID: req.StoryboardID,
		DramaID:      req.DramaID,
		FrameType:    req.FrameType,
		ImageURL:     req.ImageURL,
		Prompt:       req.Prompt,
	})

	if err != nil {
		h.log.Errorw("Failed to create image from upload", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, imageGen)
}
