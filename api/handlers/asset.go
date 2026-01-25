package handlers

import (
	"strconv"
	"strings"

	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AssetHandler struct {
	assetService *services.AssetService
	log          *logger.Logger
}

func NewAssetHandler(db *gorm.DB, cfg *config.Config, log *logger.Logger) *AssetHandler {
	return &AssetHandler{
		assetService: services.NewAssetService(db, log),
		log:          log,
	}
}

// CreateAsset 创建素材
// @Summary 创建素材
// @Tags Assets
// @Accept json
// @Produce json
// @Param request body services.CreateAssetRequest true "创建素材请求"
// @Success 200 {object} response.Response{data=Asset}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/assets [post]
func (h *AssetHandler) CreateAsset(c *gin.Context) {

	var req services.CreateAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	asset, err := h.assetService.CreateAsset(&req)
	if err != nil {
		h.log.Errorw("Failed to create asset", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, asset)
}

// UpdateAsset 更新素材
// @Summary 更新素材
// @Tags Assets
// @Accept json
// @Produce json
// @Param id path int true "素材ID"
// @Param request body services.UpdateAssetRequest true "更新素材请求"
// @Success 200 {object} response.Response{data=Asset}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/assets/{id} [put]
func (h *AssetHandler) UpdateAsset(c *gin.Context) {

	assetID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	var req services.UpdateAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	asset, err := h.assetService.UpdateAsset(uint(assetID), &req)
	if err != nil {
		h.log.Errorw("Failed to update asset", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, asset)
}

// GetAsset 获取素材详情
// @Summary 获取素材详情
// @Tags Assets
// @Produce json
// @Param id path int true "素材ID"
// @Success 200 {object} response.Response{data=Asset}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /api/v1/assets/{id} [get]
func (h *AssetHandler) GetAsset(c *gin.Context) {

	assetID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	asset, err := h.assetService.GetAsset(uint(assetID))
	if err != nil {
		response.NotFound(c, "素材不存在")
		return
	}

	response.Success(c, asset)
}

// ListAssets 获取素材列表
// @Summary 获取素材列表
// @Tags Assets
// @Produce json
// @Param drama_id query string false "剧本ID"
// @Param episode_id query int false "章节ID"
// @Param storyboard_id query int false "分镜ID"
// @Param type query string false "素材类型(image/video/audio)"
// @Param is_favorite query bool false "是否收藏"
// @Param tag_ids query string false "标签ID，逗号分隔"
// @Param category query string false "分类"
// @Param search query string false "搜索关键字"
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Success 200 {object} response.Response{data=response.PaginationData{items=[]Asset}}
// @Failure 500 {object} response.Response
// @Router /api/v1/assets [get]
func (h *AssetHandler) ListAssets(c *gin.Context) {

	var dramaID *string
	if dramaIDStr := c.Query("drama_id"); dramaIDStr != "" {
		dramaID = &dramaIDStr
	}

	var episodeID *uint
	if episodeIDStr := c.Query("episode_id"); episodeIDStr != "" {
		if id, err := strconv.ParseUint(episodeIDStr, 10, 32); err == nil {
			uid := uint(id)
			episodeID = &uid
		}
	}

	var storyboardID *uint
	if storyboardIDStr := c.Query("storyboard_id"); storyboardIDStr != "" {
		if id, err := strconv.ParseUint(storyboardIDStr, 10, 32); err == nil {
			uid := uint(id)
			storyboardID = &uid
		}
	}

	var assetType *models.AssetType
	if typeStr := c.Query("type"); typeStr != "" {
		t := models.AssetType(typeStr)
		assetType = &t
	}

	var isFavorite *bool
	if favoriteStr := c.Query("is_favorite"); favoriteStr != "" {
		if favoriteStr == "true" {
			fav := true
			isFavorite = &fav
		} else if favoriteStr == "false" {
			fav := false
			isFavorite = &fav
		}
	}

	var tagIDs []uint
	if tagIDsStr := c.Query("tag_ids"); tagIDsStr != "" {
		for _, idStr := range strings.Split(tagIDsStr, ",") {
			if id, err := strconv.ParseUint(strings.TrimSpace(idStr), 10, 32); err == nil {
				tagIDs = append(tagIDs, uint(id))
			}
		}
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	req := &services.ListAssetsRequest{
		DramaID:      dramaID,
		EpisodeID:    episodeID,
		StoryboardID: storyboardID,
		Type:         assetType,
		Category:     c.Query("category"),
		TagIDs:       tagIDs,
		IsFavorite:   isFavorite,
		Search:       c.Query("search"),
		Page:         page,
		PageSize:     pageSize,
	}

	assets, total, err := h.assetService.ListAssets(req)
	if err != nil {
		h.log.Errorw("Failed to list assets", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.SuccessWithPagination(c, assets, total, page, pageSize)
}

// DeleteAsset 删除素材
// @Summary 删除素材
// @Tags Assets
// @Produce json
// @Param id path int true "素材ID"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/assets/{id} [delete]
func (h *AssetHandler) DeleteAsset(c *gin.Context) {

	assetID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	if err := h.assetService.DeleteAsset(uint(assetID)); err != nil {
		h.log.Errorw("Failed to delete asset", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// ImportFromImageGen 从图片生成记录导入素材
// @Summary 从图片生成记录导入素材
// @Tags Assets
// @Produce json
// @Param image_gen_id path int true "图片生成ID"
// @Success 200 {object} response.Response{data=Asset}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/assets/import/image/{image_gen_id} [post]
func (h *AssetHandler) ImportFromImageGen(c *gin.Context) {

	imageGenID, err := strconv.ParseUint(c.Param("image_gen_id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	asset, err := h.assetService.ImportFromImageGen(uint(imageGenID))
	if err != nil {
		h.log.Errorw("Failed to import from image gen", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, asset)
}

// ImportFromVideoGen 从视频生成记录导入素材
// @Summary 从视频生成记录导入素材
// @Tags Assets
// @Produce json
// @Param video_gen_id path int true "视频生成ID"
// @Success 200 {object} response.Response{data=Asset}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/assets/import/video/{video_gen_id} [post]
func (h *AssetHandler) ImportFromVideoGen(c *gin.Context) {

	videoGenID, err := strconv.ParseUint(c.Param("video_gen_id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	asset, err := h.assetService.ImportFromVideoGen(uint(videoGenID))
	if err != nil {
		h.log.Errorw("Failed to import from video gen", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, asset)
}
