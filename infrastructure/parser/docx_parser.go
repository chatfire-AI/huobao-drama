package parser

import (
	"fmt"

	"github.com/nguyenthenguyen/docx"
)

// DocxParser Word文档解析器
type DocxParser struct{}

// Parse 解析docx文件
func (p *DocxParser) Parse(filePath string) (string, error) {
	// 读取docx文件
	doc, err := docx.ReadDocxFile(filePath)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrFileReadFailed, err)
	}
	defer doc.Close()

	// 获取可编辑对象
	editable := doc.Editable()

	// 获取文本内容
	content := editable.GetContent()
	if content == "" {
		return "", fmt.Errorf("%w: no content found", ErrFileReadFailed)
	}

	return content, nil
}

// GetSupportedExtensions 返回支持的扩展名
func (p *DocxParser) GetSupportedExtensions() []string {
	return []string{".docx"}
}
