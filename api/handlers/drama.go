package handlers

import (
	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DramaHandler struct {
	db                *gorm.DB
	dramaService      *services.DramaService
	videoMergeService *services.VideoMergeService
	log               *logger.Logger
}

func NewDramaHandler(db *gorm.DB, cfg *config.Config, log *logger.Logger, transferService *services.ResourceTransferService) *DramaHandler {
	return &DramaHandler{
		db:                db,
		dramaService:      services.NewDramaService(db, log),
		videoMergeService: services.NewVideoMergeService(db, transferService, cfg.Storage.LocalPath, cfg.Storage.BaseURL, log),
		log:               log,
	}
}

// CreateDrama 创建剧本
// @Summary 创建剧本
// @Tags Drama
// @Accept json
// @Produce json
// @Param request body services.CreateDramaRequest true "创建剧本请求"
// @Success 201 {object} response.Response{data=models.Drama}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/dramas [post]
func (h *DramaHandler) CreateDrama(c *gin.Context) {

	var req services.CreateDramaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	drama, err := h.dramaService.CreateDrama(&req)
	if err != nil {
		response.InternalError(c, "创建失败")
		return
	}

	response.Created(c, drama)
}

// GetDrama 获取剧本详情
// @Summary 获取剧本详情
// @Tags Drama
// @Produce json
// @Param id path string true "剧本ID"
// @Success 200 {object} response.Response{data=models.Drama}
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/dramas/{id} [get]
func (h *DramaHandler) GetDrama(c *gin.Context) {

	dramaID := c.Param("id")

	drama, err := h.dramaService.GetDrama(dramaID)
	if err != nil {
		if err.Error() == "drama not found" {
			response.NotFound(c, "剧本不存在")
			return
		}
		response.InternalError(c, "获取失败")
		return
	}

	response.Success(c, drama)
}

// ListDramas 获取剧本列表
// @Summary 获取剧本列表
// @Tags Drama
// @Produce json
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Param status query string false "状态"
// @Param genre query string false "类型"
// @Param keyword query string false "关键词"
// @Success 200 {object} response.Response{data=response.PaginationData{items=[]models.Drama}}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/dramas [get]
func (h *DramaHandler) ListDramas(c *gin.Context) {

	var query services.DramaListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}

	dramas, total, err := h.dramaService.ListDramas(&query)
	if err != nil {
		response.InternalError(c, "获取列表失败")
		return
	}

	response.SuccessWithPagination(c, dramas, total, query.Page, query.PageSize)
}

// UpdateDrama 更新剧本
// @Summary 更新剧本
// @Tags Drama
// @Accept json
// @Produce json
// @Param id path string true "剧本ID"
// @Param request body services.UpdateDramaRequest true "更新剧本请求"
// @Success 200 {object} response.Response{data=models.Drama}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/dramas/{id} [put]
func (h *DramaHandler) UpdateDrama(c *gin.Context) {

	dramaID := c.Param("id")

	var req services.UpdateDramaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	drama, err := h.dramaService.UpdateDrama(dramaID, &req)
	if err != nil {
		if err.Error() == "drama not found" {
			response.NotFound(c, "剧本不存在")
			return
		}
		response.InternalError(c, "更新失败")
		return
	}

	response.Success(c, drama)
}

// DeleteDrama 删除剧本
// @Summary 删除剧本
// @Tags Drama
// @Produce json
// @Param id path string true "剧本ID"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/dramas/{id} [delete]
func (h *DramaHandler) DeleteDrama(c *gin.Context) {

	dramaID := c.Param("id")

	if err := h.dramaService.DeleteDrama(dramaID); err != nil {
		if err.Error() == "drama not found" {
			response.NotFound(c, "剧本不存在")
			return
		}
		response.InternalError(c, "删除失败")
		return
	}

	response.Success(c, gin.H{"message": "删除成功"})
}

// GetDramaStats 获取剧本统计
// @Summary 获取剧本统计
// @Tags Drama
// @Produce json
// @Success 200 {object} response.Response{data=DramaStatsResponse}
// @Failure 500 {object} response.Response
// @Router /api/v1/dramas/stats [get]
func (h *DramaHandler) GetDramaStats(c *gin.Context) {

	stats, err := h.dramaService.GetDramaStats()
	if err != nil {
		response.InternalError(c, "获取统计失败")
		return
	}

	response.Success(c, stats)
}

// SaveOutline 保存剧情大纲
// @Summary 保存剧情大纲
// @Tags Drama
// @Accept json
// @Produce json
// @Param id path string true "剧本ID"
// @Param request body services.SaveOutlineRequest true "保存大纲请求"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/dramas/{id}/outline [put]
func (h *DramaHandler) SaveOutline(c *gin.Context) {

	dramaID := c.Param("id")

	var req services.SaveOutlineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.dramaService.SaveOutline(dramaID, &req); err != nil {
		if err.Error() == "drama not found" {
			response.NotFound(c, "剧本不存在")
			return
		}
		response.InternalError(c, "保存失败")
		return
	}

	response.Success(c, gin.H{"message": "保存成功"})
}

// GetCharacters 获取剧本角色
// @Summary 获取剧本角色
// @Tags Drama
// @Produce json
// @Param id path string true "剧本ID"
// @Param episode_id query string false "章节ID（可选）"
// @Success 200 {object} response.Response{data=[]models.Character}
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/dramas/{id}/characters [get]
func (h *DramaHandler) GetCharacters(c *gin.Context) {

	dramaID := c.Param("id")
	episodeID := c.Query("episode_id") // 可选：如果提供则只返回该章节的角色

	var episodeIDPtr *string
	if episodeID != "" {
		episodeIDPtr = &episodeID
	}

	characters, err := h.dramaService.GetCharacters(dramaID, episodeIDPtr)
	if err != nil {
		if err.Error() == "drama not found" {
			response.NotFound(c, "剧本不存在")
			return
		}
		if err.Error() == "episode not found" {
			response.NotFound(c, "章节不存在")
			return
		}
		response.InternalError(c, "获取角色失败")
		return
	}

	response.Success(c, characters)
}

// SaveCharacters 保存剧本角色
// @Summary 保存剧本角色
// @Tags Drama
// @Accept json
// @Produce json
// @Param id path string true "剧本ID"
// @Param request body services.SaveCharactersRequest true "保存角色请求"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/dramas/{id}/characters [put]
func (h *DramaHandler) SaveCharacters(c *gin.Context) {

	dramaID := c.Param("id")

	var req services.SaveCharactersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.dramaService.SaveCharacters(dramaID, &req); err != nil {
		if err.Error() == "drama not found" {
			response.NotFound(c, "剧本不存在")
			return
		}
		response.InternalError(c, "保存失败")
		return
	}

	response.Success(c, gin.H{"message": "保存成功"})
}

// SaveEpisodes 保存剧本章节
// @Summary 保存剧本章节
// @Tags Drama
// @Accept json
// @Produce json
// @Param id path string true "剧本ID"
// @Param request body services.SaveEpisodesRequest true "保存章节请求"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/dramas/{id}/episodes [put]
func (h *DramaHandler) SaveEpisodes(c *gin.Context) {

	dramaID := c.Param("id")

	var req services.SaveEpisodesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.dramaService.SaveEpisodes(dramaID, &req); err != nil {
		if err.Error() == "drama not found" {
			response.NotFound(c, "剧本不存在")
			return
		}
		response.InternalError(c, "保存失败")
		return
	}

	response.Success(c, gin.H{"message": "保存成功"})
}

// SaveProgress 保存剧本进度
// @Summary 保存剧本进度
// @Tags Drama
// @Accept json
// @Produce json
// @Param id path string true "剧本ID"
// @Param request body services.SaveProgressRequest true "保存进度请求"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/dramas/{id}/progress [put]
func (h *DramaHandler) SaveProgress(c *gin.Context) {

	dramaID := c.Param("id")

	var req services.SaveProgressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.dramaService.SaveProgress(dramaID, &req); err != nil {
		if err.Error() == "drama not found" {
			response.NotFound(c, "剧本不存在")
			return
		}
		response.InternalError(c, "保存失败")
		return
	}

	response.Success(c, gin.H{"message": "保存成功"})
}

// FinalizeEpisode 完成集数制作（触发视频合成）
// @Summary 完成集数制作
// @Tags Episodes
// @Accept json
// @Produce json
// @Param episode_id path string true "章节ID"
// @Param request body services.FinalizeEpisodeRequest false "时间线剪辑数据（可选）"
// @Success 200 {object} response.Response{data=FinalizeEpisodeResponse}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/episodes/{episode_id}/finalize [post]
func (h *DramaHandler) FinalizeEpisode(c *gin.Context) {

	episodeID := c.Param("episode_id")
	if episodeID == "" {
		response.BadRequest(c, "episode_id不能为空")
		return
	}

	// 尝试读取时间线数据（可选）
	var timelineData *services.FinalizeEpisodeRequest
	if err := c.ShouldBindJSON(&timelineData); err != nil {
		// 如果没有请求体或解析失败，使用nil（将使用默认场景顺序）
		h.log.Warnw("No timeline data provided, will use default scene order", "error", err)
		timelineData = nil
	} else if timelineData != nil {
		h.log.Infow("Received timeline data", "clips_count", len(timelineData.Clips), "episode_id", episodeID)
	}

	// 触发视频合成任务
	result, err := h.videoMergeService.FinalizeEpisode(episodeID, timelineData)
	if err != nil {
		h.log.Errorw("Failed to finalize episode", "error", err, "episode_id", episodeID)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, result)
}

// DownloadEpisodeVideo 下载剧集视频
// @Summary 下载剧集视频
// @Tags Episodes
// @Produce json
// @Param episode_id path string true "章节ID"
// @Success 200 {object} EpisodeDownloadResponse
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /api/v1/episodes/{episode_id}/download [get]
func (h *DramaHandler) DownloadEpisodeVideo(c *gin.Context) {

	episodeID := c.Param("episode_id")
	if episodeID == "" {
		response.BadRequest(c, "episode_id不能为空")
		return
	}

	// 查询episode
	var episode models.Episode
	if err := h.db.Preload("Drama").Where("id = ?", episodeID).First(&episode).Error; err != nil {
		response.NotFound(c, "剧集不存在")
		return
	}

	// 检查是否有视频
	if episode.VideoURL == nil || *episode.VideoURL == "" {
		response.BadRequest(c, "该剧集还没有生成视频")
		return
	}

	// 返回视频URL，让前端重定向下载
	c.JSON(200, gin.H{
		"video_url":      *episode.VideoURL,
		"title":          episode.Title,
		"episode_number": episode.EpisodeNum,
	})
}
