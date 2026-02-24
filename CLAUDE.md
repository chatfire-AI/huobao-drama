# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Huobao Drama is a full-stack AI-powered drama/video production tool. A Go backend (Gin + GORM) serves both a REST API and a Vue 3 SPA frontend as a single binary.

## Commands

### Backend (project root)
- `go run main.go` — start server (reads `configs/config.yaml`, serves on :5678)
- `go build -o huobao-drama .` — build binary
- `go run cmd/migrate/main.go` — run DB migrations
- `go test ./...` — run all Go tests

### Frontend (`web/` directory, uses pnpm)
- `pnpm dev` — Vite dev server on :3012, proxies `/api` and `/static` to :5678
- `pnpm build` — production build to `web/dist/`
- `pnpm build:check` — build with TypeScript type checking
- `pnpm lint` — ESLint

### Docker
- `docker-compose up --build` — full stack on port 5678

## Architecture

### Backend — DDD 4-layer structure
- `api/handlers/` — HTTP handlers (Gin). Call services, return JSON via `pkg/response/` helpers.
- `api/routes/routes.go` — all route definitions under `/api/v1`
- `api/middlewares/` — CORS, logging, rate limiting
- `application/services/` — business logic orchestration
- `domain/models/` — GORM models with soft deletes, JSON fields (`datatypes.JSON`), and `gorm:"-"` runtime fields
- `infrastructure/` — database (GORM + SQLite/MySQL), local file storage, FFmpeg wrapper, cron scheduler
- `pkg/` — shared packages: AI clients (text/image/video), config, logger (Zap), response helpers, utils

Handlers never touch the DB directly. Services orchestrate between handlers and infrastructure.

### Multi-provider AI abstraction
`pkg/ai/`, `pkg/image/`, `pkg/video/` each define a client interface with multiple provider implementations (OpenAI, Gemini, Volcengine/Doubao, MiniMax, Sora, Chatfire). Config in `configs/config.yaml` selects active providers.

### Frontend — Vue 3 SPA (`web/src/`)
- Vue 3 + TypeScript + Vite 5
- UI: Element Plus + Tailwind CSS 4 + SCSS
- State: Pinia (`stores/episode.ts`)
- Routing: Vue Router 4, all routes lazy-loaded (`router/index.ts`)
- HTTP: Axios with interceptors (`api/request.ts`), 13 API modules in `api/`
- i18n: vue-i18n (zh-CN, en-US) in `locales/`
- Dark mode: Tailwind `darkMode: 'class'`, persisted in localStorage
- Views organized by feature: `drama/`, `workflow/`, `storyboard/`, `settings/`
- Shared components in `components/common/` and `components/editor/`

### SPA serving
Go serves `web/dist/` as static files with a NoRoute fallback to `index.html` for client-side routing.

## Key Config
- `configs/config.yaml` — server port, DB type (sqlite/mysql), AI provider settings, storage paths
- `web/vite.config.ts` — dev proxy config, path aliases (`@` → `src/`)
- `web/tailwind.config.js` — custom color tokens for dark mode

## Database
Default: SQLite (pure Go via `modernc.org/sqlite`, no CGO). Also supports MySQL. WAL mode enabled with connection pool tuning for SQLite's single-writer constraint. Auto-migration on startup in `infrastructure/database/`.

## Conventions
- Backend uses Chinese comments extensively
- Frontend i18n keys used throughout — both zh-CN and en-US supported
- API responses use standard format via `pkg/response/` (Success/Error helpers)
- Domain models use `gorm.Model` base (ID, CreatedAt, UpdatedAt, DeletedAt)
