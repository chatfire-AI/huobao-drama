package services

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/pkg/ai"
	"github.com/drama-generator/backend/pkg/utils"
)

type StoryboardNarrationResult struct {
	StoryboardID     uint   `json:"storyboard_id"`
	StoryboardNumber int    `json:"storyboard_number"`
	Narration        string `json:"narration,omitempty"`
	Updated          bool   `json:"updated"`
	Skipped          bool   `json:"skipped,omitempty"`
	Error            string `json:"error,omitempty"`
}

func (s *StoryboardService) GenerateNovelNarrations(storyboardIDs []uint, overwrite bool, model string) ([]StoryboardNarrationResult, error) {
	orderedIDs := uniqueStoryboardIDs(storyboardIDs)
	if len(orderedIDs) == 0 {
		return nil, fmt.Errorf("storyboard_ids is empty")
	}

	var storyboards []models.Storyboard
	if err := s.db.Where("id IN ?", orderedIDs).
		Order("storyboard_number ASC").
		Find(&storyboards).Error; err != nil {
		return nil, fmt.Errorf("failed to load storyboards: %w", err)
	}

	storyboardMap := make(map[uint]models.Storyboard, len(storyboards))
	for _, sb := range storyboards {
		storyboardMap[sb.ID] = sb
	}

	var textClient ai.AIClient
	if strings.TrimSpace(model) != "" {
		client, err := s.aiService.GetAIClientForModel("text", model)
		if err != nil {
			return nil, fmt.Errorf("failed to get text model client: %w", err)
		}
		textClient = client
	}

	results := make([]StoryboardNarrationResult, 0, len(orderedIDs))
	for _, storyboardID := range orderedIDs {
		sb, ok := storyboardMap[storyboardID]
		if !ok {
			results = append(results, StoryboardNarrationResult{
				StoryboardID: storyboardID,
				Error:        "storyboard not found",
			})
			continue
		}

		result := StoryboardNarrationResult{
			StoryboardID:     sb.ID,
			StoryboardNumber: sb.StoryboardNumber,
		}

		currentDialogue := strings.TrimSpace(getPtrString(sb.Dialogue))
		if !overwrite && currentDialogue != "" {
			result.Narration = currentDialogue
			result.Skipped = true
			results = append(results, result)
			continue
		}

		generated, err := s.generateNovelNarrationFromStoryboard(sb, textClient)
		if err != nil {
			result.Error = err.Error()
			results = append(results, result)
			continue
		}

		finalNarration := normalizeNarrationText(generated)
		if finalNarration == "" {
			finalNarration = fallbackNarrationFromStoryboard(sb)
		}
		if finalNarration == "" {
			result.Error = "empty narration"
			results = append(results, result)
			continue
		}

		if err := s.UpdateStoryboard(strconv.FormatUint(uint64(sb.ID), 10), map[string]interface{}{
			"dialogue": finalNarration,
		}); err != nil {
			result.Error = fmt.Sprintf("failed to save narration: %v", err)
			results = append(results, result)
			continue
		}

		result.Narration = finalNarration
		result.Updated = true
		results = append(results, result)
	}

	return results, nil
}

func (s *StoryboardService) generateNovelNarrationFromStoryboard(sb models.Storyboard, client ai.AIClient) (string, error) {
	systemPrompt := `你是影视小说旁白写作助手。请根据“无声分镜视频”的信息，写出一段小说感旁白。
输出要求：
1. 只返回 JSON：{"narration":"..."}，不要输出其它文本
2. narration 使用中文，1-2句，20-60字
3. 第三人称叙述，不使用对白引号，不代写角色台词
4. 不写镜头术语，不出现“镜头/画面/运镜”等词
5. 语气克制、有文学感，与动作和氛围一致`

	userPrompt := fmt.Sprintf(`分镜信息：
- 分镜号：%d
- 标题：%s
- 时间：%s
- 地点：%s
- 动作：%s
- 结果：%s
- 氛围：%s
- 描述：%s
- 时长（秒）：%d
- 音效：%s
- 配乐：%s
- 原对白：%s
- 无声视频URL：%s

请输出该分镜的“小说类型旁白”。`,
		sb.StoryboardNumber,
		condensePromptText(getPtrString(sb.Title)),
		condensePromptText(getPtrString(sb.Time)),
		condensePromptText(getPtrString(sb.Location)),
		condensePromptText(getPtrString(sb.Action)),
		condensePromptText(getPtrString(sb.Result)),
		condensePromptText(getPtrString(sb.Atmosphere)),
		condensePromptText(getPtrString(sb.Description)),
		sb.Duration,
		condensePromptText(getPtrString(sb.SoundEffect)),
		condensePromptText(getPtrString(sb.BgmPrompt)),
		condensePromptText(getPtrString(sb.Dialogue)),
		condensePromptText(getPtrString(sb.VideoURL)),
	)

	var raw string
	var err error
	if client != nil {
		raw, err = client.GenerateText(userPrompt, systemPrompt, ai.WithTemperature(0.7), ai.WithMaxTokens(180))
	} else {
		raw, err = s.aiService.GenerateText(userPrompt, systemPrompt, ai.WithTemperature(0.7), ai.WithMaxTokens(180))
	}
	if err != nil {
		return "", err
	}

	var parsed struct {
		Narration string `json:"narration"`
	}
	if parseErr := utils.SafeParseAIJSON(raw, &parsed); parseErr == nil && strings.TrimSpace(parsed.Narration) != "" {
		return parsed.Narration, nil
	}

	return strings.TrimSpace(raw), nil
}

func normalizeNarrationText(text string) string {
	clean := strings.TrimSpace(text)
	clean = strings.Trim(clean, "\"'`")
	clean = strings.ReplaceAll(clean, "\r\n", " ")
	clean = strings.ReplaceAll(clean, "\n", " ")
	clean = strings.Join(strings.Fields(clean), " ")

	if strings.HasPrefix(clean, "旁白：") {
		clean = strings.TrimSpace(strings.TrimPrefix(clean, "旁白："))
	}
	if strings.HasPrefix(clean, "旁白:") {
		clean = strings.TrimSpace(strings.TrimPrefix(clean, "旁白:"))
	}
	if strings.HasPrefix(clean, "（旁白）") {
		// keep
	} else if clean != "" {
		clean = "（旁白）" + clean
	}

	runes := []rune(clean)
	if len(runes) > 140 {
		clean = string(runes[:140])
	}
	return strings.TrimSpace(clean)
}

func fallbackNarrationFromStoryboard(sb models.Storyboard) string {
	core := firstNonEmpty(
		getPtrString(sb.Result),
		getPtrString(sb.Action),
		getPtrString(sb.Description),
		getPtrString(sb.Atmosphere),
	)
	core = condensePromptText(core)
	if core == "" {
		core = "沉默推进的情境里，人物的情绪正在逼近失衡边缘。"
	}

	runes := []rune(core)
	if len(runes) > 90 {
		core = string(runes[:90])
	}
	return normalizeNarrationText(core)
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func condensePromptText(value string) string {
	text := strings.TrimSpace(value)
	if text == "" {
		return ""
	}
	text = strings.ReplaceAll(text, "\r\n", " ")
	text = strings.ReplaceAll(text, "\n", " ")
	return strings.Join(strings.Fields(text), " ")
}

func uniqueStoryboardIDs(ids []uint) []uint {
	seen := make(map[uint]struct{}, len(ids))
	result := make([]uint, 0, len(ids))
	for _, id := range ids {
		if id == 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		result = append(result, id)
	}
	return result
}

func getPtrString(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}
