package handlers

import (
	services2 "github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

type UploadHandler struct {
	uploadService           *services2.UploadService
	characterLibraryService *services2.CharacterLibraryService
	log                     *logger.Logger
}

func NewUploadHandler(cfg *config.Config, log *logger.Logger, characterLibraryService *services2.CharacterLibraryService) (*UploadHandler, error) {
	uploadService, err := services2.NewUploadService(cfg, log)
	if err != nil {
		return nil, err
	}

	return &UploadHandler{
		uploadService:           uploadService,
		characterLibraryService: characterLibraryService,
		log:                     log,
	}, nil
}

// UploadImage 上传图片
func (h *UploadHandler) UploadImage(c *gin.Context) {
	// 获取上传的文件
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.BadRequest(c, "请选择文件")
		return
	}
	defer file.Close()

	// 检查文件类型
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// 验证是图片类型
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/jpg":  true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}

	if !allowedTypes[contentType] {
		response.BadRequest(c, "只支持图片格式 (jpg, png, gif, webp)")
		return
	}

	// 检查文件大小 (10MB)
	if header.Size > 10*1024*1024 {
		response.BadRequest(c, "文件大小不能超过10MB")
		return
	}

	// 上传到本地存储
	result, err := h.uploadService.UploadCharacterImage(file, header.Filename, contentType)
	if err != nil {
		h.log.Errorw("Failed to upload image", "error", err)
		response.InternalError(c, "上传失败")
		return
	}

	response.Success(c, gin.H{
		"url":        result.URL,
		"local_path": result.LocalPath,
		"filename":   header.Filename,
		"size":       header.Size,
	})
}

// UploadCharacterImage 上传角色图片（带角色ID）
func (h *UploadHandler) UploadCharacterImage(c *gin.Context) {
	characterID := c.Param("id")

	// 获取上传的文件
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.BadRequest(c, "请选择文件")
		return
	}
	defer file.Close()

	// 检查文件类型
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// 验证是图片类型
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/jpg":  true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}

	if !allowedTypes[contentType] {
		response.BadRequest(c, "只支持图片格式 (jpg, png, gif, webp)")
		return
	}

	// 检查文件大小 (10MB)
	if header.Size > 10*1024*1024 {
		response.BadRequest(c, "文件大小不能超过10MB")
		return
	}

	// 上传到本地存储
	result, err := h.uploadService.UploadCharacterImage(file, header.Filename, contentType)
	if err != nil {
		h.log.Errorw("Failed to upload character image", "error", err)
		response.InternalError(c, "上传失败")
		return
	}

	// 更新角色的image_url字段到数据库
	err = h.characterLibraryService.UploadCharacterImage(characterID, result.URL)
	if err != nil {
		h.log.Errorw("Failed to update character image_url", "error", err, "character_id", characterID)
		response.InternalError(c, "更新角色图片失败")
		return
	}

	h.log.Infow("Character image uploaded and saved", "character_id", characterID, "url", result.URL, "local_path", result.LocalPath)

	response.Success(c, gin.H{
		"url":        result.URL,
		"local_path": result.LocalPath,
		"filename":   header.Filename,
		"size":       header.Size,
	})
}
