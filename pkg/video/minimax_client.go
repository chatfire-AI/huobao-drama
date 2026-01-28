package video

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// MiniMax Hailuo 支持的模型
const (
	// ModelHailuo23 全新视频生成模型，肢体动作、面部表情、物理表现与指令遵循再度突破
	// 支持：文生视频、图生视频
	// 时长：768P(6s/10s), 1080P(6s)
	ModelHailuo23 = "MiniMax-Hailuo-2.3"

	// ModelHailuo23Fast 全新图生视频模型，物理表现与指令遵循具佳，更快更优惠
	// 支持：图生视频
	// 时长：768P(6s/10s), 1080P(6s)
	ModelHailuo23Fast = "MiniMax-Hailuo-2.3-Fast"

	// ModelHailuo02 新一代视频生成模型，1080p 原生，SOTA 指令遵循，极致物理表现
	// 支持：文生视频、图生视频、首尾帧模式
	// 时长：768P(6s/10s), 1080P(6s)
	ModelHailuo02 = "MiniMax-Hailuo-02"
)

// MiniMax Hailuo 支持的分辨率
const (
	Resolution768P  = "768P"
	Resolution1080P = "1080P"
)

// MiniMax Hailuo 支持的时长（秒）
const (
	Duration6s  = 6
	Duration10s = 10
)

// MinimaxClient Minimax视频生成客户端
type MinimaxClient struct {
	BaseURL    string
	APIKey     string
	Model      string
	HTTPClient *http.Client
}

type MinimaxSubjectReference struct {
	Type  string   `json:"type"`
	Image []string `json:"image"`
}

type MinimaxRequest struct {
	Prompt           string                    `json:"prompt"`
	FirstFrameImage  string                    `json:"first_frame_image,omitempty"`
	LastFrameImage   string                    `json:"last_frame_image,omitempty"`
	SubjectReference []MinimaxSubjectReference `json:"subject_reference,omitempty"`
	Model            string                    `json:"model"`
	Duration         int                       `json:"duration,omitempty"`
	Resolution       string                    `json:"resolution,omitempty"`
}

// MinimaxCreateResponse 创建任务的响应
type MinimaxCreateResponse struct {
	TaskID   string `json:"task_id"`
	BaseResp struct {
		StatusCode int    `json:"status_code"`
		StatusMsg  string `json:"status_msg"`
	} `json:"base_resp"`
}

// MinimaxQueryResponse 查询任务状态的响应
type MinimaxQueryResponse struct {
	TaskID      string `json:"task_id"`
	Status      string `json:"status"` // Processing, Success, Failed
	FileID      string `json:"file_id"`
	VideoWidth  int    `json:"video_width"`
	VideoHeight int    `json:"video_height"`
	BaseResp    struct {
		StatusCode int    `json:"status_code"`
		StatusMsg  string `json:"status_msg"`
	} `json:"base_resp"`
}

// MinimaxFileResponse 获取文件信息的响应
type MinimaxFileResponse struct {
	File struct {
		FileID      interface{} `json:"file_id"` // 可能是 string 或 number
		Bytes       int         `json:"bytes"`
		CreatedAt   int64       `json:"created_at"`
		Filename    string      `json:"filename"`
		Purpose     string      `json:"purpose"`
		DownloadURL string      `json:"download_url"`
	} `json:"file"`
	BaseResp struct {
		StatusCode int    `json:"status_code"`
		StatusMsg  string `json:"status_msg"`
	} `json:"base_resp"`
}

func NewMinimaxClient(baseURL, apiKey, model string) *MinimaxClient {
	return &MinimaxClient{
		BaseURL: baseURL,
		APIKey:  apiKey,
		Model:   model,
		HTTPClient: &http.Client{
			Timeout: 300 * time.Second,
		},
	}
}

// GenerateVideo 生成视频（支持首尾帧和主体参考）
// 步骤1：创建任务，返回 task_id
func (c *MinimaxClient) GenerateVideo(imageURL, prompt string, opts ...VideoOption) (*VideoResult, error) {
	options := &VideoOptions{
		Duration:   6,
		Resolution: "1080P",
	}

	for _, opt := range opts {
		opt(options)
	}

	model := c.Model
	if options.Model != "" {
		model = options.Model
	}

	reqBody := MinimaxRequest{
		Prompt:   prompt,
		Model:    model,
		Duration: options.Duration,
	}

	// 设置分辨率
	if options.Resolution != "" {
		reqBody.Resolution = options.Resolution
	}

	// 支持首帧图片
	if options.FirstFrameURL != "" {
		reqBody.FirstFrameImage = options.FirstFrameURL
	} else if imageURL != "" {
		reqBody.FirstFrameImage = imageURL
	}

	// 支持尾帧图片
	if options.LastFrameURL != "" {
		reqBody.LastFrameImage = options.LastFrameURL
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	// 步骤1：创建任务，POST 请求
	// 注意：BaseURL 应该已包含 /v1，例如 https://api.minimaxi.com/v1
	endpoint := c.BaseURL + "/video_generation"
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

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var result MinimaxCreateResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	if result.BaseResp.StatusCode != 0 {
		return nil, fmt.Errorf("minimax error: %s", result.BaseResp.StatusMsg)
	}

	// 第一步只返回 task_id，状态为 Processing
	videoResult := &VideoResult{
		TaskID:    result.TaskID,
		Status:    "Processing",
		Completed: false,
	}

	return videoResult, nil
}

// GetTaskStatus 查询任务状态
// 步骤2：查询任务状态，如果成功则进入步骤3获取文件下载地址
func (c *MinimaxClient) GetTaskStatus(taskID string) (*VideoResult, error) {
	// 步骤2：查询任务状态
	// 注意：BaseURL 应该已包含 /v1
	endpoint := fmt.Sprintf("%s/query/video_generation?task_id=%s", c.BaseURL, taskID)
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

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var queryResult MinimaxQueryResponse
	if err := json.Unmarshal(body, &queryResult); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	if queryResult.BaseResp.StatusCode != 0 {
		return nil, fmt.Errorf("minimax error: %s", queryResult.BaseResp.StatusMsg)
	}

	videoResult := &VideoResult{
		TaskID:    queryResult.TaskID,
		Status:    queryResult.Status,
		Width:     queryResult.VideoWidth,
		Height:    queryResult.VideoHeight,
		Completed: false,
	}

	// 如果状态是 Success 且有 file_id，则获取文件下载地址
	if queryResult.Status == "Success" && queryResult.FileID != "" {
		downloadURL, err := c.getFileDownloadURL(queryResult.FileID)
		if err != nil {
			return nil, fmt.Errorf("failed to get download URL: %w", err)
		}
		videoResult.VideoURL = downloadURL
		videoResult.Completed = true
	} else if queryResult.Status == "Failed" {
		videoResult.Error = "Video generation failed"
		videoResult.Completed = true
	}

	return videoResult, nil
}

// getFileDownloadURL 步骤3：根据 file_id 获取文件下载地址
func (c *MinimaxClient) getFileDownloadURL(fileID string) (string, error) {
	// 注意：BaseURL 应该已包含 /v1
	endpoint := fmt.Sprintf("%s/files/retrieve?file_id=%s", c.BaseURL, fileID)
	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.APIKey)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var fileResult MinimaxFileResponse
	if err := json.Unmarshal(body, &fileResult); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	if fileResult.BaseResp.StatusCode != 0 {
		return "", fmt.Errorf("minimax error: %s", fileResult.BaseResp.StatusMsg)
	}

	return fileResult.File.DownloadURL, nil
}
