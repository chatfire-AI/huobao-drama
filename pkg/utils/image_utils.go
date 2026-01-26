package utils

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// ImageToBase64 将图片转换为 base64 编码
// 支持本地文件路径和 HTTP/HTTPS URL
func ImageToBase64(imagePath string) (string, error) {
	var data []byte
	var err error

	if strings.HasPrefix(imagePath, "http://") || strings.HasPrefix(imagePath, "https://") {
		// 从 URL 下载图片
		data, err = downloadImageFromURL(imagePath)
		if err != nil {
			return "", fmt.Errorf("failed to download image from URL: %w", err)
		}
	} else {
		// 从本地文件读取
		data, err = os.ReadFile(imagePath)
		if err != nil {
			return "", fmt.Errorf("failed to read local image file: %w", err)
		}
	}

	// 转换为 base64
	base64Str := base64.StdEncoding.EncodeToString(data)
	
	// 检测 MIME 类型
	mimeType := detectImageMimeType(data)
	
	// 返回 data URI 格式
	return fmt.Sprintf("data:%s;base64,%s", mimeType, base64Str), nil
}

// downloadImageFromURL 从 URL 下载图片数据
func downloadImageFromURL(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

// detectImageMimeType 检测图片的 MIME 类型
func detectImageMimeType(data []byte) string {
	if len(data) < 12 {
		return "image/jpeg" // 默认
	}

	// PNG: 89 50 4E 47
	if data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
		return "image/png"
	}

	// JPEG: FF D8 FF
	if data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "image/jpeg"
	}

	// GIF: 47 49 46
	if data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46 {
		return "image/gif"
	}

	// WebP: 52 49 46 46 ... 57 45 42 50
	if data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46 &&
		data[8] == 0x57 && data[9] == 0x45 && data[10] == 0x42 && data[11] == 0x50 {
		return "image/webp"
	}

	return "image/jpeg" // 默认
}
