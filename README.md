# 🎬 Huobao Drama - AI 短剧生成平台
## 更改中
<div align="center">

**基于 TypeScript 全栈的 AI 短剧自动化生产平台**

[![Node Version](https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=node.js)](https://nodejs.org)
[![Vue Version](https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat&logo=vue.js)](https://vuejs.org)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

[功能特性](#功能特性) • [快速开始](#快速开始) • [部署指南](#部署指南)

</div>

---

## 📖 项目简介

Huobao Drama 是一个基于 AI 的短剧自动化生产平台，实现从剧本生成、角色设计、分镜制作到视频合成的全流程自动化。

火宝短剧商业版地址：[火宝短剧商业版](https://drama.chatfire.site/shortvideo)
火宝小说生成：[火宝小说生成](https://marketing.chatfire.site/huobao-novel/)

### 🎯 核心价值

- **🤖 AI 驱动**：使用大语言模型解析剧本，提取角色、场景和分镜信息
- **🎨 智能创作**：AI 绘图生成角色形象和场景背景
- **📹 视频生成**：基于文生视频和图生视频模型自动生成分镜视频
- **🔄 工作流**：完整的短剧制作工作流，从创意到成片一站式完成

### 🛠️ 技术架构

```
frontend/   — Nuxt 3 + Vue 3 + TypeScript (纯 CSS，无 UI 框架)
backend/    — Hono + Drizzle ORM + Mastra AI Agents + better-sqlite3
configs/    — config.yaml 配置文件
data/       — SQLite 数据库 + 生成资源文件
skills/     — Agent 技能定义 (SKILL.md)
```

### 🎥 作品展示 / Demo Videos

体验 AI 短剧生成效果：

<div align="center">

**示例作品 1**

<video src="https://ffile.chatfire.site/cf/public/20260114094337396.mp4" controls width="640"></video>

**示例作品 2**

<video src="https://ffile.chatfire.site/cf/public/fcede75e8aeafe22031dbf78f86285b8.mp4" controls width="640"></video>

[点击观看视频 1](https://ffile.chatfire.site/cf/public/20260114094337396.mp4) | [点击观看视频 2](https://ffile.chatfire.site/cf/public/fcede75e8aeafe22031dbf78f86285b8.mp4)

</div>

---

## ✨ 功能特性

### 🎭 角色管理

- ✅ AI 生成角色形象
- ✅ 批量角色生成
- ✅ 角色图片上传和管理
- ✅ 角色音色分配与试听

### 🎬 分镜制作

- ✅ AI 自动拆解分镜脚本
- ✅ 场景描述和镜头设计
- ✅ 分镜图片生成（文生图）
- ✅ 宫格图生成、切分与分配
- ✅ 帧类型选择（首帧/尾帧/分镜板）

### 🎥 视频生成

- ✅ 图生视频自动生成
- ✅ TTS 配音生成
- ✅ FFmpeg 单镜头合成（视频 + 音频 + 字幕）
- ✅ 整集拼接导出

### 📦 资源管理

- ✅ 素材库统一管理
- ✅ 本地存储支持
- ✅ 任务进度追踪

### 🤖 AI Agents

内置 5 个 Mastra Agent，支持数据库配置和 Skill 扩展：

| Agent | 职责 |
|---|---|
| `script_rewriter` | 小说 → 格式化剧本改写 |
| `extractor` | 角色 + 场景智能提取与去重 |
| `storyboard_breaker` | 剧本 → 分镜序列拆解 |
| `voice_assigner` | 角色音色自动分配 |
| `grid_prompt_generator` | 角色/场景/宫格图提示词生成 |

### 🔌 多厂商适配

| 类型 | 支持厂商 |
|---|---|
| **图片** | OpenAI、Gemini、MiniMax、火山引擎、阿里、Chatfire |
| **视频** | MiniMax、火山引擎/Seedance、Vidu、阿里 |
| **TTS** | MiniMax |

---

## 🚀 快速开始

### 📋 环境要求

| 软件 | 版本要求 | 说明 |
|---|---|---|
| **Node.js** | 20+ | 前后端运行环境 |
| **npm** | 9+ | 包管理工具 |
| **FFmpeg** | 4.0+ | 视频处理（**必需**） |

#### 安装 FFmpeg

**macOS:**

```bash
brew install ffmpeg
```

**Ubuntu/Debian:**

```bash
sudo apt update && sudo apt install ffmpeg
```

**Windows:**
从 [FFmpeg 官网](https://ffmpeg.org/download.html) 下载并配置环境变量

验证安装：

```bash
ffmpeg -version
```

### ⚙️ 配置文件

复制并编辑配置文件：

```bash
cp configs/config.example.yaml configs/config.yaml
```

配置文件格式（`configs/config.yaml`）：

```yaml
app:
  name: "Huobao Drama API"
  version: "1.0.0"
  debug: true

server:
  port: 5679
  host: "0.0.0.0"
  cors_origins:
    - "http://localhost:3013"

database:
  type: "sqlite"
  path: "./data/huobao_drama.db"

storage:
  type: "local"
  local_path: "./data/storage"
  base_url: "http://localhost:5679/static"

ai:
  default_text_provider: "openai"
  default_image_provider: "openai"
  default_video_provider: "doubao"
```

> **说明**：AI 服务的具体 API Key 和模型参数在 Web 界面的「设置」页面中配置。

### 📥 安装依赖

```bash
# 克隆项目
git clone https://github.com/chatfire-AI/huobao-drama.git
cd huobao-drama

# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install
```

### 🎯 启动项目

#### 方式一：开发模式（推荐）

前后端分离，支持热重载：

```bash
# 终端1：启动后端
cd backend
npm run dev

# 终端2：启动前端
cd frontend
npm run dev
```

- 前端地址: `http://localhost:3013`
- 后端 API: `http://localhost:5679/api/v1`
- 前端自动代理 `/api` 和 `/static` 到后端

#### 方式二：单服务模式

后端同时提供 API 和前端静态文件：

```bash
# 1. 构建前端
cd frontend && npm run generate

# 2. 启动后端
cd ../backend && npm start
```

访问: `http://localhost:5679`

### 🗄️ 数据库

数据库表在首次启动时自动创建，无需手动迁移。默认路径 `data/huobao_drama.db`，可通过环境变量覆盖：

```bash
DB_PATH=/path/to/your.db npm start
```

---

## 📦 部署指南

### ☁️ 云端一键部署（推荐 3080Ti）

👉 [优云智算，一键部署](https://www.compshare.cn/images/fScvzK95NUk5?referral_code=8hUJOaWz3YzG64FI2OlCiB&ytag=GPU_YY_YX_GitHub_huobaoai)

> ⚠️ **注意**：云端部署方案数据请及时存储到本地

---

### 🐳 Docker 部署（推荐）

#### 方式一：Docker Compose（推荐）

```bash
# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

#### 方式二：Docker 命令

```bash
# 从 Docker Hub 运行
docker run -d \
  --name huobao-drama \
  -p 5679:5679 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/configs/config.yaml:/app/configs/config.yaml \
  --restart unless-stopped \
  huobao/huobao-drama:latest

# 查看日志
docker logs -f huobao-drama
```

> **注意**：Linux 用户需添加 `--add-host=host.docker.internal:host-gateway` 以访问宿主机服务

**本地构建**（可选）：

```bash
docker build -t huobao-drama:latest .
docker run -d --name huobao-drama -p 5679:5679 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/configs/config.yaml:/app/configs/config.yaml \
  huobao-drama:latest
```

**Docker 部署优势：**

- ✅ 开箱即用，内置 FFmpeg 和默认配置
- ✅ 前后端合并为单镜像、单端口
- ✅ 环境一致性，避免依赖问题
- ✅ `data/` 目录 volume 挂载，数据持久化

#### 🔗 访问宿主机服务（Ollama / 本地模型）

容器内可通过 `http://host.docker.internal:端口号` 访问宿主机服务。

**配置步骤：**

1. 宿主机启动服务（监听所有接口）：

   ```bash
   export OLLAMA_HOST=0.0.0.0:11434 && ollama serve
   ```

2. 在 Web 界面「设置 → AI 服务配置」中填写：
   - Base URL: `http://host.docker.internal:11434/v1`
   - Provider: `openai`
   - Model: `qwen2.5:latest`

---

### 🏭 传统部署方式

```bash
# 1. 构建前端
cd frontend && npm run generate && cd ..

# 2. 启动后端
cd backend && npm start
```

需要上传到服务器的文件：

```
backend/          # 后端源码 + node_modules
frontend/dist/    # 前端构建产物
configs/config.yaml
data/             # 数据目录（首次运行自动创建）
skills/           # Agent 技能文件
```

#### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5679;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 🎨 技术栈

### 后端

- **运行时**: Node.js 20+
- **Web 框架**: Hono
- **ORM**: Drizzle ORM + better-sqlite3
- **AI Agent**: Mastra + AI SDK (OpenAI compatible)
- **视频处理**: FFmpeg (fluent-ffmpeg)
- **图片处理**: Sharp

### 前端

- **框架**: Nuxt 3 (SPA 模式)
- **语言**: Vue 3 + TypeScript
- **路由**: 文件路由 (Vue Router 4)
- **样式**: 纯 CSS + CSS Variables (暗色主题)
- **图标**: Lucide Vue

---

## 📝 常见问题

### Q: Docker 容器如何访问宿主机的 Ollama？

A: 使用 `http://host.docker.internal:11434/v1` 作为 Base URL。注意：
1. 宿主机 Ollama 需监听 `0.0.0.0`：`export OLLAMA_HOST=0.0.0.0:11434 && ollama serve`
2. Linux 用户使用 `docker run` 需添加：`--add-host=host.docker.internal:host-gateway`

### Q: FFmpeg 未安装或找不到？

A: 确保 FFmpeg 已安装并在 PATH 环境变量中。运行 `ffmpeg -version` 验证。Docker 部署已内置 FFmpeg。

### Q: 前端无法连接后端 API？

A: 检查后端是否启动，端口是否正确。开发模式下前端代理配置在 `frontend/nuxt.config.ts`。

### Q: 数据库表未创建？

A: 后端会在首次启动时自动创建所有表，检查日志确认初始化是否成功。

---

## 📋 更新日志

### v2.0.0 (2026-04)

#### 🚀 重大更新

- 项目全面迁移至 TypeScript 技术栈
  - 后端：Hono + Drizzle ORM + better-sqlite3
  - 前端：Nuxt 3 + Vue 3
  - AI Agent：Mastra 框架
- 重做单集工作台 UI 和生产流程
  - 更紧凑的控制台布局
  - 重做分镜编辑区
  - 重做配音、镜头图、视频、合成、导出界面
- 新增 Docker 部署支持，前后端合并为单镜像
- 增加运行时 Skill 加载机制
- 扩展多厂商媒体 Adapter
  - 图片：OpenAI、Gemini、MiniMax、火山引擎、阿里
  - 视频：MiniMax、火山引擎/Seedance、Vidu、阿里
  - TTS：MiniMax
- 增加宫格图生成、切分和重新分配流程
- 优化本地文件处理与参考图按需转码

### v1.0.4 (2026-01-27)

- 引入本地存储策略，规避外部资源链接失效
- Base64 参考图嵌入式传输
- 修复镜头切换状态重置问题
- 添加场景迁移至章节

### v1.0.3 (2026-01-16)

- SQLite 纯 Go 驱动，支持 CGO_ENABLED=0 跨平台编译
- 优化并发性能（WAL 模式）
- Docker 跨平台支持 host.docker.internal

### v1.0.2 (2026-01-14)

- 修复视频生成 API 响应解析问题
- 添加 OpenAI Sora 视频端点配置
- 优化错误处理和日志输出

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

常用检查命令：

```bash
cd backend && npm run typecheck
cd ../frontend && npm run build
```

---

## API 配置站点

2 分钟完成配置：[API 聚合站点](https://api.chatfire.site/models)

---

## 👨‍💻 关于我们

**AI 火宝 - AI 工作室创业中**

- 🏠 **位置**: 中国南京
- 🚀 **状态**: 创业中
- 📧 **Email**: [18550175439@163.com](mailto:18550175439@163.com)
- 🐙 **GitHub**: [https://github.com/chatfire-AI/huobao-drama](https://github.com/chatfire-AI/huobao-drama)

> _"让 AI 帮我们做更有创造力的事"_

## 🔗 友情链接

本项目已获得 [LINUX DO](https://linux.do/) 社区链接认可。

- [LINUX DO](https://linux.do/) — 真正的开源精神，共建共享的技术社区

## 项目交流群

![项目交流群](drama.png)

- 提交 [Issue](../../issues)
- 发送邮件至项目维护者

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star！**

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=chatfire-AI/huobao-drama&type=date&legend=top-left)](https://www.star-history.com/#chatfire-AI/huobao-drama&type=date&legend=top-left)
Made with ❤️ by Huobao Team

</div>
