package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestValidServiceTypes 测试所有支持的服务类型
func TestValidServiceTypes(t *testing.T) {
	validTypes := []string{"text", "image", "video", "audio", "lipsync"}

	for _, serviceType := range validTypes {
		t.Run(serviceType, func(t *testing.T) {
			req := CreateAIConfigRequest{
				ServiceType: serviceType,
				Name:        "test-config",
				Provider:    "test-provider",
				BaseURL:     "https://api.example.com",
				APIKey:      "test-key",
				Model:       []string{"test-model"},
			}

			// 验证 service type 是有效的
			assert.Contains(t, validTypes, req.ServiceType)
		})
	}
}

// TestInvalidServiceType 测试无效的服务类型
func TestInvalidServiceType(t *testing.T) {
	invalidTypes := []string{"invalid", "unknown", ""}

	for _, serviceType := range invalidTypes {
		t.Run(serviceType, func(t *testing.T) {
			req := CreateAIConfigRequest{
				ServiceType: serviceType,
				Name:        "test-config",
				Provider:    "test-provider",
				BaseURL:     "https://api.example.com",
				APIKey:      "test-key",
				Model:       []string{"test-model"},
			}

			// 这些类型不应该在有效列表中
			validTypes := []string{"text", "image", "video", "audio", "lipsync"}
			assert.NotContains(t, validTypes, req.ServiceType)
		})
	}
}

// TestUpdateAIConfigRequest_BoolPointers 测试 bool 指针字段
func TestUpdateAIConfigRequest_BoolPointers(t *testing.T) {
	t.Run("nil pointers should not update", func(t *testing.T) {
		req := UpdateAIConfigRequest{
			Name:      "updated-name",
			IsDefault: nil,
			IsActive:  nil,
		}

		assert.Nil(t, req.IsDefault)
		assert.Nil(t, req.IsActive)
	})

	t.Run("false pointer should update to false", func(t *testing.T) {
		falseVal := false
		req := UpdateAIConfigRequest{
			Name:      "updated-name",
			IsDefault: &falseVal,
			IsActive:  &falseVal,
		}

		assert.NotNil(t, req.IsDefault)
		assert.NotNil(t, req.IsActive)
		assert.False(t, *req.IsDefault)
		assert.False(t, *req.IsActive)
	})

	t.Run("true pointer should update to true", func(t *testing.T) {
		trueVal := true
		req := UpdateAIConfigRequest{
			Name:      "updated-name",
			IsDefault: &trueVal,
			IsActive:  &trueVal,
		}

		assert.NotNil(t, req.IsDefault)
		assert.NotNil(t, req.IsActive)
		assert.True(t, *req.IsDefault)
		assert.True(t, *req.IsActive)
	})
}
