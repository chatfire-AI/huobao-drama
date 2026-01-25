package storage

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type LocalStorage struct {
	basePath string
	baseURL  string
}

func NewLocalStorage(basePath, baseURL string) (*LocalStorage, error) {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}

	return &LocalStorage{
		basePath: basePath,
		baseURL:  baseURL,
	}, nil
}

func (s *LocalStorage) Upload(file io.Reader, filename string, category string) (string, error) {
	dir := filepath.Join(s.basePath, category)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create category directory: %w", err)
	}

	timestamp := time.Now().Format("20060102_150405")
	newFilename := fmt.Sprintf("%s_%s", timestamp, filename)
	filePath := filepath.Join(dir, newFilename)

	dst, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	url := fmt.Sprintf("%s/%s/%s", s.baseURL, category, newFilename)
	return url, nil
}

func (s *LocalStorage) Delete(url string) error {
	return nil
}

func (s *LocalStorage) GetURL(path string) string {
	return fmt.Sprintf("%s/%s", s.baseURL, path)
}

// DownloadFromURL 从远程URL下载文件到本地存储
func (s *LocalStorage) DownloadFromURL(url, category string) (string, error) {
	// CRITICAL FIX: Add HTTP client with timeout to prevent hanging indefinitely
	// Without timeout, the download can hang forever if the remote server is unresponsive
	// 5 minute timeout is reasonable for large video/image files
	client := &http.Client{
		Timeout: 5 * time.Minute,
	}

	// 发送HTTP请求下载文件
	resp, err := client.Get(url)
	if err != nil {
		return "", fmt.Errorf("failed to download file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to download file: HTTP %d", resp.StatusCode)
	}

	// 从URL或Content-Type推断文件扩展名
	ext := getFileExtension(url, resp.Header.Get("Content-Type"))

	// 创建目录
	dir := filepath.Join(s.basePath, category)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create category directory: %w", err)
	}

	// 生成唯一文件名
	timestamp := time.Now().Format("20060102_150405_000")
	filename := fmt.Sprintf("%s%s", timestamp, ext)
	filePath := filepath.Join(dir, filename)

	// 保存文件
	dst, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, resp.Body); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	// 返回本地URL
	localURL := fmt.Sprintf("%s/%s/%s", s.baseURL, category, filename)
	return localURL, nil
}

// getFileExtension 从URL或Content-Type推断文件扩展名
func getFileExtension(url, contentType string) string {
	// 首先尝试从URL获取扩展名
	if idx := strings.LastIndex(url, "."); idx != -1 {
		ext := url[idx:]
		// 只取扩展名部分，忽略查询参数
		if qIdx := strings.Index(ext, "?"); qIdx != -1 {
			ext = ext[:qIdx]
		}
		if len(ext) <= 5 { // 合理的扩展名长度
			return ext
		}
	}

	// 根据Content-Type推断扩展名
	switch {
	case strings.Contains(contentType, "image/jpeg"):
		return ".jpg"
	case strings.Contains(contentType, "image/png"):
		return ".png"
	case strings.Contains(contentType, "image/gif"):
		return ".gif"
	case strings.Contains(contentType, "image/webp"):
		return ".webp"
	case strings.Contains(contentType, "video/mp4"):
		return ".mp4"
	case strings.Contains(contentType, "video/webm"):
		return ".webm"
	case strings.Contains(contentType, "video/quicktime"):
		return ".mov"
	default:
		return ".bin"
	}
}
