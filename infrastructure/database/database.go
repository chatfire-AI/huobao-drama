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
	return db.AutoMigrate(
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

		// 小说解析
		&models.NovelParseTask{},
	)
}
