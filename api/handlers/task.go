package handlers

import (
	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type TaskHandler struct {
	taskService *services.TaskService
	log         *logger.Logger
}

func NewTaskHandler(db *gorm.DB, log *logger.Logger) *TaskHandler {
	return &TaskHandler{
		taskService: services.NewTaskService(db, log),
		log:         log,
	}
}

// GetTaskStatus 获取任务状态
// @Summary 获取任务状态
// @Tags Tasks
// @Produce json
// @Param task_id path string true "任务ID"
// @Success 200 {object} response.Response{data=AsyncTask}
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/tasks/{task_id} [get]
func (h *TaskHandler) GetTaskStatus(c *gin.Context) {
	taskID := c.Param("task_id")

	task, err := h.taskService.GetTask(taskID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			response.NotFound(c, "任务不存在")
			return
		}
		h.log.Errorw("Failed to get task", "error", err, "task_id", taskID)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, task)
}

// GetResourceTasks 获取资源相关的所有任务
// @Summary 获取资源相关任务
// @Tags Tasks
// @Produce json
// @Param resource_id query string true "资源ID"
// @Success 200 {object} response.Response{data=[]AsyncTask}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/tasks [get]
func (h *TaskHandler) GetResourceTasks(c *gin.Context) {
	resourceID := c.Query("resource_id")
	if resourceID == "" {
		response.BadRequest(c, "缺少resource_id参数")
		return
	}

	tasks, err := h.taskService.GetTasksByResource(resourceID)
	if err != nil {
		h.log.Errorw("Failed to get resource tasks", "error", err, "resource_id", resourceID)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, tasks)
}
