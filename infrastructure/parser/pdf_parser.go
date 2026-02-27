package parser

import (
	"fmt"
	"os"
	"strings"

	"github.com/ledongthuc/pdf"
)

// PdfParser PDF文档解析器
type PdfParser struct{}

// Parse 解析pdf文件
func (p *PdfParser) Parse(filePath string) (string, error) {
	f, r, err := pdf.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrFileReadFailed, err)
	}
	defer f.Close()

	var buf strings.Builder
	totalPage := r.NumPage()

	for i := 1; i <= totalPage; i++ {
		page := r.Page(i)
		if page.V.IsNull() {
			continue
		}

		rows, err := page.GetTextByRow()
		if err != nil {
			continue
		}

		for _, row := range rows {
			for _, item := range row.Content {
				text := strings.TrimSpace(item.S)
				if text != "" {
					buf.WriteString(text)
				}
			}
			buf.WriteString("\n")
		}
	}

	if buf.Len() == 0 {
		return "", fmt.Errorf("%w: pdf content is empty", ErrFileReadFailed)
	}

	return buf.String(), nil
}

// GetSupportedExtensions 返回支持的扩展名
func (p *PdfParser) GetSupportedExtensions() []string {
	return []string{".pdf"}
}

// GetFileSize 获取文件大小
func GetFileSize(filePath string) (int64, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}
