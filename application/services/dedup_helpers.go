package services

import (
	"strings"

	models "github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/pkg/logger"
	"gorm.io/gorm"
)

// DeduplicateScenesByLocation 按地点去重场景，保留最早创建的记录
func DeduplicateScenesByLocation(db *gorm.DB, log *logger.Logger, dramaID uint) int {
	var scenes []models.Scene
	if err := db.Where("drama_id = ?", dramaID).Order("created_at ASC").Find(&scenes).Error; err != nil {
		log.Errorw("Failed to load scenes for dedup", "error", err)
		return 0
	}

	groups := make(map[string][]models.Scene)
	for _, scene := range scenes {
		key := strings.ToLower(strings.TrimSpace(scene.Location))
		groups[key] = append(groups[key], scene)
	}

	dedupCount := 0
	for _, group := range groups {
		if len(group) <= 1 {
			continue
		}
		for i := 1; i < len(group); i++ {
			if err := db.Delete(&group[i]).Error; err != nil {
				log.Warnw("Failed to delete duplicate scene", "error", err, "scene_id", group[i].ID)
				continue
			}
			dedupCount++
		}
	}
	return dedupCount
}

// DeduplicatePropsByName 按名称去重道具，保留最早创建的记录
func DeduplicatePropsByName(db *gorm.DB, log *logger.Logger, dramaID uint) int {
	var props []models.Prop
	if err := db.Where("drama_id = ?", dramaID).Order("created_at ASC").Find(&props).Error; err != nil {
		log.Errorw("Failed to load props for dedup", "error", err)
		return 0
	}

	groups := make(map[string][]models.Prop)
	for _, prop := range props {
		key := strings.ToLower(strings.TrimSpace(prop.Name))
		groups[key] = append(groups[key], prop)
	}

	dedupCount := 0
	for _, group := range groups {
		if len(group) <= 1 {
			continue
		}
		for i := 1; i < len(group); i++ {
			if err := db.Delete(&group[i]).Error; err != nil {
				log.Warnw("Failed to delete duplicate prop", "error", err, "prop_id", group[i].ID)
				continue
			}
			dedupCount++
		}
	}
	return dedupCount
}
