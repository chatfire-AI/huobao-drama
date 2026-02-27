package parser

import (
	"os"
	"strings"
)

// TxtParser 纯文本解析器
type TxtParser struct{}

// Parse 解析txt文件
func (p *TxtParser) Parse(filePath string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", ErrFileReadFailed
	}

	// 尝试多种编码
	content := string(data)
	if strings.Contains(content, "\x00") {
		// 可能是UTF-16或其他编码，尝试简单处理
		content = strings.ReplaceAll(content, "\x00", "")
	}

	return content, nil
}

// GetSupportedExtensions 返回支持的扩展名
func (p *TxtParser) GetSupportedExtensions() []string {
	return []string{".txt"}
}
