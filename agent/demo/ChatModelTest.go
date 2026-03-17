package main

import (
	"context"
	"fmt"
	"log"

	"github.com/cloudwego/eino/schema"
	agentmodel "github.com/drama-generator/backend/agent/model"
	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/infrastructure/database"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
)

func main1() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("load config failed: %v", err)
	}
	db, err := database.NewDatabase(cfg.Database)
	if err != nil {
		log.Fatalf("init database failed: %v", err)
	}
	appLogger := logger.NewLogger(cfg.App.Debug)

	aiService := services.NewAIService(db, appLogger)
	factory := agentmodel.NewChatModelFactory(aiService)

	chatModel, err := factory.NewChatModelByProvider("chatfire")
	if err != nil {
		log.Fatalf("create model failed: %v", err)
	}

	ctx := context.Background()
	msg, err := chatModel.Generate(ctx, []*schema.Message{
		{Role: schema.User, Content: "你好"},
	})
	if err != nil {
		log.Fatalf("generate failed: %v", err)
	}
	fmt.Println(msg.Content)
}
