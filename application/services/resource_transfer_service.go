package services

import (
	"errors"

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

// NOTE:
// The scheduler currently references batch transfer-to-MinIO helpers.
// This repository's default deployment is local storage, and MinIO support was
// removed from the service layer.
//
// To keep builds green (and allow the scheduler to be enabled later), we keep
// no-op stubs here. If you want real MinIO transfer, implement these methods
// and wire the storage client in infrastructure.

var ErrMinioTransferNotImplemented = errors.New("minio transfer is not implemented; use local storage")

func (s *ResourceTransferService) BatchTransferImagesToMinio(dramaID string, limit int) (int, error) {
	s.log.Warnw("MinIO transfer requested but not implemented",
		"kind", "images",
		"drama_id", dramaID,
		"limit", limit,
	)
	return 0, ErrMinioTransferNotImplemented
}

func (s *ResourceTransferService) BatchTransferVideosToMinio(dramaID string, limit int) (int, error) {
	s.log.Warnw("MinIO transfer requested but not implemented",
		"kind", "videos",
		"drama_id", dramaID,
		"limit", limit,
	)
	return 0, ErrMinioTransferNotImplemented
}
