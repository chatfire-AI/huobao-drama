package handlers

import (
	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type StoryboardHandler struct {
	storyboardService *services.StoryboardService
	taskService       *services.TaskService
	log               *logger.Logger
}

func NewStoryboardHandler(db *gorm.DB, cfg *config.Config, log *logger.Logger) *StoryboardHandler {
	return &StoryboardHandler{
		storyboardService: services.NewStoryboardService(db, cfg, log),
		taskService:       services.NewTaskService(db, log),
		log:               log,
	}
}

// GenerateStoryboard 生成分镜头（异步）
// @Summary 生成分镜头
// @Tags Storyboards
// @Accept json
// @Produce json
// @Param episode_id path string true "章节ID"
// @Param request body GenerateStoryboardRequest false "生成分镜参数（可选）"
// @Success 200 {object} response.Response{data=TaskCreatedResponse}
// @Failure 500 {object} response.Response
// @Router /api/v1/episodes/{episode_id}/storyboards [post]
func (h *StoryboardHandler) GenerateStoryboard(c *gin.Context) {
	episodeID := c.Param("episode_id")

	// 接收可选的 model 参数
	var req GenerateStoryboardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 如果没有提供body或者解析失败，使用空字符串（使用默认模型）
		req.Model = ""
	}

	// 创建异步任务
	task, err := h.taskService.CreateTask("storyboard_generation", episodeID)
	if err != nil {
		h.log.Errorw("Failed to create task", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	// 启动后台goroutine处理
	go h.processStoryboardGeneration(task.ID, episodeID, req.Model)

	// 立即返回任务ID
	response.Success(c, gin.H{
		"task_id": task.ID,
		"status":  "pending",
		"message": "分镜头生成任务已创建，正在后台处理...",
	})
}

// processStoryboardGeneration 后台处理分镜生成
func (h *StoryboardHandler) processStoryboardGeneration(taskID, episodeID, model string) {
	h.log.Infow("Starting storyboard generation", "task_id", taskID, "episode_id", episodeID, "model", model)

	// 更新任务状态为处理中
	if err := h.taskService.UpdateTaskStatus(taskID, "processing", 10, "开始生成分镜..."); err != nil {
		h.log.Errorw("Failed to update task status", "error", err)
	}

	// 调用实际的生成逻辑
	result, err := h.storyboardService.GenerateStoryboard(episodeID, model)
	if err != nil {
		h.log.Errorw("Failed to generate storyboard", "error", err, "task_id", taskID)
		if updateErr := h.taskService.UpdateTaskError(taskID, err); updateErr != nil {
			h.log.Errorw("Failed to update task error", "error", updateErr)
		}
		return
	}

	// 更新任务结果
	if err := h.taskService.UpdateTaskResult(taskID, result); err != nil {
		h.log.Errorw("Failed to update task result", "error", err)
		return
	}

	h.log.Infow("Storyboard generation completed", "task_id", taskID, "total", result.Total)
}

// UpdateStoryboard 更新分镜
// @Summary 更新分镜
// @Tags Storyboards
// @Accept json
// @Produce json
// @Param id path string true "分镜ID"
// @Param request body UpdateStoryboardRequest true "更新分镜请求"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/storyboards/{id} [put]
func (h *StoryboardHandler) UpdateStoryboard(c *gin.Context) {
	storyboardID := c.Param("id")

	var req UpdateStoryboardRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	err := h.storyboardService.UpdateStoryboard(storyboardID, req)
	if err != nil {
		h.log.Errorw("Failed to update storyboard", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Storyboard updated successfully"})
}
