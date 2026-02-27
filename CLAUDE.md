# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Huobao Drama is an AI-powered short drama production platform that automates the workflow from script generation, character design, storyboarding to video composition. It uses a Go backend with Vue 3 frontend.

## Development Commands

### Backend (Go)

```bash
# Run the backend server (port 5678)
go run main.go

# Build for production
go build -o drama-api
```

### Frontend (Vue 3 + Vite)

```bash
cd web

# Install dependencies
pnpm install

# Development server (port 3012)
pnpm dev

# Production build
pnpm build

# Lint
pnpm lint
```

## Architecture

### Backend (DDD Pattern)

```
├── api/                    # HTTP Layer
│   ├── handlers/          # Request handlers
│   ├── middlewares/       # Gin middlewares (CORS, logging, rate limit)
│   └── routes/            # Route registration
├── application/           # Application Services
│   └── services/         # Business logic services
├── domain/               # Domain Layer
│   └── models/           # Domain models
├── infrastructure/       # Infrastructure Layer
│   ├── database/        # Database connections & migrations
│   ├── storage/         # Local file storage
│   ├── scheduler/       # Background tasks
│   └── external/        # External tools (FFmpeg)
├── pkg/                  # Shared packages
│   ├── config/           # Configuration loading
│   ├── logger/          # Zap logger wrapper
│   ├── response/         # API response helpers
│   ├── ai/              # AI clients (OpenAI, Gemini)
│   ├── image/           # Image generation clients
│   └── video/           # Video generation clients
├── configs/              # Configuration files
├── migrations/           # Database migrations
└── main.go              # Application entry point
```

### Frontend

```
web/
├── src/
│   ├── api/            # API service layer
│   ├── components/      # Reusable Vue components
│   ├── views/          # Page components
│   ├── stores/         # Pinia state management
│   ├── router/         # Vue Router configuration
│   ├── types/          # TypeScript type definitions
│   ├── locales/        # i18n translations
│   └── utils/          # Utilities (FFmpeg, request, etc.)
├── package.json
└── vite.config.ts
```

## Key Configuration

- Backend config: `configs/config.yaml`
- Server port: `5678` (default)
- CORS origins configured in config.yaml
- Database: SQLite by default (`data/drama_generator.db`)
- Storage: Local filesystem (`data/storage`)

## Database

The project uses GORM with automatic migrations. Supported databases:

- SQLite (default for development)
- MySQL
- PostgreSQL

## AI Providers

The system supports multiple AI providers configurable in `configs/config.yaml`:

- Text: OpenAI, Gemini
- Image: OpenAI, Gemini, Volcengine
- Video: OpenAI Sora, Doubao, Minimax, etc.
