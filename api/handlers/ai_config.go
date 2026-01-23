package handlers

import (
	"strconv"

	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AIConfigHandler struct {
	aiService *services.AIService
	log       *logger.Logger
}

func NewAIConfigHandler(db *gorm.DB, cfg *config.Config, log *logger.Logger) *AIConfigHandler {
	return &AIConfigHandler{
		aiService: services.NewAIService(db, log),
		log:       log,
	}
}

// CreateConfig 创建AI配置
// @Summary 创建AI配置
// @Tags AIConfig
// @Accept json
// @Produce json
// @Param request body services.CreateAIConfigRequest true "创建配置请求"
// @Success 201 {object} response.Response{data=AIServiceConfig}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/ai-configs [post]
func (h *AIConfigHandler) CreateConfig(c *gin.Context) {
	var req services.CreateAIConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	config, err := h.aiService.CreateConfig(&req)
	if err != nil {
		response.InternalError(c, "创建失败")
		return
	}

	response.Created(c, config)
}

// GetConfig 获取AI配置详情
// @Summary 获取AI配置详情
// @Tags AIConfig
// @Produce json
// @Param id path int true "配置ID"
// @Success 200 {object} response.Response{data=AIServiceConfig}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/ai-configs/{id} [get]
func (h *AIConfigHandler) GetConfig(c *gin.Context) {

	configID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的配置ID")
		return
	}

	config, err := h.aiService.GetConfig(uint(configID))
	if err != nil {
		if err.Error() == "config not found" {
			response.NotFound(c, "配置不存在")
			return
		}
		response.InternalError(c, "获取失败")
		return
	}

	response.Success(c, config)
}

// ListConfigs 获取AI配置列表
// @Summary 获取AI配置列表
// @Tags AIConfig
// @Produce json
// @Param service_type query string false "服务类型(text/image/video)"
// @Success 200 {object} response.Response{data=[]AIServiceConfig}
// @Failure 500 {object} response.Response
// @Router /api/v1/ai-configs [get]
func (h *AIConfigHandler) ListConfigs(c *gin.Context) {

	serviceType := c.Query("service_type")

	configs, err := h.aiService.ListConfigs(serviceType)
	if err != nil {
		response.InternalError(c, "获取列表失败")
		return
	}

	response.Success(c, configs)
}

// UpdateConfig 更新AI配置
// @Summary 更新AI配置
// @Tags AIConfig
// @Accept json
// @Produce json
// @Param id path int true "配置ID"
// @Param request body services.UpdateAIConfigRequest true "更新配置请求"
// @Success 200 {object} response.Response{data=AIServiceConfig}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/ai-configs/{id} [put]
func (h *AIConfigHandler) UpdateConfig(c *gin.Context) {

	configID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的配置ID")
		return
	}

	var req services.UpdateAIConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	config, err := h.aiService.UpdateConfig(uint(configID), &req)
	if err != nil {
		if err.Error() == "config not found" {
			response.NotFound(c, "配置不存在")
			return
		}
		response.InternalError(c, "更新失败")
		return
	}

	response.Success(c, config)
}

// DeleteConfig 删除AI配置
// @Summary 删除AI配置
// @Tags AIConfig
// @Produce json
// @Param id path int true "配置ID"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/ai-configs/{id} [delete]
func (h *AIConfigHandler) DeleteConfig(c *gin.Context) {

	configID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的配置ID")
		return
	}

	if err := h.aiService.DeleteConfig(uint(configID)); err != nil {
		if err.Error() == "config not found" {
			response.NotFound(c, "配置不存在")
			return
		}
		response.InternalError(c, "删除失败")
		return
	}

	response.Success(c, gin.H{"message": "删除成功"})
}

// TestConnection 测试AI配置连通性
// @Summary 测试AI配置连通性
// @Tags AIConfig
// @Accept json
// @Produce json
// @Param request body services.TestConnectionRequest true "测试连接请求"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Router /api/v1/ai-configs/test [post]
func (h *AIConfigHandler) TestConnection(c *gin.Context) {
	var req services.TestConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.aiService.TestConnection(&req); err != nil {
		response.BadRequest(c, "连接测试失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{"message": "连接测试成功"})
}
