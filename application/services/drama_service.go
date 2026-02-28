package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"gorm.io/gorm"
)

type DramaService struct {
	db      *gorm.DB
	log     *logger.Logger
	baseURL string
}

func NewDramaService(db *gorm.DB, cfg *config.Config, log *logger.Logger) *DramaService {
	return &DramaService{
		db:      db,
		log:     log,
		baseURL: cfg.Storage.BaseURL,
	}
}

type CreateDramaRequest struct {
	Title       string `json:"title" binding:"required,min=1,max=100"`
	Description string `json:"description"`
	Genre       string `json:"genre"`
	Style       string `json:"style"`
	Tags        string `json:"tags"`
}

type UpdateDramaRequest struct {
	Title       string `json:"title" binding:"omitempty,min=1,max=100"`
	Description string `json:"description"`
	Genre       string `json:"genre"`
	Style       string `json:"style"`
	Tags        string `json:"tags"`
	Status      string `json:"status" binding:"omitempty,oneof=draft planning production completed archived"`
}

type DramaListQuery struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"page_size,default=20"`
	Status   string `form:"status"`
	Genre    string `form:"genre"`
	Keyword  string `form:"keyword"`
}

func (s *DramaService) CreateDrama(req *CreateDramaRequest) (*models.Drama, error) {
	drama := &models.Drama{
		Title:  req.Title,
		Status: "draft",
		Style:  "ghibli", // 默认风格
	}

	if req.Description != "" {
		drama.Description = &req.Description
	}
	if req.Genre != "" {
		drama.Genre = &req.Genre
	}
	if req.Style != "" {
		drama.Style = req.Style
	}

	if err := s.db.Create(drama).Error; err != nil {
		s.log.Errorw("Failed to create drama", "error", err)
		return nil, err
	}

	s.log.Infow("Drama created", "drama_id", drama.ID)
	return drama, nil
}

func (s *DramaService) GetDrama(dramaID string) (*models.Drama, error) {
	var drama models.Drama
	err := s.db.Where("id = ? ", dramaID).
		Preload("Characters").          // 加载Drama级别的角色
		Preload("Scenes").              // 加载Drama级别的场景
		Preload("Props").               // 加载Drama级别的道具
		Preload("Episodes.Characters"). // 加载每个章节关联的角色
		Preload("Episodes.Scenes").     // 加载每个章节关联的场景
		Preload("Episodes.Storyboards", func(db *gorm.DB) *gorm.DB {
			return db.Order("storyboards.storyboard_number ASC")
		}).
		Preload("Episodes.Storyboards.Props"). // 加载分镜关联的道具
		Preload("Episodes.Storyboards.Characters"). // 加载分镜关联的角色
		Preload("Episodes.Storyboards.Background"). // 加载分镜关联的场景
		First(&drama).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("drama not found")
		}
		s.log.Errorw("Failed to get drama", "error", err)
		return nil, err
	}

	// 统计每个剧集的时长（基于场景时长之和）
	for i := range drama.Episodes {
		totalDuration := 0
		for _, scene := range drama.Episodes[i].Storyboards {
			totalDuration += scene.Duration
		}
		// 更新剧集时长（秒转分钟，向上取整）
		durationMinutes := (totalDuration + 59) / 60
		drama.Episodes[i].Duration = durationMinutes

		// 如果数据库中的时长与计算的不一致，更新数据库
		if drama.Episodes[i].Duration != durationMinutes {
			s.db.Model(&models.Episode{}).Where("id = ?", drama.Episodes[i].ID).Update("duration", durationMinutes)
		}

		// 查询角色的图片生成状态
		for j := range drama.Episodes[i].Characters {
			var imageGen models.ImageGeneration
			// 查询进行中或失败的任务状态
			err := s.db.Where("character_id = ? AND (status = ? OR status = ?)",
				drama.Episodes[i].Characters[j].ID, "pending", "processing").
				Order("created_at DESC").
				First(&imageGen).Error

			if err == nil {
				// 找到生成中的记录，设置状态
				statusStr := string(imageGen.Status)
				drama.Episodes[i].Characters[j].ImageGenerationStatus = &statusStr
				if imageGen.ErrorMsg != nil {
					drama.Episodes[i].Characters[j].ImageGenerationError = imageGen.ErrorMsg
				}
			} else if errors.Is(err, gorm.ErrRecordNotFound) {
				// 检查是否有失败的记录
				err := s.db.Where("character_id = ? AND status = ?",
					drama.Episodes[i].Characters[j].ID, "failed").
					Order("created_at DESC").
					First(&imageGen).Error

				if err == nil {
					statusStr := string(imageGen.Status)
					drama.Episodes[i].Characters[j].ImageGenerationStatus = &statusStr
					if imageGen.ErrorMsg != nil {
						drama.Episodes[i].Characters[j].ImageGenerationError = imageGen.ErrorMsg
					}
				}
			}
		}

		// 查询场景的图片生成状态
		for j := range drama.Episodes[i].Scenes {
			var imageGen models.ImageGeneration
			// 查询进行中或失败的任务状态
			err := s.db.Where("scene_id = ? AND (status = ? OR status = ?)",
				drama.Episodes[i].Scenes[j].ID, "pending", "processing").
				Order("created_at DESC").
				First(&imageGen).Error

			if err == nil {
				// 找到生成中的记录，设置状态
				statusStr := string(imageGen.Status)
				drama.Episodes[i].Scenes[j].ImageGenerationStatus = &statusStr
				if imageGen.ErrorMsg != nil {
					drama.Episodes[i].Scenes[j].ImageGenerationError = imageGen.ErrorMsg
				}
			} else if errors.Is(err, gorm.ErrRecordNotFound) {
				// 检查是否有失败的记录
				err := s.db.Where("scene_id = ? AND status = ?",
					drama.Episodes[i].Scenes[j].ID, "failed").
					Order("created_at DESC").
					First(&imageGen).Error

				if err == nil {
					statusStr := string(imageGen.Status)
					drama.Episodes[i].Scenes[j].ImageGenerationStatus = &statusStr
					if imageGen.ErrorMsg != nil {
						drama.Episodes[i].Scenes[j].ImageGenerationError = imageGen.ErrorMsg
					}
				}
			}
		}
	}

	// 整合所有剧集的场景到Drama级别的Scenes字段
	sceneMap := make(map[uint]*models.Scene) // 用于去重
	for i := range drama.Episodes {
		for j := range drama.Episodes[i].Scenes {
			scene := &drama.Episodes[i].Scenes[j]
			sceneMap[scene.ID] = scene
		}
	}

	// 将整合的场景添加到drama.Scenes
	drama.Scenes = make([]models.Scene, 0, len(sceneMap))
	for _, scene := range sceneMap {
		drama.Scenes = append(drama.Scenes, *scene)
	}

	// 为所有场景的 local_path 添加 base_url 前缀
	// s.addBaseURLToScenes(&drama)

	return &drama, nil
}

func (s *DramaService) ListDramas(query *DramaListQuery) ([]models.Drama, int64, error) {
	var dramas []models.Drama
	var total int64

	db := s.db.Model(&models.Drama{})

	if query.Status != "" {
		db = db.Where("status = ?", query.Status)
	}

	if query.Genre != "" {
		db = db.Where("genre = ?", query.Genre)
	}

	if query.Keyword != "" {
		db = db.Where("title LIKE ? OR description LIKE ?", "%"+query.Keyword+"%", "%"+query.Keyword+"%")
	}

	if err := db.Count(&total).Error; err != nil {
		s.log.Errorw("Failed to count dramas", "error", err)
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PageSize
	err := db.Order("updated_at DESC").
		Offset(offset).
		Limit(query.PageSize).
		Preload("Episodes.Storyboards", func(db *gorm.DB) *gorm.DB {
			return db.Order("storyboards.storyboard_number ASC")
		}).
		Find(&dramas).Error

	if err != nil {
		s.log.Errorw("Failed to list dramas", "error", err)
		return nil, 0, err
	}

	// 统计每个剧本的每个剧集的时长（基于场景时长之和）
	for i := range dramas {
		for j := range dramas[i].Episodes {
			totalDuration := 0
			for _, scene := range dramas[i].Episodes[j].Storyboards {
				totalDuration += scene.Duration
			}
			// 更新剧集时长（秒转分钟，向上取整）
			durationMinutes := (totalDuration + 59) / 60
			dramas[i].Episodes[j].Duration = durationMinutes
		}
	}

	return dramas, total, nil
}

func (s *DramaService) UpdateDrama(dramaID string, req *UpdateDramaRequest) (*models.Drama, error) {
	var drama models.Drama
	if err := s.db.Where("id = ? ", dramaID).First(&drama).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("drama not found")
		}
		return nil, err
	}

	updates := make(map[string]interface{})

	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Genre != "" {
		updates["genre"] = req.Genre
	}
	if req.Style != "" {
		updates["style"] = req.Style
	}
	if req.Tags != "" {
		updates["tags"] = req.Tags
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}

	updates["updated_at"] = time.Now()

	if err := s.db.Model(&drama).Updates(updates).Error; err != nil {
		s.log.Errorw("Failed to update drama", "error", err)
		return nil, err
	}

	s.log.Infow("Drama updated", "drama_id", dramaID)
	return &drama, nil
}

func (s *DramaService) DeleteDrama(dramaID string) error {
	result := s.db.Where("id = ? ", dramaID).Delete(&models.Drama{})

	if result.Error != nil {
		s.log.Errorw("Failed to delete drama", "error", result.Error)
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("drama not found")
	}

	s.log.Infow("Drama deleted", "drama_id", dramaID)
	return nil
}

func (s *DramaService) GetDramaStats() (map[string]interface{}, error) {
	var total int64
	var byStatus []struct {
		Status string
		Count  int64
	}

	if err := s.db.Model(&models.Drama{}).Count(&total).Error; err != nil {
		return nil, err
	}

	if err := s.db.Model(&models.Drama{}).
		Select("status, count(*) as count").
		Group("status").
		Scan(&byStatus).Error; err != nil {
		return nil, err
	}

	stats := map[string]interface{}{
		"total":     total,
		"by_status": byStatus,
	}

	return stats, nil
}

type SaveOutlineRequest struct {
	Title   string   `json:"title" binding:"required"`
	Summary string   `json:"summary" binding:"required"`
	Genre   string   `json:"genre"`
	Tags    []string `json:"tags"`
}

type SaveCharactersRequest struct {
	Characters []models.Character `json:"characters" binding:"required"`
	EpisodeID  *uint              `json:"episode_id"` // 可选：如果提供则关联到指定章节
}

type SaveProgressRequest struct {
	CurrentStep string                 `json:"current_step" binding:"required"`
	StepData    map[string]interface{} `json:"step_data"`
}

type SaveEpisodesRequest struct {
	Episodes []models.Episode `json:"episodes" binding:"required"`
}

func (s *DramaService) SaveOutline(dramaID string, req *SaveOutlineRequest) error {
	var drama models.Drama
	if err := s.db.Where("id = ? ", dramaID).First(&drama).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("drama not found")
		}
		return err
	}

	updates := map[string]interface{}{
		"title":       req.Title,
		"description": req.Summary,
		"updated_at":  time.Now(),
	}

	if req.Genre != "" {
		updates["genre"] = req.Genre
	}

	if len(req.Tags) > 0 {
		tagsJSON, err := json.Marshal(req.Tags)
		if err != nil {
			s.log.Errorw("Failed to marshal tags", "error", err)
			return err
		}
		updates["tags"] = tagsJSON
	}

	if err := s.db.Model(&drama).Updates(updates).Error; err != nil {
		s.log.Errorw("Failed to save outline", "error", err)
		return err
	}

	s.log.Infow("Outline saved", "drama_id", dramaID)
	return nil
}

func (s *DramaService) GetCharacters(dramaID string, episodeID *string) ([]models.Character, error) {
	var drama models.Drama
	if err := s.db.Where("id = ? ", dramaID).First(&drama).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("drama not found")
		}
		return nil, err
	}

	var characters []models.Character

	// 如果指定了episodeID，只获取该章节关联的角色
	if episodeID != nil {
		var episode models.Episode
		if err := s.db.Preload("Characters").Where("id = ? AND drama_id = ?", *episodeID, dramaID).First(&episode).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("episode not found")
			}
			return nil, err
		}
		characters = episode.Characters
	} else {
		// 如果没有指定episodeID，获取项目的所有角色
		if err := s.db.Where("drama_id = ?", dramaID).Find(&characters).Error; err != nil {
			s.log.Errorw("Failed to get characters", "error", err)
			return nil, err
		}
	}

	// 查询每个角色的图片生成任务状态
	for i := range characters {
		// 查询该角色最新的图片生成任务
		var imageGen models.ImageGeneration
		err := s.db.Where("character_id = ?", characters[i].ID).
			Order("created_at DESC").
			First(&imageGen).Error

		if err == nil {
			// 如果有进行中的任务，填充状态信息
			if imageGen.Status == models.ImageStatusPending || imageGen.Status == models.ImageStatusProcessing {
				statusStr := string(imageGen.Status)
				characters[i].ImageGenerationStatus = &statusStr
			} else if imageGen.Status == models.ImageStatusFailed {
				statusStr := "failed"
				characters[i].ImageGenerationStatus = &statusStr
				if imageGen.ErrorMsg != nil {
					characters[i].ImageGenerationError = imageGen.ErrorMsg
				}
			}
		}
	}

	return characters, nil
}

func (s *DramaService) SaveCharacters(dramaID string, req *SaveCharactersRequest) error {
	// 转换dramaID
	id, err := strconv.ParseUint(dramaID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid drama ID")
	}
	dramaIDUint := uint(id)

	var drama models.Drama
	if err := s.db.Where("id = ? ", dramaIDUint).First(&drama).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("drama not found")
		}
		return err
	}

	// 如果指定了EpisodeID，验证章节存在性
	if req.EpisodeID != nil {
		var episode models.Episode
		if err := s.db.Where("id = ? AND drama_id = ?", *req.EpisodeID, dramaIDUint).First(&episode).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("episode not found")
			}
			return err
		}
	}

	// 获取该项目已存在的所有角色
	var existingCharacters []models.Character
	if err := s.db.Where("drama_id = ?", dramaIDUint).Find(&existingCharacters).Error; err != nil {
		s.log.Errorw("Failed to get existing characters", "error", err)
		return err
	}

	// 创建角色名称到角色的映射
	existingCharMap := make(map[string]*models.Character)
	for i := range existingCharacters {
		existingCharMap[existingCharacters[i].Name] = &existingCharacters[i]
	}

	// 收集需要关联到章节的角色ID
	var characterIDs []uint

	// 创建新角色或复用/更新已有角色
	for _, char := range req.Characters {
		// 1. 如果提供了ID，尝试更新已有角色
		if char.ID > 0 {
			var existing models.Character
			if err := s.db.Where("id = ? AND drama_id = ?", char.ID, dramaIDUint).First(&existing).Error; err == nil {
				// 更新角色信息
				updates := map[string]interface{}{
					"name":        char.Name,
					"role":        char.Role,
					"description": char.Description,
					"personality": char.Personality,
					"appearance":  char.Appearance,
					"image_url":   char.ImageURL,
				}
				if err := s.db.Model(&existing).Updates(updates).Error; err != nil {
					s.log.Errorw("Failed to update character", "error", err, "id", char.ID)
				}
				characterIDs = append(characterIDs, existing.ID)
				continue
			}
		}

		// 2. 如果没有ID但名字已存在，直接复用（可选：也可以选择更新）
		if existingChar, exists := existingCharMap[char.Name]; exists {
			s.log.Infow("Character already exists, reusing", "name", char.Name, "character_id", existingChar.ID)
			characterIDs = append(characterIDs, existingChar.ID)
			continue
		}

		// 3. 角色不存在，创建新角色
		character := models.Character{
			DramaID:     dramaIDUint,
			Name:        char.Name,
			Role:        char.Role,
			Description: char.Description,
			Personality: char.Personality,
			Appearance:  char.Appearance,
			ImageURL:    char.ImageURL,
		}

		if err := s.db.Create(&character).Error; err != nil {
			s.log.Errorw("Failed to create character", "error", err, "name", char.Name)
			continue
		}

		s.log.Infow("New character created", "character_id", character.ID, "name", char.Name)
		characterIDs = append(characterIDs, character.ID)
	}

	// 如果指定了EpisodeID，建立角色与章节的关联
	if req.EpisodeID != nil && len(characterIDs) > 0 {
		var episode models.Episode
		if err := s.db.First(&episode, *req.EpisodeID).Error; err != nil {
			return err
		}

		// 获取角色对象
		var characters []models.Character
		if err := s.db.Where("id IN ?", characterIDs).Find(&characters).Error; err != nil {
			s.log.Errorw("Failed to get characters", "error", err)
			return err
		}

		// 使用GORM的Association API建立多对多关系（会自动去重）
		if err := s.db.Model(&episode).Association("Characters").Append(&characters); err != nil {
			s.log.Errorw("Failed to associate characters with episode", "error", err)
			return err
		}

		s.log.Infow("Characters associated with episode", "episode_id", *req.EpisodeID, "character_count", len(characterIDs))
	}

	if err := s.db.Model(&drama).Update("updated_at", time.Now()).Error; err != nil {
		s.log.Errorw("Failed to update drama timestamp", "error", err)
	}

	s.log.Infow("Characters saved", "drama_id", dramaID, "count", len(req.Characters))
	return nil
}

func (s *DramaService) SaveEpisodes(dramaID string, req *SaveEpisodesRequest) error {
	// 转换dramaID
	id, err := strconv.ParseUint(dramaID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid drama ID")
	}
	dramaIDUint := uint(id)

	var drama models.Drama
	if err := s.db.Where("id = ? ", dramaIDUint).First(&drama).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("drama not found")
		}
		return err
	}

	// 删除旧剧集
	if err := s.db.Where("drama_id = ?", dramaIDUint).Delete(&models.Episode{}).Error; err != nil {
		s.log.Errorw("Failed to delete old episodes", "error", err)
		return err
	}

	// 创建新剧集（不包含场景，场景由后续步骤生成）
	for _, ep := range req.Episodes {
		episode := models.Episode{
			DramaID:       dramaIDUint,
			EpisodeNum:    ep.EpisodeNum,
			Title:         ep.Title,
			Description:   ep.Description,
			ScriptContent: ep.ScriptContent,
			Duration:      ep.Duration,
			Status:        "draft",
		}

		if err := s.db.Create(&episode).Error; err != nil {
			s.log.Errorw("Failed to create episode", "error", err, "episode", ep.EpisodeNum)
			continue
		}
	}

	if err := s.db.Model(&drama).Update("updated_at", time.Now()).Error; err != nil {
		s.log.Errorw("Failed to update drama timestamp", "error", err)
	}

	s.log.Infow("Episodes saved", "drama_id", dramaID, "count", len(req.Episodes))
	return nil
}

func (s *DramaService) SaveProgress(dramaID string, req *SaveProgressRequest) error {
	var drama models.Drama
	if err := s.db.Where("id = ? ", dramaID).First(&drama).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("drama not found")
		}
		return err
	}

	// 构建metadata对象
	metadata := make(map[string]interface{})

	// 保留现有metadata
	if drama.Metadata != nil {
		if err := json.Unmarshal(drama.Metadata, &metadata); err != nil {
			s.log.Warnw("Failed to unmarshal existing metadata", "error", err)
		}
	}

	// 更新progress信息
	metadata["current_step"] = req.CurrentStep
	if req.StepData != nil {
		metadata["step_data"] = req.StepData
	}

	// 序列化metadata
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		s.log.Errorw("Failed to marshal metadata", "error", err)
		return err
	}

	updates := map[string]interface{}{
		"metadata":   metadataJSON,
		"updated_at": time.Now(),
	}

	if err := s.db.Model(&drama).Updates(updates).Error; err != nil {
		s.log.Errorw("Failed to save progress", "error", err)
		return err
	}

	s.log.Infow("Progress saved", "drama_id", dramaID, "step", req.CurrentStep)
	return nil
}

// addBaseURLToScenes 为剧本中所有场景的 local_path 添加 base_url 前缀
func (s *DramaService) addBaseURLToScenes(drama *models.Drama) {
	// 处理 drama.Scenes
	for i := range drama.Scenes {
		if drama.Scenes[i].LocalPath != nil && *drama.Scenes[i].LocalPath != "" {
			fullPath := fmt.Sprintf("%s/%s", s.baseURL, *drama.Scenes[i].LocalPath)
			drama.Scenes[i].LocalPath = &fullPath
		}
	}

	// 处理 drama.Episodes[].Scenes
	for i := range drama.Episodes {
		for j := range drama.Episodes[i].Scenes {
			if drama.Episodes[i].Scenes[j].LocalPath != nil && *drama.Episodes[i].Scenes[j].LocalPath != "" {
				fullPath := fmt.Sprintf("%s/%s", s.baseURL, *drama.Episodes[i].Scenes[j].LocalPath)
				drama.Episodes[i].Scenes[j].LocalPath = &fullPath
			}
		}
	}
}
