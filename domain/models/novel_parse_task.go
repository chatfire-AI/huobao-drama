package models

import (
	"time"

	"gorm.io/gorm"
)

// NovelParseTask 小说解析任务
type NovelParseTask struct {
	ID            uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	TaskID        string         `gorm:"size:36;uniqueIndex;not null" json:"task_id"` // 任务唯一标识(UUID)
	DramaID       uint           `gorm:"index" json:"drama_id"`                        // 关联的项目ID
	FileName      string         `gorm:"size:255;not null" json:"file_name"`          // 原始文件名
	FilePath      string         `gorm:"size:500;not null" json:"file_path"`         // 文件存储路径
	FileSize      int64          `gorm:"not null" json:"file_size"`                   // 文件大小(字节)
	Status        string         `gorm:"size:20;not null;index" json:"status"`        // pending/running/completed/failed/cancelled
	Progress      int           `gorm:"default:0" json:"progress"`                  // 进度百分比(0-100)
	ErrorMessage  string         `gorm:"type:text" json:"error_message,omitempty"`   // 错误信息
	TotalEpisodes int            `gorm:"default:0" json:"total_episodes"`            // 总集数
	CreatedEpisodes int          `gorm:"default:0" json:"created_episodes"`           // 已创建集数
	CreatedAt     time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// NovelParseTaskStatus 任务状态常量
const (
	NovelParseTaskStatusPending   = "pending"   // 等待中
	NovelParseTaskStatusRunning  = "running"   // 运行中
	NovelParseTaskStatusCompleted = "completed" // 已完成
	NovelParseTaskStatusFailed   = "failed"    // 失败
	NovelParseTaskStatusCancelled = "cancelled" // 已取消
)
