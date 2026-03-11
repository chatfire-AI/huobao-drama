package handlers

import (
	"strconv"
	"time"

	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type OperationLogHandler struct {
	logService *services.OperationLogService
	log        *logger.Logger
}

func NewOperationLogHandler(db *gorm.DB, log *logger.Logger) *OperationLogHandler {
	return &OperationLogHandler{
		logService: services.NewOperationLogService(db, log),
		log:        log,
	}
}

// ListOperationLogs 获取操作记录列表
func (h *OperationLogHandler) ListOperationLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	filter := services.OperationLogFilter{
		Module: c.Query("module"),
		Action: c.Query("action"),
		API:    c.Query("api"),
		Result: c.Query("result"),
	}

	if userID := c.Query("user_id"); userID != "" {
		filter.UserID = &userID
	}

	if start := c.Query("start_time"); start != "" {
		startTime, err := time.Parse(time.RFC3339, start)
		if err != nil {
			response.BadRequest(c, "start_time 格式错误，需为 RFC3339 时间格式")
			return
		}
		filter.StartTime = &startTime
	}

	if end := c.Query("end_time"); end != "" {
		endTime, err := time.Parse(time.RFC3339, end)
		if err != nil {
			response.BadRequest(c, "end_time 格式错误，需为 RFC3339 时间格式")
			return
		}
		filter.EndTime = &endTime
	}

	offset := (page - 1) * pageSize
	logs, total, err := h.logService.ListLogs(filter, pageSize, offset)
	if err != nil {
		h.log.Errorw("Failed to list operation logs", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.SuccessWithPagination(c, logs, total, page, pageSize)
}
