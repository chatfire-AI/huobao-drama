package handlers

import (
	"strconv"

	services2 "github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type VideoMergeHandler struct {
	mergeService *services2.VideoMergeService
	log          *logger.Logger
}

func NewVideoMergeHandler(db *gorm.DB, transferService *services2.ResourceTransferService, storagePath, baseURL string, log *logger.Logger) *VideoMergeHandler {
	return &VideoMergeHandler{
		mergeService: services2.NewVideoMergeService(db, transferService, storagePath, baseURL, log),
		log:          log,
	}
}

// MergeVideos 创建视频合成任务
// @Summary 创建视频合成任务
// @Tags VideoMerges
// @Accept json
// @Produce json
// @Param request body services2.MergeVideoRequest true "合成请求"
// @Success 200 {object} response.Response{data=VideoMergeCreatedResponse}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/video-merges [post]
func (h *VideoMergeHandler) MergeVideos(c *gin.Context) {
	var req services2.MergeVideoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request")
		return
	}

	merge, err := h.mergeService.MergeVideos(&req)
	if err != nil {
		h.log.Errorw("Failed to merge videos", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"message": "Video merge task created",
		"merge":   merge,
	})
}

// GetMerge 获取视频合成详情
// @Summary 获取视频合成详情
// @Tags VideoMerges
// @Produce json
// @Param merge_id path int true "合成ID"
// @Success 200 {object} response.Response{data=VideoMergeDetailResponse}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /api/v1/video-merges/{merge_id} [get]
func (h *VideoMergeHandler) GetMerge(c *gin.Context) {
	mergeIDStr := c.Param("merge_id")
	mergeID, err := strconv.ParseUint(mergeIDStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "Invalid merge ID")
		return
	}

	merge, err := h.mergeService.GetMerge(uint(mergeID))
	if err != nil {
		h.log.Errorw("Failed to get merge", "error", err)
		response.NotFound(c, "Merge not found")
		return
	}

	response.Success(c, gin.H{"merge": merge})
}

// ListMerges 获取视频合成列表
// @Summary 获取视频合成列表
// @Tags VideoMerges
// @Produce json
// @Param episode_id query string false "章节ID"
// @Param status query string false "状态"
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Success 200 {object} response.Response{data=VideoMergeListResponse}
// @Failure 500 {object} response.Response
// @Router /api/v1/video-merges [get]
func (h *VideoMergeHandler) ListMerges(c *gin.Context) {
	episodeID := c.Query("episode_id")
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	var episodeIDPtr *string
	if episodeID != "" {
		episodeIDPtr = &episodeID
	}

	merges, total, err := h.mergeService.ListMerges(episodeIDPtr, status, page, pageSize)
	if err != nil {
		h.log.Errorw("Failed to list merges", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"merges":    merges,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// DeleteMerge 删除视频合成记录
// @Summary 删除视频合成记录
// @Tags VideoMerges
// @Produce json
// @Param merge_id path int true "合成ID"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/video-merges/{merge_id} [delete]
func (h *VideoMergeHandler) DeleteMerge(c *gin.Context) {
	mergeIDStr := c.Param("merge_id")
	mergeID, err := strconv.ParseUint(mergeIDStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "Invalid merge ID")
		return
	}

	if err := h.mergeService.DeleteMerge(uint(mergeID)); err != nil {
		h.log.Errorw("Failed to delete merge", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Merge deleted successfully"})
}
