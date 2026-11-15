# CLAUDE.md

## Project Overview

火宝短剧（Huobao Drama）— AI 短剧/漫剧一站式制作工具。全 TypeScript 栈：小说 → 剧本改写 → 资产提取 → 生图 → 分镜拆解 → 生视频 → FFmpeg 拼接导出。支持 Electron 桌面版（macOS dmg）与服务器部署。

## Structure

```
backend/   — Hono + Drizzle ORM (better-sqlite3) + Mastra (AI agents)
backend/workspace/ — Agent 工作目录（Mastra Workspace jail 根）
backend/workspace/skills/ — Agent SKILL.md definitions（设置页可在线编辑）
frontend/  — Nuxt 3 + Vue 3 + TypeScript，ssr:false（纯 CSS，无 UI 框架）
desktop/   — Electron 桌面版：主进程 + esbuild 打包脚本 + electron-builder 配置
data/      — SQLite 数据库（huobao.sqlite3）+ 生成的静态文件（static/）
configs/   — 遗留死配置，代码零引用
```

## Commands

### Backend (`backend/`)
- `npm run dev` — tsx watch 开发服务（端口 5679）
- `npm start` — tsx 生产启动
- `npm run typecheck` — TypeScript 类型检查
- `npm run backfill-artwork` — 存量图片/视频补缩略图与海报帧

### Frontend (`frontend/`)
- `npm run dev` — Vite 开发服务（端口 3013，代理 /api 与 /static 到 5679）
- `npm run generate` — 产出含 index.html 的静态站点（`.output/public`；`nuxt build` 不产 index.html，不能用于静态托管）

### Desktop (`desktop/`，根目录 `npm run dist` 串联全流程)
- `npm run dev` — 打包后端 bundle + Electron 窗口运行
- `npm run build:backend` — esbuild 打包 backend/src → build/backend.mjs（ESM；externals: sharp/better-sqlite3/ffmpeg-static/ffprobe-static）
- `npm run build:main` — 打包主进程 → dist/main.js
- `npm run rebuild:native` — better-sqlite3 按 Electron ABI 重编（原生模块 ABI 变化后必须执行；postinstall 已自动做）
- `npm run dist` — prepare-resources + electron-builder 出 arm64/x64 dmg → release/
- `npm run dist:win` — 交叉打包 Windows NSIS 安装器（win-x64）；win 版 ffmpeg.exe 缓存在 build/win-bin/（缺失时脚本提示下载地址）

## Architecture

### Backend
- **HTTP**: Hono（入口 `src/index.ts`），路由挂 `/api/v1`，`/static` 服务 DATA_ROOT，生产托管前端静态目录
- **Database**: SQLite（better-sqlite3 + WAL），`SQLITE_PATH` 覆盖库文件位置；DDL 在 `src/db/sqlite-schema.ts`，启动时幂等重放；Drizzle 表定义 `src/db/schema.ts`（sqlite-core）
- **路径锚点**: `src/utils/paths.ts` 统一解析 DATA_ROOT/STORAGE_ROOT；桌面版由 Electron 主进程注入 env（`HUOBAO_DATA_DIR`/`SQLITE_PATH`/`WORKSPACE_PATH`/`FRONTEND_DIST`/`FFMPEG_BIN`/`FFPROBE_BIN`），dev 走仓库相对路径默认值
- **AI Agents**: Mastra，4 个 agent（script_rewriter / extractor / storyboard_breaker / prompt_generator），instructions 从 `workspace/prompts/*.md` + skills 动态拼接，模型按请求解析；fetch 补丁链适配国内中转站（关思考/温度/max_tokens）
- **媒体生成**: `services/generation.ts` 统一任务生命周期（sys_task 表），适配器模式：图片 openai/gemini/volcengine，视频 volcengine/minimax
- **视频拼接**: `services/ffmpeg-merge.ts`，FFmpeg 二进制内置（ffmpeg-static），可用 `FFMPEG_BIN`/`FFPROBE_BIN` 覆盖

### Frontend
- Nuxt 3 SPA，动态路由在 `nuxt.config.ts` 的 `pages:extend` 手动注册（views/drama/）
- `app/composables/useApi.ts` 统一 fetch 客户端（全相对路径，生产与后端同源）
- 核心工作台 `app/views/drama/episode.vue`（剧本→制作→导出流水线）

### Desktop
- 主进程 `desktop/src/main.ts`：单实例锁 → 空闲端口 → userData 准备（workspace 模板 copy-once + `.template-version` 版本标记）→ `utilityProcess.fork` 后端 → 轮询 health → BrowserWindow
- userData：打包版 `~/Library/Application Support/HuobaoDrama/`，dev 版 `HuobaoDrama-Dev/`（互不干扰）
- 后端 bundle 在 asar 内（externals 经 asar node_modules 解析，.node 自动重定向 unpacked）

## Database
SQLite 单文件（默认 `data/huobao.sqlite3`，桌面版在 userData）。启动时 `initSqliteSchema` 幂等建表 + 风格预设种子。MySQL→SQLite 一次性迁移：`cd backend && npx tsx scripts/import-mysql-to-sqlite.ts [--force]`（逐表行数校验、写前备份）。

## Key Config
- AI 服务配置存 DB（`ai_service_configs` 表），设置页维护，不在配置文件
- 环境变量全集见 README「环境变量」；`configs/config.yaml` 是死配置（勿参考）
- `PUBLIC_BASE_URL`：Seedance 引用本地参考资源需公网地址，桌面版无此能力（有中文报错）
