package handlers

import (
	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

// FramePromptHandler 处理帧提示词生成请求
type FramePromptHandler struct {
	framePromptService *services.FramePromptService
	log                *logger.Logger
}

// NewFramePromptHandler 创建帧提示词处理器
func NewFramePromptHandler(framePromptService *services.FramePromptService, log *logger.Logger) *FramePromptHandler {
	return &FramePromptHandler{
		framePromptService: framePromptService,
		log:                log,
	}
}

// GenerateFramePrompt 生成指定类型的帧提示词
// POST /api/v1/storyboards/:id/frame-prompt
// @Summary 生成帧提示词
// @Tags Storyboards
// @Accept json
// @Produce json
// @Param id path string true "分镜ID"
// @Param request body GenerateFramePromptRequestBody true "生成帧提示词请求"
// @Success 200 {object} response.Response{data=services.FramePromptResponse}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/storyboards/{id}/frame-prompt [post]
func (h *FramePromptHandler) GenerateFramePrompt(c *gin.Context) {
	storyboardID := c.Param("id")

	var req GenerateFramePromptRequestBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	serviceReq := services.GenerateFramePromptRequest{
		StoryboardID: storyboardID,
		FrameType:    services.FrameType(req.FrameType),
		PanelCount:   req.PanelCount,
	}

	result, err := h.framePromptService.GenerateFramePrompt(serviceReq, req.Model)
	if err != nil {
		h.log.Errorw("Failed to generate frame prompt", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, result)
}
