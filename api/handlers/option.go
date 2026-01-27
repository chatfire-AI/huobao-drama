package handlers

import (
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

type OptionHandler struct {
	config *config.Config
	log    *logger.Logger
}

func NewOptionHandler(cfg *config.Config, log *logger.Logger) *OptionHandler {
	return &OptionHandler{
		config: cfg,
		log:    log,
	}
}

// GetVisualOptions 获取视觉相关配置选项
// GetVisualOptions 获取视觉相关配置选项
func (h *OptionHandler) GetVisualOptions(c *gin.Context) {
	lang := c.Query("lang")
	if lang == "" {
		lang = h.config.App.Language
	}

	if lang == "en" {
		response.Success(c, h.config.Visual.En)
		return
	}

	// 默认返回中文
	response.Success(c, h.config.Visual.Zh)
}
