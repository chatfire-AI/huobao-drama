package services

import (
	"fmt"
	"time"

	"github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/pkg/logger"
	"gorm.io/gorm"
)

type OperationLogService struct {
	db  *gorm.DB
	log *logger.Logger
}

type OperationLogFilter struct {
	UserID    *string
	Module    string
	Action    string
	API       string
	Result    string
	StartTime *time.Time
	EndTime   *time.Time
}

func NewOperationLogService(db *gorm.DB, log *logger.Logger) *OperationLogService {
	return &OperationLogService{
		db:  db,
		log: log,
	}
}

func (s *OperationLogService) CreateLog(entry *models.OperationLog) error {
	if entry == nil {
		return fmt.Errorf("operation log entry is nil")
	}
	if err := s.db.Create(entry).Error; err != nil {
		return fmt.Errorf("failed to create operation log: %w", err)
	}
	return nil
}

func (s *OperationLogService) ListLogs(filter OperationLogFilter, pageSize, offset int) ([]*models.OperationLog, int64, error) {
	db := s.db.Model(&models.OperationLog{})

	if filter.UserID != nil && *filter.UserID != "" {
		db = db.Where("user_id = ?", *filter.UserID)
	}
	if filter.Module != "" {
		db = db.Where("module = ?", filter.Module)
	}
	if filter.Action != "" {
		db = db.Where("action LIKE ?", "%"+filter.Action+"%")
	}
	if filter.API != "" {
		db = db.Where("api LIKE ?", "%"+filter.API+"%")
	}
	if filter.Result != "" {
		db = db.Where("result = ?", filter.Result)
	}
	if filter.StartTime != nil {
		db = db.Where("created_at >= ?", *filter.StartTime)
	}
	if filter.EndTime != nil {
		db = db.Where("created_at <= ?", *filter.EndTime)
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count operation logs: %w", err)
	}

	var logs []*models.OperationLog
	if err := db.Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&logs).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list operation logs: %w", err)
	}

	return logs, total, nil
}
