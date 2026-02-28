package database

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/pkg/config"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	_ "modernc.org/sqlite"
)

func NewDatabase(cfg config.DatabaseConfig) (*gorm.DB, error) {
	dsn := cfg.DSN()

	if cfg.Type == "sqlite" {
		dbDir := filepath.Dir(dsn)
		if err := os.MkdirAll(dbDir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create database directory: %w", err)
		}
	}

	gormConfig := &gorm.Config{
		Logger: NewCustomLogger(),
	}

	var db *gorm.DB
	var err error

	if cfg.Type == "sqlite" {
		// 使用 modernc.org/sqlite 纯 Go 驱动（无需 CGO）
		// 添加并发优化参数：WAL 模式、busy_timeout、cache
		dsnWithParams := dsn + "?_journal_mode=WAL&_busy_timeout=5000&_synchronous=NORMAL&cache=shared"
		db, err = gorm.Open(sqlite.Dialector{
			DriverName: "sqlite",
			DSN:        dsnWithParams,
		}, gormConfig)
	} else {
		db, err = gorm.Open(mysql.Open(dsn), gormConfig)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	// SQLite 连接池配置（限制并发连接数）
	if cfg.Type == "sqlite" {
		sqlDB.SetMaxIdleConns(1)
		sqlDB.SetMaxOpenConns(1) // SQLite 单写入，限制为 1
	} else {
		sqlDB.SetMaxIdleConns(cfg.MaxIdle)
		sqlDB.SetMaxOpenConns(cfg.MaxOpen)
	}
	sqlDB.SetConnMaxLifetime(time.Hour)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	err := db.AutoMigrate(
		// 核心模型
		&models.Drama{},
		&models.Episode{},
		&models.Character{},
		&models.Scene{},
		&models.Storyboard{},
		&models.FramePrompt{},
		&models.Prop{},

		// 生成相关
		&models.ImageGeneration{},
		&models.VideoGeneration{},
		&models.VideoMerge{},

		// AI配置
		&models.AIServiceConfig{},
		&models.AIServiceProvider{},

		// 资源管理
		&models.Asset{},
		&models.CharacterLibrary{},

		// 任务管理
		&models.AsyncTask{},
	)
	if err != nil {
		return err
	}

	// 初始化 AI 厂商种子数据
	return SeedProviders(db)
}

// SeedProviders 初始化 AI 厂商种子数据（幂等，按 name 匹配，存在则更新预设模型）
func SeedProviders(db *gorm.DB) error {
	providers := []models.AIServiceProvider{
		// --- 文本 ---
		{Name: "chatfire-text", DisplayName: "Chatfire", ServiceType: "text", Provider: "chatfire", DefaultURL: "https://api.chatfire.site/v1", Description: "Chatfire 聚合服务 - 文本生成", IsActive: true,
			PresetModels: models.ModelField{"gemini-3-flash-preview", "gemini-3-pro-preview", "gemini-3.1-pro-preview", "claude-sonnet-4-5-20250929", "claude-sonnet-4", "doubao-seed-1-8-251228", "doubao-seed-2-0-pro-260215"}},
		{Name: "openai-text", DisplayName: "OpenAI", ServiceType: "text", Provider: "openai", DefaultURL: "https://api.openai.com/v1", Description: "OpenAI GPT 系列", IsActive: true,
			PresetModels: models.ModelField{"gpt-5.2", "gpt-4.1", "gpt-4.1-mini"}},
		{Name: "gemini-text", DisplayName: "Google Gemini", ServiceType: "text", Provider: "gemini", DefaultURL: "https://generativelanguage.googleapis.com", Description: "Google Gemini 系列", IsActive: true,
			PresetModels: models.ModelField{"gemini-3.1-pro-preview", "gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash"}},
		{Name: "volcengine-text", DisplayName: "火山引擎", ServiceType: "text", Provider: "volcengine", DefaultURL: "https://ark.cn-beijing.volces.com/api/v3", Description: "火山引擎豆包系列", IsActive: true,
			PresetModels: models.ModelField{"doubao-seed-2-0-pro-260215", "doubao-seed-2-0-lite-260215", "doubao-seed-2-0-mini-260215", "doubao-seed-1-8-251228", "doubao-seed-1-6-251015", "doubao-seed-1-6-lite-251015"}},
		{Name: "openrouter-text", DisplayName: "OpenRouter", ServiceType: "text", Provider: "openrouter", DefaultURL: "https://openrouter.ai/api/v1", Description: "OpenRouter 聚合服务", IsActive: true,
			PresetModels: models.ModelField{"google/gemini-3.1-pro-preview", "google/gemini-3-pro-preview", "google/gemini-3-flash-preview", "anthropic/claude-sonnet-4.5", "anthropic/claude-sonnet-4"}},
		{Name: "minimax-text", DisplayName: "MiniMax 海螺", ServiceType: "text", Provider: "minimax", DefaultURL: "https://api.minimaxi.com/v1", Description: "MiniMax 大语言模型", IsActive: true,
			PresetModels: models.ModelField{"MiniMax-M2.5", "MiniMax-M2.5-highspeed", "MiniMax-M2.1", "MiniMax-M2.1-highspeed", "MiniMax-M2", "MiniMax-M1", "MiniMax-MCP"}},

		// --- 图片 ---
		{Name: "chatfire-image", DisplayName: "Chatfire", ServiceType: "image", Provider: "chatfire", DefaultURL: "https://api.chatfire.site/v1", Description: "Chatfire 聚合服务 - 图片生成", IsActive: true,
			PresetModels: models.ModelField{"nano-banana-pro", "banana-2", "doubao-seedream-4-5-251128"}},
		{Name: "volcengine-image", DisplayName: "火山引擎", ServiceType: "image", Provider: "volcengine", DefaultURL: "https://ark.cn-beijing.volces.com/api/v3", Description: "火山引擎 Seedream 系列", IsActive: true,
			PresetModels: models.ModelField{"doubao-seedream-4-5-251128", "doubao-seedream-4-0-250828"}},
		{Name: "gemini-image", DisplayName: "Google Gemini", ServiceType: "image", Provider: "gemini", DefaultURL: "https://generativelanguage.googleapis.com", Description: "Google Gemini / Imagen 图片生成", IsActive: true,
			PresetModels: models.ModelField{"gemini-3-pro-image-preview", "gemini-3.1-flash-image-preview", "gemini-2.5-flash-image", "imagen-4.0-generate-001", "imagen-4.0-ultra-generate-001", "imagen-4.0-fast-generate-001", "gemini-3-pro-image-preview-batch"}},
		{Name: "openai-image", DisplayName: "OpenAI", ServiceType: "image", Provider: "openai", DefaultURL: "https://api.openai.com/v1", Description: "OpenAI DALL-E 系列", IsActive: true,
			PresetModels: models.ModelField{"dall-e-3", "dall-e-2"}},
		{Name: "fal-image", DisplayName: "FAL", ServiceType: "image", Provider: "fal", DefaultURL: "https://queue.fal.run", Description: "FAL 图片生成", IsActive: true,
			PresetModels: models.ModelField{"banana", "banana-2"}},

		// --- 视频 ---
		{Name: "chatfire-video", DisplayName: "Chatfire", ServiceType: "video", Provider: "chatfire", DefaultURL: "https://api.chatfire.site/v1", Description: "Chatfire 聚合服务 - 视频生成", IsActive: true,
			PresetModels: models.ModelField{"doubao-seedance-1-5-pro-251215", "doubao-seedance-2-0-260128", "doubao-seedance-1-0-pro-fast-251015", "doubao-seedance-1-0-pro-250528", "doubao-seedance-1-0-lite-i2v-250428", "doubao-seedance-1-0-lite-t2v-250428", "sora-2", "sora-2-pro", "veo-3.0-generate-001", "veo-3.0-fast-generate-001"}},
		{Name: "volces-video", DisplayName: "火山引擎", ServiceType: "video", Provider: "volces", DefaultURL: "https://ark.cn-beijing.volces.com/api/v3", Description: "火山引擎 Seedance 系列", IsActive: true,
			PresetModels: models.ModelField{"doubao-seedance-1-5-pro-251215", "doubao-seedance-2-0-260128", "doubao-seedance-1-0-pro-fast-251015", "doubao-seedance-1-0-pro-250528", "doubao-seedance-1-0-lite-i2v-250428", "doubao-seedance-1-0-lite-t2v-250428"}},
		{Name: "gemini-video", DisplayName: "Google Gemini", ServiceType: "video", Provider: "gemini", DefaultURL: "https://generativelanguage.googleapis.com", Description: "Google Veo 视频生成", IsActive: true,
			PresetModels: models.ModelField{"veo-3.1-generate-preview", "veo-3.1-fast-generate-preview", "veo-3.0-generate-001", "veo-3.0-fast-generate-001", "veo-2.0-generate-001"}},
		{Name: "minimax-video", DisplayName: "MiniMax 海螺", ServiceType: "video", Provider: "minimax", DefaultURL: "https://api.minimaxi.com/v1", Description: "MiniMax Hailuo 视频生成", IsActive: true,
			PresetModels: models.ModelField{"MiniMax-Hailuo-2.3", "MiniMax-Hailuo-2.3-Fast", "MiniMax-Hailuo-02", "t2v-01", "t2v-01-director"}},
		{Name: "openai-video", DisplayName: "OpenAI", ServiceType: "video", Provider: "openai", DefaultURL: "https://api.openai.com/v1", Description: "OpenAI Sora 视频生成", IsActive: true,
			PresetModels: models.ModelField{"sora-2", "sora-2-pro"}},
		{Name: "vidu-video", DisplayName: "生数科技 Vidu", ServiceType: "video", Provider: "vidu", DefaultURL: "https://api.vidu.com/v1", Description: "Vidu 视频生成", IsActive: true,
			PresetModels: models.ModelField{"viduq3-pro", "viduq2-pro-fast", "viduq2-pro", "viduq2-turbo", "viduq1", "viduq1-classic", "vidu2.0"}},
		{Name: "fal-video", DisplayName: "FAL", ServiceType: "video", Provider: "fal", DefaultURL: "https://queue.fal.run", Description: "FAL 视频生成 (Kling/Wan/Veo/Sora)", IsActive: true,
			PresetModels: models.ModelField{"fal-wan25", "fal-veo31", "fal-sora2", "fal-ai/kling-video/v2.5-turbo/pro/image-to-video", "fal-ai/kling-video/v3/standard/image-to-video", "fal-ai/kling-video/v3/pro/image-to-video"}},

		// --- 音频 ---
		{Name: "minimax-audio", DisplayName: "MiniMax 海螺", ServiceType: "audio", Provider: "minimax", DefaultURL: "https://api.minimaxi.com/v1", Description: "MiniMax 海螺语音合成", IsActive: true,
			PresetModels: models.ModelField{"speech-03-hd", "speech-02-hd", "speech-02-turbo"}},
		{Name: "fal-audio", DisplayName: "FAL", ServiceType: "audio", Provider: "fal", DefaultURL: "https://queue.fal.run", Description: "FAL TTS 语音合成", IsActive: true,
			PresetModels: models.ModelField{"fal-ai/index-tts-2/text-to-speech"}},
		{Name: "qwen-audio", DisplayName: "阿里百炼", ServiceType: "audio", Provider: "qwen", DefaultURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", Description: "阿里百炼 TTS", IsActive: true,
			PresetModels: models.ModelField{"cosyvoice-v2"}},

		// --- 口型同步 ---
		{Name: "fal-lipsync", DisplayName: "FAL", ServiceType: "lipsync", Provider: "fal", DefaultURL: "https://queue.fal.run", Description: "FAL Kling 口型同步", IsActive: true,
			PresetModels: models.ModelField{"fal-ai/kling-video/lipsync/audio-to-video"}},
		{Name: "vidu-lipsync", DisplayName: "生数科技 Vidu", ServiceType: "lipsync", Provider: "vidu", DefaultURL: "https://api.vidu.com/v1", Description: "Vidu 口型同步", IsActive: true,
			PresetModels: models.ModelField{"vidu-lipsync"}},
	}

	for _, p := range providers {
		var existing models.AIServiceProvider
		result := db.Where("name = ?", p.Name).First(&existing)
		if result.Error != nil {
			// 不存在，创建
			if err := db.Create(&p).Error; err != nil {
				return fmt.Errorf("failed to seed provider %s: %w", p.Name, err)
			}
		} else {
			// 已存在，更新预设模型和 provider 字段
			if err := db.Model(&existing).Updates(map[string]interface{}{
				"preset_models": p.PresetModels,
				"provider":      p.Provider,
				"display_name":  p.DisplayName,
				"default_url":   p.DefaultURL,
				"description":   p.Description,
				"is_active":     true,
			}).Error; err != nil {
				return fmt.Errorf("failed to update provider %s: %w", p.Name, err)
			}
		}
	}

	return nil
}
