package main

import (
	"context"
	"fmt"
	"log"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/schema"
	"github.com/drama-generator/backend/agent"
	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/infrastructure/database"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
)

func main() {
	// 初始化配置和数据库
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("load config failed: %v", err)
	}
	db, err := database.NewDatabase(cfg.Database)
	if err != nil {
		log.Fatalf("init database failed: %v", err)
	}
	appLogger := logger.NewLogger(cfg.App.Debug)

	// 创建 AgentFactory
	aiService := services.NewAIService(db, appLogger)
	factory := agent.NewAgentFactory(aiService, "skills")

	// 获取角色提取 agent
	extractor, err := factory.GetCharacterExtractorAgent("chatfire")
	if err != nil {
		log.Fatalf("create agent failed: %v", err)
	}

	// 运行
	ctx := context.Background()
	content := "没有人料到，2026年的除夕夜将是人类历史上最后一个春节。" +
		"我眼睁睁看着二婶那张狰狞扭曲的脸在眼前放大。" +
		"旁边那个三百斤的堂弟林大宝，正骑在我爸冻僵的尸体上。" +
		"老妈系着围裙，一脸焦急地冲进来。紧接着是老爸，手里还拿着锅铲。" +
		"门外，传来了一道尖锐刺耳的公鸭嗓。是二婶刘翠芬。"

	iter := extractor.Runner.Run(ctx, []adk.Message{schema.UserMessage(content)})
	for {
		event, ok := iter.Next()
		if !ok {
			break
		}
		if event.Err != nil {
			log.Printf("Error: %v", event.Err)
			break
		}
		if msg, err := event.Output.MessageOutput.GetMessage(); err == nil {
			fmt.Printf("%s", msg.Content)
		}
	}
	fmt.Println()
}
