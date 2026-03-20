package agent

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino/adk"
	agentmodel "github.com/drama-generator/backend/agent/model"
)

const (
	ScriptTranslatorAgentName = "剧本翻译专家"
	ScriptTranslatorAgentDesc = "将网文内容无损转化为高冲击力的60-90秒短剧剧本，使用合适的技能完成剧本翻译"
)

type ScriptTranslatorAgent struct {
	Runner *adk.Runner
}

func NewScriptTranslatorAgent(modelFactory *agentmodel.ChatModelFactory, provider string, skillsBaseDir string) (*ScriptTranslatorAgent, error) {
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
		Name:        ScriptTranslatorAgentName,
		Description: ScriptTranslatorAgentDesc,
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

	return &ScriptTranslatorAgent{Runner: runner}, nil
}
