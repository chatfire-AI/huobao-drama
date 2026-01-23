package handlers

import (
	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/domain/models"
)

// 请求体定义（用于文档和绑定）
type UploadCharacterImageRequest struct {
	ImageURL string `json:"image_url" binding:"required"`
}

type ApplyLibraryItemRequest struct {
	LibraryItemID string `json:"library_item_id" binding:"required"`
}

type AddCharacterToLibraryRequest struct {
	Category *string `json:"category"`
}

type UpdateCharacterRequest struct {
	Name        *string `json:"name"`
	Appearance  *string `json:"appearance"`
	Personality *string `json:"personality"`
	Description *string `json:"description"`
}

type GenerateCharacterImageRequest struct {
	Model string `json:"model"`
}

type BatchGenerateCharacterImagesRequest struct {
	CharacterIDs []string `json:"character_ids" binding:"required,min=1"`
	Model        string   `json:"model"`
}

type GenerateStoryboardRequest struct {
	Model string `json:"model"`
}

type ExtractBackgroundsRequest struct {
	Model string `json:"model"`
}

type GenerateFramePromptRequestBody struct {
	FrameType  string `json:"frame_type"`
	PanelCount int    `json:"panel_count"`
	Model      string `json:"model"`
}

type UpdateLanguageRequest struct {
	Language string `json:"language" binding:"required,oneof=zh en"`
}

type UpdateStoryboardRequest = map[string]interface{}

// 通用响应数据结构（用于文档展示）
type MessageResponse struct {
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type TaskCreatedResponse struct {
	TaskID  string `json:"task_id"`
	Status  string `json:"status"`
	Message string `json:"message"`
}

type BatchGenerateResponse struct {
	Message string `json:"message"`
	Count   int    `json:"count"`
}

type ImageGenerationResponse struct {
	Message         string                  `json:"message"`
	ImageGeneration *models.ImageGeneration `json:"image_generation"`
}

type FramePromptListData struct {
	FramePrompts []models.FramePrompt `json:"frame_prompts"`
}

type StoryboardsForEpisodeData struct {
	Storyboards []services.SceneCompositionInfo `json:"storyboards"`
	Total       int                             `json:"total"`
}

type VideoMergeCreatedResponse struct {
	Message string             `json:"message"`
	Merge   *models.VideoMerge `json:"merge"`
}

type VideoMergeDetailResponse struct {
	Merge *models.VideoMerge `json:"merge"`
}

type VideoMergeListResponse struct {
	Merges   []models.VideoMerge `json:"merges"`
	Total    int64               `json:"total"`
	Page     int                 `json:"page"`
	PageSize int                 `json:"page_size"`
}

type UploadImageResponse struct {
	URL      string `json:"url"`
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
}

type EpisodeDownloadResponse struct {
	VideoURL      string `json:"video_url"`
	Title         string `json:"title"`
	EpisodeNumber int    `json:"episode_number"`
}

type FinalizeEpisodeResponse struct {
	Message       string `json:"message"`
	MergeID       uint   `json:"merge_id"`
	EpisodeID     string `json:"episode_id"`
	ScenesCount   int    `json:"scenes_count"`
	SkippedScenes []int  `json:"skipped_scenes,omitempty"`
	Warning       string `json:"warning,omitempty"`
}

type DramaStatsResponse struct {
	Total    int64              `json:"total"`
	ByStatus []DramaStatusCount `json:"by_status"`
}

type DramaStatusCount struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

type LanguageResponse struct {
	Language string `json:"language"`
}

type LanguageUpdateResponse struct {
	Message  string `json:"message"`
	Language string `json:"language"`
}

type BatchExtractAudioResponse struct {
	Results []services.ExtractAudioResponse `json:"results"`
	Total   int                             `json:"total"`
}

// 类型别名（便于 Swagger 注释引用）
type Drama = models.Drama
type Character = models.Character
type CharacterLibrary = models.CharacterLibrary
type ImageGeneration = models.ImageGeneration
type VideoGeneration = models.VideoGeneration
type VideoMerge = models.VideoMerge
type Asset = models.Asset
type Scene = models.Scene
type AIServiceConfig = models.AIServiceConfig
type AsyncTask = models.AsyncTask
