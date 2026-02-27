package parser

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"
)

var (
	// ErrUnsupportedFormat 不支持的格式
	ErrUnsupportedFormat = errors.New("unsupported file format")
	// ErrFileReadFailed 文件读取失败
	ErrFileReadFailed = errors.New("file read failed")
)

// Parser 文件解析器接口
type Parser interface {
	// Parse 解析文件内容
	Parse(filePath string) (string, error)
	// GetSupportedExtensions 返回支持的扩展名
	GetSupportedExtensions() []string
}

// ParseFile 根据文件扩展名选择合适的解析器
func ParseFile(filePath string) (string, error) {
	ext := strings.ToLower(filepath.Ext(filePath))

	var p Parser
	switch ext {
	case ".txt":
		p = &TxtParser{}
	case ".docx":
		p = &DocxParser{}
	case ".pdf":
		p = &PdfParser{}
	default:
		return "", fmt.Errorf("%w: %s", ErrUnsupportedFormat, ext)
	}

	return p.Parse(filePath)
}

// GetSupportedFormats 返回支持的格式列表
func GetSupportedFormats() []string {
	return []string{".txt", ".docx", ".pdf"}
}

// IsSupportedFormat 检查是否支持该格式
func IsSupportedFormat(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	supported := GetSupportedFormats()
	for _, s := range supported {
		if ext == s {
			return true
		}
	}
	return false
}
