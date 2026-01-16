# 🎬 Huobao Drama - AI Short Drama Generation Platform

<div align="center\">

**A full-stack AI short drama automated production platform based on Go + Vue3**

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Vue Version](https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat&logo=vue.js)](https://vuejs.org)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

[Features](#features) • [Quick Start](#quick-start) • [Deployment Guide](#deployment-guide)

[简体中文](README.md) | English

</div>

---

## 📖 About Project

Huobao Drama is an AI-powered short drama production platform that automates the entire workflow from script generation, character design, storyboarding to video composition.

### 🎯 Core Values

- **🤖 AI-Driven**: Parse scripts using large language models to extract characters, scenes, and storyboards.
- **🎨 Intelligent Creation**: AI-generated character portraits and scene backgrounds.
- **📹 Video Generation**: Automatic storyboard video generation using text-to-video and image-to-video models.
- **🔄 Workflow**: Complete production workflow from idea to final video in one stop.

### 🛠️ Technical Architecture

Adopts **DDD (Domain-Driven Design)** with clear layering:

```
├── API Layer (Gin HTTP)
├── Application Service Layer (Business Logic)
├── Domain Layer (Domain Models)
└── Infrastructure Layer (Database, External Services)
```

### 🎥 Demo Videos

Experience AI short drama generation effects:

<div align="center\">

**Example Work 1**

<video src="https://ffile.chatfire.site/cf/public/20260114094337396.mp4" controls width="640"></video>

**Example Work 2**

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
- ✅ Scene description and shot design
- ✅ Storyboard image generation (Text-to-Image)
- ✅ Frame type selection (First frame/Keyframe/Last frame/Storyboard)

### 🎥 Video Generation
- ✅ Automatic Image-to-Video generation
- ✅ Video composition and editing
- ✅ Transition effects

### 📦 Resource Management
- ✅ Unified material library management
- ✅ Local storage support
- ✅ Resource import/export
- ✅ Task progress tracking

---

## 🚀 Quick Start

### 📋 Prerequisites

| Software | Version Requirement | Description |
|------|---------|------|
| **Go** | 1.23+ | Backend runtime environment |
| **Node.js** | 18+ | Frontend build environment |
| **npm** | 9+ | Package management tool |
| **FFmpeg** | 4.0+ | Video processing (**Required**) |
| **SQLite** | 3.x | Database (Built-in) |

#### Install FFmpeg

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
Download from [FFmpeg Official Website](https://ffmpeg.org/download.html) and configure environment variables.

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

Configuration format (`configs/config.yaml`):

```yaml
app:
  name: "Huobao Drama API"
  version: "1.0.0"
  debug: true  # Set to true for dev, false for production

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

**Important Settings:**
- `app.debug`: Debug mode switch (recommended true for development)
- `server.port`: Service port
- `server.cors_origins`: Allowed frontend addresses for CORS
- `database.path`: SQLite database file path
- `storage.local_path`: Local file storage path
- `storage.base_url`: Static resource access URL
- `ai.default_*_provider`: AI service provider configuration (configure specific API Keys in the Web UI)

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

### 🎯 Launch Project

#### Option 1: Development Mode (Recommended)

**Frontend and backend separated with hot reload support**

```bash
# Terminal 1: Start backend service
go run main.go

# Terminal 2: Start frontend dev server
cd web
npm run dev
```

- Frontend: `http://localhost:3012`
- Backend API: `http://localhost:5678/api/v1`
- Frontend automatically proxies API requests to the backend

#### Option 2: Single Service Mode

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

Database tables will be automatically created on first launch (using GORM AutoMigrate), no manual migration required.

---

## 📦 Deployment Guide

### 🐳 Docker Deployment (Recommended)

#### Option 1: Docker Compose (Recommended)

```bash
# Start service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop service
docker-compose down
```

#### Option 2: Docker Command

> **Note**: Linux users need to add `--add-host=host.docker.internal:host-gateway` to access host services.

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

**Local Build** (Optional):
```bash
docker build -t huobao-drama:latest .
docker run -d --name huobao-drama -p 5678:5678 -v $(pwd)/data:/app/data huobao-drama:latest
```

**Docker Deployment Advantages:**
- ✅ Out-of-the-box with default configuration
- ✅ Environment consistency, avoiding dependency issues
- ✅ One-click startup, no need to install Go, Node.js, FFmpeg
- ✅ Easy to migrate and scale
- ✅ Automatic health checks and restarts
- ✅ Automatic file permission handling

#### 🔗 Access Host Services (Ollama/Local Models)

The container is configured to support access to host services, use `http://host.docker.internal:PORT` directly.

**Configuration Steps:**

1. **Start host service (listening on all interfaces)**
   ```bash
   export OLLAMA_HOST=0.0.0.0:11434 && ollama serve
   ```

2. **Frontend AI Service Configuration**
   - Base URL: `http://host.docker.internal:11434/v1`
   - Provider: `openai`
   - Model: `qwen2.5:latest`

---

## 🏭 Traditional Deployment

#### 1. Compilation and Build

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

Files to upload to the server:
```
huobao-drama            # Backend executable
configs/config.yaml     # Configuration file
data/                   # Data directory (optional, created on first run)
```

#### 3. Server Configuration

```bash
# Upload files to server
scp huobao-drama user@server:/opt/huobao-drama/
scp configs/config.yaml user@server:/opt/huobao-drama/configs/

# SSH into server
ssh user@server

# Modify configuration
cd /opt/huobao-drama
vim configs/config.yaml
# Set mode to production
# Configure domain and storage paths

# Create data directory and set permissions (Important!)
# Replace YOUR_USER with the actual user running the service
sudo mkdir -p /opt/huobao-drama/data/storage
sudo chown -R YOUR_USER:YOUR_USER /opt/huobao-drama/data
sudo chmod -R 755 /opt/huobao-drama/data

# Grant execution permission
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
# 1. Confirm current service user
ps aux | grep huobao-drama

# 2. Fix permissions (replace YOUR_USER)
sudo chown -R YOUR_USER:YOUR_USER /opt/huobao-drama/data
sudo chmod -R 755 /opt/huobao-drama/data

# 3. Verify permissions
ls -la /opt/huobao-drama/data

# 4. Restart service
sudo systemctl restart huobao-drama
```

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

    # Static file direct access
    location /static/ {
        alias /opt/huobao-drama/data/storage/;
    }
}
```

---

## 🎨 Technology Stack

### Backend
- **Language**: Go 1.23+
- **Framework**: Gin 1.9+
- **ORM**: GORM
- **Database**: SQLite
- **Logging**: Zap
- **Video Processing**: FFmpeg
- **AI Services**: OpenAI, Gemini, Volcengine, etc.

### Frontend
- **Framework**: Vue 3.4+
- **Language**: TypeScript 5+
- **Build Tool**: Vite 5
- **UI Components**: Element Plus
- **CSS Framework**: TailwindCSS
- **State Management**: Pinia
- **Routing**: Vue Router 4

---

## 📝 FAQ

### Q: How can a Docker container access host's Ollama?
A: Use `http://host.docker.internal:11434/v1` as Base URL. Note:
1. Host Ollama must listen on `0.0.0.0`.
2. Linux users using `docker run` need `--add-host=host.docker.internal:host-gateway`.

See: [DOCKER_HOST_ACCESS.md](docs/DOCKER_HOST_ACCESS.md)

---

## 🚀 Changelog

### v1.0.2 (2026-01-16)
- Pure Go SQLite driver (`modernc.org/sqlite`), supports `CGO_ENABLED=0` cross-compilation
- Optimized concurrency performance (WAL mode), resolved "database is locked" errors
- Docker cross-platform support for `host.docker.internal`
- Streamlined documentation and deployment guides

### v1.0.1 (2026-01-14)
- Fixed video generation API response parsing issues
- Added OpenAI Sora video endpoint configuration
- Optimized error handling and log output

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## API Configuration
Complete configuration in 2 minutes: [API Site](https://api.chatfire.site/models)

## 📧 Contact
Business Contact (WeChat): dangbao1117

## Community
![Community](drama.png)
- Submit [Issue](../../issues)

---

<div align="center\">

**⭐ If this project is helpful to you, please give it a Star!**

[![Star History Chart](https://api.star-history.com/svg?repos=chatfire-AI/huobao-drama&type=date&legend=top-left)](https://www.star-history.com/#chatfire-AI/huobao-drama&type=date&legend=top-left)

Made with ❤️ by Huobao Team

</div>
