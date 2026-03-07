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

// ChatfireClient Chatfire 视频生成客户端
type ChatfireClient struct {
	BaseURL       string
	APIKey        string
	Model         string
	Endpoint      string
	QueryEndpoint string
	HTTPClient    *http.Client
}

type ChatfireRequest struct {
	Model    string `json:"model"`
	Prompt   string `json:"prompt"`
	ImageURL string `json:"image_url,omitempty"`
	Duration int    `json:"duration,omitempty"`
	Size     string `json:"size,omitempty"`
}

// ChatfireSoraRequest Sora 模型请求格式
type ChatfireSoraRequest struct {
	Model          string `json:"model"`
	Prompt         string `json:"prompt"`
	Seconds        string `json:"seconds,omitempty"`
	Size           string `json:"size,omitempty"`
	InputReference string `json:"input_reference,omitempty"`
}

// ChatfireDoubaoRequest 豆包/火山模型请求格式
type ChatfireDoubaoRequest struct {
	Model   string `json:"model"`
	Content []struct {
		Type     string                 `json:"type"`
		Text     string                 `json:"text,omitempty"`
		ImageURL map[string]interface{} `json:"image_url,omitempty"`
		Role     string                 `json:"role,omitempty"`
	} `json:"content"`
}

type ChatfireResponse struct {
	ID     string          `json:"id"`
	TaskID string          `json:"task_id,omitempty"`
	Status string          `json:"status,omitempty"`
	Error  json.RawMessage `json:"error,omitempty"`
	Data   struct {
		ID       string `json:"id,omitempty"`
		Status   string `json:"status,omitempty"`
		VideoURL string `json:"video_url,omitempty"`
	} `json:"data,omitempty"`
}

type ChatfireTaskResponse struct {
	ID       string          `json:"id,omitempty"`
	TaskID   string          `json:"task_id,omitempty"`
	Status   string          `json:"status,omitempty"`
	VideoURL string          `json:"video_url,omitempty"`
	Error    json.RawMessage `json:"error,omitempty"`
	Data     struct {
		ID       string `json:"id,omitempty"`
		Status   string `json:"status,omitempty"`
		VideoURL string `json:"video_url,omitempty"`
	} `json:"data,omitempty"`
	Content struct {
		VideoURL string `json:"video_url,omitempty"`
	} `json:"content,omitempty"`
}

// getErrorMessage 从 error 字段提取错误信息（支持字符串或对象）
func getErrorMessage(errorData json.RawMessage) string {
	if len(errorData) == 0 {
		return ""
	}

	// 尝试解析为字符串
	var errStr string
	if err := json.Unmarshal(errorData, &errStr); err == nil {
		return errStr
	}

	// 尝试解析为对象
	var errObj struct {
		Message string `json:"message"`
		Code    string `json:"code"`
	}
	if err := json.Unmarshal(errorData, &errObj); err == nil {
		if errObj.Message != "" {
			return errObj.Message
		}
	}

	// 返回原始 JSON 字符串
	return string(errorData)
}

func NewChatfireClient(baseURL, apiKey, model, endpoint, queryEndpoint string) *ChatfireClient {
	if endpoint == "" {
		endpoint = "/video/generations"
	}
	if queryEndpoint == "" {
		queryEndpoint = "/video/task/{taskId}"
	}
	return &ChatfireClient{
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

func (c *ChatfireClient) GenerateVideo(imageURL, prompt string, opts ...VideoOption) (*VideoResult, error) {
	options := &VideoOptions{
		Duration:    5,
		AspectRatio: "16:9",
	}

	for _, opt := range opts {
		opt(options)
	}

	model := c.Model
	if options.Model != "" {
		model = options.Model
	}
	model = strings.TrimSpace(model)
	lowerModel := strings.ToLower(model)

	// 根据模型名称选择请求格式
	var jsonData []byte
	var err error

	if strings.Contains(lowerModel, "doubao") || strings.Contains(lowerModel, "seedance") {
		normalizedModel := normalizeChatfireVideoModel(model)
		// 豆包/火山格式
		reqBody := ChatfireDoubaoRequest{
			Model: normalizedModel,
		}

		// 构建prompt文本（包含duration和ratio参数）
		promptText := prompt
		if options.AspectRatio != "" {
			promptText += fmt.Sprintf("  --ratio %s", options.AspectRatio)
		}
		if options.Duration > 0 {
			promptText += fmt.Sprintf("  --dur %d", options.Duration)
		}

		// 添加文本内容
		reqBody.Content = append(reqBody.Content, struct {
			Type     string                 `json:"type"`
			Text     string                 `json:"text,omitempty"`
			ImageURL map[string]interface{} `json:"image_url,omitempty"`
			Role     string                 `json:"role,omitempty"`
		}{Type: "text", Text: promptText})

		// 处理不同的图片模式
		// 1. 组图模式（多个reference_image）
		if len(options.ReferenceImageURLs) > 0 {
			for _, refURL := range options.ReferenceImageURLs {
				reqBody.Content = append(reqBody.Content, struct {
					Type     string                 `json:"type"`
					Text     string                 `json:"text,omitempty"`
					ImageURL map[string]interface{} `json:"image_url,omitempty"`
					Role     string                 `json:"role,omitempty"`
				}{
					Type: "image_url",
					ImageURL: map[string]interface{}{
						"url": refURL,
					},
					Role: "reference_image",
				})
			}
		} else if options.FirstFrameURL != "" && options.LastFrameURL != "" {
			// 2. 首尾帧模式
			reqBody.Content = append(reqBody.Content, struct {
				Type     string                 `json:"type"`
				Text     string                 `json:"text,omitempty"`
				ImageURL map[string]interface{} `json:"image_url,omitempty"`
				Role     string                 `json:"role,omitempty"`
			}{
				Type: "image_url",
				ImageURL: map[string]interface{}{
					"url": options.FirstFrameURL,
				},
				Role: "first_frame",
			})
			reqBody.Content = append(reqBody.Content, struct {
				Type     string                 `json:"type"`
				Text     string                 `json:"text,omitempty"`
				ImageURL map[string]interface{} `json:"image_url,omitempty"`
				Role     string                 `json:"role,omitempty"`
			}{
				Type: "image_url",
				ImageURL: map[string]interface{}{
					"url": options.LastFrameURL,
				},
				Role: "last_frame",
			})
		} else if imageURL != "" {
			// 3. 单图模式（默认）
			reqBody.Content = append(reqBody.Content, struct {
				Type     string                 `json:"type"`
				Text     string                 `json:"text,omitempty"`
				ImageURL map[string]interface{} `json:"image_url,omitempty"`
				Role     string                 `json:"role,omitempty"`
			}{
				Type: "image_url",
				ImageURL: map[string]interface{}{
					"url": imageURL,
				},
				// 单图模式不需要role
			})
		} else if options.FirstFrameURL != "" {
			// 4. 只有首帧
			reqBody.Content = append(reqBody.Content, struct {
				Type     string                 `json:"type"`
				Text     string                 `json:"text,omitempty"`
				ImageURL map[string]interface{} `json:"image_url,omitempty"`
				Role     string                 `json:"role,omitempty"`
			}{
				Type: "image_url",
				ImageURL: map[string]interface{}{
					"url": options.FirstFrameURL,
				},
				Role: "first_frame",
			})
		}

		jsonData, err = json.Marshal(reqBody)
	} else if strings.Contains(lowerModel, "sora") {
		normalizedModel := normalizeChatfireVideoModel(model)
		// Sora 格式
		seconds := fmt.Sprintf("%d", options.Duration)
		size := options.AspectRatio
		if size == "16:9" {
			size = "1280x720"
		} else if size == "9:16" {
			size = "720x1280"
		}

		reqBody := ChatfireSoraRequest{
			Model:          normalizedModel,
			Prompt:         prompt,
			Seconds:        seconds,
			Size:           size,
			InputReference: imageURL,
		}
		jsonData, err = json.Marshal(reqBody)
	} else {
		// 默认格式
		reqBody := ChatfireRequest{
			Model:    model,
			Prompt:   prompt,
			ImageURL: imageURL,
			Duration: options.Duration,
			Size:     options.AspectRatio,
		}
		jsonData, err = json.Marshal(reqBody)
	}

	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	endpoint := c.BaseURL + c.Endpoint
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

	// 调试日志：打印响应内容
	fmt.Printf("[Chatfire] Response body: %s\n", string(body))

	var result ChatfireResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w, body: %s", err, string(body))
	}

	// 优先使用 id 字段，其次使用 task_id
	taskID := result.ID
	if taskID == "" {
		taskID = result.TaskID
	}

	// 如果有 data 嵌套，优先使用 data 中的值
	if result.Data.ID != "" {
		taskID = result.Data.ID
	}

	status := result.Status
	if status == "" && result.Data.Status != "" {
		status = result.Data.Status
	}

	fmt.Printf("[Chatfire] Parsed result - TaskID: %s, Status: %s\n", taskID, status)

	if errMsg := getErrorMessage(result.Error); errMsg != "" {
		return nil, fmt.Errorf("chatfire error: %s", errMsg)
	}

	videoResult := &VideoResult{
		TaskID:    taskID,
		Status:    status,
		Completed: status == "completed" || status == "succeeded",
		Duration:  options.Duration,
	}

	return videoResult, nil
}

func (c *ChatfireClient) GetTaskStatus(taskID string) (*VideoResult, error) {
	queryPath := c.QueryEndpoint
	if strings.Contains(queryPath, "{taskId}") {
		queryPath = strings.ReplaceAll(queryPath, "{taskId}", taskID)
	} else if strings.Contains(queryPath, "{task_id}") {
		queryPath = strings.ReplaceAll(queryPath, "{task_id}", taskID)
	} else {
		queryPath = queryPath + "/" + taskID
	}

	endpoint := c.BaseURL + queryPath
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

	// 调试日志：打印响应内容
	fmt.Printf("[Chatfire] GetTaskStatus Response body: %s\n", string(body))

	var result ChatfireTaskResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w, body: %s", err, string(body))
	}

	// 优先使用 id 字段，其次使用 task_id
	responseTaskID := result.ID
	if responseTaskID == "" {
		responseTaskID = result.TaskID
	}

	// 如果有 data 嵌套，优先使用 data 中的值
	if result.Data.ID != "" {
		responseTaskID = result.Data.ID
	}

	status := result.Status
	if status == "" && result.Data.Status != "" {
		status = result.Data.Status
	}

	// 按优先级获取 video_url：VideoURL -> Data.VideoURL -> Content.VideoURL
	videoURL := result.VideoURL
	if videoURL == "" && result.Data.VideoURL != "" {
		videoURL = result.Data.VideoURL
	}
	if videoURL == "" && result.Content.VideoURL != "" {
		videoURL = result.Content.VideoURL
	}

	fmt.Printf("[Chatfire] Parsed result - TaskID: %s, Status: %s, VideoURL: %s\n", responseTaskID, status, videoURL)

	videoResult := &VideoResult{
		TaskID:    responseTaskID,
		Status:    status,
		Completed: status == "completed" || status == "succeeded",
	}

	if errMsg := getErrorMessage(result.Error); errMsg != "" {
		videoResult.Error = errMsg
	}

	if videoURL != "" {
		videoResult.VideoURL = videoURL
		videoResult.Completed = true
	}

	return videoResult, nil
}

func normalizeChatfireVideoModel(model string) string {
	normalized := strings.ToLower(strings.TrimSpace(model))

	replacer := strings.NewReplacer(
		"seedance-1.0-", "seedance-1-0-",
		"seedance-1.5-", "seedance-1-5-",
	)

	return replacer.Replace(normalized)
}
