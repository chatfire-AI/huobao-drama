package handlers

import (
	"net/http"

	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/gin-gonic/gin"
)

type AudioExtractionHandler struct {
	service *services.AudioExtractionService
	log     *logger.Logger
	dataDir string
}

func NewAudioExtractionHandler(log *logger.Logger, dataDir string) *AudioExtractionHandler {
	return &AudioExtractionHandler{
		service: services.NewAudioExtractionService(log),
		log:     log,
		dataDir: dataDir,
	}
}

// ExtractAudio 提取单个视频的音频
// @Summary 提取视频音频
// @Description 从视频URL中提取音频轨道
// @Tags Audio
// @Accept json
// @Produce json
// @Param request body services.ExtractAudioRequest true "提取请求"
// @Success 200 {object} services.ExtractAudioResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/audio/extract [post]
func (h *AudioExtractionHandler) ExtractAudio(c *gin.Context) {
	var req services.ExtractAudioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Errorw("Invalid request body", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	h.log.Infow("Received audio extraction request", "video_url", req.VideoURL)

	result, err := h.service.ExtractAudio(req.VideoURL, h.dataDir)
	if err != nil {
		h.log.Errorw("Failed to extract audio", "error", err, "video_url", req.VideoURL)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

type BatchExtractAudioRequest struct {
	VideoURLs []string `json:"video_urls" binding:"required,min=1"`
}

// BatchExtractAudio 批量提取音频
// @Summary 批量提取视频音频
// @Description 从多个视频URL中提取音频轨道
// @Tags Audio
// @Accept json
// @Produce json
// @Param request body BatchExtractAudioRequest true "批量提取请求"
// @Success 200 {object} BatchExtractAudioResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/audio/extract/batch [post]
func (h *AudioExtractionHandler) BatchExtractAudio(c *gin.Context) {
	var req BatchExtractAudioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Errorw("Invalid request body", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	h.log.Infow("Received batch audio extraction request", "count", len(req.VideoURLs))

	results, err := h.service.BatchExtractAudio(req.VideoURLs, h.dataDir)
	if err != nil {
		h.log.Errorw("Failed to batch extract audio", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"total":   len(results),
	})
}
