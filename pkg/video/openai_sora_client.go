package video

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto" // Added for explicit MIME header control
	"path/filepath"
	"strings"
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

	// Add basic fields
	writer.WriteField("model", model)
	writer.WriteField("prompt", prompt)

	if options.Duration > 0 {
		writer.WriteField("seconds", fmt.Sprintf("%d", options.Duration))
	}

	if options.Resolution != "" {
		writer.WriteField("size", options.Resolution)
	}

	// [PR FIX START]
	// The OpenAI Sora API requires 'input_reference' to be a file upload (binary), not a URL string
	// set the Content-Type header (e.g., image/png) or the API returns 400
	if imageURL != "" {
		var imageData []byte
		var mimeType string
		var filename string = "reference_image.png"

		if strings.HasPrefix(imageURL, "data:") {
			// Case A: Handle Base64 Data URI (often stored in DB)
			parts := strings.Split(imageURL, ",")
			if len(parts) != 2 {
				return nil, fmt.Errorf("invalid data URI format")
			}

			// Extract mime type from header (e.g., "data:image/jpeg;base64")
			header := parts[0]
			if strings.Contains(header, "image/jpeg") || strings.Contains(header, "image/jpg") {
				mimeType = "image/jpeg"
				filename = "reference.jpg"
			} else if strings.Contains(header, "image/png") {
				mimeType = "image/png"
				filename = "reference.png"
			} else if strings.Contains(header, "image/webp") {
				mimeType = "image/webp"
				filename = "reference.webp"
			} else {
				mimeType = "image/png" // Default fallback
			}

			decoded, err := base64.StdEncoding.DecodeString(parts[1])
			if err != nil {
				return nil, fmt.Errorf("failed to decode base64 image: %w", err)
			}
			imageData = decoded

		} else {
			// Case B: Handle Standard HTTP/HTTPS URL
			resp, err := http.Get(imageURL)
			if err != nil {
				return nil, fmt.Errorf("failed to download reference image: %w", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				return nil, fmt.Errorf("failed to download reference image, status: %d", resp.StatusCode)
			}

			data, err := io.ReadAll(resp.Body)
			if err != nil {
				return nil, fmt.Errorf("failed to read downloaded image: %w", err)
			}
			imageData = data

			// Use the Content-Type header from the response
			mimeType = resp.Header.Get("Content-Type")

			// Fallback/Correction if server sends bad headers
			if mimeType == "" || mimeType == "application/octet-stream" {
				ext := filepath.Ext(imageURL)
				switch strings.ToLower(ext) {
				case ".jpg", ".jpeg":
					mimeType = "image/jpeg"
				case ".png":
					mimeType = "image/png"
				case ".webp":
					mimeType = "image/webp"
				default:
					mimeType = "image/png"
				}
			}

			// Ensure filename has extension
			base := filepath.Base(imageURL)
			if base != "" && base != "." {
				if idx := strings.Index(base, "?"); idx != -1 {
					base = base[:idx]
				}
				filename = base
			}
		}

		// Create the MIME Header manually to force the Content-Type.
		// Standard writer.CreateFormFile does not set Content-Type, causing "unsupported mimetype" errors.
		h := make(textproto.MIMEHeader)
		h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="input_reference"; filename="%s"`, filename))
		h.Set("Content-Type", mimeType)

		part, err := writer.CreatePart(h)
		if err != nil {
			return nil, fmt.Errorf("create part: %w", err)
		}
		if _, err := part.Write(imageData); err != nil {
			return nil, fmt.Errorf("write image data: %w", err)
		}
	}
	// [PR FIX END]

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
