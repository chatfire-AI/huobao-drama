package services

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"time"

	models "github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/infrastructure/external/ffmpeg"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/video"
	"gorm.io/gorm"
)

type VideoMergeService struct {
	db              *gorm.DB
	aiService       *AIService
	transferService *ResourceTransferService
	ffmpeg          *ffmpeg.FFmpeg
	storagePath     string
	baseURL         string
	log             *logger.Logger
}

func NewVideoMergeService(db *gorm.DB, transferService *ResourceTransferService, storagePath, baseURL string, log *logger.Logger) *VideoMergeService {
	return &VideoMergeService{
		db:              db,
		aiService:       NewAIService(db, log),
		transferService: transferService,
		ffmpeg:          ffmpeg.NewFFmpeg(log),
		storagePath:     storagePath,
		baseURL:         baseURL,
		log:             log,
	}
}

type MergeVideoRequest struct {
	EpisodeID string             `json:"episode_id" binding:"required"`
	DramaID   string             `json:"drama_id" binding:"required"`
	Title     string             `json:"title"`
	Scenes    []models.SceneClip `json:"scenes" binding:"required,min=1"`
	Provider  string             `json:"provider"`
	Model     string             `json:"model"`
}

func (s *VideoMergeService) MergeVideos(req *MergeVideoRequest) (*models.VideoMerge, error) {
	// 验证episode权限
	var episode models.Episode
	if err := s.db.Preload("Drama").Where("id = ?", req.EpisodeID).First(&episode).Error; err != nil {
		return nil, fmt.Errorf("episode not found")
	}

	// 验证所有场景都有视频
	for i, scene := range req.Scenes {
		if scene.VideoURL == "" {
			return nil, fmt.Errorf("scene %d has no video", i+1)
		}
	}

	provider := req.Provider
	if provider == "" {
		provider = "doubao"
	}

	// 序列化场景列表
	scenesJSON, err := json.Marshal(req.Scenes)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize scenes: %w", err)
	}

	s.log.Infow("Serialized scenes to JSON",
		"scenes_count", len(req.Scenes),
		"scenes_json", string(scenesJSON))

	epID, _ := strconv.ParseUint(req.EpisodeID, 10, 32)
	dramaID, _ := strconv.ParseUint(req.DramaID, 10, 32)

	videoMerge := &models.VideoMerge{
		EpisodeID: uint(epID),
		DramaID:   uint(dramaID),
		Title:     req.Title,
		Provider:  provider,
		Model:     &req.Model,
		Scenes:    scenesJSON,
		Status:    models.VideoMergeStatusPending,
	}

	if err := s.db.Create(videoMerge).Error; err != nil {
		return nil, fmt.Errorf("failed to create merge record: %w", err)
	}

	go s.processMergeVideo(videoMerge.ID)

	return videoMerge, nil
}

func (s *VideoMergeService) processMergeVideo(mergeID uint) {
	var videoMerge models.VideoMerge
	if err := s.db.First(&videoMerge, mergeID).Error; err != nil {
		s.log.Errorw("Failed to load video merge", "error", err, "id", mergeID)
		return
	}

	s.db.Model(&videoMerge).Update("status", models.VideoMergeStatusProcessing)

	client, err := s.getVideoClient(videoMerge.Provider)
	if err != nil {
		s.updateMergeError(mergeID, err.Error())
		return
	}

	// 解析场景列表
	var scenes []models.SceneClip
	if err := json.Unmarshal(videoMerge.Scenes, &scenes); err != nil {
		s.updateMergeError(mergeID, fmt.Sprintf("failed to parse scenes: %v", err))
		return
	}

	// 调用视频合并API
	result, err := s.mergeVideoClips(client, scenes)
	if err != nil {
		s.updateMergeError(mergeID, err.Error())
		return
	}

	if !result.Completed {
		s.db.Model(&videoMerge).Updates(map[string]interface{}{
			"status":  models.VideoMergeStatusProcessing,
			"task_id": result.TaskID,
		})
		go s.pollMergeStatus(mergeID, client, result.TaskID)
		return
	}

	s.completeMerge(mergeID, result)
}

func (s *VideoMergeService) mergeVideoClips(client video.VideoClient, scenes []models.SceneClip) (*video.VideoResult, error) {
	if len(scenes) == 0 {
		return nil, fmt.Errorf("no scenes to merge")
	}

	// 按Order字段排序场景
	sort.Slice(scenes, func(i, j int) bool {
		return scenes[i].Order < scenes[j].Order
	})

	s.log.Infow("Merging video clips with FFmpeg", "scene_count", len(scenes))

	// 计算总时长
	var totalDuration float64
	for _, scene := range scenes {
		totalDuration += scene.Duration
	}

	// 准备FFmpeg合成选项
	clips := make([]ffmpeg.VideoClip, len(scenes))
	for i, scene := range scenes {
		// 使用 scene.VideoURL，它已经在前面的代码中被正确处理
		// 如果是本地文件，已经包含了完整路径（storagePath + LocalPath）
		// 如果是 HTTP URL，则直接使用
		videoPath := scene.VideoURL

		clips[i] = ffmpeg.VideoClip{
			URL:        videoPath,
			Duration:   scene.Duration,
			StartTime:  scene.StartTime,
			EndTime:    scene.EndTime,
			Transition: scene.Transition,
		}

		s.log.Infow("Clip added to merge queue",
			"order", scene.Order,
			"index", i,
			"video_path", videoPath,
			"duration", scene.Duration,
			"start_time", scene.StartTime,
			"end_time", scene.EndTime)
	}

	// 创建视频输出目录
	videoDir := filepath.Join(s.storagePath, "videos", "merged")
	if err := os.MkdirAll(videoDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create video directory: %w", err)
	}

	// 生成输出文件名
	fileName := fmt.Sprintf("merged_%d.mp4", time.Now().Unix())
	outputPath := filepath.Join(videoDir, fileName)

	// 使用FFmpeg合成视频
	mergedPath, err := s.ffmpeg.MergeVideos(&ffmpeg.MergeOptions{
		OutputPath: outputPath,
		Clips:      clips,
	})
	if err != nil {
		return nil, fmt.Errorf("ffmpeg merge failed: %w", err)
	}

	s.log.Infow("Video merged successfully", "path", mergedPath)

	// 生成相对路径（不包含协议、IP、端口）
	relPath := filepath.Join("videos", "merged", fileName)

	result := &video.VideoResult{
		VideoURL:  relPath, // 只保存相对路径
		Duration:  int(totalDuration),
		Completed: true,
		Status:    "completed",
	}

	return result, nil
}

func (s *VideoMergeService) pollMergeStatus(mergeID uint, client video.VideoClient, taskID string) {
	maxAttempts := 240
	pollInterval := 5 * time.Second

	for i := 0; i < maxAttempts; i++ {
		time.Sleep(pollInterval)

		result, err := client.GetTaskStatus(taskID)
		if err != nil {
			s.log.Errorw("Failed to get merge task status", "error", err, "task_id", taskID)
			continue
		}

		if result.Completed {
			s.completeMerge(mergeID, result)
			return
		}

		if result.Error != "" {
			s.updateMergeError(mergeID, result.Error)
			return
		}
	}

	s.updateMergeError(mergeID, "timeout: video merge took too long")
}

func (s *VideoMergeService) completeMerge(mergeID uint, result *video.VideoResult) {
	now := time.Now()

	// 获取merge记录
	var videoMerge models.VideoMerge
	if err := s.db.First(&videoMerge, mergeID).Error; err != nil {
		s.log.Errorw("Failed to load video merge for completion", "error", err, "id", mergeID)
		return
	}

	finalVideoURL := result.VideoURL

	// 使用本地存储，不再使用MinIO
	s.log.Infow("Video merge completed, using local storage", "merge_id", mergeID, "local_path", result.VideoURL)

	updates := map[string]interface{}{
		"status":       models.VideoMergeStatusCompleted,
		"merged_url":   finalVideoURL,
		"completed_at": now,
	}

	if result.Duration > 0 {
		updates["duration"] = result.Duration
	}

	s.db.Model(&models.VideoMerge{}).Where("id = ?", mergeID).Updates(updates)

	// 更新episode的状态和最终视频URL
	if videoMerge.EpisodeID != 0 {
		s.db.Model(&models.Episode{}).Where("id = ?", videoMerge.EpisodeID).Updates(map[string]interface{}{
			"status":    "completed",
			"video_url": finalVideoURL,
		})
		s.log.Infow("Episode finalized", "episode_id", videoMerge.EpisodeID, "video_url", finalVideoURL)
	}

	s.log.Infow("Video merge completed", "id", mergeID, "url", finalVideoURL)
}

func (s *VideoMergeService) updateMergeError(mergeID uint, errorMsg string) {
	s.db.Model(&models.VideoMerge{}).Where("id = ?", mergeID).Updates(map[string]interface{}{
		"status":    models.VideoMergeStatusFailed,
		"error_msg": errorMsg,
	})
	s.log.Errorw("Video merge failed", "id", mergeID, "error", errorMsg)
}

func (s *VideoMergeService) getVideoClient(provider string) (video.VideoClient, error) {
	config, err := s.aiService.GetDefaultConfig("video")
	if err != nil {
		return nil, fmt.Errorf("failed to get video config: %w", err)
	}

	// 使用第一个模型
	model := ""
	if len(config.Model) > 0 {
		model = config.Model[0]
	}

	// 根据配置中的 provider 创建对应的客户端
	var endpoint string
	var queryEndpoint string

	switch config.Provider {
	case "runway":
		return video.NewRunwayClient(config.BaseURL, config.APIKey, model), nil
	case "pika":
		return video.NewPikaClient(config.BaseURL, config.APIKey, model), nil
	case "openai", "sora":
		return video.NewOpenAISoraClient(config.BaseURL, config.APIKey, model), nil
	case "minimax":
		return video.NewMinimaxClient(config.BaseURL, config.APIKey, model), nil
	case "chatfire":
		endpoint = "/video/generations"
		queryEndpoint = "/video/task/{taskId}"
		return video.NewChatfireClient(config.BaseURL, config.APIKey, model, endpoint, queryEndpoint), nil
	case "doubao", "volces", "ark":
		endpoint = "/contents/generations/tasks"
		queryEndpoint = "/generations/tasks/{taskId}"
		return video.NewVolcesArkClient(config.BaseURL, config.APIKey, model, endpoint, queryEndpoint), nil
	default:
		endpoint = "/contents/generations/tasks"
		queryEndpoint = "/generations/tasks/{taskId}"
		return video.NewVolcesArkClient(config.BaseURL, config.APIKey, model, endpoint, queryEndpoint), nil
	}
}

func (s *VideoMergeService) GetMerge(mergeID uint) (*models.VideoMerge, error) {
	var merge models.VideoMerge
	if err := s.db.Where("id = ? ", mergeID).First(&merge).Error; err != nil {
		return nil, err
	}
	return &merge, nil
}

func (s *VideoMergeService) ListMerges(episodeID *string, status string, page, pageSize int) ([]models.VideoMerge, int64, error) {
	query := s.db.Model(&models.VideoMerge{})

	if episodeID != nil && *episodeID != "" {
		query = query.Where("episode_id = ?", *episodeID)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var merges []models.VideoMerge
	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&merges).Error; err != nil {
		return nil, 0, err
	}

	return merges, total, nil
}

func (s *VideoMergeService) DeleteMerge(mergeID uint) error {
	result := s.db.Where("id = ? ", mergeID).Delete(&models.VideoMerge{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("merge not found")
	}
	return nil
}

// TimelineClip 时间线片段数据
type TimelineClip struct {
	AssetID      interface{}            `json:"asset_id"`      // 素材库视频ID（优先使用，可以是数字或字符串）
	StoryboardID string                 `json:"storyboard_id"` // 分镜ID（fallback）
	Order        int                    `json:"order"`
	StartTime    float64                `json:"start_time"`
	EndTime      float64                `json:"end_time"`
	Duration     float64                `json:"duration"`
	Transition   map[string]interface{} `json:"transition"`
}

// getAssetIDString 将 AssetID 转换为字符串
func getAssetIDString(assetID interface{}) string {
	if assetID == nil {
		return ""
	}
	switch v := assetID.(type) {
	case string:
		return v
	case float64:
		return fmt.Sprintf("%.0f", v)
	case int:
		return fmt.Sprintf("%d", v)
	default:
		return fmt.Sprintf("%v", v)
	}
}

// FinalizeEpisodeRequest 完成剧集制作请求
type FinalizeEpisodeRequest struct {
	EpisodeID string         `json:"episode_id"`
	Clips     []TimelineClip `json:"clips"`
}

// FinalizeEpisode 完成集数制作，根据时间线场景顺序合成最终视频
func (s *VideoMergeService) FinalizeEpisode(episodeID string, timelineData *FinalizeEpisodeRequest) (map[string]interface{}, error) {
	// 验证episode存在且属于该用户
	var episode models.Episode
	if err := s.db.Preload("Drama").Preload("Storyboards").Where("id = ?", episodeID).First(&episode).Error; err != nil {
		return nil, fmt.Errorf("episode not found")
	}

	// 构建分镜ID映射
	sceneMap := make(map[string]models.Storyboard)
	for _, scene := range episode.Storyboards {
		sceneMap[fmt.Sprintf("%d", scene.ID)] = scene
	}

	// 根据时间线数据构建场景片段
	var sceneClips []models.SceneClip
	var skippedScenes []int

	if timelineData != nil && len(timelineData.Clips) > 0 {
		s.log.Infow("Processing timeline data", "clips_count", len(timelineData.Clips))
		// 使用前端提供的时间线数据
		for i, clip := range timelineData.Clips {
			assetIDStr := getAssetIDString(clip.AssetID)
			s.log.Infow("Processing clip", "index", i, "storyboard_id", clip.StoryboardID, "asset_id", assetIDStr, "order", clip.Order)
			// 优先使用素材库中的视频（通过AssetID）
			var videoURL string
			var sceneID uint

			if assetIDStr != "" {
				// 从素材库获取视频，优先使用 local_path
				var asset models.Asset
				if err := s.db.Where("id = ? AND type = ?", assetIDStr, models.AssetTypeVideo).First(&asset).Error; err == nil {
					// 优先使用 local_path
					if asset.LocalPath != nil && *asset.LocalPath != "" {
						// 检查是否已经是完整路径
						if filepath.IsAbs(*asset.LocalPath) || filepath.HasPrefix(*asset.LocalPath, s.storagePath) {
							videoURL = *asset.LocalPath
						} else {
							videoURL = filepath.Join(s.storagePath, *asset.LocalPath)
						}
						s.log.Infow("Using local video from asset library", "asset_id", assetIDStr, "local_path", videoURL)
					} else {
						// 回退到远程 URL
						videoURL = asset.URL
						s.log.Infow("Using remote video from asset library", "asset_id", assetIDStr, "video_url", videoURL)
					}
					// 如果asset关联了storyboard，使用关联的storyboard_id
					if asset.StoryboardID != nil {
						sceneID = *asset.StoryboardID
					}
				} else {
					s.log.Warnw("Asset not found, will try storyboard video", "asset_id", assetIDStr, "error", err)
				}
			}

			// 如果没有从素材库获取到视频，尝试从storyboard获取
			if videoURL == "" && clip.StoryboardID != "" {
				scene, exists := sceneMap[clip.StoryboardID]
				if !exists {
					s.log.Warnw("Storyboard not found in episode, skipping", "storyboard_id", clip.StoryboardID)
					continue
				}

				// 查找关联的 video_generation 记录以获取 local_path
				var videoGen models.VideoGeneration
				if err := s.db.Where("storyboard_id = ? AND status = ?", scene.ID, "completed").Order("created_at DESC").First(&videoGen).Error; err == nil {
					if videoGen.LocalPath != nil && *videoGen.LocalPath != "" {
						// 检查是否已经是完整路径
						if filepath.IsAbs(*videoGen.LocalPath) || filepath.HasPrefix(*videoGen.LocalPath, s.storagePath) {
							videoURL = *videoGen.LocalPath
						} else {
							videoURL = filepath.Join(s.storagePath, *videoGen.LocalPath)
						}
						sceneID = scene.ID
						s.log.Infow("Using local video from video_generation", "storyboard_id", clip.StoryboardID, "local_path", videoURL)
					} else if scene.VideoURL != nil && *scene.VideoURL != "" {
						// 回退到远程 URL
						videoURL = *scene.VideoURL
						sceneID = scene.ID
						s.log.Infow("Using remote video from storyboard", "storyboard_id", clip.StoryboardID, "video_url", videoURL)
					}
				} else if scene.VideoURL != nil && *scene.VideoURL != "" {
					// 如果没有找到 video_generation，直接使用 storyboard 的 video_url
					videoURL = *scene.VideoURL
					sceneID = scene.ID
					s.log.Infow("Using video from storyboard (no video_generation found)", "storyboard_id", clip.StoryboardID, "video_url", videoURL)
				}
			}

			// 如果仍然没有视频URL，跳过该片段
			if videoURL == "" {
				s.log.Warnw("No video available for clip, skipping", "clip", clip)
				if clip.StoryboardID != "" {
					if scene, exists := sceneMap[clip.StoryboardID]; exists {
						skippedScenes = append(skippedScenes, scene.StoryboardNumber)
					}
				}
				continue
			}

			sceneClip := models.SceneClip{
				SceneID:    sceneID,
				VideoURL:   videoURL,
				Duration:   clip.Duration,
				Order:      clip.Order,
				StartTime:  clip.StartTime,
				EndTime:    clip.EndTime,
				Transition: clip.Transition,
			}
			s.log.Infow("Adding scene clip with transition",
				"scene_id", sceneID,
				"order", clip.Order,
				"video_url", videoURL,
				"transition", clip.Transition)
			sceneClips = append(sceneClips, sceneClip)
			s.log.Infow("Scene clip added", "total_clips", len(sceneClips))
		}
	} else {
		// 没有时间线数据，使用默认场景顺序
		if len(episode.Storyboards) == 0 {
			return nil, fmt.Errorf("no scenes found for this episode")
		}

		order := 0
		for _, scene := range episode.Storyboards {
			// 优先从素材库查找该分镜关联的视频
			var videoURL string
			var asset models.Asset
			if err := s.db.Where("storyboard_id = ? AND type = ? AND episode_id = ?",
				scene.ID, models.AssetTypeVideo, episode.ID).
				Order("created_at DESC").
				First(&asset).Error; err == nil {
				// 优先使用 local_path
				if asset.LocalPath != nil && *asset.LocalPath != "" {
					// 检查是否已经是完整路径
					if filepath.IsAbs(*asset.LocalPath) || filepath.HasPrefix(*asset.LocalPath, s.storagePath) {
						videoURL = *asset.LocalPath
					} else {
						videoURL = filepath.Join(s.storagePath, *asset.LocalPath)
					}
					s.log.Infow("Using local video from asset library for storyboard",
						"storyboard_id", scene.ID,
						"asset_id", asset.ID,
						"local_path", videoURL)
				} else {
					videoURL = asset.URL
					s.log.Infow("Using remote video from asset library for storyboard",
						"storyboard_id", scene.ID,
						"asset_id", asset.ID,
						"video_url", videoURL)
				}
			} else {
				// 如果素材库没有，查找 video_generation 记录
				var videoGen models.VideoGeneration
				if err := s.db.Where("storyboard_id = ? AND status = ?", scene.ID, "completed").Order("created_at DESC").First(&videoGen).Error; err == nil {
					if videoGen.LocalPath != nil && *videoGen.LocalPath != "" {
						// 检查是否已经是完整路径
						if filepath.IsAbs(*videoGen.LocalPath) || filepath.HasPrefix(*videoGen.LocalPath, s.storagePath) {
							videoURL = *videoGen.LocalPath
						} else {
							videoURL = filepath.Join(s.storagePath, *videoGen.LocalPath)
						}
						s.log.Infow("Using local video from video_generation for storyboard",
							"storyboard_id", scene.ID,
							"local_path", videoURL)
					} else if scene.VideoURL != nil && *scene.VideoURL != "" {
						videoURL = *scene.VideoURL
						s.log.Infow("Using remote video from storyboard",
							"storyboard_id", scene.ID,
							"video_url", videoURL)
					}
				} else if scene.VideoURL != nil && *scene.VideoURL != "" {
					// 最后回退到 storyboard 的 video_url
					videoURL = *scene.VideoURL
					s.log.Infow("Using fallback video from storyboard",
						"storyboard_id", scene.ID,
						"video_url", videoURL)
				}
			}

			// 跳过没有视频的场景
			if videoURL == "" {
				s.log.Warnw("Scene has no video, skipping", "storyboard_number", scene.StoryboardNumber)
				skippedScenes = append(skippedScenes, scene.StoryboardNumber)
				continue
			}

			clip := models.SceneClip{
				SceneID:  scene.ID,
				VideoURL: videoURL,
				Duration: float64(scene.Duration),
				Order:    order,
			}
			sceneClips = append(sceneClips, clip)
			order++
		}
	}

	// 检查是否至少有一个场景可以合成
	if len(sceneClips) == 0 {
		return nil, fmt.Errorf("no scenes with videos available for merging")
	}

	// 创建视频合成任务
	title := fmt.Sprintf("%s - 第%d集", episode.Drama.Title, episode.EpisodeNum)

	finalReq := &MergeVideoRequest{
		EpisodeID: episodeID,
		DramaID:   fmt.Sprintf("%d", episode.DramaID),
		Title:     title,
		Scenes:    sceneClips,
		Provider:  "doubao", // 默认使用doubao
	}

	// 执行视频合成
	videoMerge, err := s.MergeVideos(finalReq)
	if err != nil {
		return nil, fmt.Errorf("failed to start video merge: %w", err)
	}

	// 更新episode状态为processing
	s.db.Model(&episode).Updates(map[string]interface{}{
		"status": "processing",
	})

	result := map[string]interface{}{
		"message":      "视频合成任务已创建，正在后台处理",
		"merge_id":     videoMerge.ID,
		"episode_id":   episodeID,
		"scenes_count": len(sceneClips),
	}

	// 如果有跳过的场景，添加提示信息
	if len(skippedScenes) > 0 {
		result["skipped_scenes"] = skippedScenes
		result["warning"] = fmt.Sprintf("已跳过 %d 个未生成视频的场景（场景编号：%v）", len(skippedScenes), skippedScenes)
	}

	return result, nil
}
