# Gemini 视频生成集成指南

本文档说明如何在系统中配置和使用 Google Gemini Veo 视频生成功能。

## 功能概述

系统现已支持 Google Gemini Veo 3.1 系列视频生成模型：

- **veo-3.1-generate-preview**: Veo 3.1 预览版，支持高质量 8 秒视频生成
- **veo-3.1-fast-generate-preview**: Veo 3.1 Fast 预览版，速度优化版本
- **veo-2.0-generate-001**: Veo 2 稳定版

### 主要特性

- **原生音频**: 生成带音频的视频
- **分辨率**: 支持 720p、1080p、4k
- **帧率**: 24 帧/秒
- **时长**: 4、6、8 秒
- **宽高比**: 横屏（16:9）或竖屏（9:16）
- **输入模态**: 文生视频、图生视频、多图参考生成

## 配置步骤

### 1. 获取 Gemini API 密钥

访问 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取 API 密钥。

### 2. 在系统中添加 Gemini 视频配置

1. 进入系统设置页面，选择 "AI 配置"
2. 切换到 "视频" 标签
3. 点击 "添加配置" 按钮
4. 填写配置信息：
   - **配置名称**: 自动生成（如 "Gemini-视频-0001"）
   - **厂商**: 选择 "Google Gemini"
   - **优先级**: 设置优先级（0-100）
   - **模型**: 选择一个或多个模型
     - `veo-3.1-generate-preview`（推荐）
     - `veo-3.1-fast-generate-preview`
     - `veo-2.0-generate-001`
   - **Base URL**: 自动填充为 `https://generativelanguage.googleapis.com`
   - **API Key**: 输入您的 Gemini API 密钥

5. 点击 "保存" 完成配置

### 3. 使用 Gemini 生成视频

配置完成后，在视频生成界面：

1. 选择剧本和场景
2. 输入视频提示词
3. 选择 Gemini 模型
4. 可选配置：
   - **时长**: 4、6 或 8 秒
   - **宽高比**: 16:9（横屏）或 9:16（竖屏）
   - **分辨率**: 720p、1080p 或 4k
   - **参考图片**: 上传参考图片（可选）

5. 点击 "生成视频" 开始生成

## 技术实现

### 后端

新增文件：
- `pkg/video/gemini_video_client.go`: Gemini 视频客户端实现

关键方法：
- `GenerateVideo()`: 发起视频生成请求
- `GetTaskStatus()`: 查询生成任务状态
- `downloadVideoFile()`: 下载生成的视频文件

### 前端

修改文件：
- `web/src/components/common/AIConfigDialog.vue`: 添加 Gemini 视频配置选项

## API 端点

- **生成视频**: `POST /v1beta/models/{model}:generateVideos`
- **查询状态**: `GET /v1beta/operations/{operationId}`
- **下载视频**: `GET /v1beta/files/{fileId}?alt=media`

## 注意事项

1. **API 配额**: Gemini API 有使用配额限制
2. **视频时长**: Veo 3.1 在 1080p/4k 或使用参考图片时支持 8 秒
3. **文件过期**: 生成的视频在服务器上存储 2 天后会被移除
4. **水印**: 生成的视频会添加 SynthID 水印
5. **安全过滤**: 视频会通过安全过滤，某些内容可能被拒绝生成
6. **异步处理**: 视频生成是异步过程，系统会自动轮询任务状态

## 参考链接

- [Gemini API 视频生成文档](https://ai.google.dev/gemini-api/docs/video?hl=zh-cn)
- [Gemini API 模型列表](https://ai.google.dev/gemini-api/docs/models#veo)
- [Google AI Studio](https://aistudio.google.com/)
- [Veo 提示词指南](https://ai.google.dev/gemini-api/docs/prompting_intro)
