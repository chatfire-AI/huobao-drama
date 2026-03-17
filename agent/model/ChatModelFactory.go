package model

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino-ext/components/model/ark"
	"github.com/cloudwego/eino-ext/components/model/gemini"
	"github.com/cloudwego/eino-ext/components/model/openai"
	einomodel "github.com/cloudwego/eino/components/model"
	"github.com/drama-generator/backend/application/services"
	"google.golang.org/genai"
)

// ChatModelFactory 从数据库配置构建 eino ChatModel
type ChatModelFactory struct {
	aiService *services.AIService
}

func NewChatModelFactory(aiService *services.AIService) *ChatModelFactory {
	return &ChatModelFactory{aiService: aiService}
}

// NewChatModelByProvider 按 provider 从数据库读取配置，构建对应的 eino ChatModel
func (f *ChatModelFactory) NewChatModelByProvider(provider string) (einomodel.BaseChatModel, error) {
	configs, err := f.aiService.ListConfigs("text")
	if err != nil {
		return nil, fmt.Errorf("failed to list configs: %w", err)
	}

	// 按 provider 筛选第一条 active 配置
	for _, cfg := range configs {
		if cfg.Provider == provider && cfg.IsActive {
			modelName := ""
			if len(cfg.Model) > 0 {
				modelName = cfg.Model[0]
			}
			return f.buildChatModel(provider, cfg.BaseURL, cfg.APIKey, modelName)
		}
	}

	return nil, fmt.Errorf("no active config found for provider: %s", provider)
}

func (f *ChatModelFactory) buildChatModel(provider, baseURL, apiKey, modelName string) (einomodel.BaseChatModel, error) {
	ctx := context.Background()

	switch provider {
	case "chatfire", "openai":
		return openai.NewChatModel(ctx, &openai.ChatModelConfig{
			BaseURL: baseURL,
			APIKey:  apiKey,
			Model:   modelName,
		})

	case "gemini", "google":
		client, err := genai.NewClient(ctx, &genai.ClientConfig{
			APIKey:  apiKey,
			Backend: genai.BackendGeminiAPI,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create genai client: %w", err)
		}
		return gemini.NewChatModel(ctx, &gemini.Config{
			Client: client,
			Model:  modelName,
		})

	case "volcengine", "doubao":
		return ark.NewChatModel(ctx, &ark.ChatModelConfig{
			APIKey: apiKey,
			Model:  modelName,
		})

	default:
		// 默认按 OpenAI 兼容格式构建
		return openai.NewChatModel(ctx, &openai.ChatModelConfig{
			BaseURL: baseURL,
			APIKey:  apiKey,
			Model:   modelName,
		})
	}
}
