package services

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/google/uuid"
)

type UploadService struct {
	storagePath string
	baseURL     string
	log         *logger.Logger
}

func NewUploadService(cfg *config.Config, log *logger.Logger) (*UploadService, error) {
	// 确保存储目录存在
	if err := os.MkdirAll(cfg.Storage.LocalPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}

	return &UploadService{
		storagePath: cfg.Storage.LocalPath,
		baseURL:     cfg.Storage.BaseURL,
		log:         log,
	}, nil
}

// UploadResult 上传结果
type UploadResult struct {
	URL       string // 完整访问URL
	LocalPath string // 相对路径（相对于 storage 根目录）
}

// UploadFile 上传文件到本地存储
func (s *UploadService) UploadFile(file io.Reader, fileName, contentType string, category string) (*UploadResult, error) {
	// 创建分类目录
	categoryPath := filepath.Join(s.storagePath, category)
	if err := os.MkdirAll(categoryPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create category directory: %w", err)
	}

	// 生成唯一文件名
	ext := filepath.Ext(fileName)
	uniqueID := uuid.New().String()
	timestamp := time.Now().Format("20060102_150405")
	newFileName := fmt.Sprintf("%s_%s%s", timestamp, uniqueID, ext)
	filePath := filepath.Join(categoryPath, newFileName)

	// 创建文件
	dst, err := os.Create(filePath)
	if err != nil {
		s.log.Errorw("Failed to create file", "error", err, "path", filePath)
		return nil, fmt.Errorf("创建文件失败: %w", err)
	}
	defer dst.Close()

	// 写入文件
	if _, err := io.Copy(dst, file); err != nil {
		s.log.Errorw("Failed to write file", "error", err, "path", filePath)
		return nil, fmt.Errorf("写入文件失败: %w", err)
	}

	// 构建访问URL和相对路径
	fileURL := fmt.Sprintf("%s/%s/%s", s.baseURL, category, newFileName)
	localPath := fmt.Sprintf("%s/%s", category, newFileName)

	s.log.Infow("File uploaded successfully", "path", filePath, "url", fileURL, "local_path", localPath)
	return &UploadResult{
		URL:       fileURL,
		LocalPath: localPath,
	}, nil
}

// UploadCharacterImage 上传角色图片
func (s *UploadService) UploadCharacterImage(file io.Reader, fileName, contentType string) (*UploadResult, error) {
	return s.UploadFile(file, fileName, contentType, "characters")
}

// DeleteFile 删除本地文件
func (s *UploadService) DeleteFile(fileURL string) error {
	// 从URL中提取相对路径
	// URL格式: http://localhost:8080/static/characters/20060102_150405_uuid.jpg
	relPath := s.extractRelativePathFromURL(fileURL)
	if relPath == "" {
		return fmt.Errorf("invalid file URL")
	}

	filePath := filepath.Join(s.storagePath, relPath)
	err := os.Remove(filePath)
	if err != nil {
		s.log.Errorw("Failed to delete file", "error", err, "path", filePath)
		return fmt.Errorf("删除文件失败: %w", err)
	}

	s.log.Infow("File deleted successfully", "path", filePath)
	return nil
}

// extractRelativePathFromURL 从URL中提取相对路径
func (s *UploadService) extractRelativePathFromURL(fileURL string) string {
	// 从baseURL后面提取路径
	// 例如: http://localhost:8080/static/characters/xxx.jpg -> characters/xxx.jpg
	if len(fileURL) <= len(s.baseURL) {
		return ""
	}
	return fileURL[len(s.baseURL)+1:] // +1 for the '/'
}

// GetPresignedURL 本地存储不需要预签名URL，直接返回原URL
func (s *UploadService) GetPresignedURL(objectName string, expiry time.Duration) (string, error) {
	// 本地存储通过静态文件服务直接访问，不需要预签名
	return fmt.Sprintf("%s/%s", s.baseURL, objectName), nil
}
