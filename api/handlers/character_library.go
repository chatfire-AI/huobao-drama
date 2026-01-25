package handlers

import (
	"strconv"

	services2 "github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/infrastructure/storage"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CharacterLibraryHandler struct {
	libraryService *services2.CharacterLibraryService
	imageService   *services2.ImageGenerationService
	log            *logger.Logger
}

func NewCharacterLibraryHandler(db *gorm.DB, cfg *config.Config, log *logger.Logger, transferService *services2.ResourceTransferService, localStorage *storage.LocalStorage) *CharacterLibraryHandler {
	return &CharacterLibraryHandler{
		libraryService: services2.NewCharacterLibraryService(db, log),
		imageService:   services2.NewImageGenerationService(db, cfg, transferService, localStorage, log),
		log:            log,
	}
}

// ListLibraryItems 获取角色库列表
// @Summary 获取角色库列表
// @Tags CharacterLibrary
// @Produce json
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Param category query string false "分类"
// @Param source_type query string false "来源类型(generated/uploaded)"
// @Param keyword query string false "关键词"
// @Success 200 {object} response.Response{data=response.PaginationData{items=[]CharacterLibrary}}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/character-library [get]
func (h *CharacterLibraryHandler) ListLibraryItems(c *gin.Context) {

	var query services2.CharacterLibraryQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}

	items, total, err := h.libraryService.ListLibraryItems(&query)
	if err != nil {
		h.log.Errorw("Failed to list library items", "error", err)
		response.InternalError(c, "获取角色库失败")
		return
	}

	response.SuccessWithPagination(c, items, total, query.Page, query.PageSize)
}

// CreateLibraryItem 添加到角色库
// @Summary 添加到角色库
// @Tags CharacterLibrary
// @Accept json
// @Produce json
// @Param request body services2.CreateLibraryItemRequest true "创建角色库项"
// @Success 201 {object} response.Response{data=CharacterLibrary}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/character-library [post]
func (h *CharacterLibraryHandler) CreateLibraryItem(c *gin.Context) {

	var req services2.CreateLibraryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	item, err := h.libraryService.CreateLibraryItem(&req)
	if err != nil {
		h.log.Errorw("Failed to create library item", "error", err)
		response.InternalError(c, "添加到角色库失败")
		return
	}

	response.Created(c, item)
}

// GetLibraryItem 获取角色库项详情
// @Summary 获取角色库项详情
// @Tags CharacterLibrary
// @Produce json
// @Param id path string true "角色库项ID"
// @Success 200 {object} response.Response{data=CharacterLibrary}
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/character-library/{id} [get]
func (h *CharacterLibraryHandler) GetLibraryItem(c *gin.Context) {

	itemID := c.Param("id")

	item, err := h.libraryService.GetLibraryItem(itemID)
	if err != nil {
		if err.Error() == "library item not found" {
			response.NotFound(c, "角色库项不存在")
			return
		}
		h.log.Errorw("Failed to get library item", "error", err)
		response.InternalError(c, "获取失败")
		return
	}

	response.Success(c, item)
}

// DeleteLibraryItem 删除角色库项
// @Summary 删除角色库项
// @Tags CharacterLibrary
// @Produce json
// @Param id path string true "角色库项ID"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/character-library/{id} [delete]
func (h *CharacterLibraryHandler) DeleteLibraryItem(c *gin.Context) {

	itemID := c.Param("id")

	if err := h.libraryService.DeleteLibraryItem(itemID); err != nil {
		if err.Error() == "library item not found" {
			response.NotFound(c, "角色库项不存在")
			return
		}
		h.log.Errorw("Failed to delete library item", "error", err)
		response.InternalError(c, "删除失败")
		return
	}

	response.Success(c, gin.H{"message": "删除成功"})
}

// UploadCharacterImage 上传角色图片
// @Summary 上传角色图片（URL方式）
// @Tags Characters
// @Accept json
// @Produce json
// @Param id path string true "角色ID"
// @Param request body UploadCharacterImageRequest true "角色图片URL"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 403 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/characters/{id}/image [put]
func (h *CharacterLibraryHandler) UploadCharacterImage(c *gin.Context) {

	characterID := c.Param("id")

	// TODO: 处理文件上传
	// 这里需要实现文件上传逻辑，保存到OSS或本地
	// 暂时使用简单的实现
	var req UploadCharacterImageRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.libraryService.UploadCharacterImage(characterID, req.ImageURL); err != nil {
		if err.Error() == "character not found" {
			response.NotFound(c, "角色不存在")
			return
		}
		if err.Error() == "unauthorized" {
			response.Forbidden(c, "无权限")
			return
		}
		h.log.Errorw("Failed to upload character image", "error", err)
		response.InternalError(c, "上传失败")
		return
	}

	response.Success(c, gin.H{"message": "上传成功"})
}

// ApplyLibraryItemToCharacter 从角色库应用形象
// @Summary 从角色库应用形象
// @Tags Characters
// @Accept json
// @Produce json
// @Param id path string true "角色ID"
// @Param request body ApplyLibraryItemRequest true "角色库项ID"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 403 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/characters/{id}/image-from-library [put]
func (h *CharacterLibraryHandler) ApplyLibraryItemToCharacter(c *gin.Context) {

	characterID := c.Param("id")

	var req ApplyLibraryItemRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.libraryService.ApplyLibraryItemToCharacter(characterID, req.LibraryItemID); err != nil {
		if err.Error() == "library item not found" {
			response.NotFound(c, "角色库项不存在")
			return
		}
		if err.Error() == "character not found" {
			response.NotFound(c, "角色不存在")
			return
		}
		if err.Error() == "unauthorized" {
			response.Forbidden(c, "无权限")
			return
		}
		h.log.Errorw("Failed to apply library item", "error", err)
		response.InternalError(c, "应用失败")
		return
	}

	response.Success(c, gin.H{"message": "应用成功"})
}

// AddCharacterToLibrary 将角色添加到角色库
// @Summary 将角色添加到角色库
// @Tags Characters
// @Accept json
// @Produce json
// @Param id path string true "角色ID"
// @Param request body AddCharacterToLibraryRequest false "角色库分类（可选）"
// @Success 201 {object} response.Response{data=CharacterLibrary}
// @Failure 400 {object} response.Response
// @Failure 403 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/characters/{id}/add-to-library [post]
func (h *CharacterLibraryHandler) AddCharacterToLibrary(c *gin.Context) {

	characterID := c.Param("id")

	var req AddCharacterToLibraryRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		// 允许空body
		req.Category = nil
	}

	item, err := h.libraryService.AddCharacterToLibrary(characterID, req.Category)
	if err != nil {
		if err.Error() == "character not found" {
			response.NotFound(c, "角色不存在")
			return
		}
		if err.Error() == "unauthorized" {
			response.Forbidden(c, "无权限")
			return
		}
		if err.Error() == "character has no image" {
			response.BadRequest(c, "角色还没有形象图片")
			return
		}
		h.log.Errorw("Failed to add character to library", "error", err)
		response.InternalError(c, "添加失败")
		return
	}

	response.Created(c, item)
}

// UpdateCharacter 更新角色信息
// @Summary 更新角色信息
// @Tags Characters
// @Accept json
// @Produce json
// @Param id path string true "角色ID"
// @Param request body UpdateCharacterRequest true "更新角色请求"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 403 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/characters/{id} [put]
func (h *CharacterLibraryHandler) UpdateCharacter(c *gin.Context) {

	characterID := c.Param("id")

	var req UpdateCharacterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.libraryService.UpdateCharacter(characterID, &req); err != nil {
		if err.Error() == "character not found" {
			response.NotFound(c, "角色不存在")
			return
		}
		if err.Error() == "unauthorized" {
			response.Forbidden(c, "无权限")
			return
		}
		h.log.Errorw("Failed to update character", "error", err)
		response.InternalError(c, "更新失败")
		return
	}

	response.Success(c, gin.H{"message": "更新成功"})
}

// DeleteCharacter 删除单个角色
// @Summary 删除角色
// @Tags Characters
// @Produce json
// @Param id path string true "角色ID"
// @Success 200 {object} response.Response{data=MessageResponse}
// @Failure 400 {object} response.Response
// @Failure 403 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/characters/{id} [delete]
func (h *CharacterLibraryHandler) DeleteCharacter(c *gin.Context) {

	characterIDStr := c.Param("id")
	characterID, err := strconv.ParseUint(characterIDStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的角色ID")
		return
	}

	if err := h.libraryService.DeleteCharacter(uint(characterID)); err != nil {
		h.log.Errorw("Failed to delete character", "error", err, "id", characterID)
		if err.Error() == "character not found" {
			response.NotFound(c, "角色不存在")
			return
		}
		if err.Error() == "unauthorized" {
			response.Forbidden(c, "无权删除此角色")
			return
		}
		response.InternalError(c, "删除失败")
		return
	}

	response.Success(c, gin.H{"message": "角色已删除"})
}
