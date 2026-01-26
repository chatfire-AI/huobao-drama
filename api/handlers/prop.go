package handlers

import (
	"strconv"

	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PropHandler struct {
	propService *services.PropService
	log         *logger.Logger
}

func NewPropHandler(db *gorm.DB, cfg *config.Config, log *logger.Logger, aiService *services.AIService, imageGenerationService *services.ImageGenerationService) *PropHandler {
	return &PropHandler{
		propService: services.NewPropService(db, aiService, services.NewTaskService(db, log), imageGenerationService, log, cfg),
		log:         log,
	}
}

// ListProps 获取道具列表
func (h *PropHandler) ListProps(c *gin.Context) {
	dramaIDStr := c.Query("drama_id")
	if dramaIDStr == "" {
		response.BadRequest(c, "drama_id is required")
		return
	}

	dramaID, err := strconv.ParseUint(dramaIDStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "Invalid drama_id")
		return
	}

	props, err := h.propService.ListProps(uint(dramaID))
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, props)
}

// CreateProp 创建道具
func (h *PropHandler) CreateProp(c *gin.Context) {
	var prop models.Prop
	if err := c.ShouldBindJSON(&prop); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.propService.CreateProp(&prop); err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Created(c, prop)
}

// UpdateProp 更新道具
func (h *PropHandler) UpdateProp(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.propService.UpdateProp(uint(id), updates); err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// DeleteProp 删除道具
func (h *PropHandler) DeleteProp(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}

	if err := h.propService.DeleteProp(uint(id)); err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// ExtractProps 提取道具
func (h *PropHandler) ExtractProps(c *gin.Context) {
	episodeIDStr := c.Param("episode_id")
	episodeID, err := strconv.ParseUint(episodeIDStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "Invalid episode_id")
		return
	}

	taskID, err := h.propService.ExtractPropsFromScript(uint(episodeID))
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{"task_id": taskID})
}

// GenerateImage 生成道具图片
func (h *PropHandler) GenerateImage(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}

	taskID, err := h.propService.GeneratePropImage(uint(id))
	if err != nil {
		h.log.Errorw("Failed to generate prop image", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{"task_id": taskID, "message": "图片生成任务已提交"})
}

// AssociateProps 关联道具
func (h *PropHandler) AssociateProps(c *gin.Context) {
	storyboardIDStr := c.Param("id")
	storyboardID, err := strconv.ParseUint(storyboardIDStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "Invalid storyboard_id")
		return
	}

	var req struct {
		PropIDs []uint `json:"prop_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.propService.AssociatePropsWithStoryboard(uint(storyboardID), req.PropIDs); err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, nil)
}
