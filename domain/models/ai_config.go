package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type AIServiceConfig struct {
	ID            uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	ServiceType   string     `gorm:"type:varchar(50);not null" json:"service_type"` // text, image, video, audio, lipsync
	Provider      string     `gorm:"type:varchar(50)" json:"provider"`              // openai, gemini, volcengine, etc.
	Name          string     `gorm:"type:varchar(100);not null" json:"name"`
	BaseURL       string     `gorm:"type:varchar(255);not null" json:"base_url"`
	APIKey        string     `gorm:"type:varchar(255);not null" json:"api_key"`
	Model         ModelField `gorm:"type:text" json:"model"`
	Endpoint      string     `gorm:"type:varchar(255)" json:"endpoint"`
	QueryEndpoint string     `gorm:"type:varchar(255)" json:"query_endpoint"`
	Priority      int        `gorm:"default:0" json:"priority"` // 优先级，数值越大优先级越高
	IsDefault     bool       `gorm:"default:false" json:"is_default"`
	IsActive      bool       `gorm:"default:true" json:"is_active"`
	Settings      string     `gorm:"type:text" json:"settings"`
	CreatedAt     time.Time  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time  `gorm:"not null;autoUpdateTime" json:"updated_at"`
}

func (c *AIServiceConfig) TableName() string {
	return "ai_service_configs"
}

type AIServiceProvider struct {
	ID           uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	Name         string     `gorm:"type:varchar(100);not null;uniqueIndex" json:"name"`
	DisplayName  string     `gorm:"type:varchar(100);not null" json:"display_name"`
	ServiceType  string     `gorm:"type:varchar(50);not null" json:"service_type"`
	Provider     string     `gorm:"type:varchar(50)" json:"provider"`    // 实际 provider id（如 chatfire, gemini, volces）
	DefaultURL   string     `gorm:"type:varchar(255)" json:"default_url"`
	PresetModels ModelField `gorm:"type:text" json:"preset_models"`      // 预设模型列表
	Description  string     `gorm:"type:text" json:"description"`
	IsActive     bool       `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"not null;autoUpdateTime" json:"updated_at"`
}

func (p *AIServiceProvider) TableName() string {
	return "ai_service_providers"
}

// ModelField 自定义类型，支持字符串或字符串数组
type ModelField []string

// Value 实现 driver.Valuer 接口，用于存储到数据库
func (m ModelField) Value() (driver.Value, error) {
	if len(m) == 0 {
		return nil, nil
	}
	data, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	return string(data), nil
}

// Scan 实现 sql.Scanner 接口，用于从数据库读取
func (m *ModelField) Scan(value interface{}) error {
	if value == nil {
		*m = []string{}
		return nil
	}

	var data []byte
	switch v := value.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.New("unsupported type for ModelField")
	}

	// 尝试解析为数组
	var arr []string
	if err := json.Unmarshal(data, &arr); err == nil {
		*m = arr
		return nil
	}

	// 如果解析失败，尝试作为单个字符串处理
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		*m = []string{str}
		return nil
	}

	// 兼容旧数据：直接作为字符串
	*m = []string{string(data)}
	return nil
}

// MarshalJSON 实现 json.Marshaler 接口
func (m ModelField) MarshalJSON() ([]byte, error) {
	if len(m) == 0 {
		return json.Marshal([]string{})
	}
	return json.Marshal([]string(m))
}

// UnmarshalJSON 实现 json.Unmarshaler 接口，支持字符串或数组
func (m *ModelField) UnmarshalJSON(data []byte) error {
	// 尝试解析为数组
	var arr []string
	if err := json.Unmarshal(data, &arr); err == nil {
		*m = arr
		return nil
	}

	// 尝试解析为单个字符串
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		*m = []string{str}
		return nil
	}

	return errors.New("model field must be string or array of strings")
}
