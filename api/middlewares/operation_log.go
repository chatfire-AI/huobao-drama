package middlewares

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"
	"time"

	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const (
	maxLoggedBodySize    = 16 * 1024
	maxLoggedResponseLen = 16 * 1024
)

type responseBodyWriter struct {
	gin.ResponseWriter
	body     *bytes.Buffer
	limit    int
	overflow bool
}

func (w *responseBodyWriter) Write(b []byte) (int, error) {
	if w.body != nil && !w.overflow {
		remaining := w.limit - w.body.Len()
		if remaining > 0 {
			if len(b) <= remaining {
				w.body.Write(b)
			} else {
				w.body.Write(b[:remaining])
				w.overflow = true
			}
		} else {
			w.overflow = true
		}
	}
	return w.ResponseWriter.Write(b)
}

func (w *responseBodyWriter) WriteString(s string) (int, error) {
	return w.Write([]byte(s))
}

func OperationLogMiddleware(db *gorm.DB, log *logger.Logger) gin.HandlerFunc {
	logService := services.NewOperationLogService(db, log)

	return func(c *gin.Context) {
		path := c.Request.URL.Path
		if !strings.HasPrefix(path, "/api/") {
			c.Next()
			return
		}

		bodyBytes := readRequestBody(c)
		queryData := normalizeQuery(c.Request.URL.Query())
		bodyData := parseRequestBody(c, bodyBytes)

		recorder := &responseBodyWriter{
			ResponseWriter: c.Writer,
			body:           bytes.NewBuffer(nil),
			limit:          maxLoggedResponseLen,
		}
		c.Writer = recorder

		c.Next()

		status := c.Writer.Status()
		result := "success"
		if status >= 400 {
			result = "failed"
		}

		module := firstNonEmpty(c.GetHeader("X-Module"), deriveModule(path))
		action := firstNonEmpty(c.GetHeader("X-Action"), deriveAction(c))
		apiPath := path
		if c.FullPath() != "" {
			apiPath = c.FullPath()
		}

		requestData := buildRequestData(queryData, bodyData)
		errorMessage := extractErrorMessage(status, recorder.body.Bytes(), c)

		entry := &models.OperationLog{
			UserID:       extractUserID(c),
			Module:       module,
			Action:       action,
			API:          apiPath,
			RequestData:  requestData,
			Result:       result,
			ErrorMessage: errorMessage,
			CreatedAt:    time.Now(),
		}

		if err := logService.CreateLog(entry); err != nil {
			log.Warnw("Failed to save operation log", "error", err)
		}
	}
}

func readRequestBody(c *gin.Context) []byte {
	if c.Request.Body == nil {
		return nil
	}

	contentType := c.GetHeader("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") || strings.HasPrefix(contentType, "application/octet-stream") {
		return nil
	}

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return nil
	}

	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	if len(bodyBytes) > maxLoggedBodySize {
		return bodyBytes[:maxLoggedBodySize]
	}
	return bodyBytes
}

func parseRequestBody(c *gin.Context, bodyBytes []byte) interface{} {
	if len(bodyBytes) == 0 {
		return nil
	}

	contentType := c.GetHeader("Content-Type")
	if strings.HasPrefix(contentType, "application/json") {
		var data interface{}
		if err := json.Unmarshal(bodyBytes, &data); err == nil {
			return maskSensitive(data)
		}
		return string(bodyBytes)
	}

	if strings.HasPrefix(contentType, "application/x-www-form-urlencoded") {
		if err := c.Request.ParseForm(); err == nil {
			return maskSensitive(normalizeQuery(c.Request.PostForm))
		}
	}

	return truncateString(string(bodyBytes), maxLoggedBodySize)
}

func buildRequestData(queryData map[string]interface{}, bodyData interface{}) datatypes.JSON {
	payload := map[string]interface{}{}
	if len(queryData) > 0 {
		payload["query"] = queryData
	}
	if bodyData != nil {
		payload["body"] = bodyData
	}
	if len(payload) == 0 {
		payload = map[string]interface{}{}
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		return datatypes.JSON([]byte("{}"))
	}
	if len(raw) > maxLoggedBodySize {
		raw = []byte(`{"note":"payload too large"}`)
	}
	return datatypes.JSON(raw)
}

func normalizeQuery(values map[string][]string) map[string]interface{} {
	result := make(map[string]interface{}, len(values))
	for key, val := range values {
		if len(val) == 1 {
			result[key] = val[0]
		} else {
			result[key] = val
		}
	}
	return result
}

func deriveModule(path string) string {
	trimmed := strings.TrimPrefix(path, "/")
	if strings.HasPrefix(trimmed, "api/") {
		trimmed = strings.TrimPrefix(trimmed, "api/")
	}
	if strings.HasPrefix(trimmed, "v1/") {
		trimmed = strings.TrimPrefix(trimmed, "v1/")
	}
	parts := strings.Split(trimmed, "/")
	if len(parts) > 0 && parts[0] != "" {
		return parts[0]
	}
	return "system"
}

func deriveAction(c *gin.Context) string {
	fullPath := c.FullPath()
	if fullPath == "" {
		fullPath = c.Request.URL.Path
	}
	return c.Request.Method + " " + fullPath
}

func extractUserID(c *gin.Context) *string {
	if userID := strings.TrimSpace(c.GetHeader("X-User-Id")); userID != "" {
		return &userID
	}
	return nil
}

func extractErrorMessage(status int, responseBody []byte, ctx *gin.Context) *string {
	if status < 400 {
		return nil
	}

	var payload struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
		Message string `json:"message"`
	}
	if len(responseBody) > 0 {
		if err := json.Unmarshal(responseBody, &payload); err == nil {
			if payload.Error.Message != "" {
				msg := payload.Error.Message
				return &msg
			}
			if payload.Message != "" {
				msg := payload.Message
				return &msg
			}
		}
	}

	if ctx != nil && len(ctx.Errors) > 0 {
		msg := ctx.Errors.Last().Error()
		if msg != "" {
			return &msg
		}
	}

	return nil
}

func maskSensitive(value interface{}) interface{} {
	switch v := value.(type) {
	case map[string]interface{}:
		for key, val := range v {
			if isSensitiveKey(key) {
				v[key] = "***"
				continue
			}
			v[key] = maskSensitive(val)
		}
		return v
	case []interface{}:
		for i, val := range v {
			v[i] = maskSensitive(val)
		}
		return v
	default:
		return value
	}
}

func isSensitiveKey(key string) bool {
	k := strings.ToLower(strings.TrimSpace(key))
	switch k {
	case "api_key", "apikey", "apiKey", "password", "token", "authorization", "access_token", "refresh_token", "secret":
		return true
	default:
		return false
	}
}

func truncateString(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max] + "...(truncated)"
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
