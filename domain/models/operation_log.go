package models

import (
	"time"

	"gorm.io/datatypes"
)

// OperationLog stores audit-style records for user/system actions.
type OperationLog struct {
	ID           uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID       *string        `gorm:"type:varchar(64);index" json:"user_id"`
	Module       string         `gorm:"type:varchar(100);index" json:"module"`
	Action       string         `gorm:"type:varchar(200)" json:"action"`
	API          string         `gorm:"type:varchar(255)" json:"api"`
	RequestData  datatypes.JSON `gorm:"type:json" json:"request_data"`
	Result       string         `gorm:"type:varchar(20);index" json:"result"`
	ErrorMessage *string        `gorm:"type:text" json:"error_message"`
	CreatedAt    time.Time      `gorm:"not null;autoCreateTime;index" json:"created_at"`
}

func (o *OperationLog) TableName() string {
	return "operation_logs"
}
