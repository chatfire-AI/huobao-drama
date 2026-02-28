package services

import (
	"github.com/drama-generator/backend/pkg/logger"
	"gorm.io/gorm"
)

type ResourceTransferService struct {
	db  *gorm.DB
	log *logger.Logger
}

func NewResourceTransferService(db *gorm.DB, log *logger.Logger) *ResourceTransferService {
	return &ResourceTransferService{
		db:  db,
		log: log,
	}
}

// BatchTransferImagesToMinio is retained as a compatibility no-op.
func (s *ResourceTransferService) BatchTransferImagesToMinio(dramaID string, limit int) (int, error) {
	s.log.Warnw("BatchTransferImagesToMinio is deprecated and runs as no-op",
		"drama_id", dramaID,
		"limit", limit)
	return 0, nil
}

// BatchTransferVideosToMinio is retained as a compatibility no-op.
func (s *ResourceTransferService) BatchTransferVideosToMinio(dramaID string, limit int) (int, error) {
	s.log.Warnw("BatchTransferVideosToMinio is deprecated and runs as no-op",
		"drama_id", dramaID,
		"limit", limit)
	return 0, nil
}
