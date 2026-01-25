package handlers

import (
	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ScriptGenerationHandler struct {
	scriptService *services.ScriptGenerationService
	taskService   *services.TaskService
	log           *logger.Logger
}

func NewScriptGenerationHandler(db *gorm.DB, cfg *config.Config, log *logger.Logger) *ScriptGenerationHandler {
	return &ScriptGenerationHandler{
		scriptService: services.NewScriptGenerationService(db, cfg, log),
		taskService:   services.NewTaskService(db, log),
		log:           log,
	}
}

// GenerateCharacters 生成角色（异步）
// @Summary 生成角色
// @Tags Generation
// @Accept json
// @Produce json
// @Param request body services.GenerateCharactersRequest true "角色生成请求"
// @Success 200 {object} response.Response{data=TaskCreatedResponse}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/generation/characters [post]
func (h *ScriptGenerationHandler) GenerateCharacters(c *gin.Context) {
	var req services.GenerateCharactersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 创建异步任务
	task, err := h.taskService.CreateTask("character_generation", req.DramaID)
	if err != nil {
		h.log.Errorw("Failed to create task", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	// 复制req值，避免goroutine中使用指针导致的并发问题
	reqCopy := req

	// 启动后台goroutine处理
	go h.processCharacterGeneration(task.ID, &reqCopy)

	// 立即返回任务ID
	response.Success(c, gin.H{
		"task_id": task.ID,
		"status":  "pending",
		"message": "角色生成任务已创建，正在后台处理...",
	})
}

// processCharacterGeneration 后台处理角色生成
func (h *ScriptGenerationHandler) processCharacterGeneration(taskID string, req *services.GenerateCharactersRequest) {
	h.log.Infow("Starting character generation", "task_id", taskID, "drama_id", req.DramaID)

	// 更新任务状态为处理中
	if err := h.taskService.UpdateTaskStatus(taskID, "processing", 10, "开始生成角色..."); err != nil {
		h.log.Errorw("Failed to update task status", "error", err)
	}

	// 调用实际的生成逻辑
	characters, err := h.scriptService.GenerateCharacters(req)
	if err != nil {
		h.log.Errorw("Failed to generate characters", "error", err, "task_id", taskID)
		if updateErr := h.taskService.UpdateTaskError(taskID, err); updateErr != nil {
			h.log.Errorw("Failed to update task error", "error", updateErr)
		}
		return
	}

	// 更新任务结果
	result := gin.H{
		"characters": characters,
		"total":      len(characters),
	}
	if err := h.taskService.UpdateTaskResult(taskID, result); err != nil {
		h.log.Errorw("Failed to update task result", "error", err)
		return
	}

	h.log.Infow("Character generation completed", "task_id", taskID, "total", len(characters))
}
