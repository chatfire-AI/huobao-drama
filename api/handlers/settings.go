package handlers

import (
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

type SettingsHandler struct {
	config *config.Config
	log    *logger.Logger
}

func NewSettingsHandler(cfg *config.Config, log *logger.Logger) *SettingsHandler {
	return &SettingsHandler{
		config: cfg,
		log:    log,
	}
}

// GetLanguage 获取当前系统语言
// @Summary 获取当前系统语言
// @Tags Settings
// @Produce json
// @Success 200 {object} response.Response{data=LanguageResponse}
// @Router /api/v1/settings/language [get]
func (h *SettingsHandler) GetLanguage(c *gin.Context) {
	language := h.config.App.Language
	if language == "" {
		language = "zh" // 默认中文
	}

	response.Success(c, gin.H{
		"language": language,
	})
}

// UpdateLanguage 更新系统语言
// @Summary 更新系统语言
// @Tags Settings
// @Accept json
// @Produce json
// @Param request body UpdateLanguageRequest true "更新语言请求"
// @Success 200 {object} response.Response{data=LanguageUpdateResponse}
// @Failure 400 {object} response.Response
// @Router /api/v1/settings/language [put]
func (h *SettingsHandler) UpdateLanguage(c *gin.Context) {
	var req UpdateLanguageRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "语言参数错误，只支持 zh 或 en")
		return
	}

	// 更新内存中的配置
	h.config.App.Language = req.Language

	// 更新配置文件
	viper.Set("app.language", req.Language)
	if err := viper.WriteConfig(); err != nil {
		h.log.Warnw("Failed to write config file", "error", err)
		// 即使写入文件失败，内存配置也已更新，仍然可用
	}

	h.log.Infow("System language updated", "language", req.Language)

	message := "语言已切换为中文"
	if req.Language == "en" {
		message = "Language switched to English"
	}

	response.Success(c, gin.H{
		"message":  message,
		"language": req.Language,
	})
}
