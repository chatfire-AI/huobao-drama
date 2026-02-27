package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/drama-generator/backend/domain/models"
	"github.com/drama-generator/backend/infrastructure/parser"
	"github.com/drama-generator/backend/pkg/config"
	"github.com/drama-generator/backend/pkg/logger"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NovelParseService struct {
	db           *gorm.DB
	log          *logger.Logger
	aiService    *AIService
	dramaService *DramaService
	cfg          *config.Config
}

// NovelEpisode AI返回的剧集结构
type NovelEpisode struct {
	Number    int             `json:"number"`
	Title     string          `json:"title"`
	Conflict  string          `json:"conflict"`
	Visuals   []string        `json:"visuals"`
	Dialogues []EpisodeDialog `json:"dialogues"`
	Hook      string          `json:"hook"`
	FullScript string         `json:"fullScript"`
}

// EpisodeDialog 对话结构
type EpisodeDialog struct {
	Role string `json:"role"`
	Line string `json:"line"`
}

// AIParseResult AI解析结果
type AIParseResult struct {
	Episodes        []NovelEpisode `json:"episodes"`
	HasMore         bool           `json:"hasMore"`
	ProcessedCount  int            `json:"processedCount"`
}

// CreateTaskRequest 创建任务请求
type CreateTaskRequest struct {
	DramaID   uint
	File      *multipart.FileHeader
	Title     string
}

// NewNovelParseService 创建小说解析服务
func NewNovelParseService(db *gorm.DB, cfg *config.Config, log *logger.Logger, aiService *AIService, dramaService *DramaService) *NovelParseService {
	return &NovelParseService{
		db:           db,
		log:          log,
		aiService:    aiService,
		dramaService: dramaService,
		cfg:          cfg,
	}
}

// CreateTask 创建解析任务
func (s *NovelParseService) CreateTask(req *CreateTaskRequest) (*models.NovelParseTask, error) {
	// 生成唯一任务ID
	taskID := uuid.New().String()

	// 创建上传目录
	uploadDir := filepath.Join(s.cfg.Storage.LocalPath, "novels")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		s.log.Errorw("Failed to create upload directory", "error", err)
		return nil, errors.New("创建上传目录失败")
	}

	// 生成文件名
	ext := filepath.Ext(req.File.Filename)
	fileName := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
	filePath := filepath.Join(uploadDir, fileName)

	// 保存文件
	src, err := req.File.Open()
	if err != nil {
		return nil, errors.New("无法打开上传文件")
	}
	defer src.Close()

	dst, err := os.Create(filePath)
	if err != nil {
		return nil, errors.New("无法创建文件")
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return nil, errors.New("文件保存失败")
	}

	// 创建任务记录
	task := &models.NovelParseTask{
		TaskID:   taskID,
		DramaID:  req.DramaID,
		FileName: req.File.Filename,
		FilePath: filePath,
		FileSize: req.File.Size,
		Status:   models.NovelParseTaskStatusPending,
		Progress: 0,
	}

	if err := s.db.Create(task).Error; err != nil {
		s.log.Errorw("Failed to create task", "error", err)
		return nil, errors.New("创建任务失败")
	}

	return task, nil
}

// GetTask 获取任务状态
func (s *NovelParseService) GetTask(taskID string) (*models.NovelParseTask, error) {
	var task models.NovelParseTask
	if err := s.db.Where("task_id = ?", taskID).First(&task).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("任务不存在")
		}
		return nil, err
	}
	return &task, nil
}

// CancelTask 取消任务
func (s *NovelParseService) CancelTask(taskID string) error {
	task, err := s.GetTask(taskID)
	if err != nil {
		return err
	}

	if task.Status == models.NovelParseTaskStatusCompleted {
		return errors.New("任务已完成，无法取消")
	}

	if task.Status == models.NovelParseTaskStatusFailed {
		return errors.New("任务已失败，无法取消")
	}

	task.Status = models.NovelParseTaskStatusCancelled
	return s.db.Save(task).Error
}

// ExecuteTask 执行解析任务
func (s *NovelParseService) ExecuteTask(taskID string) error {
	task, err := s.GetTask(taskID)
	if err != nil {
		return err
	}

	// 检查任务状态
	if task.Status != models.NovelParseTaskStatusPending && task.Status != models.NovelParseTaskStatusRunning {
		return errors.New("任务状态无效")
	}

	// 更新状态为运行中
	task.Status = models.NovelParseTaskStatusRunning
	task.Progress = 10
	if err := s.db.Save(task).Error; err != nil {
		return err
	}

	// 解析文件内容
	s.log.Infow("Parsing file", "task_id", taskID)
	content, err := parser.ParseFile(task.FilePath)
	if err != nil {
		s.updateTaskFailed(task, "文件解析失败: "+err.Error())
		return err
	}

	// 更新进度
	task.Progress = 20
	s.db.Save(task)

	// 调用AI解析
	episodes, err := s.parseWithAI(task, content)
	if err != nil {
		s.updateTaskFailed(task, "AI解析失败: "+err.Error())
		return err
	}

	// 创建项目
	task.Progress = 80
	s.db.Save(task)

	drama, err := s.createDramaAndEpisodes(task, episodes)
	if err != nil {
		s.updateTaskFailed(task, "创建项目失败: "+err.Error())
		return err
	}

	// 更新任务完成
	task.Status = models.NovelParseTaskStatusCompleted
	task.Progress = 100
	task.DramaID = drama.ID
	task.TotalEpisodes = len(episodes)
	task.CreatedEpisodes = len(episodes)
	s.db.Save(task)

	s.log.Infow("Task completed", "task_id", taskID, "episodes", len(episodes))
	return nil
}

// parseWithAI 使用AI解析小说
func (s *NovelParseService) parseWithAI(task *models.NovelParseTask, content string) ([]NovelEpisode, error) {
	allEpisodes := []NovelEpisode{}
	processedCount := 0
	maxRetries := 3

	// 构造系统提示词
	systemPrompt := s.getSystemPrompt()
	prompt := content

	for retry := 0; retry < maxRetries; retry++ {
		// 检查任务是否被取消
		currentTask, _ := s.GetTask(task.TaskID)
		if currentTask != nil && currentTask.Status == models.NovelParseTaskStatusCancelled {
			return nil, errors.New("任务已取消")
		}

		// 调用AI
		s.log.Infow("Calling AI to parse novel", "retry", retry, "processedCount", processedCount)
		response, err := s.aiService.GenerateText(prompt, systemPrompt)
		if err != nil {
			s.log.Errorw("AI call failed", "error", err)
			if retry == maxRetries-1 {
				return nil, err
			}
			continue
		}

		// 解析AI返回的JSON
		result, err := s.parseAIResponse(response)
		if err != nil {
			s.log.Errorw("Failed to parse AI response", "error", err, "response", response)
			if retry == maxRetries-1 {
				return nil, errors.New("AI响应解析失败")
			}
			continue
		}

		// 合并剧集
		allEpisodes = append(allEpisodes, result.Episodes...)
		processedCount = result.ProcessedCount

		// 更新进度
		progress := 20 + int(float64(processedCount)/float64(processedCount+20))*60
		if progress > 80 {
			progress = 80
		}
		task.Progress = progress
		s.db.Save(task)

		// 检查是否需要继续
		if !result.HasMore {
			break
		}

		// 继续请求
		prompt = s.getContinuePrompt()
	}

	return allEpisodes, nil
}

// parseAIResponse 解析AI响应
func (s *NovelParseService) parseAIResponse(response string) (*AIParseResult, error) {
	// 尝试提取JSON
	jsonStr := s.extractJSON(response)
	if jsonStr == "" {
		return nil, errors.New("AI响应中未找到有效JSON")
	}

	var result AIParseResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		s.log.Errorw("JSON unmarshal failed", "error", err, "json", jsonStr)
		return nil, err
	}

	return &result, nil
}

// extractJSON 从响应中提取JSON
func (s *NovelParseService) extractJSON(response string) string {
	// 尝试找到JSON开始和结束
	start := strings.Index(response, "{")
	if start == -1 {
		start = strings.Index(response, "[")
	}
	if start == -1 {
		return ""
	}

	// 找到最后一个匹配的闭括号
	end := strings.LastIndex(response, "}")
	if end == -1 {
		end = len(response) - 1
	}

	// 处理嵌套的大括号
	count := 0
	for i := start; i < len(response); i++ {
		if response[i] == '{' {
			count++
		} else if response[i] == '}' {
			count--
			if count == 0 {
				end = i
				break
			}
		}
	}

	return response[start : end+1]
}

// createDramaAndEpisodes 创建项目和章节
func (s *NovelParseService) createDramaAndEpisodes(task *models.NovelParseTask, episodes []NovelEpisode) (*models.Drama, error) {
	title := task.FileName
	if task.DramaID > 0 {
		// 如果有关联项目，使用现有项目
		drama, err := s.dramaService.GetDrama(fmt.Sprintf("%d", task.DramaID))
		if err == nil {
			return s.addEpisodesToDrama(drama, episodes)
		}
	}

	// 创建新项目
	req := &CreateDramaRequest{
		Title:       strings.TrimSuffix(title, filepath.Ext(title)),
		Description: "从小说文件导入",
	}
	drama, err := s.dramaService.CreateDrama(req)
	if err != nil {
		return nil, err
	}

	return s.addEpisodesToDrama(drama, episodes)
}

// addEpisodesToDrama 添加章节到项目
func (s *NovelParseService) addEpisodesToDrama(drama *models.Drama, episodes []NovelEpisode) (*models.Drama, error) {
	for _, ep := range episodes {
		episode := models.Episode{
			DramaID:       drama.ID,
			EpisodeNum:    ep.Number,
			Title:         ep.Title,
			ScriptContent: &ep.FullScript,
			Status:        "draft",
		}
		if err := s.db.Create(&episode).Error; err != nil {
			s.log.Errorw("Failed to create episode", "error", err)
			continue
		}
	}

	// 更新项目的总集数
	drama.TotalEpisodes = len(episodes)
	s.db.Save(drama)

	return drama, nil
}

// updateTaskFailed 更新任务为失败状态
func (s *NovelParseService) updateTaskFailed(task *models.NovelParseTask, errMsg string) {
	task.Status = models.NovelParseTaskStatusFailed
	task.ErrorMessage = errMsg
	task.Progress = 0
	s.db.Save(task)
}

// getSystemPrompt 获取系统提示词
func (s *NovelParseService) getSystemPrompt() string {
	return `# 角色设定
你是一位专业的短剧编剧，擅长将小说文字转化为高张力的视觉化剧本。你的任务是直接进入【章节提炼模式】，将我上传的小说内容拆解并重构。

# 核心指令
1. **自动分集：** 请根据小说情节的自然转折、冲突爆发点或信息量的密集程度，自动决定提炼出的剧本集数。
2. **去水留精：** 删掉所有环境描写、心理独白和非必要的过渡情节。只保留能推动剧情的**动作**和**台词**。
3. **节奏重塑：** 每一集必须符合短剧"黄金30秒一个反转，结尾一个大钩子"的规律。

# 章节提炼格式（请按此结构逐集输出）
**第 [X] 集：[集名]**
* **【核心冲突】：** [本集要解决的矛盾或爆发的爆点]
* **【视觉画面】：** [动作指令1]：(例如：男主摔碎杯子，冷漠地擦去手上的血)
              [动作指令2]：(例如：女主在雨中转身，眼神从绝望变为决绝)
* **【对白提炼】：** 角色A：(台词，要求：短促、有力、具有攻击性)
              角色B：(台词，要求：反转或情绪爆发)
* **【断点钩子】：** [本集结束在哪个最让人心痒的瞬间？请详细描述最后一秒的画面或台词]

# 提炼要求
* **人设还原：** 必须精准捕捉小说中主角的性格特征。
* **信息密度：** 确保每一集都有实质性的剧情进展，拒绝平铺直叙。
* **分集逻辑：** 不要按照字数平均切分，要按照**"爽点"**和**"悬念"**切分。

# 输出格式（必须严格JSON，不要包含其他内容）
{
  "episodes": [
    {
      "number": 1,
      "title": "第1集 集名",
      "conflict": "核心冲突描述",
      "visuals": ["动作指令1", "动作指令2"],
      "dialogues": [{"role": "角色A", "line": "台词内容"}],
      "hook": "断点钩子描述",
      "fullScript": "【核心冲突】：...\n【视觉画面】：...\n【对白提炼】：...\n【断点钩子】：..."
    }
  ],
  "hasMore": true,
  "processedCount": 10
}

# 重要说明
1. **fullScript字段**：必须包含完整、自然语言的剧本提炼内容（包含核心冲突、视觉画面、对白提炼、断点钩子），这是后续要存入数据库的内容
2. **hasMore标记**：如果本轮输出未包含全部集数，设置hasMore为true；已全部输出则设置为false
3. **processedCount**：本轮已处理的集数，用于断点续传
4. **分段输出**：如果小说内容较长，单次输出限制为20集以内，超出则设置hasMore为true，等待继续请求
5. **继续请求**：收到"请继续"指令时，从上一集的下一集开始继续输出，保持JSON格式不变`
}

// getContinuePrompt 获取继续提示词
func (s *NovelParseService) getContinuePrompt() string {
	return `请继续输出剩余的章节内容。格式同上，继续从上一集的下一集开始输出。`
}
