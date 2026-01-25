package handlers

import (
	services2 "github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SceneHandler struct {
	sceneService *services2.StoryboardCompositionService
	log          *logger.Logger
}

func NewSceneHandler(db *gorm.DB, log *logger.Logger, imageGenService *services2.ImageGenerationService) *SceneHandler {
	return &SceneHandler{
		sceneService: services2.NewStoryboardCompositionService(db, log, imageGenService),
		log:          log,
	}
}

// GetStoryboardsForEpisode 获取章节分镜列表
// @Summary 获取章节分镜列表
// @Tags Episodes
// @Produce json
// @Param episode_id path string true "章节ID"
// @Success 200 {object} response.Response{data=StoryboardsForEpisodeData}
// @Failure 500 {object} response.Response
// @Router /api/v1/episodes/{episode_id}/storyboards [get]
func (h *SceneHandler) GetStoryboardsForEpisode(c *gin.Context) {
	episodeID := c.Param("episode_id")

	storyboards, err := h.sceneService.GetScenesForEpisode(episodeID)
	if err != nil {
		h.log.Errorw("Failed to get storyboards for episode", "error", err, "episode_id", episodeID)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"storyboards": storyboards,
		"total":       len(storyboards),
	})
}

// UpdateScene 更新场景
// @Summary 更新场景
// @Tags Scenes
// @Accept json
// @Produce json
// @Param scene_id path string true "场景ID"
// @Param request body services2.UpdateSceneRequest true "更新场景请求"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/scenes/{scene_id} [put]
func (h *SceneHandler) UpdateScene(c *gin.Context) {
	sceneID := c.Param("scene_id")

	var req services2.UpdateSceneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request")
		return
	}

	if err := h.sceneService.UpdateScene(sceneID, &req); err != nil {
		h.log.Errorw("Failed to update scene", "error", err, "scene_id", sceneID)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Scene updated successfully"})
}

// GenerateSceneImage 生成场景图片
// @Summary 生成场景图片
// @Tags Scenes
// @Accept json
// @Produce json
// @Param request body services2.GenerateSceneImageRequest true "生成场景图片请求"
// @Success 200 {object} response.Response{data=ImageGenerationResponse}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/scenes/generate-image [post]
func (h *SceneHandler) GenerateSceneImage(c *gin.Context) {
	var req services2.GenerateSceneImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request")
		return
	}

	imageGen, err := h.sceneService.GenerateSceneImage(&req)
	if err != nil {
		h.log.Errorw("Failed to generate scene image", "error", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"message":          "Scene image generation started",
		"image_generation": imageGen,
	})
}

// UpdateScenePrompt 更新场景提示词
// @Summary 更新场景提示词
// @Tags Scenes
// @Accept json
// @Produce json
// @Param scene_id path string true "场景ID"
// @Param request body services2.UpdateScenePromptRequest true "更新提示词请求"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/scenes/{scene_id}/prompt [put]
func (h *SceneHandler) UpdateScenePrompt(c *gin.Context) {
	sceneID := c.Param("scene_id")

	var req services2.UpdateScenePromptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request")
		return
	}

	if err := h.sceneService.UpdateScenePrompt(sceneID, &req); err != nil {
		h.log.Errorw("Failed to update scene prompt", "error", err, "scene_id", sceneID)
		if err.Error() == "scene not found" {
			response.NotFound(c, "场景不存在")
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{"message": "场景提示词已更新"})
}

// DeleteScene 删除场景
// @Summary 删除场景
// @Tags Scenes
// @Produce json
// @Param scene_id path string true "场景ID"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/scenes/{scene_id} [delete]
func (h *SceneHandler) DeleteScene(c *gin.Context) {
	sceneID := c.Param("scene_id")

	if err := h.sceneService.DeleteScene(sceneID); err != nil {
		h.log.Errorw("Failed to delete scene", "error", err, "scene_id", sceneID)
		if err.Error() == "scene not found" {
			response.NotFound(c, "场景不存在")
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{"message": "场景已删除"})
}
