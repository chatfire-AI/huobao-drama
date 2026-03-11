package handlers

import (
	"strings"

	"github.com/drama-generator/backend/application/services"
	"github.com/drama-generator/backend/pkg/ai"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/drama-generator/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

type PromptOptimizerHandler struct {
	aiService *services.AIService
	log       *logger.Logger
}

type OptimizePromptRequest struct {
	Prompt   string `json:"prompt" binding:"required,min=5,max=4000"`
	UseCase  string `json:"use_case"`
	Language string `json:"language"`
}

func NewPromptOptimizerHandler(aiService *services.AIService, log *logger.Logger) *PromptOptimizerHandler {
	return &PromptOptimizerHandler{
		aiService: aiService,
		log:       log,
	}
}

func (h *PromptOptimizerHandler) OptimizePrompt(c *gin.Context) {
	var req OptimizePromptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	prompt := strings.TrimSpace(req.Prompt)
	if prompt == "" {
		response.BadRequest(c, "prompt is required")
		return
	}

	useCase := strings.ToLower(strings.TrimSpace(req.UseCase))
	if useCase == "" {
		useCase = "image"
	}

	language := strings.ToLower(strings.TrimSpace(req.Language))
	if language == "" {
		language = "auto"
	}

	systemPrompt := buildOptimizeSystemPrompt(useCase, language)
	userPrompt := "Original prompt:\n" + prompt

	optimized, err := h.aiService.GenerateText(
		userPrompt,
		systemPrompt,
		ai.WithTemperature(0.4),
		ai.WithMaxTokens(800),
	)
	if err != nil {
		h.log.Errorw("Failed to optimize prompt", "error", err, "use_case", useCase)
		response.InternalError(c, "failed to optimize prompt")
		return
	}

	optimized = cleanOptimizedPrompt(optimized)
	if optimized == "" {
		response.InternalError(c, "optimized prompt is empty")
		return
	}

	response.Success(c, gin.H{
		"optimized_prompt": optimized,
	})
}

func buildOptimizeSystemPrompt(useCase, language string) string {
	languageInstruction := "Keep the same language as the original prompt."
	if language == "zh" {
		languageInstruction = "Output in Simplified Chinese."
	} else if language == "en" {
		languageInstruction = "Output in English."
	}

	useCaseInstruction := "Optimize this prompt for AI image generation."
	if useCase == "video" {
		useCaseInstruction = "Optimize this prompt for AI video generation."
	}

	return strings.Join([]string{
		"You are an expert prompt engineer.",
		useCaseInstruction,
		languageInstruction,
		"Keep key subject, scene, and intent unchanged.",
		"Improve clarity, detail density, visual composition, lighting, mood, and style consistency.",
		"Do not add explanations, titles, markdown, or quotation marks.",
		"Return only the optimized prompt text.",
	}, "\n")
}

func cleanOptimizedPrompt(content string) string {
	text := strings.TrimSpace(content)
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)
	return text
}
