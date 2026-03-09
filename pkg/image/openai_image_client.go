package image

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"path"
	"strings"
	"time"
)

type OpenAIImageClient struct {
	BaseURL      string
	APIKey       string
	Model        string
	Endpoint     string
	StrictOpenAI bool
	HTTPClient   *http.Client
}

type openAIImageRequest struct {
	Model          string `json:"model,omitempty"`
	Prompt         string `json:"prompt"`
	Size           string `json:"size,omitempty"`
	Quality        string `json:"quality,omitempty"`
	Style          string `json:"style,omitempty"`
	ResponseFormat string `json:"response_format,omitempty"`
	N              int    `json:"n,omitempty"`
}

type openAIImageResponse struct {
	Created int64 `json:"created"`
	Data    []struct {
		URL           string `json:"url"`
		B64JSON       string `json:"b64_json"`
		RevisedPrompt string `json:"revised_prompt,omitempty"`
	} `json:"data"`
}

func NewOpenAIImageClient(baseURL, apiKey, model, endpoint string, strictOpenAI bool) *OpenAIImageClient {
	if endpoint == "" {
		endpoint = "/images/generations"
	}
	return &OpenAIImageClient{
		BaseURL:      baseURL,
		APIKey:       apiKey,
		Model:        model,
		Endpoint:     endpoint,
		StrictOpenAI: strictOpenAI,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Minute,
		},
	}
}

func (c *OpenAIImageClient) GenerateImage(prompt string, opts ...ImageOption) (*ImageResult, error) {
	options := &ImageOptions{}

	for _, opt := range opts {
		opt(options)
	}

	model := c.Model
	if options.Model != "" {
		model = options.Model
	}

	fullPrompt := composeOpenAIImagePrompt(prompt, options.NegativePrompt)

	if !c.StrictOpenAI {
		return c.generateLegacyCompatible(fullPrompt, model, options)
	}

	if len(options.ReferenceImages) > 0 {
		return c.generateWithOpenAIEdit(fullPrompt, model, options)
	}
	return c.generateWithOpenAIGenerations(fullPrompt, model, options)
}

func (c *OpenAIImageClient) generateLegacyCompatible(prompt, model string, options *ImageOptions) (*ImageResult, error) {
	size := options.Size
	if size == "" {
		size = "1024x1024"
	}
	quality := options.Quality
	if quality == "" {
		quality = "standard"
	}

	reqBody := map[string]interface{}{
		"model":   model,
		"prompt":  prompt,
		"size":    size,
		"quality": quality,
		"n":       1,
	}
	if len(options.ReferenceImages) > 0 {
		reqBody["image"] = options.ReferenceImages
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	respBody, err := c.sendJSONRequest(c.Endpoint, payload)
	if err != nil {
		return nil, err
	}
	return parseOpenAIImageResponse(respBody)
}

func (c *OpenAIImageClient) generateWithOpenAIGenerations(prompt, model string, options *ImageOptions) (*ImageResult, error) {
	normalizedModel := normalizeModelName(model)
	size := normalizeOpenAIImageSize(normalizedModel, options.Size, false)
	quality, okQuality := normalizeOpenAIQuality(normalizedModel, options.Quality, false)
	style, okStyle := normalizeOpenAIStyle(normalizedModel, options.Style)

	reqBody := openAIImageRequest{
		Model:  model,
		Prompt: prompt,
		Size:   size,
		N:      1,
	}
	if okQuality {
		reqBody.Quality = quality
	}
	if okStyle {
		reqBody.Style = style
	}
	// DALL-E 支持 url，能复用既有下载逻辑；GPT Image 总是返回 b64_json。
	if isDALLE2Model(normalizedModel) || isDALLE3Model(normalizedModel) {
		reqBody.ResponseFormat = "url"
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	respBody, err := c.sendJSONRequest(c.Endpoint, payload)
	if err != nil {
		return nil, err
	}
	return parseOpenAIImageResponse(respBody)
}

func (c *OpenAIImageClient) generateWithOpenAIEdit(prompt, model string, options *ImageOptions) (*ImageResult, error) {
	normalizedModel := normalizeModelName(model)
	if isDALLE3Model(normalizedModel) {
		return nil, fmt.Errorf("openai image edit does not support model %q; use gpt-image-* or dall-e-2", model)
	}

	size := normalizeOpenAIImageSize(normalizedModel, options.Size, true)
	quality, okQuality := normalizeOpenAIQuality(normalizedModel, options.Quality, true)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	if model != "" {
		if err := writer.WriteField("model", model); err != nil {
			return nil, fmt.Errorf("write model field: %w", err)
		}
	}
	if err := writer.WriteField("prompt", prompt); err != nil {
		return nil, fmt.Errorf("write prompt field: %w", err)
	}
	if size != "" {
		if err := writer.WriteField("size", size); err != nil {
			return nil, fmt.Errorf("write size field: %w", err)
		}
	}
	if okQuality {
		if err := writer.WriteField("quality", quality); err != nil {
			return nil, fmt.Errorf("write quality field: %w", err)
		}
	}

	fieldName := "image"
	if len(options.ReferenceImages) > 1 {
		fieldName = "image[]"
	}
	for idx, ref := range options.ReferenceImages {
		filename, mimeType, fileData, err := c.resolveReferenceImage(ref, idx)
		if err != nil {
			return nil, fmt.Errorf("invalid reference image[%d]: %w", idx, err)
		}
		part, err := createImageFormPart(writer, fieldName, filename, mimeType)
		if err != nil {
			return nil, fmt.Errorf("create image part[%d]: %w", idx, err)
		}
		if _, err := part.Write(fileData); err != nil {
			return nil, fmt.Errorf("write image part[%d]: %w", idx, err)
		}
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("close multipart writer: %w", err)
	}

	respBody, err := c.sendMultipartRequest(c.editsEndpoint(), body, writer.FormDataContentType())
	if err != nil {
		return nil, err
	}
	return parseOpenAIImageResponse(respBody)
}

func (c *OpenAIImageClient) sendJSONRequest(endpoint string, payload []byte) ([]byte, error) {
	reqURL := joinURL(c.BaseURL, endpoint)
	req, err := http.NewRequest("POST", reqURL, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	return c.do(req)
}

func (c *OpenAIImageClient) sendMultipartRequest(endpoint string, body *bytes.Buffer, contentType string) ([]byte, error) {
	reqURL := joinURL(c.BaseURL, endpoint)
	req, err := http.NewRequest("POST", reqURL, body)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	return c.do(req)
}

func (c *OpenAIImageClient) do(req *http.Request) ([]byte, error) {
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openai api error (status %d): %s", resp.StatusCode, string(respBody))
	}
	return respBody, nil
}

func parseOpenAIImageResponse(body []byte) (*ImageResult, error) {
	var result openAIImageResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w, body: %s", err, string(body))
	}
	if len(result.Data) == 0 {
		return nil, fmt.Errorf("no image generated, response: %s", string(body))
	}

	if result.Data[0].URL != "" {
		return &ImageResult{
			Status:    "completed",
			ImageURL:  result.Data[0].URL,
			Completed: true,
		}, nil
	}

	if result.Data[0].B64JSON != "" {
		decoded, err := decodeBase64(result.Data[0].B64JSON)
		if err != nil {
			return nil, fmt.Errorf("decode b64_json: %w", err)
		}
		dataURI := "data:image/png;base64," + base64.StdEncoding.EncodeToString(decoded)
		return &ImageResult{
			Status:    "completed",
			ImageURL:  dataURI,
			Completed: true,
		}, nil
	}

	return nil, fmt.Errorf("no image url or b64_json in response: %s", string(body))
}

func (c *OpenAIImageClient) GetTaskStatus(taskID string) (*ImageResult, error) {
	return nil, fmt.Errorf("not supported for OpenAI/DALL-E")
}

func (c *OpenAIImageClient) editsEndpoint() string {
	endpoint := strings.TrimSpace(c.Endpoint)
	if endpoint == "" {
		return "/images/edits"
	}
	if strings.Contains(endpoint, "/images/generations") {
		return strings.Replace(endpoint, "/images/generations", "/images/edits", 1)
	}
	return "/images/edits"
}

func (c *OpenAIImageClient) resolveReferenceImage(ref string, idx int) (filename string, mimeType string, data []byte, err error) {
	if strings.HasPrefix(ref, "data:") {
		return decodeDataURI(ref, idx)
	}
	if strings.HasPrefix(ref, "http://") || strings.HasPrefix(ref, "https://") {
		return c.downloadReferenceImage(ref, idx)
	}
	decoded, err := decodeBase64(ref)
	if err != nil {
		return "", "", nil, fmt.Errorf("unsupported reference image format (need data URI, URL, or base64): %w", err)
	}
	mimeType = http.DetectContentType(decoded)
	return fmt.Sprintf("reference-%d%s", idx+1, extensionByMIME(mimeType)), mimeType, decoded, nil
}

func (c *OpenAIImageClient) downloadReferenceImage(rawURL string, idx int) (filename string, mimeType string, data []byte, err error) {
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return "", "", nil, err
	}
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", "", nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", "", nil, fmt.Errorf("download image failed with status %d", resp.StatusCode)
	}
	data, err = io.ReadAll(resp.Body)
	if err != nil {
		return "", "", nil, err
	}
	mimeType = strings.TrimSpace(strings.Split(resp.Header.Get("Content-Type"), ";")[0])
	if mimeType == "" {
		mimeType = http.DetectContentType(data)
	}
	filename = filenameFromURL(rawURL)
	if filename == "" {
		filename = fmt.Sprintf("reference-%d%s", idx+1, extensionByMIME(mimeType))
	}
	return filename, mimeType, data, nil
}

func createImageFormPart(writer *multipart.Writer, fieldName, filename, mimeType string) (io.Writer, error) {
	headers := make(textproto.MIMEHeader)
	headers.Set("Content-Disposition", fmt.Sprintf(`form-data; name="%s"; filename="%s"`, fieldName, filename))
	if mimeType != "" {
		headers.Set("Content-Type", mimeType)
	} else {
		headers.Set("Content-Type", "application/octet-stream")
	}
	return writer.CreatePart(headers)
}

func decodeDataURI(dataURI string, idx int) (filename string, mimeType string, data []byte, err error) {
	parts := strings.SplitN(dataURI, ",", 2)
	if len(parts) != 2 {
		return "", "", nil, fmt.Errorf("invalid data URI")
	}
	meta := parts[0]
	payload := parts[1]
	if !strings.HasPrefix(meta, "data:") || !strings.Contains(meta, ";base64") {
		return "", "", nil, fmt.Errorf("unsupported data URI format")
	}
	mimeType = strings.TrimPrefix(strings.Split(meta, ";")[0], "data:")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	decoded, err := decodeBase64(payload)
	if err != nil {
		return "", "", nil, fmt.Errorf("decode data URI: %w", err)
	}
	filename = fmt.Sprintf("reference-%d%s", idx+1, extensionByMIME(mimeType))
	return filename, mimeType, decoded, nil
}

func decodeBase64(v string) ([]byte, error) {
	clean := strings.Map(func(r rune) rune {
		switch r {
		case '\n', '\r', '\t', ' ':
			return -1
		default:
			return r
		}
	}, v)
	if b, err := base64.StdEncoding.DecodeString(clean); err == nil {
		return b, nil
	}
	if b, err := base64.RawStdEncoding.DecodeString(clean); err == nil {
		return b, nil
	}
	return nil, fmt.Errorf("invalid base64 data")
}

func filenameFromURL(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	base := path.Base(parsed.Path)
	if base == "." || base == "/" || base == "" {
		return ""
	}
	return base
}

func extensionByMIME(mimeType string) string {
	switch strings.ToLower(strings.TrimSpace(mimeType)) {
	case "image/png":
		return ".png"
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	default:
		return ".bin"
	}
}

func composeOpenAIImagePrompt(prompt, negativePrompt string) string {
	if strings.TrimSpace(negativePrompt) == "" {
		return prompt
	}
	return fmt.Sprintf("%s\n\nNegative prompt: %s", prompt, negativePrompt)
}

func normalizeOpenAIImageSize(model, size string, forEdit bool) string {
	value := strings.TrimSpace(size)

	var allowed map[string]struct{}
	var fallback string

	switch {
	case isGPTImageModel(model):
		allowed = map[string]struct{}{
			"auto":      {},
			"1024x1024": {},
			"1536x1024": {},
			"1024x1536": {},
		}
		fallback = "auto"
	case isDALLE3Model(model):
		if forEdit {
			return ""
		}
		allowed = map[string]struct{}{
			"1024x1024": {},
			"1792x1024": {},
			"1024x1792": {},
		}
		fallback = "1024x1024"
	case isDALLE2Model(model):
		allowed = map[string]struct{}{
			"256x256":   {},
			"512x512":   {},
			"1024x1024": {},
		}
		fallback = "1024x1024"
	default:
		allowed = map[string]struct{}{
			"1024x1024": {},
		}
		fallback = "1024x1024"
	}

	if value == "" {
		return fallback
	}
	if _, ok := allowed[value]; ok {
		return value
	}
	return fallback
}

func normalizeOpenAIQuality(model, quality string, forEdit bool) (string, bool) {
	value := strings.TrimSpace(strings.ToLower(quality))

	switch {
	case isGPTImageModel(model):
		allowed := map[string]struct{}{
			"auto":   {},
			"low":    {},
			"medium": {},
			"high":   {},
		}
		if forEdit {
			allowed["standard"] = struct{}{}
		}
		if value == "" {
			return "auto", true
		}
		if _, ok := allowed[value]; ok {
			return value, true
		}
		// 历史 UI 会发送 standard/hd；GPT 模型下回退为 auto。
		return "auto", true
	case isDALLE3Model(model):
		if forEdit {
			return "", false
		}
		if value == "hd" || value == "standard" {
			return value, true
		}
		return "standard", true
	case isDALLE2Model(model):
		return "standard", true
	default:
		if value == "" {
			return "", false
		}
		return value, true
	}
}

func normalizeOpenAIStyle(model, style string) (string, bool) {
	if !isDALLE3Model(model) {
		return "", false
	}
	switch strings.TrimSpace(strings.ToLower(style)) {
	case "vivid", "natural":
		return strings.TrimSpace(strings.ToLower(style)), true
	default:
		return "", false
	}
}

func normalizeModelName(model string) string {
	return strings.ToLower(strings.TrimSpace(model))
}

func isGPTImageModel(model string) bool {
	return strings.HasPrefix(model, "gpt-image-") || model == "chatgpt-image-latest"
}

func isDALLE2Model(model string) bool {
	return model == "dall-e-2"
}

func isDALLE3Model(model string) bool {
	return model == "dall-e-3"
}

func joinURL(baseURL, endpoint string) string {
	base := strings.TrimSpace(baseURL)
	ep := strings.TrimSpace(endpoint)
	if strings.HasPrefix(ep, "http://") || strings.HasPrefix(ep, "https://") {
		return ep
	}
	if base == "" {
		return ep
	}
	if ep == "" {
		return base
	}
	if strings.HasSuffix(base, "/") && strings.HasPrefix(ep, "/") {
		return base + strings.TrimPrefix(ep, "/")
	}
	if !strings.HasSuffix(base, "/") && !strings.HasPrefix(ep, "/") {
		return base + "/" + ep
	}
	return base + ep
}
