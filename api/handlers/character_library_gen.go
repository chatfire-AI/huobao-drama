package handlers

import (
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

// GenerateCharacterImage AI生成角色形象
// @Summary AI生成角色形象
// @Tags Characters
// @Accept json
// @Produce json
// @Param id path string true "角色ID"
// @Param request body GenerateCharacterImageRequest false "生成参数（可选）"
// @Success 200 {object} response.Response{data=ImageGenerationResponse}
// @Failure 403 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/characters/{id}/generate-image [post]
func (h *CharacterLibraryHandler) GenerateCharacterImage(c *gin.Context) {

	characterID := c.Param("id")

	// 获取请求体中的model参数
	var req GenerateCharacterImageRequest
	c.ShouldBindJSON(&req)

	imageGen, err := h.libraryService.GenerateCharacterImage(characterID, h.imageService, req.Model)
	if err != nil {
		if err.Error() == "character not found" {
			response.NotFound(c, "角色不存在")
			return
		}
		if err.Error() == "unauthorized" {
			response.Forbidden(c, "无权限")
			return
		}
		h.log.Errorw("Failed to generate character image", "error", err)
		response.InternalError(c, "生成失败")
		return
	}

	response.Success(c, gin.H{
		"message":          "角色图片生成已启动",
		"image_generation": imageGen,
	})
}
