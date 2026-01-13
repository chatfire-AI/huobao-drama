package video

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// VolcesArkClient 火山引擎ARK视频生成客户端
type VolcesArkClient struct {
	BaseURL       string
	APIKey        string
	Model         string
	Endpoint      string
	QueryEndpoint string
	HTTPClient    *http.Client
}

type VolcesArkContent struct {
	Type     string                 `json:"type"`
	Text     string                 `json:"text,omitempty"`
	ImageURL map[string]interface{} `json:"image_url,omitempty"`
	Role     string                 `json:"role,omitempty"`
}

type VolcesArkRequest struct {
	Model         string             `json:"model"`
	Content       []VolcesArkContent `json:"content"`
	GenerateAudio bool               `json:"generate_audio,omitempty"`
}

type VolcesArkResponse struct {
	ID      string `json:"id"`
	Model   string `json:"model"`
	Status  string `json:"status"`
	Content struct {
		VideoURL string `json:"video_url"`
	} `json:"content"`
	Usage struct {
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
	CreatedAt             int64       `json:"created_at"`
	UpdatedAt             int64       `json:"updated_at"`
	Seed                  int         `json:"seed"`
	Resolution            string      `json:"resolution"`
	Ratio                 string      `json:"ratio"`
	Duration              int         `json:"duration"`
	FramesPerSecond       int         `json:"framespersecond"`
	ServiceTier           string      `json:"service_tier"`
	ExecutionExpiresAfter int         `json:"execution_expires_after"`
	GenerateAudio         bool        `json:"generate_audio"`
	Error                 interface{} `json:"error,omitempty"`
}

func NewVolcesArkClient(baseURL, apiKey, model, endpoint, queryEndpoint string) *VolcesArkClient {
	if endpoint == "" {
		endpoint = "/api/v3/contents/generations/tasks"
	}
	if queryEndpoint == "" {
		queryEndpoint = endpoint
	}
	return &VolcesArkClient{
		BaseURL:       baseURL,
		APIKey:        apiKey,
		Model:         model,
		Endpoint:      endpoint,
		QueryEndpoint: queryEndpoint,
		HTTPClient: &http.Client{
			Timeout: 300 * time.Second,
		},
	}
}

// GenerateVideo 生成视频（支持首帧、首尾帧、参考图等多种模式）
func (c *VolcesArkClient) GenerateVideo(imageURL, prompt string, opts ...VideoOption) (*VideoResult, error) {
	options := &VideoOptions{
		Duration:    5,
		AspectRatio: "adaptive",
	}

	for _, opt := range opts {
		opt(options)
	}

	model := c.Model
	if options.Model != "" {
		model = options.Model
	}

	// 构建prompt文本（包含duration和ratio参数）
	promptText := prompt
	if options.AspectRatio != "" {
		promptText += fmt.Sprintf("  --ratio %s", options.AspectRatio)
	}
	if options.Duration > 0 {
		promptText += fmt.Sprintf("  --dur %d", options.Duration)
	}

	content := []VolcesArkContent{
		{
			Type: "text",
			Text: promptText,
		},
	}

	// 处理不同的图片模式
	// 1. 组图模式（多个reference_image）
	if len(options.ReferenceImageURLs) > 0 {
		for _, refURL := range options.ReferenceImageURLs {
			content = append(content, VolcesArkContent{
				Type: "image_url",
				ImageURL: map[string]interface{}{
					"url": refURL,
				},
				Role: "reference_image",
			})
		}
	} else if options.FirstFrameURL != "" && options.LastFrameURL != "" {
		// 2. 首尾帧模式
		content = append(content, VolcesArkContent{
			Type: "image_url",
			ImageURL: map[string]interface{}{
				"url": options.FirstFrameURL,
			},
			Role: "first_frame",
		})
		content = append(content, VolcesArkContent{
			Type: "image_url",
			ImageURL: map[string]interface{}{
				"url": options.LastFrameURL,
			},
			Role: "last_frame",
		})
	} else if imageURL != "" {
		// 3. 单图模式（默认）
		content = append(content, VolcesArkContent{
			Type: "image_url",
			ImageURL: map[string]interface{}{
				"url": imageURL,
			},
			// 单图模式不需要role
		})
	} else if options.FirstFrameURL != "" {
		// 4. 只有首帧
		content = append(content, VolcesArkContent{
			Type: "image_url",
			ImageURL: map[string]interface{}{
				"url": options.FirstFrameURL,
			},
			Role: "first_frame",
		})
	}

	// 只有 seedance-1-5-pro 模型支持 generate_audio 参数
	generateAudio := false
	if strings.Contains(strings.ToLower(model), "seedance-1-5-pro") {
		generateAudio = true
	}

	reqBody := VolcesArkRequest{
		Model:         model,
		Content:       content,
		GenerateAudio: generateAudio,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	endpoint := c.BaseURL + c.Endpoint
	fmt.Printf("[VolcesARK] Generating video - Endpoint: %s, FullURL: %s, Model: %s\n", c.Endpoint, endpoint, model)
	fmt.Printf("[VolcesARK] Request body: %s\n", string(jsonData))

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	fmt.Printf("[VolcesARK] Response status: %d, body: %s\n", resp.StatusCode, string(body))

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var result VolcesArkResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	fmt.Printf("[VolcesARK] Video generation initiated - TaskID: %s, Status: %s\n", result.ID, result.Status)

	if result.Error != nil {
		errorMsg := fmt.Sprintf("%v", result.Error)
		return nil, fmt.Errorf("volces error: %s", errorMsg)
	}

	videoResult := &VideoResult{
		TaskID:    result.ID,
		Status:    result.Status,
		Completed: result.Status == "completed" || result.Status == "succeeded",
		Duration:  result.Duration,
	}

	if result.Content.VideoURL != "" {
		videoResult.VideoURL = result.Content.VideoURL
		videoResult.Completed = true
	}

	return videoResult, nil
}

func (c *VolcesArkClient) GetTaskStatus(taskID string) (*VideoResult, error) {
	// 替换占位符{taskId}、{task_id}或直接拼接
	queryPath := c.QueryEndpoint
	if strings.Contains(queryPath, "{taskId}") {
		queryPath = strings.ReplaceAll(queryPath, "{taskId}", taskID)
	} else if strings.Contains(queryPath, "{task_id}") {
		queryPath = strings.ReplaceAll(queryPath, "{task_id}", taskID)
	} else {
		queryPath = queryPath + "/" + taskID
	}

	endpoint := c.BaseURL + queryPath
	fmt.Printf("[VolcesARK] Querying task status - TaskID: %s, QueryEndpoint: %s, FullURL: %s\n", taskID, c.QueryEndpoint, endpoint)

	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.APIKey)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	fmt.Printf("[VolcesARK] Response body: %s\n", string(body))

	var result VolcesArkResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	fmt.Printf("[VolcesARK] Parsed result - ID: %s, Status: %s, VideoURL: %s\n", result.ID, result.Status, result.Content.VideoURL)

	videoResult := &VideoResult{
		TaskID:    result.ID,
		Status:    result.Status,
		Completed: result.Status == "completed" || result.Status == "succeeded",
		Duration:  result.Duration,
	}

	if result.Error != nil {
		videoResult.Error = fmt.Sprintf("%v", result.Error)
	}

	if result.Content.VideoURL != "" {
		videoResult.VideoURL = result.Content.VideoURL
		videoResult.Completed = true
	}

	return videoResult, nil
}
