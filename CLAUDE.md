# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Huobao Drama (火宝短剧) is an AI-powered short drama production platform that automates the workflow from script generation, character design, storyboarding to video composition. Built with Go backend + Vue 3 frontend using DDD architecture.

## Technology Stack

- **Backend**: Go 1.23+, Gin web framework, GORM ORM
- **Frontend**: Vue 3, TypeScript, Vite, Element Plus, Pinia, Vue Router
- **Database**: SQLite (default), MySQL, PostgreSQL supported
- **AI Providers**: OpenAI, Gemini, Volcengine for text/image/video generation

## Common Commands

### Backend (Go)

```bash
# Run the server
go run main.go

# Build
go build -o huobao-drama

# Run with custom config
go run main.go --config=/path/to/config.yaml
```

### Frontend (Vue)

```bash
cd web

# Install dependencies
pnpm install

# Development server
pnpm dev

# Build for production
pnpm build

# Lint and fix
pnpm lint
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in background
docker-compose up -d
```

## Project Structure

```
├── api/              # HTTP handlers and routes (Gin)
│   ├── handlers/     # Request handlers
│   ├── middlewares/  # CORS, rate limiting, logging
│   └── routes/      # Route definitions
├── application/     # Business logic services
│   └── services/    # Service layer
├── domain/          # Domain models (GORM)
│   └── models/     # Database entities
├── infrastructure/  # External integrations
│   ├── database/    # Database connection
│   ├── storage/     # Local storage
│   ├── scheduler/   # Background jobs
│   └── external/   # FFmpeg, etc.
├── pkg/             # Shared packages
│   ├── ai/         # AI provider clients (OpenAI, Gemini)
│   ├── image/      # Image generation clients
│   ├── video/      # Video generation clients
│   ├── config/     # Configuration management
│   ├── logger/     # Zap logger
│   └── utils/      # Utilities
└── web/            # Vue 3 frontend
    └── src/
        ├── api/    # TypeScript API calls
        ├── views/  # Page components
        ├── components/  # Reusable components
        ├── stores/ # Pinia stores
        ├── router/ # Vue Router
        └── locales/ # i18n translations
```

## Key Architecture Patterns

### Backend (DDD)

- **API Layer** (`api/handlers/`): HTTP handlers receive requests, validate input, call services
- **Service Layer** (`application/services/`): Business logic, orchestrates domain operations
- **Domain Layer** (`domain/models/`): GORM models with business logic
- **Infrastructure Layer** (`infrastructure/`): Database, storage, external service clients

### API Response Format

Use `pkg/response/response.go` for consistent API responses:
```go
response.Success(c, data)
response.Error(c, code, message)
```

### Frontend State Management

- **Pinia** stores for global state
- **Vue Router** for navigation
- **Axios** for HTTP requests with interceptors in `utils/request.ts`

## Database

- Uses GORM for ORM
- Auto-migration enabled in `main.go`
- SQLite default at `./data/drama_generator.db`
- Supports MySQL and PostgreSQL via config

## Configuration

Config file: `configs/config.yaml` (copy from `config.example.yaml`)

Key sections:
- `app`: App name, version, debug mode
- `server`: Port, CORS origins
- `database`: Type, connection details
- `storage`: Local storage path
- `ai`: Default AI providers (text, image, video)

## API Routes

All routes prefixed with `/api/v1`:
- `/api/v1/dramas` - Drama management
- `/api/v1/ai-configs` - AI configuration
- `/api/v1/image-generation` - Image generation
- `/api/v1/video-generation` - Video generation
- `/api/v1/characters` - Character library
- `/api/v1/assets` - Asset management
- `/api/v1/tasks` - Async task tracking

## Development Notes

- Frontend runs on port 3012 (configurable)
- Backend runs on port 5678 by default
- CORS configured to allow frontend origin
- Rate limiting enabled on API routes
- Task system for async operations (video generation, etc.)