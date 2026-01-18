# 🎬 Huobao Drama - AI Short Drama Production Platform

<div align="center">

**Full-stack AI Short Drama Automation Platform Based on Go + Vue3**

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Vue Version](https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat&logo=vue.js)](https://vuejs.org)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

[Features](#features) • [Quick Start](#quick-start) • [Deployment](#deployment)

[简体中文](README.md) | [English](README-EN.md) | [日本語](README-JA.md)

</div>

---

## 📖 About

Huobao Drama is an AI-powered short drama production platform that automates the entire workflow from script generation, character design, storyboarding to video composition.

### 🎯 Core Features

- **🤖 AI-Driven**: Parse scripts using large language models to extract characters, scenes, and storyboards
- **🎨 Intelligent Creation**: AI-generated character portraits and scene backgrounds
- **📹 Video Generation**: Automatic storyboard video generation using text-to-video and image-to-video models
- **🔄 Complete Workflow**: End-to-end production workflow from idea to final video

### 🛠️ Technical Architecture

Based on **DDD (Domain-Driven Design)** with clear layering:

```
├── API Layer (Gin HTTP)
├── Application Service Layer (Business Logic)
├── Domain Layer (Domain Models)
└── Infrastructure Layer (Database, External Services)
```

### 🎥 Demo Videos

Experience AI short drama generation:

<div align="center">

**Sample Work 1**

<video src="https://ffile.chatfire.site/cf/public/20260114094337396.mp4" controls width="640"></video>

**Sample Work 2**

<video src="https://ffile.chatfire.site/cf/public/fcede75e8aeafe22031dbf78f86285b8.mp4" controls width="640"></video>

[Watch Video 1](https://ffile.chatfire.site/cf/public/20260114094337396.mp4) | [Watch Video 2](https://ffile.chatfire.site/cf/public/fcede75e8aeafe22031dbf78f86285b8.mp4)

</div>

---

## ✨ Features

### 🎭 Character Management
- ✅ AI-generated character portraits
- ✅ Batch character generation
- ✅ Character image upload and management

### 🎬 Storyboard Production
- ✅ Automatic storyboard script generation
- ✅ Scene descriptions and shot design
- ✅ Storyboard image generation (text-to-image)
- ✅ Frame type selection (first frame/key frame/last frame/panel)

### 🎥 Video Generation
- ✅ Automatic image-to-video generation
- ✅ Video composition and editing
- ✅ Transition effects

### 📦 Asset Management
- ✅ Unified asset library management
- ✅ Local storage support
- ✅ Asset import/export
- ✅ Task progress tracking

---

## 🚀 Quick Start

### 📋 Prerequisites

| Software | Version | Description |
|----------|---------|-------------|
| **Go** | 1.23+ | Backend runtime |
| **Node.js** | 18+ | Frontend build environment |
| **npm** | 9+ | Package manager |
| **FFmpeg** | 4.0+ | Video processing (**Required**) |
| **SQLite** | 3.x | Database (built-in) |

#### Installing FFmpeg

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
Download from [FFmpeg Official Site](https://ffmpeg.org/download.html) and configure environment variables

Verify installation:
```bash
ffmpeg -version
```

### ⚙️ Configuration

Copy and edit the configuration file:

```bash
cp configs/config.example.yaml configs/config.yaml
vim configs/config.yaml
```

Configuration file format (`configs/config.yaml`):

```yaml
app:
  name: "Huobao Drama API"
  version: "1.0.0"
  debug: true  # Set to true for development, false for production

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

**Key Configuration Items:**
- `app.debug`: Debug mode switch (recommended true for development)
- `server.port`: Service port
- `server.cors_origins`: Allowed CORS origins for frontend
- `database.path`: SQLite database file path
- `storage.local_path`: Local file storage path
- `storage.base_url`: Static resource access URL
- `ai.default_*_provider`: AI service provider configuration (API keys configured in Web UI)

### 📥 Installation

```bash
# Clone the project
git clone https://github.com/chatfire-AI/huobao-drama.git
cd huobao-drama

# Install Go dependencies
go mod download

# Install frontend dependencies
cd web
npm install
cd ..
```

### 🎯 Starting the Project

#### Method 1: Development Mode (Recommended)

**Frontend and backend separation with hot reload**

```bash
# Terminal 1: Start backend service
go run main.go

# Terminal 2: Start frontend dev server
cd web
npm run dev
```

- Frontend: `http://localhost:3012`
- Backend API: `http://localhost:5678/api/v1`
- Frontend automatically proxies API requests to backend

#### Method 2: Single Service Mode

**Backend serves both API and frontend static files**

```bash
# 1. Build frontend
cd web
npm run build
cd ..

# 2. Start service
go run main.go
```

Access: `http://localhost:5678`

### 🗄️ Database Initialization

Database tables are automatically created on first startup (using GORM AutoMigrate), no manual migration needed.

---

## 📦 Deployment

### 🐳 Docker Deployment (Recommended)

#### Method 1: Docker Compose (Recommended)

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Method 2: Docker Command

> **Note**: Linux users need to add `--add-host=host.docker.internal:host-gateway` to access host services

```bash
# Run from Docker Hub
docker run -d \
  --name huobao-drama \
  -p 5678:5678 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  huobao/huobao-drama:latest

# View logs
docker logs -f huobao-drama
```

**Local Build** (optional):
```bash
docker build -t huobao-drama:latest .
docker run -d --name huobao-drama -p 5678:5678 -v $(pwd)/data:/app/data huobao-drama:latest
```

**Docker Deployment Advantages:**
- ✅ Ready to use with default configuration
- ✅ Environment consistency, avoiding dependency issues
- ✅ One-click start, no need to install Go, Node.js, FFmpeg
- ✅ Easy to migrate and scale
- ✅ Automatic health checks and restarts
- ✅ Automatic file permission handling

#### 🔗 Accessing Host Services (Ollama/Local Models)

The container is configured to access host services using `http://host.docker.internal:PORT`.

**Configuration Steps:**

1. **Start service on host (listen on all interfaces)**
   ```bash
   export OLLAMA_HOST=0.0.0.0:11434 && ollama serve
   ```

2. **Frontend AI Service Configuration**
   - Base URL: `http://host.docker.internal:11434/v1`
   - Provider: `openai`
   - Model: `qwen2.5:latest`

---

### 🏭 Traditional Deployment

#### 1. Build

```bash
# 1. Build frontend
cd web
npm run build
cd ..

# 2. Compile backend
go build -o huobao-drama .
```

Generated files:
- `huobao-drama` - Backend executable
- `web/dist/` - Frontend static files (embedded in backend)

#### 2. Prepare Deployment Files

Files to upload to server:
```
huobao-drama            # Backend executable
configs/config.yaml     # Configuration file
data/                   # Data directory (optional, auto-created on first run)
```

#### 3. Server Configuration

```bash
# Upload files to server
scp huobao-drama user@server:/opt/huobao-drama/
scp configs/config.yaml user@server:/opt/huobao-drama/configs/

# SSH to server
ssh user@server

# Modify configuration file
cd /opt/huobao-drama
vim configs/config.yaml
# Set mode to production
# Configure domain and storage path

# Create data directory and set permissions (Important!)
# Note: Replace YOUR_USER with actual user running the service (e.g., www-data, ubuntu, deploy)
sudo mkdir -p /opt/huobao-drama/data/storage
sudo chown -R YOUR_USER:YOUR_USER /opt/huobao-drama/data
sudo chmod -R 755 /opt/huobao-drama/data

# Grant execute permission
chmod +x huobao-drama

# Start service
./huobao-drama
```

#### 4. Manage Service with systemd

Create service file `/etc/systemd/system/huobao-drama.service`:

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

# Environment variables (optional)
# Environment="GIN_MODE=release"

[Install]
WantedBy=multi-user.target
```

Start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable huobao-drama
sudo systemctl start huobao-drama
sudo systemctl status huobao-drama
```

**⚠️ Common Issue: SQLite Write Permission Error**

If you encounter `attempt to write a readonly database` error:

```bash
# 1. Check current user running the service
sudo systemctl status huobao-drama | grep "Main PID"
ps aux | grep huobao-drama

# 2. Fix permissions (replace YOUR_USER with actual username)
sudo chown -R YOUR_USER:YOUR_USER /opt/huobao-drama/data
sudo chmod -R 755 /opt/huobao-drama/data

# 3. Verify permissions
ls -la /opt/huobao-drama/data
# Should show owner as the user running the service

# 4. Restart service
sudo systemctl restart huobao-drama
```

**Reason:**
- SQLite requires write permission on both the database file **and** its directory
- Needs to create temporary files in the directory (e.g., `-wal`, `-journal`)
- **Key**: Ensure systemd `User` matches data directory owner

**Common Usernames:**
- Ubuntu/Debian: `www-data`, `ubuntu`
- CentOS/RHEL: `nginx`, `apache`
- Custom deployment: `deploy`, `app`, current logged-in user

#### 5. Nginx Reverse Proxy

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

    # Direct access to static files
    location /static/ {
        alias /opt/huobao-drama/data/storage/;
    }
}
```

---

## 🎨 Tech Stack

### Backend
- **Language**: Go 1.23+
- **Web Framework**: Gin 1.9+
- **ORM**: GORM
- **Database**: SQLite
- **Logging**: Zap
- **Video Processing**: FFmpeg
- **AI Services**: OpenAI, Gemini, Doubao, etc.

### Frontend
- **Framework**: Vue 3.4+
- **Language**: TypeScript 5+
- **Build Tool**: Vite 5
- **UI Components**: Element Plus
- **CSS Framework**: TailwindCSS
- **State Management**: Pinia
- **Router**: Vue Router 4

### Development Tools
- **Package Management**: Go Modules, npm
- **Code Standards**: ESLint, Prettier
- **Version Control**: Git

---

## 📝 FAQ

### Q: How can Docker containers access Ollama on the host?
A: Use `http://host.docker.internal:11434/v1` as Base URL. Note two things:
1. Host Ollama needs to listen on `0.0.0.0`: `export OLLAMA_HOST=0.0.0.0:11434 && ollama serve`
2. Linux users using `docker run` need to add: `--add-host=host.docker.internal:host-gateway`

See: [DOCKER_HOST_ACCESS.md](docs/DOCKER_HOST_ACCESS.md)

### Q: FFmpeg not installed or not found?
A: Ensure FFmpeg is installed and in the PATH environment variable. Verify with `ffmpeg -version`.

### Q: Frontend cannot connect to backend API?
A: Check if backend is running and port is correct. In development mode, frontend proxy config is in `web/vite.config.ts`.

### Q: Database tables not created?
A: GORM automatically creates tables on first startup, check logs to confirm migration success.

---

## 📋 Changelog

### v1.0.2 (2026-01-16)

#### 🚀 Major Updates
- Pure Go SQLite driver (`modernc.org/sqlite`), supports `CGO_ENABLED=0` cross-platform compilation
- Optimized concurrency performance (WAL mode), resolved "database is locked" errors
- Docker cross-platform support for `host.docker.internal` to access host services
- Streamlined documentation and deployment guides

### v1.0.1 (2026-01-14)

#### 🐛 Bug Fixes / 🔧 Improvements
- Fixed video generation API response parsing issues
- Added OpenAI Sora video endpoint configuration
- Optimized error handling and logging

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

1. Fork this project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## API Configuration Site
Configure in 2 minutes: [API Aggregation Site](https://api.chatfire.site/models)

## 📧 Contact
Business Contact (WeChat): dangbao1117

## Community Group
![Community Group](drama.png)
- Submit [Issue](../../issues)
- Email project maintainers

---

<div align="center">

**⭐ If this project helps you, please give it a Star!**

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=chatfire-AI/huobao-drama&type=date&legend=top-left)](https://www.star-history.com/#chatfire-AI/huobao-drama&type=date&legend=top-left)

Made with ❤️ by Huobao Team

</div>
