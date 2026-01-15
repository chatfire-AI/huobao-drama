package video

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"
)

type OpenAISoraClient struct {
	BaseURL    string
	APIKey     string
	Model      string
	HTTPClient *http.Client
}

type OpenAISoraResponse struct {
	ID          string `json:"id"`
	Object      string `json:"object"`
	Model       string `json:"model"`
	Status      string `json:"status"`
	Progress    int    `json:"progress"`
	CreatedAt   int64  `json:"created_at"`
	CompletedAt int64  `json:"completed_at"`
	Size        string `json:"size"`
	Seconds     string `json:"seconds"`
	Quality     string `json:"quality"`
	VideoURL    string `json:"video_url"` // 直接的video_url字段
	Video       struct {
		URL string `json:"url"`
	} `json:"video"` // 嵌套的video.url字段（兼容）
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error"`
}

func NewOpenAISoraClient(baseURL, apiKey, model string) *OpenAISoraClient {
	return &OpenAISoraClient{
		BaseURL: baseURL,
		APIKey:  apiKey,
		Model:   model,
		HTTPClient: &http.Client{
			Timeout: 300 * time.Second,
		},
	}
}

func (c *OpenAISoraClient) GenerateVideo(imageURL, prompt string, opts ...VideoOption) (*VideoResult, error) {
	options := &VideoOptions{
		Duration: 4,
	}

	for _, opt := range opts {
		opt(options)
	}

	model := c.Model
	if options.Model != "" {
		model = options.Model
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	writer.WriteField("model", model)
	writer.WriteField("prompt", prompt)

	if imageURL != "" {
		writer.WriteField("input_reference", imageURL)
	}

	if options.Duration > 0 {
		writer.WriteField("seconds", fmt.Sprintf("%d", options.Duration))
	}

	if options.Resolution != "" {
		writer.WriteField("size", options.Resolution)
	}

	writer.Close()

	endpoint := c.BaseURL + "/videos"
	req, err := http.NewRequest("POST", endpoint, body)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+c.APIKey)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result OpenAISoraResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	if result.Error.Message != "" {
		return nil, fmt.Errorf("openai error: %s", result.Error.Message)
	}

	videoResult := &VideoResult{
		TaskID:    result.ID,
		Status:    result.Status,
		Completed: result.Status == "completed",
	}

	// 优先使用video_url字段，兼容video.url嵌套结构
	if result.VideoURL != "" {
		videoResult.VideoURL = result.VideoURL
	} else if result.Video.URL != "" {
		videoResult.VideoURL = result.Video.URL
	}

	return videoResult, nil
}

func (c *OpenAISoraClient) GetTaskStatus(taskID string) (*VideoResult, error) {
	endpoint := c.BaseURL + "/videos/" + taskID
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

	var result OpenAISoraResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	videoResult := &VideoResult{
		TaskID:    result.ID,
		Status:    result.Status,
		Completed: result.Status == "completed",
	}

	if result.Error.Message != "" {
		videoResult.Error = result.Error.Message
	}

	// 优先使用video_url字段，兼容video.url嵌套结构
	if result.VideoURL != "" {
		videoResult.VideoURL = result.VideoURL
	} else if result.Video.URL != "" {
		videoResult.VideoURL = result.Video.URL
	}

	return videoResult, nil
}
