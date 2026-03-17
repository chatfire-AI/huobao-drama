package agent

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino-ext/adk/backend/local"
	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/adk/middlewares/skill"
	agentmodel "github.com/drama-generator/backend/agent/model"
)

const (
	CharacterExtractorAgentName = "角色提取专家"
	CharacterExtractorAgentDesc = "你是一个角色提取专家，你需要使用合适的技能来提取角色"
)

// CharacterExtractorAgent 角色提取的最小执行单元
type CharacterExtractorAgent struct {
	Runner *adk.Runner
}

// NewCharacterExtractorAgent 构建角色提取 agent（ChatModel + Skills）
func NewCharacterExtractorAgent(modelFactory *agentmodel.ChatModelFactory, provider string, skillsBaseDir string) (*CharacterExtractorAgent, error) {
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
		Name:        CharacterExtractorAgentName,
		Description: CharacterExtractorAgentDesc,
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

	return &CharacterExtractorAgent{Runner: runner}, nil
}

// newSkillMiddleware 从文件系统加载 skills
func newSkillMiddleware(ctx context.Context, baseDir string) (adk.ChatModelAgentMiddleware, error) {
	backend, err := local.NewBackend(ctx, &local.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to create local backend: %w", err)
	}

	skillBackend, err := skill.NewBackendFromFilesystem(ctx, &skill.BackendFromFilesystemConfig{
		Backend: backend,
		BaseDir: baseDir,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to load skills from %s: %w", baseDir, err)
	}

	return skill.NewMiddleware(ctx, &skill.Config{
		Backend: skillBackend,
	})
}
