package handlers

import (
	"strconv"

	services2 "github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/infrastructure/parser"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

type NovelParseHandler struct {
	novelParseService *services2.NovelParseService
	log              *logger.Logger
	cfg              *config.Config
}

func NewNovelParseHandler(cfg *config.Config, log *logger.Logger, novelParseService *services2.NovelParseService) *NovelParseHandler {
	return &NovelParseHandler{
		novelParseService: novelParseService,
		log:              log,
		cfg:              cfg,
	}
}

// CreateTask 创建解析任务
func (h *NovelParseHandler) CreateTask(c *gin.Context) {
	// 获取drama_id（可选）
	dramaIDStr := c.PostForm("drama_id")
	var dramaID uint
	if dramaIDStr != "" {
		id, err := strconv.ParseUint(dramaIDStr, 10, 32)
		if err != nil {
			response.BadRequest(c, "无效的项目ID")
			return
		}
		dramaID = uint(id)
	}

	// 获取项目标题（可选）
	title := c.PostForm("title")

	// 获取文件头
	header, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, "请选择文件")
		return
	}

	// 检查文件格式
	if !parser.IsSupportedFormat(header.Filename) {
		response.BadRequest(c, "不支持的文件格式，仅支持 txt, docx, pdf")
		return
	}

	// 检查文件大小 (10MB)
	if header.Size > 10*1024*1024 {
		response.BadRequest(c, "文件大小不能超过10MB")
		return
	}

	// 创建任务
	req := &services2.CreateTaskRequest{
		DramaID: dramaID,
		File:    header,
		Title:   title,
	}

	task, err := h.novelParseService.CreateTask(req)
	if err != nil {
		h.log.Errorw("Failed to create task", "error", err)
		response.InternalError(c, "创建任务失败")
		return
	}

	response.Success(c, gin.H{
		"task_id":  task.TaskID,
		"status":   task.Status,
		"progress": task.Progress,
	})
}

// StartTask 开始解析任务
func (h *NovelParseHandler) StartTask(c *gin.Context) {
	taskID := c.Param("task_id")
	if taskID == "" {
		response.BadRequest(c, "任务ID不能为空")
		return
	}

	// 异步执行任务（不阻塞）
	go func() {
		err := h.novelParseService.ExecuteTask(taskID)
		if err != nil {
			h.log.Errorw("Task execution failed", "task_id", taskID, "error", err)
		}
	}()

	response.Success(c, gin.H{
		"task_id": taskID,
		"status":  "running",
		"message": "任务已开始执行",
	})
}

// GetTask 获取任务状态
func (h *NovelParseHandler) GetTask(c *gin.Context) {
	taskID := c.Param("task_id")
	if taskID == "" {
		response.BadRequest(c, "任务ID不能为空")
		return
	}

	task, err := h.novelParseService.GetTask(taskID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"task_id":           task.TaskID,
		"status":            task.Status,
		"progress":          task.Progress,
		"total_episodes":    task.TotalEpisodes,
		"created_episodes":  task.CreatedEpisodes,
		"error_message":     task.ErrorMessage,
		"drama_id":          task.DramaID,
	})
}

// CancelTask 取消任务
func (h *NovelParseHandler) CancelTask(c *gin.Context) {
	taskID := c.Param("task_id")
	if taskID == "" {
		response.BadRequest(c, "任务ID不能为空")
		return
	}

	err := h.novelParseService.CancelTask(taskID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"message": "任务已取消",
	})
}
