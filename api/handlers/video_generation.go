package handlers

import (
	"strconv"

	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/infrastructure/storage"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type VideoGenerationHandler struct {
	videoService *services.VideoGenerationService
	log          *logger.Logger
}

func NewVideoGenerationHandler(db *gorm.DB, transferService *services.ResourceTransferService, localStorage *storage.LocalStorage, aiService *services.AIService, log *logger.Logger) *VideoGenerationHandler {
	return &VideoGenerationHandler{
		videoService: services.NewVideoGenerationService(db, transferService, localStorage, aiService, log),
		log:          log,
	}
}

// GenerateVideo 创建视频生成任务
// @Summary 创建视频生成任务
// @Tags Videos
// @Accept json
// @Produce json
// @Param request body services.GenerateVideoRequest true "视频生成请求"
// @Success 200 {object} response.Response{data=VideoGeneration}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/videos [post]
func (h *VideoGenerationHandler) GenerateVideo(c *gin.Context) {

	var req services.GenerateVideoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	videoGen, err := h.videoService.GenerateVideo(&req)
	if err != nil {
		h.log.Errorw("Failed to generate video", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, videoGen)
}

// GenerateVideoFromImage 根据图片生成视频
// @Summary 根据图片生成视频
// @Tags Videos
// @Produce json
// @Param image_gen_id path int true "图片生成ID"
// @Success 200 {object} response.Response{data=VideoGeneration}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/videos/image/{image_gen_id} [post]
func (h *VideoGenerationHandler) GenerateVideoFromImage(c *gin.Context) {

	imageGenID, err := strconv.ParseUint(c.Param("image_gen_id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的图片ID")
		return
	}

	videoGen, err := h.videoService.GenerateVideoFromImage(uint(imageGenID))
	if err != nil {
		h.log.Errorw("Failed to generate video from image", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, videoGen)
}

// BatchGenerateForEpisode 批量生成章节视频
// @Summary 批量生成章节视频
// @Tags Videos
// @Produce json
// @Param episode_id path string true "章节ID"
// @Success 200 {object} response.Response{data=[]VideoGeneration}
// @Failure 500 {object} response.Response
// @Router /api/v1/videos/episode/{episode_id}/batch [post]
func (h *VideoGenerationHandler) BatchGenerateForEpisode(c *gin.Context) {

	episodeID := c.Param("episode_id")

	videos, err := h.videoService.BatchGenerateVideosForEpisode(episodeID)
	if err != nil {
		h.log.Errorw("Failed to batch generate videos", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, videos)
}

// GetVideoGeneration 获取视频生成记录
// @Summary 获取视频生成记录
// @Tags Videos
// @Produce json
// @Param id path int true "视频生成ID"
// @Success 200 {object} response.Response{data=VideoGeneration}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /api/v1/videos/{id} [get]
func (h *VideoGenerationHandler) GetVideoGeneration(c *gin.Context) {

	videoGenID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	videoGen, err := h.videoService.GetVideoGeneration(uint(videoGenID))
	if err != nil {
		response.NotFound(c, "视频生成记录不存在")
		return
	}

	response.Success(c, videoGen)
}

// ListVideoGenerations 获取视频生成记录列表
// @Summary 获取视频生成记录列表
// @Tags Videos
// @Produce json
// @Param drama_id query int false "剧本ID"
// @Param storyboard_id query int false "分镜ID"
// @Param status query string false "状态"
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Success 200 {object} response.Response{data=response.PaginationData{items=[]VideoGeneration}}
// @Failure 500 {object} response.Response
// @Router /api/v1/videos [get]
func (h *VideoGenerationHandler) ListVideoGenerations(c *gin.Context) {
	var storyboardID *uint
	// 优先使用storyboard_id参数
	if storyboardIDStr := c.Query("storyboard_id"); storyboardIDStr != "" {
		id, err := strconv.ParseUint(storyboardIDStr, 10, 32)
		if err == nil {
			uid := uint(id)
			storyboardID = &uid
		}
	}
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

	// 计算offset：(page - 1) * pageSize
	offset := (page - 1) * pageSize
	videos, total, err := h.videoService.ListVideoGenerations(dramaIDUint, storyboardID, status, pageSize, offset)

	if err != nil {
		h.log.Errorw("Failed to list videos", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.SuccessWithPagination(c, videos, total, page, pageSize)
}

// DeleteVideoGeneration 删除视频生成记录
// @Summary 删除视频生成记录
// @Tags Videos
// @Produce json
// @Param id path int true "视频生成ID"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/videos/{id} [delete]
func (h *VideoGenerationHandler) DeleteVideoGeneration(c *gin.Context) {

	videoGenID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	if err := h.videoService.DeleteVideoGeneration(uint(videoGenID)); err != nil {
		h.log.Errorw("Failed to delete video", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, nil)
}
