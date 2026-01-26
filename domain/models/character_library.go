package models

import (
	"time"

	"gorm.io/gorm"
)

// CharacterLibrary 角色库模型
type CharacterLibrary struct {
	ID          uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string         `gorm:"type:varchar(100);not null" json:"name"`
	Category    *string        `gorm:"type:varchar(50)" json:"category"`
	ImageURL    string         `gorm:"type:varchar(500);not null" json:"image_url"`
	LocalPath   *string        `gorm:"type:varchar(500)" json:"local_path,omitempty"`
	Description *string        `gorm:"type:text" json:"description"`
	Tags        *string        `gorm:"type:varchar(500)" json:"tags"`
	SourceType  string         `gorm:"type:varchar(20);default:'generated'" json:"source_type"` // generated, uploaded
	CreatedAt   time.Time      `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (c *CharacterLibrary) TableName() string {
	return "character_libraries"
}
