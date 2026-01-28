package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	App      AppConfig      `mapstructure:"app"`
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Storage  StorageConfig  `mapstructure:"storage"`
	AI       AIConfig       `mapstructure:"ai"`
	Style    StyleConfig    `mapstructure:"style"`
	Visual   VisualConfig   `mapstructure:"visual_references"`
}

type VisualConfig struct {
	Zh VisualDetail `mapstructure:"zh"`
	En VisualDetail `mapstructure:"en"`
}

type VisualDetail struct {
	ShotTypes           []string            `mapstructure:"shot_types"`
	Angles              []string            `mapstructure:"angles"`
	Movements           []string            `mapstructure:"movements"`
	VisualEffects       []string            `mapstructure:"visual_effects"`
	Ratios              RatioConfig         `mapstructure:"ratios"`
	ImageSizes          []Option            `mapstructure:"image_sizes"`
	CharacterAttributes CharacterAttributes `mapstructure:"character_attributes"`
}

type CharacterAttributes struct {
	Genders        []string `mapstructure:"genders"`
	Ages           []string `mapstructure:"ages"`
	BodyTypes      []string `mapstructure:"body_types"`
	Hairstyles     []string `mapstructure:"hairstyles"`
	FacialFeatures []string `mapstructure:"facial_features"`
	ClothingStyles []string `mapstructure:"clothing_styles"`
	Accessories    []string `mapstructure:"accessories"`
}

type RatioConfig struct {
	Image []Option `mapstructure:"image"`
	Video []Option `mapstructure:"video"`
	Role  []Option `mapstructure:"role"`
	Prop  []Option `mapstructure:"prop"`
}

type Option struct {
	Label string `mapstructure:"label"`
	Value string `mapstructure:"value"`
}

type AppConfig struct {
	Name     string `mapstructure:"name"`
	Version  string `mapstructure:"version"`
	Debug    bool   `mapstructure:"debug"`
	Language string `mapstructure:"language"` // zh 或 en
}

type ServerConfig struct {
	Port         int      `mapstructure:"port"`
	Host         string   `mapstructure:"host"`
	CORSOrigins  []string `mapstructure:"cors_origins"`
	ReadTimeout  int      `mapstructure:"read_timeout"`
	WriteTimeout int      `mapstructure:"write_timeout"`
}

type DatabaseConfig struct {
	Type     string `mapstructure:"type"` // sqlite, mysql
	Path     string `mapstructure:"path"` // SQLite数据库文件路径
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	Database string `mapstructure:"database"`
	Charset  string `mapstructure:"charset"`
	MaxIdle  int    `mapstructure:"max_idle"`
	MaxOpen  int    `mapstructure:"max_open"`
}

type StorageConfig struct {
	Type      string `mapstructure:"type"`       // local, minio
	LocalPath string `mapstructure:"local_path"` // 本地存储路径
	BaseURL   string `mapstructure:"base_url"`   // 访问URL前缀
}

type AIConfig struct {
	DefaultTextProvider  string `mapstructure:"default_text_provider"`
	DefaultImageProvider string `mapstructure:"default_image_provider"`
	DefaultVideoProvider string `mapstructure:"default_video_provider"`
}

type StyleConfig struct {
	// 默认主风格
	DefaultStyle string `mapstructure:"default_style"`
	// 默认角色风格
	DefaultRoleStyle string `mapstructure:"default_role_style"`
	// 默认场景风格
	DefaultSceneStyle string `mapstructure:"default_scene_style"`
	// 默认视频比例
	DefaultVideoRatio string `mapstructure:"default_video_ratio"`
	// 默认图片比例
	DefaultImageRatio string `mapstructure:"default_image_ratio"`
	// 默认图片尺寸
	DefaultImageSize string `mapstructure:"default_image_size"`
	// 默认道具比例
	DefaultPropRatio string `mapstructure:"default_prop_ratio"`
	// 默认道具风格
	DefaultPropStyle string `mapstructure:"default_prop_style"`
	// 默认场景比例
	DefaultSceneRatio string `mapstructure:"default_scene_ratio"`
	// 默认角色比例
	DefaultRoleRatio string `mapstructure:"default_role_ratio"`
}

func LoadConfig() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./configs")
	viper.AddConfigPath(".")

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	// Load visual config
	viper.SetConfigName("visual_config")
	if err := viper.MergeInConfig(); err != nil {
		fmt.Printf("Warning: failed to read visual config: %v\n", err)
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &config, nil
}

func (c *DatabaseConfig) DSN() string {
	if c.Type == "sqlite" {
		return c.Path
	}
	// MySQL DSN
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local",
		c.User,
		c.Password,
		c.Host,
		c.Port,
		c.Database,
		c.Charset,
	)
}
