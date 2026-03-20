package agent

import (
	agentmodel "github.com/drama-generator/backend/agent/model"
	"github.com/drama-generator/backend/application/services"
)

// AgentFactory 业务驱动的 agent 获取入口
type AgentFactory struct {
	modelFactory  *agentmodel.ChatModelFactory
	skillsBaseDir string
}

func NewAgentFactory(aiService *services.AIService, skillsBaseDir string) *AgentFactory {
	return &AgentFactory{
		modelFactory:  agentmodel.NewChatModelFactory(aiService),
		skillsBaseDir: skillsBaseDir,
	}
}

// GetCharacterExtractorAgent 获取角色提取 agent
func (f *AgentFactory) GetCharacterExtractorAgent(provider string) (*CharacterExtractorAgent, error) {
	return NewCharacterExtractorAgent(f.modelFactory, provider, f.skillsBaseDir)
}

// GetCharacterImageAgent 获取角色参考图生成 agent
func (f *AgentFactory) GetCharacterImageAgent(provider string) (*CharacterImageAgent, error) {
	return NewCharacterImageAgent(f.modelFactory, provider, f.skillsBaseDir)
}

// GetSceneExtractorAgent 获取场景提取 agent
func (f *AgentFactory) GetSceneExtractorAgent(provider string) (*SceneExtractorAgent, error) {
	return NewSceneExtractorAgent(f.modelFactory, provider, f.skillsBaseDir)
}

// GetScriptTranslatorAgent 获取剧本翻译 agent
func (f *AgentFactory) GetScriptTranslatorAgent(provider string) (*ScriptTranslatorAgent, error) {
	return NewScriptTranslatorAgent(f.modelFactory, provider, f.skillsBaseDir)
}
