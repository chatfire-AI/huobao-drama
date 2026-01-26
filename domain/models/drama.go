package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Drama struct {
	ID            uint    `gorm:"primaryKey;autoIncrement" json:"id"`
	Title         string  `gorm:"type:varchar(200);not null" json:"title"`
	Description   *string `gorm:"type:text" json:"description"`
	Genre         *string `gorm:"type:varchar(50)" json:"genre"`
	Style         string  `gorm:"type:varchar(50);default:'realistic'" json:"style"`
	TotalEpisodes int     `gorm:"default:1" json:"total_episodes"`
	TotalDuration int     `gorm:"default:0" json:"total_duration"`
	Status        string  `gorm:"type:varchar(20);default:'draft';not null" json:"status"`
	// 新增项目属性：样式和比例覆盖配置
	DefaultStyle      *string        `gorm:"type:text" json:"default_style"`
	DefaultRoleStyle  *string        `gorm:"type:text" json:"default_role_style"`
	DefaultSceneStyle *string        `gorm:"type:text" json:"default_scene_style"`
	DefaultPropStyle  *string        `gorm:"type:text" json:"default_prop_style"`
	DefaultImageRatio *string        `gorm:"type:varchar(20)" json:"default_image_ratio"`
	DefaultVideoRatio *string        `gorm:"type:varchar(20)" json:"default_video_ratio"`
	DefaultPropRatio  *string        `gorm:"type:varchar(20)" json:"default_prop_ratio"`
	DefaultImageSize  *string        `gorm:"type:varchar(20)" json:"default_image_size"`
	DefaultRoleRatio  *string        `gorm:"type:varchar(20)" json:"default_role_ratio"`
	Thumbnail         *string        `gorm:"type:varchar(500)" json:"thumbnail"`
	Tags              datatypes.JSON `gorm:"type:json" json:"tags"`
	Metadata          datatypes.JSON `gorm:"type:json" json:"metadata"`
	CreatedAt         time.Time      `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time      `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`

	Episodes   []Episode   `gorm:"foreignKey:DramaID" json:"episodes,omitempty"`
	Characters []Character `gorm:"foreignKey:DramaID" json:"characters,omitempty"`
	Scenes     []Scene     `gorm:"foreignKey:DramaID" json:"scenes,omitempty"`
	Props      []Prop      `gorm:"foreignKey:DramaID" json:"props,omitempty"`
	Poses      []Pose      `gorm:"foreignKey:DramaID" json:"poses,omitempty"`
}

func (d *Drama) TableName() string {
	return "dramas"
}

type Character struct {
	ID              uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	DramaID         uint           `gorm:"not null;index" json:"drama_id"`
	Name            string         `gorm:"type:varchar(100);not null" json:"name"`
	Role            *string        `gorm:"type:varchar(50)" json:"role"`
	Description     *string        `gorm:"type:text" json:"description"`
	Appearance      *string        `gorm:"type:text" json:"appearance"`
	Personality     *string        `gorm:"type:text" json:"personality"`
	VoiceStyle      *string        `gorm:"type:varchar(200)" json:"voice_style"`
	ImageURL        *string        `gorm:"type:varchar(500)" json:"image_url"`
	LocalPath       *string        `gorm:"type:text" json:"local_path,omitempty"`
	ReferenceImages datatypes.JSON `gorm:"type:json" json:"reference_images"`
	SeedValue       *string        `gorm:"type:varchar(100)" json:"seed_value"`
	SortOrder       int            `gorm:"default:0" json:"sort_order"`
	CreatedAt       time.Time      `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time      `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// 多对多关系：角色可以属于多个章节
	Episodes []Episode `gorm:"many2many:episode_characters;" json:"episodes,omitempty"`

	// 运行时字段（不存储到数据库）
	ImageGenerationStatus *string `gorm:"-" json:"image_generation_status,omitempty"`
	ImageGenerationError  *string `gorm:"-" json:"image_generation_error,omitempty"`
}

func (c *Character) TableName() string {
	return "characters"
}

type Episode struct {
	ID            uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	DramaID       uint           `gorm:"not null;index" json:"drama_id"`
	EpisodeNum    int            `gorm:"column:episode_number;not null" json:"episode_number"`
	Title         string         `gorm:"type:varchar(200);not null" json:"title"`
	ScriptContent *string        `gorm:"type:longtext" json:"script_content"`
	Description   *string        `gorm:"type:text" json:"description"`
	Duration      int            `gorm:"default:0" json:"duration"` // 总时长（秒）
	Status        string         `gorm:"type:varchar(20);default:'draft'" json:"status"`
	VideoURL      *string        `gorm:"type:varchar(500)" json:"video_url"`
	Thumbnail     *string        `gorm:"type:varchar(500)" json:"thumbnail"`
	CreatedAt     time.Time      `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time      `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	// 关联
	Drama       Drama        `gorm:"foreignKey:DramaID" json:"drama,omitempty"`
	Storyboards []Storyboard `gorm:"foreignKey:EpisodeID" json:"storyboards,omitempty"`
	Characters  []Character  `gorm:"many2many:episode_characters;" json:"characters,omitempty"`
	Scenes      []Scene      `gorm:"foreignKey:EpisodeID" json:"scenes,omitempty"`
}

func (e *Episode) TableName() string {
	return "episodes"
}

type Storyboard struct {
	ID               uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	EpisodeID        uint           `gorm:"not null;index:idx_storyboards_episode_id" json:"episode_id"`
	SceneID          *uint          `gorm:"index:idx_storyboards_scene_id;column:scene_id" json:"scene_id"`
	StoryboardNumber int            `gorm:"not null;column:storyboard_number" json:"storyboard_number"`
	Title            *string        `gorm:"size:255" json:"title"`
	Location         *string        `gorm:"size:255" json:"location"`
	Time             *string        `gorm:"size:255" json:"time"`
	ShotType         *string        `gorm:"size:100" json:"shot_type"`
	Angle            *string        `gorm:"size:100" json:"angle"`
	Movement         *string        `gorm:"size:100" json:"movement"`
	Action           *string        `gorm:"type:text" json:"action"`
	Result           *string        `gorm:"type:text" json:"result"`
	Atmosphere       *string        `gorm:"type:text" json:"atmosphere"`
	ImagePrompt      *string        `gorm:"type:text" json:"image_prompt"`
	VideoPrompt      *string        `gorm:"type:text" json:"video_prompt"`
	BgmPrompt        *string        `gorm:"type:text" json:"bgm_prompt"`
	VisualEffect     *string        `gorm:"type:text" json:"visual_effect"` // 视觉特效
	SoundEffect      *string        `gorm:"size:255" json:"sound_effect"`
	Dialogue         *string        `gorm:"type:text" json:"dialogue"`
	Description      *string        `gorm:"type:text" json:"description"`
	Duration         int            `gorm:"default:5" json:"duration"`
	ComposedImage    *string        `gorm:"type:text" json:"composed_image"`
	VideoURL         *string        `gorm:"type:text" json:"video_url"`
	Status           string         `gorm:"type:varchar(20);default:'pending'" json:"status"`
	CreatedAt        time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	Episode    Episode     `gorm:"foreignKey:EpisodeID;constraint:OnDelete:CASCADE" json:"episode,omitempty"`
	Background *Scene      `gorm:"foreignKey:SceneID" json:"background,omitempty"`
	Characters []Character `gorm:"many2many:storyboard_characters;" json:"characters,omitempty"`
	Props      []Prop      `gorm:"many2many:storyboard_props;" json:"props,omitempty"`
	Poses      []Pose      `gorm:"many2many:storyboard_poses;" json:"poses,omitempty"`
}

func (s *Storyboard) TableName() string {
	return "storyboards"
}

type Scene struct {
	ID              uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	DramaID         uint           `gorm:"not null;index:idx_scenes_drama_id" json:"drama_id"`
	EpisodeID       *uint          `gorm:"index:idx_scenes_episode_id" json:"episode_id"` // 场景所属章节
	Location        string         `gorm:"type:varchar(200);not null" json:"location"`
	Time            string         `gorm:"type:varchar(100);not null" json:"time"`
	Description     *string        `gorm:"type:text" json:"description"`
	Prompt          string         `gorm:"type:text;not null" json:"prompt"`
	StoryboardCount int            `gorm:"default:1" json:"storyboard_count"`
	ImageURL        *string        `gorm:"type:varchar(500)" json:"image_url"`
	LocalPath       *string        `gorm:"type:text" json:"local_path,omitempty"`
	Status          string         `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending, generated, failed
	CreatedAt       time.Time      `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time      `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// 运行时字段（不存储到数据库）
	ImageGenerationStatus *string `gorm:"-" json:"image_generation_status,omitempty"`
	ImageGenerationError  *string `gorm:"-" json:"image_generation_error,omitempty"`
}

func (s *Scene) TableName() string {
	return "scenes"
}

type Prop struct {
	ID              uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	DramaID         uint           `gorm:"not null;index" json:"drama_id"`
	Name            string         `gorm:"type:varchar(100);not null" json:"name"`
	Type            *string        `gorm:"type:varchar(50)" json:"type"` // e.g., "weapon", "daily", "vehicle"
	Description     *string        `gorm:"type:text" json:"description"`
	Prompt          *string        `gorm:"type:text" json:"prompt"` // AI Image prompt
	ImageURL        *string        `gorm:"type:varchar(500)" json:"image_url"`
	LocalPath       *string        `gorm:"type:text" json:"local_path,omitempty"`
	ReferenceImages datatypes.JSON `gorm:"type:json" json:"reference_images"`
	CreatedAt       time.Time      `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time      `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Drama       Drama        `gorm:"foreignKey:DramaID" json:"drama,omitempty"`
	Storyboards []Storyboard `gorm:"many2many:storyboard_props;" json:"storyboards,omitempty"`
}

func (p *Prop) TableName() string {
	return "props"
}

type Pose struct {
	ID              uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	DramaID         uint           `gorm:"not null;index" json:"drama_id"`
	Name            string         `gorm:"type:varchar(100);not null" json:"name"`
	Type            *string        `gorm:"type:varchar(50)" json:"type"` // e.g., "action", "stand", "sit"
	Description     *string        `gorm:"type:text" json:"description"`
	ImageURL        *string        `gorm:"type:varchar(500)" json:"image_url"`
	ReferenceImages datatypes.JSON `gorm:"type:json" json:"reference_images"`
	CreatedAt       time.Time      `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time      `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Drama       Drama        `gorm:"foreignKey:DramaID" json:"drama,omitempty"`
	Storyboards []Storyboard `gorm:"many2many:storyboard_poses;" json:"storyboards,omitempty"`
}

func (p *Pose) TableName() string {
	return "poses"
}
