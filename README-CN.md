# 🎬 Huobao Drama - AI 短剧生成平台

<div align="center">

**基于 Go + Vue3 的全栈 AI 短剧自动化生产平台**

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Vue Version](https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat&logo=vue.js)](https://vuejs.org)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

[功能特性](#功能特性) • [快速开始](#快速开始) • [部署指南](#部署指南)

[简体中文](README-CN.md) | [English](README.md) | [日本語](README-JA.md)

</div>

---

## 📖 项目简介

Huobao Drama 是一个基于 AI 的短剧自动化生产平台，实现从剧本生成、角色设计、分镜制作到视频合成的全流程自动化。

### 🎯 核心价值

- **🤖 AI 驱动**：使用大语言模型解析剧本，提取角色、场景和分镜信息
- **🎨 智能创作**：AI 绘图生成角色形象和场景背景
- **📹 视频生成**：基于文生视频和图生视频模型自动生成分镜视频
- **🔄 工作流**：完整的短剧制作工作流，从创意到成片一站式完成

### 🛠️ 技术架构

采用**DDD 领域驱动设计**，清晰分层：

```
├── API层 (Gin HTTP)
├── 应用服务层 (Business Logic)
├── 领域层 (Domain Models)
└── 基础设施层 (Database, External Services)
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

### 🎬 分镜制作

- ✅ 自动生成分镜脚本
- ✅ 场景描述和镜头设计
- ✅ 分镜图片生成（文生图）
- ✅ 帧类型选择（首帧/关键帧/尾帧/分镜板）

### 🎥 视频生成

- ✅ 图生视频自动生成
- ✅ 视频合成和剪辑
- ✅ 转场效果

### 📦 资源管理

- ✅ 素材库统一管理
- ✅ 本地存储支持
- ✅ 资源导入导出
- ✅ 任务进度追踪

---

## 🚀 快速开始

### 📋 环境要求

| 软件        | 版本要求 | 说明                 |
| ----------- | -------- | -------------------- |
| **Go**      | 1.23+    | 后端运行环境         |
| **Node.js** | 18+      | 前端构建环境         |
| **npm**     | 9+       | 包管理工具           |
| **FFmpeg**  | 4.0+     | 视频处理（**必需**） |
| **SQLite**  | 3.x      | 数据库（已内置）     |

#### 安装 FFmpeg

**macOS:**

```bash
brew install ffmpeg
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install ffmpeg
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
vim configs/config.yaml
```

配置文件格式（`configs/config.yaml`）：

```yaml
app:
  name: "Huobao Drama API"
  version: "1.0.0"
  debug: true # 开发环境设为true，生产环境设为false

server:
  port: 5678
  host: "0.0.0.0"
  cors_origins:
    - "http://localhost:3012"
  read_timeout: 600
  write_timeout: 600

database:
  type: "sqlite"
  path: "./data/drama_generator.db"
  max_idle: 10
  max_open: 100

storage:
  type: "local"
  local_path: "./data/storage"
  base_url: "http://localhost:5678/static"

ai:
  default_text_provider: "openai"
  default_image_provider: "openai"
  default_video_provider: "doubao"
```

**重要配置项：**

- `app.debug`: 调试模式开关（开发环境建议设为 true）
- `server.port`: 服务运行端口
- `server.cors_origins`: 允许跨域访问的前端地址
- `database.path`: SQLite 数据库文件路径
- `storage.local_path`: 本地文件存储路径
- `storage.base_url`: 静态资源访问 URL
- `ai.default_*_provider`: AI 服务提供商配置（在 Web 界面中配置具体的 API Key）

### 📥 安装依赖

```bash
# 克隆项目
git clone https://github.com/chatfire-AI/huobao-drama.git
cd huobao-drama

# 安装Go依赖
go mod download

# 安装前端依赖
cd web
npm install
cd ..
```

### 🎯 启动项目

#### 方式一：开发模式（推荐）

**前后端分离，支持热重载**

```bash
# 终端1：启动后端服务
go run main.go

# 终端2：启动前端开发服务器
cd web
npm run dev
```

- 前端地址: `http://localhost:3012`
- 后端 API: `http://localhost:5678/api/v1`
- 前端自动代理 API 请求到后端
- Swagger 文档（debug 模式）：`http://localhost:5678/docs/index.html`（先运行 `scripts/generate_swagger.sh` 生成）

#### 方式二：单服务模式

**后端同时提供 API 和前端静态文件**

```bash
# 1. 构建前端
cd web
npm run build
cd ..

# 2. 启动服务
go run main.go
```

访问: `http://localhost:5678`

### 🗄️ 数据库初始化

数据库表会在首次启动时自动创建（使用 GORM AutoMigrate），无需手动迁移。

---

## 📦 部署指南

### 🐳 Docker 部署（推荐）

#### 方式一：Docker Compose（推荐）

#### 🚀 国内网络加速（可选）

如果您在国内网络环境下，Docker 拉取镜像和安装依赖可能较慢。可以通过配置镜像源加速构建过程。

**步骤 1：创建环境变量文件**

```bash
cp .env.example .env
```

**步骤 2：编辑 `.env` 文件，取消注释需要的镜像源**

```bash
# 启用 Docker Hub 镜像（推荐）
DOCKER_REGISTRY=docker.1ms.run/

# 启用 npm 镜像
NPM_REGISTRY=https://registry.npmmirror.com/

# 启用 Go 代理
GO_PROXY=https://goproxy.cn,direct

# 启用 Alpine 镜像
ALPINE_MIRROR=mirrors.aliyun.com
```

**步骤 3：使用 docker compose 构建（必须）**

```bash
docker compose build
```

> **重要说明**：
>
> - ⚠️ 必须使用 `docker compose build` 才能自动加载 `.env` 文件中的镜像源配置
> - ❌ 如果使用 `docker build` 命令，需要手动传递 `--build-arg` 参数
> - ✅ 推荐始终使用 `docker compose build` 进行构建

**效果对比**：

| 操作          | 不配置镜像源 | 配置镜像源后 |
| ------------- | ------------ | ------------ |
| 拉取基础镜像  | 5-30 分钟    | 1-5 分钟     |
| 安装 npm 依赖 | 可能失败     | 快速成功     |
| 下载 Go 依赖  | 5-10 分钟    | 30 秒-1 分钟 |

> **注意**：国外用户请勿配置镜像源，使用默认配置即可。

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 方式二：Docker 命令

> **注意**：Linux 用户需添加 `--add-host=host.docker.internal:host-gateway` 以访问宿主机服务

```bash
# 从 Docker Hub 运行
docker run -d \
  --name huobao-drama \
  -p 5678:5678 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  huobao/huobao-drama:latest

# 查看日志
docker logs -f huobao-drama
```

**本地构建**（可选）：

```bash
docker build -t huobao-drama:latest .
docker run -d --name huobao-drama -p 5678:5678 -v $(pwd)/data:/app/data huobao-drama:latest
```

**Docker 部署优势：**

- ✅ 开箱即用，内置默认配置
- ✅ 环境一致性，避免依赖问题
- ✅ 一键启动，无需安装 Go、Node.js、FFmpeg
- ✅ 易于迁移和扩展
- ✅ 自动健康检查和重启
- ✅ 自动处理文件权限，无需手动配置

#### 🔗 访问宿主机服务（Ollama/本地模型）

容器已配置支持访问宿主机服务，直接使用 `http://host.docker.internal:端口号` 即可。

**配置步骤：**

1. **宿主机启动服务（监听所有接口）**

   ```bash
   export OLLAMA_HOST=0.0.0.0:11434 && ollama serve
   ```

2. **前端 AI 服务配置**
   - Base URL: `http://host.docker.internal:11434/v1`
   - Provider: `openai`
   - Model: `qwen2.5:latest`

---

### 🏭 传统部署方式

#### 1. 编译构建

```bash
# 1. 构建前端
cd web
npm run build
cd ..

# 2. 编译后端
go build -o huobao-drama .
```

生成文件：

- `huobao-drama` - 后端可执行文件
- `web/dist/` - 前端静态文件（已嵌入后端）

#### 2. 准备部署文件

需要上传到服务器的文件：

```
huobao-drama            # 后端可执行文件
configs/config.yaml     # 配置文件
data/                   # 数据目录（可选，首次运行自动创建）
```

#### 3. 服务器配置

```bash
# 上传文件到服务器
scp huobao-drama user@server:/opt/huobao-drama/
scp configs/config.yaml user@server:/opt/huobao-drama/configs/

# SSH登录服务器
ssh user@server

# 修改配置文件
cd /opt/huobao-drama
vim configs/config.yaml
# 设置mode为production
# 配置域名和存储路径

# 创建数据目录并设置权限（重要！）
# 注意：将 YOUR_USER 替换为实际运行服务的用户名（如 www-data、ubuntu、deploy 等）
sudo mkdir -p /opt/huobao-drama/data/storage
sudo chown -R YOUR_USER:YOUR_USER /opt/huobao-drama/data
sudo chmod -R 755 /opt/huobao-drama/data

# 赋予执行权限
chmod +x huobao-drama

# 启动服务
./huobao-drama
```

#### 4. 使用 systemd 管理服务

创建服务文件 `/etc/systemd/system/huobao-drama.service`:

```ini
[Unit]
Description=Huobao Drama Service
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/opt/huobao-drama
ExecStart=/opt/huobao-drama/huobao-drama
Restart=on-failure
RestartSec=10

# 环境变量（可选）
# Environment="GIN_MODE=release"

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable huobao-drama
sudo systemctl start huobao-drama
sudo systemctl status huobao-drama
```

**⚠️ 常见问题：SQLite 写权限错误**

如果遇到 `attempt to write a readonly database` 错误：

```bash
# 1. 确认当前运行服务的用户
sudo systemctl status huobao-drama | grep "Main PID"
ps aux | grep huobao-drama

# 2. 修复权限（将 YOUR_USER 替换为实际用户名）
sudo chown -R YOUR_USER:YOUR_USER /opt/huobao-drama/data
sudo chmod -R 755 /opt/huobao-drama/data

# 3. 验证权限
ls -la /opt/huobao-drama/data
# 应该显示所有者为运行服务的用户

# 4. 重启服务
sudo systemctl restart huobao-drama
```

**原因说明**：

- SQLite 需要对数据库文件 **和** 所在目录都有写权限
- 需要在目录中创建临时文件（如 `-wal`、`-journal`）
- **关键**：确保 systemd 配置中的 `User` 与数据目录所有者一致

**常用用户名**：

- Ubuntu/Debian: `www-data`、`ubuntu`
- CentOS/RHEL: `nginx`、`apache`
- 自定义部署: `deploy`、`app`、当前登录用户

#### 5. Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 静态文件直接访问
    location /static/ {
        alias /opt/huobao-drama/data/storage/;
    }
}
```

---

## 🎨 技术栈

### 后端技术

- **语言**: Go 1.23+
- **Web 框架**: Gin 1.9+
- **ORM**: GORM
- **数据库**: SQLite
- **日志**: Zap
- **视频处理**: FFmpeg
- **AI 服务**: OpenAI、Gemini、火山等

### 前端技术

- **框架**: Vue 3.4+
- **语言**: TypeScript 5+
- **构建工具**: Vite 5
- **UI 组件**: Element Plus
- **CSS 框架**: TailwindCSS
- **状态管理**: Pinia
- **路由**: Vue Router 4

### 开发工具

- **包管理**: Go Modules, npm
- **代码规范**: ESLint, Prettier
- **版本控制**: Git

---

## 📝 常见问题

### Q: Docker 容器如何访问宿主机的 Ollama？

A: 使用 `http://host.docker.internal:11434/v1` 作为 Base URL。注意两点：

1. 宿主机 Ollama 需监听 `0.0.0.0`：`export OLLAMA_HOST=0.0.0.0:11434 && ollama serve`
2. Linux 用户使用 `docker run` 需添加：`--add-host=host.docker.internal:host-gateway`

详见：[DOCKER_HOST_ACCESS.md](docs/DOCKER_HOST_ACCESS.md)

### Q: FFmpeg 未安装或找不到？

A: 确保 FFmpeg 已安装并在 PATH 环境变量中。运行 `ffmpeg -version` 验证。

### Q: 前端无法连接后端 API？

A: 检查后端是否启动，端口是否正确。开发模式下前端代理配置在 `web/vite.config.ts`。

### Q: 数据库表未创建？

A: GORM 会在首次启动时自动创建表，检查日志确认迁移是否成功。

---

## � 更新日志 / Changelog

### v1.0.2 (2026-01-16)

#### 🚀 重大更新

- SQLite 纯 Go 驱动（`modernc.org/sqlite`），支持 `CGO_ENABLED=0` 跨平台编译
- 优化并发性能（WAL 模式），解决 "database is locked" 错误
- Docker 跨平台支持 `host.docker.internal` 访问宿主机服务
- 精简文档和部署指南

### v1.0.1 (2026-01-14)

#### 🐛 Bug Fixes / 🔧 Improvements

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
