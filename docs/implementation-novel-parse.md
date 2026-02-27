# 小说上传解析功能实现文档

## 1. 功能概述

用户上传小说文件（txt/word/pdf），系统自动解析小说内容，将章节内容保存为项目章节数据。

## 2. 数据模型

### 2.1 NovelParseTask 模型

文件位置: `domain/models/novel_parse_task.go`

```go
type NovelParseTask struct {
    ID              uint           `gorm:"primaryKey;autoIncrement"`
    TaskID          string         `gorm:"size:36;uniqueIndex"`  // 任务唯一标识(UUID)
    DramaID         uint           `gorm:"index"`                  // 关联的项目ID
    FileName        string         `gorm:"size:255"`              // 原始文件名
    FilePath        string         `gorm:"size:500"`              // 文件存储路径
    FileSize        int64          `gorm:"not null"`              // 文件大小(字节)
    Status          string         `gorm:"size:20;index"`         // pending/running/completed/failed/cancelled
    Progress        int            `gorm:"default:0"`             // 进度百分比(0-100)
    ErrorMessage    string         `gorm:"type:text"`             // 错误信息
    TotalEpisodes   int            `gorm:"default:0"`             // 总集数
    CreatedEpisodes int            `gorm:"default:0"`             // 已创建集数
    CreatedAt       time.Time      `gorm:"autoCreateTime"`
    UpdatedAt       time.Time      `gorm:"autoUpdateTime"`
}
```

## 3. 后端实现

### 3.1 文件解析器

| 文件 | 说明 |
|------|------|
| `infrastructure/parser/parser.go` | 统一入口，根据扩展名选择解析器 |
| `infrastructure/parser/txt_parser.go` | TXT文件解析 |
| `infrastructure/parser/docx_parser.go` | Word文件解析 (使用 go-docx 库) |
| `infrastructure/parser/pdf_parser.go` | PDF文件解析 (使用 ledongthuc/pdf 库) |

### 3.2 解析服务

文件位置: `application/services/novel_parse_service.go`

核心功能:
- 创建解析任务，保存上传文件
- 使用AI解析小说内容
- 支持分段续写（hasMore标记）
- 创建项目和章节

AI提示词:
```markdown
# 角色设定
你是一位专业的短剧编剧，擅长将小说文字转化为高张力的视觉化剧本。

# 输出格式（必须严格JSON）
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
  "hasMore": true/false,
  "processedCount": 10
}
```

### 3.3 HTTP Handler

文件位置: `api/handlers/novel_parse.go`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/novel-parse/tasks` | 创建任务（上传文件） |
| POST | `/api/v1/novel-parse/tasks/:task_id/start` | 开始解析 |
| GET | `/api/v1/novel-parse/tasks/:task_id` | 获取任务状态 |
| POST | `/api/v1/novel-parse/tasks/:task_id/cancel` | 取消任务 |

## 4. 前端实现

### 4.1 API接口

文件位置: `web/src/api/novel-parse.ts`

```typescript
export const novelParseAPI = {
  // 创建解析任务（上传文件）
  createTask(dramaId: number | null, file: File, title?: string),

  // 开始解析任务
  startTask(taskId: string),

  // 获取任务状态
  getTask(taskId: string),

  // 取消任务
  cancelTask(taskId: string)
}
```

### 4.2 导入对话框组件

文件位置: `web/src/components/common/NovelImportDialog.vue`

功能:
- 支持拖拽上传
- 支持 txt/docx/pdf 格式
- 进度展示（4个步骤）
- 取消解析
- 解析完成/失败状态展示

### 4.3 入口集成

文件位置: `web/src/views/drama/DramaManagement.vue`

入口位置:
1. **项目概览Tab**: 无章节时显示"从小说导入"按钮，有章节时显示导入卡片
2. **章节管理Tab**: 与"新建章节"按钮并列

## 5. 交互流程

```
用户点击"从小说导入"
       ↓
   上传文件（拖拽或点击选择）
       ↓
   显示文件信息，点击"开始解析"
       ↓
   进入解析状态（轮询任务进度）
       ↓
   ┌─────────────────────────────────────┐
   │  步骤1: 上传文件完成 (10%)          │
   │  步骤2: AI分析中 (20%-80%)          │
   │  步骤3: 提取章节内容                │
   │  步骤4: 保存到数据库 (80%-100%)    │
   └─────────────────────────────────────┘
       ↓
   解析完成 → 跳转到章节管理Tab
```

## 6. 状态流转

| 状态 | 说明 |
|------|------|
| idle | 初始状态，等待上传文件 |
| fileUploaded | 文件已上传，等待点击开始解析 |
| parsing | 解析中，展示进度 |
| completed | 解析完成，展示章节列表 |
| failed | 解析失败，展示错误信息 |
| cancelled | 用户取消 |

## 7. 依赖项

需要在 go.mod 中添加:

```go
github.com/lukasjarosch/go-docx  // Word解析
github.com/ledongthuc/pdf         // PDF解析
```

## 8. 数据库迁移

在 `infrastructure/database/database.go` 的 AutoMigrate 函数中添加:

```go
&models.NovelParseTask{},
```

## 9. 国际化

中文 (zh-CN):
- `drama.management.importFromNovel`: 从小说导入
- `drama.management.parsing`: 正在解析小说...
- `drama.management.parseCompleted`: 解析完成！
- `drama.management.parseFailed`: 解析失败

英文 (en-US):
- `drama.management.importFromNovel`: Import from Novel
- `drama.management.parsing`: Parsing novel...
- `drama.management.parseCompleted`: Parsing completed!
- `drama.management.parseFailed`: Parsing failed

## 10. 待优化

1. **AI会话保持**: 当前实现每次请求是独立的，如果需要真正的上下文保持，需要使用消息历史
2. **大文件处理**: 对于超长小说，可以考虑分段预处理
3. **错误恢复**: 增加重试机制
4. **SSE推送**: 可以考虑使用Server-Sent Events替代轮询
