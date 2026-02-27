package video

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type GeminiVideoClient struct {
	BaseURL    string
	APIKey     string
	Model      string
	HTTPClient *http.Client
}

// Gemini Video API 请求结构
type GeminiVideoGenerateRequest struct {
	Model  string                      `json:"model"`
	Prompt string                      `json:"prompt"`
	Config *GeminiVideoGenerationConfig `json:"generationConfig,omitempty"`
}

type GeminiVideoGenerationConfig struct {
	AspectRatio   string `json:"aspectRatio,omitempty"`    // "16:9" or "9:16"
	Duration      int    `json:"duration,omitempty"`       // 4, 6, or 8 seconds
	Resolution    string `json:"resolution,omitempty"`     // "720p", "1080p", or "4k"
}

// 文生视频请求
type GeminiTextToVideoRequest struct {
	Model  string                      `json:"model"`
	Prompt string                      `json:"prompt"`
	Config *GeminiVideoGenerationConfig `json:"generationConfig,omitempty"`
}

// 图生视频请求
type GeminiImageToVideoRequest struct {
	Model            string                      `json:"model"`
	Prompt           string                      `json:"prompt"`
	ReferenceImages  []GeminiVideoImage           `json:"referenceImages,omitempty"`
	Config           *GeminiVideoGenerationConfig `json:"generationConfig,omitempty"`
}

type GeminiVideoImage struct {
	Image GeminiVideoImageData `json:"image"`
}

type GeminiVideoImageData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"` // base64编码的图片数据
}

// Gemini Video API 响应结构（异步操作）
type GeminiVideoOperationResponse struct {
	Name     string                      `json:"name"`     // operation ID，格式如 "operations/xxx"
	Metadata GeminiVideoOperationMetadata `json:"metadata,omitempty"`
	Done     bool                        `json:"done"`
	Error    *GeminiVideoError           `json:"error,omitempty"`
	Response *GeminiVideoResponse        `json:"response,omitempty"`
}

type GeminiVideoOperationMetadata struct {
	CreateTime   string `json:"createTime,omitempty"`
	UpdateTime   string `json:"updateTime,omitempty"`
}

type GeminiVideoError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Status  string `json:"status"`
}

type GeminiVideoResponse struct {
	GeneratedVideos []GeminiGeneratedVideo `json:"generatedVideos"`
}

type GeminiGeneratedVideo struct {
	Video GeminiVideoFile `json:"video"`
}

type GeminiVideoFile struct {
	Name        string `json:"name"`        // file ID，格式如 "files/xxx"
	DisplayName string `json:"displayName,omitempty"`
	MimeType    string `json:"mimeType"`
	SizeBytes   int64  `json:"sizeBytes,omitempty"`
	CreateTime  string `json:"createTime,omitempty"`
	UpdateTime  string `json:"updateTime,omitempty"`
	ExpirationTime string `json:"expirationTime,omitempty"`
	VideoMetadata *GeminiVideoMetadata `json:"videoMetadata,omitempty"`
}

type GeminiVideoMetadata struct {
	VideoDuration string `json:"videoDuration,omitempty"` // 格式如 "8.040s"
}

func NewGeminiVideoClient(baseURL, apiKey, model string) *GeminiVideoClient {
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com"
	}
	if model == "" {
		model = "veo-3.1-generate-preview"
	}
	return &GeminiVideoClient{
		BaseURL: baseURL,
		APIKey:  apiKey,
		Model:   model,
		HTTPClient: &http.Client{
			Timeout: 180 * time.Second,
		},
	}
}

func (c *GeminiVideoClient) GenerateVideo(imageURL, prompt string, opts ...VideoOption) (*VideoResult, error) {
	options := &VideoOptions{
		Duration:    8,
		AspectRatio: "16:9",
	}

	for _, opt := range opts {
		opt(options)
	}

	model := c.Model
	if options.Model != "" {
		model = options.Model
	}

	// 构建生成配置
	config := &GeminiVideoGenerationConfig{
		AspectRatio: options.AspectRatio,
		Duration:    options.Duration,
	}

	// 设置分辨率（Gemini支持 720p, 1080p, 4k）
	if options.Resolution != "" {
		config.Resolution = options.Resolution
	}

	var reqBody interface{}
	
	// 判断是否有参考图片
	hasReferenceImages := false
	var referenceImages []GeminiVideoImage

	// 处理多图模式
	if len(options.ReferenceImageURLs) > 0 {
		hasReferenceImages = true
		for _, imgURL := range options.ReferenceImageURLs {
			base64Data, mimeType, err := c.processImageInput(imgURL)
			if err != nil {
				return nil, fmt.Errorf("failed to process reference image: %w", err)
			}
			referenceImages = append(referenceImages, GeminiVideoImage{
				Image: GeminiVideoImageData{
					MimeType: mimeType,
					Data:     base64Data,
				},
			})
		}
	} else if imageURL != "" {
		// 单图模式
		hasReferenceImages = true
		base64Data, mimeType, err := c.processImageInput(imageURL)
		if err != nil {
			return nil, fmt.Errorf("failed to process input image: %w", err)
		}
		referenceImages = append(referenceImages, GeminiVideoImage{
			Image: GeminiVideoImageData{
				MimeType: mimeType,
				Data:     base64Data,
			},
		})
	}

	// 根据是否有参考图片选择不同的请求类型
	if hasReferenceImages {
		reqBody = GeminiImageToVideoRequest{
			Model:           model,
			Prompt:          prompt,
			ReferenceImages: referenceImages,
			Config:          config,
		}
	} else {
		reqBody = GeminiTextToVideoRequest{
			Model:  model,
			Prompt: prompt,
			Config: config,
		}
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	// 构建API URL
	endpoint := fmt.Sprintf("%s/v1beta/models/%s:generateVideos?key=%s", c.BaseURL, model, c.APIKey)

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var operationResp GeminiVideoOperationResponse
	if err := json.Unmarshal(body, &operationResp); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	if operationResp.Error != nil {
		return nil, fmt.Errorf("gemini error: %s (code %d)", operationResp.Error.Message, operationResp.Error.Code)
	}

	// 提取 operation ID（去掉 "operations/" 前缀）
	taskID := operationResp.Name
	if strings.HasPrefix(taskID, "operations/") {
		taskID = strings.TrimPrefix(taskID, "operations/")
	}

	result := &VideoResult{
		TaskID:    taskID,
		Status:    "processing",
		Completed: operationResp.Done,
	}

	// 如果任务已完成（同步返回），直接处理视频结果
	if operationResp.Done && operationResp.Response != nil {
		if len(operationResp.Response.GeneratedVideos) > 0 {
			videoFile := operationResp.Response.GeneratedVideos[0].Video
			
			// 下载视频文件并转换为可访问的URL
			videoURL, err := c.downloadVideoFile(videoFile.Name)
			if err != nil {
				return nil, fmt.Errorf("failed to download video: %w", err)
			}
			
			result.VideoURL = videoURL
			result.Status = "completed"
			
			// 解析视频时长
			if videoFile.VideoMetadata != nil && videoFile.VideoMetadata.VideoDuration != "" {
				duration := c.parseVideoDuration(videoFile.VideoMetadata.VideoDuration)
				result.Duration = duration
			}
		}
	}

	return result, nil
}

func (c *GeminiVideoClient) GetTaskStatus(taskID string) (*VideoResult, error) {
	// 确保 taskID 包含 "operations/" 前缀
	operationName := taskID
	if !strings.HasPrefix(operationName, "operations/") {
		operationName = "operations/" + taskID
	}

	endpoint := fmt.Sprintf("%s/v1beta/%s?key=%s", c.BaseURL, operationName, c.APIKey)

	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var operationResp GeminiVideoOperationResponse
	if err := json.Unmarshal(body, &operationResp); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	result := &VideoResult{
		TaskID:    taskID,
		Completed: operationResp.Done,
		Status:    "processing",
	}

	if operationResp.Error != nil {
		result.Error = fmt.Sprintf("%s (code %d)", operationResp.Error.Message, operationResp.Error.Code)
		result.Status = "failed"
		return result, nil
	}

	if operationResp.Done && operationResp.Response != nil {
		if len(operationResp.Response.GeneratedVideos) > 0 {
			videoFile := operationResp.Response.GeneratedVideos[0].Video
			
			// 下载视频文件
			videoURL, err := c.downloadVideoFile(videoFile.Name)
			if err != nil {
				result.Error = fmt.Sprintf("failed to download video: %v", err)
				result.Status = "failed"
				return result, nil
			}
			
			result.VideoURL = videoURL
			result.Status = "completed"
			
			// 解析视频时长
			if videoFile.VideoMetadata != nil && videoFile.VideoMetadata.VideoDuration != "" {
				duration := c.parseVideoDuration(videoFile.VideoMetadata.VideoDuration)
				result.Duration = duration
			}
		}
	}

	return result, nil
}

// downloadVideoFile 使用 Files API 下载生成的视频
func (c *GeminiVideoClient) downloadVideoFile(fileName string) (string, error) {
	// fileName 格式为 "files/xxx"
	endpoint := fmt.Sprintf("%s/v1beta/%s?key=%s", c.BaseURL, fileName, c.APIKey)

	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return "", fmt.Errorf("create download request: %w", err)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("send download request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read download response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download failed (status %d): %s", resp.StatusCode, string(body))
	}

	var fileResp GeminiVideoFile
	if err := json.Unmarshal(body, &fileResp); err != nil {
		return "", fmt.Errorf("parse file response: %w", err)
	}

	// Gemini API 返回的视频文件需要通过特定的URL访问
	// 构建可访问的URL
	videoURL := fmt.Sprintf("%s/v1beta/%s?alt=media&key=%s", c.BaseURL, fileName, c.APIKey)
	
	return videoURL, nil
}

// processImageInput 处理输入图片，支持URL、base64和data URI
func (c *GeminiVideoClient) processImageInput(imageInput string) (string, string, error) {
	// 如果已经是base64格式（不带前缀）
	if !strings.Contains(imageInput, "://") && !strings.HasPrefix(imageInput, "data:") {
		return imageInput, "image/jpeg", nil
	}

	// 如果是data URI格式，解析出base64数据和mime type
	if strings.HasPrefix(imageInput, "data:") {
		parts := strings.Split(imageInput, ",")
		if len(parts) != 2 {
			return "", "", fmt.Errorf("invalid data URI format")
		}

		// 提取mime type
		mimeType := "image/jpeg"
		headerParts := strings.Split(parts[0], ";")
		if len(headerParts) > 0 {
			mimeTypePart := strings.TrimPrefix(headerParts[0], "data:")
			if mimeTypePart != "" {
				mimeType = mimeTypePart
			}
		}

		return parts[1], mimeType, nil
	}

	// 如果是HTTP/HTTPS URL，下载并转换为base64
	if strings.HasPrefix(imageInput, "http://") || strings.HasPrefix(imageInput, "https://") {
		return c.downloadImageToBase64(imageInput)
	}

	return "", "", fmt.Errorf("unsupported image input format")
}

// downloadImageToBase64 下载图片URL并转换为base64
func (c *GeminiVideoClient) downloadImageToBase64(imageURL string) (string, string, error) {
	resp, err := http.Get(imageURL)
	if err != nil {
		return "", "", fmt.Errorf("download image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("download image failed with status: %d", resp.StatusCode)
	}

	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("read image data: %w", err)
	}

	// 根据Content-Type确定mimeType
	mimeType := resp.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	base64Data := base64.StdEncoding.EncodeToString(imageData)
	return base64Data, mimeType, nil
}

// parseVideoDuration 解析Gemini返回的视频时长格式（如 "8.040s"）
func (c *GeminiVideoClient) parseVideoDuration(durationStr string) int {
	// 去掉 "s" 后缀
	durationStr = strings.TrimSuffix(durationStr, "s")
	
	// 转换为浮点数并四舍五入
	var duration float64
	fmt.Sscanf(durationStr, "%f", &duration)
	
	return int(duration + 0.5)
}
