package agent

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino/adk"
	agentmodel "github.com/drama-generator/backend/agent/model"
)

const (
	CharacterImageAgentName = "角色参考图生成专家"
	CharacterImageAgentDesc = "根据角色描述，使用合适的技能生成标准化三视图和面部特写参考图"
)

type CharacterImageAgent struct {
	Runner *adk.Runner
}

func NewCharacterImageAgent(modelFactory *agentmodel.ChatModelFactory, provider string, skillsBaseDir string) (*CharacterImageAgent, error) {
	ctx := context.Background()

	chatModel, err := modelFactory.NewChatModelByProvider(provider)
	if err != nil {
		return nil, fmt.Errorf("failed to create chat model: %w", err)
	}

	skillMiddleware, err := newSkillMiddleware(ctx, skillsBaseDir)
	if err != nil {
		return nil, fmt.Errorf("failed to create skill middleware: %w", err)
	}

	agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
		Name:        CharacterImageAgentName,
		Description: CharacterImageAgentDesc,
		Model:       chatModel,
		Handlers:    []adk.ChatModelAgentMiddleware{skillMiddleware},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create agent: %w", err)
	}

	runner := adk.NewRunner(ctx, adk.RunnerConfig{
		Agent:           agent,
		EnableStreaming: true,
	})

	return &CharacterImageAgent{Runner: runner}, nil
}
