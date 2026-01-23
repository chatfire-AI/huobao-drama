package handlers

import (
	"github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetStoryboardFramePrompts 查询镜头的所有帧提示词
// GET /api/v1/storyboards/:id/frame-prompts
// @Summary 查询帧提示词列表
// @Tags Storyboards
// @Produce json
// @Param id path string true "分镜ID"
// @Success 200 {object} response.Response{data=FramePromptListData}
// @Failure 500 {object} response.Response
// @Router /api/v1/storyboards/{id}/frame-prompts [get]
func GetStoryboardFramePrompts(db *gorm.DB, log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		storyboardID := c.Param("id")

		var framePrompts []models.FramePrompt
		if err := db.Where("storyboard_id = ?", storyboardID).
			Order("created_at DESC").
			Find(&framePrompts).Error; err != nil {
			log.Errorw("Failed to query frame prompts", "error", err)
			response.InternalError(c, err.Error())
			return
		}

		response.Success(c, gin.H{
			"frame_prompts": framePrompts,
		})
	}
}
