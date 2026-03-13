package main

import (
	"context"
	"fmt"
	"io"

	"github.com/cloudwego/eino-ext/components/model/qwen"
	"github.com/cloudwego/eino/schema"
)

func main() {
	ctx := context.Background()

	apiKey := "sk-dc5b112e28af4af5b125717ec07d72f9"
	modelName := "qwen-plus"
	chatModel, err := qwen.NewChatModel(ctx, &qwen.ChatModelConfig{
		BaseURL:     "https://dashscope.aliyuncs.com/compatible-mode/v1",
		APIKey:      apiKey,
		Timeout:     0,
		Model:       modelName,
		MaxTokens:   of(2048),
		Temperature: of(float32(0.7)),
		TopP:        of(float32(0.7)),
	})

	if err != nil {
		fmt.Printf("NewChatModel of qwen failed, err=%v", err)
	}

	resp, err := chatModel.Stream(ctx, []*schema.Message{
		schema.UserMessage("你好?"),
	})
	if err != nil {
		fmt.Printf("Generate of qwen failed, err=%v", err)
	}

	//fmt.Printf("output: \n%v", resp)
	defer resp.Close()

	i := 0
	for {
		message, err := resp.Recv()
		if err == io.EOF {
			return
		}
		if err != nil {
			fmt.Printf("recv failed: %v", err)
		}
		fmt.Print(message)
		i++
	}

}

func of[T any](v T) *T {
	return &v
}
