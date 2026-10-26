# 🎬 Huobao Drama — AI 短剧生成平台 / AI Short Drama Generation Platform

<div align="center">

**基于 TypeScript 全栈的 AI 短剧自动化生产平台**<br>
**A full-stack TypeScript platform for automated AI short-drama production**

[![Node Version](https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=node.js)](https://nodejs.org)
[![Vue Version](https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat&logo=vue.js)](https://vuejs.org)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Download](https://img.shields.io/github/v/release/chatfire-AI/huobao-drama?style=flat&logo=github&label=Download)](https://github.com/chatfire-AI/huobao-drama/releases/latest)

**中英双语 / Bilingual** | [简体中文](README.zh-CN.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

<p>
  <a href="https://api.firemux.cn">
    <img src="docs/images/api-key-cta.svg" width="380" alt="立即获取 FireMux API Key / Get your API key" />
  </a>
</p>

**文本 · 图片 · 视频全部 AI 能力，一个 Key 即可开通**<br>
**Text, image, and video AI capabilities — one key unlocks everything**

部署完成后，在「设置 → 火宝快捷配置」粘贴 Key，一键写入三条推荐配置。<br>
After deploying, paste the key in "Settings → Huobao Quick Setup" to write three recommended configs in one click.

<p>
  <a href="https://github.com/chatfire-AI/huobao-drama/releases/latest">
    <img src="docs/images/desktop-download-cta.svg" width="380" alt="立即下载桌面版 / Download Desktop App (macOS / Windows)" />
  </a>
</p>
<p>
  <a href="https://www.firemux.cn">
    <img src="docs/images/website-cta.svg" width="320" alt="访问 FireMux 官网 / Visit the official website" />
  </a>
</p>

</div>

---

## 📖 项目简介 / Overview

Huobao Drama 是一个基于 AI 的短剧自动化生产平台，实现从剧本生成、角色设计、分镜制作到视频合成的全流程自动化。<br>
Huobao Drama is an AI-powered short-drama production platform that automates the entire pipeline: script generation, character design, storyboard breakdown, and video compositing.

### 🎯 核心价值 / Core Value

- **🤖 AI 驱动**：使用大语言模型解析剧本，提取角色、场景和分镜信息<br>
  **🤖 AI-Driven**: LLMs parse scripts and extract characters, scenes, and storyboard information

- **🎨 智能创作**：AI 绘图生成角色形象和场景背景<br>
  **🎨 Intelligent Creation**: AI image generation for character designs and scene backgrounds

- **📹 视频生成**：基于文生视频和图生视频模型自动生成分镜视频<br>
  **📹 Video Generation**: Text-to-video and image-to-video models automatically produce storyboard clips

- **🔄 工作流**：完整的短剧制作工作流，从创意到成片一站式完成<br>
  **🔄 End-to-End Workflow**: A complete pipeline from idea to finished episode

### 🛠️ 技术架构 / Architecture

```
frontend/   — Nuxt 3 + Vue 3 + TypeScript（纯 CSS，无 UI 框架 / pure CSS, no UI framework）
backend/    — Hono + Drizzle ORM + Mastra AI Agents + better-sqlite3
backend/workspace/skills/ — Agent 技能定义，支持界面在线编辑 / Agent skill definitions (SKILL.md), editable in the UI
desktop/    — Electron 桌面版 / Electron desktop app（主进程 + esbuild + electron-builder / main process + esbuild + electron-builder）
data/       — 生成资源文件与 SQLite 数据库 / Generated assets and the SQLite database
```

---

## ✨ 功能特性 / Features

### 🎭 角色管理 / Character Management

- ✅ AI 生成角色形象<br>
  ✅ AI-generated character designs

- ✅ 批量角色生成<br>
  ✅ Batch character generation

- ✅ 角色图片上传和管理<br>
  ✅ Character image upload and management

### 🎬 视频任务 / Video Tasks

- ✅ AI 自动生成视频任务<br>
  ✅ Automatic AI video-task generation

- ✅ 场景描述和视频提示词生成<br>
  ✅ Scene descriptions and video prompt generation

- ✅ 按任务批量生成视频<br>
  ✅ Batch video generation per task

### 🎥 视频生成 / Video Generation

- ✅ 文生视频自动生成<br>
  ✅ Text-to-video generation

- ✅ FFmpeg 单镜头合成与字幕处理<br>
  ✅ FFmpeg per-shot compositing and subtitle handling

- ✅ 整集拼接导出<br>
  ✅ Full-episode stitching and export

### 📦 资源管理 / Asset Management

- ✅ 素材库统一管理<br>
  ✅ Unified asset library

- ✅ 本地存储支持<br>
  ✅ Local storage support

- ✅ 任务进度追踪<br>
  ✅ Task progress tracking

### 🤖 AI Agents

内置 4 个 Mastra Agent，支持数据库配置和 Skill 扩展：<br>
Four built-in Mastra agents with database-backed configuration and Skill extensions:

| Agent |职责<br>Role|
|---|---|
| `script_rewriter` |小说 → 格式化剧本改写<br>Novel → formatted script rewriting|
| `extractor` |角色 / 场景 / 道具智能提取与去重<br>Intelligent extraction and dedup of characters / scenes / props|
| `storyboard_breaker` |剧本 → 分镜序列拆解<br>Script → storyboard sequence breakdown|
| `prompt_generator` |角色/场景/道具图片提示词 + 分镜视频提示词生成<br>Image prompts for characters/scenes/props + storyboard video prompts|

### 🌐 多语言界面 / Multi-Language UI

界面内置 **中文 / English / 日本語 / 한국어** 四种语言，并可全局设置 AI 生成内容的语言。<br>
The interface ships in **中文 / English / 日本語 / 한국어**, with a global setting for AI-generated content language.

### 🔌 多厂商适配 / Multi-Provider Support

|类型<br>Type|支持厂商<br>Providers|
|---|---|
|**文本**<br>**Text**|OpenAI(兼容接口)、Gemini<br>OpenAI (compatible APIs), Gemini|
|**图片**<br>**Image**|OpenAI、Gemini、火山引擎<br>OpenAI, Gemini, Volcano Engine|
|**视频**<br>**Video**|火山引擎 Seedance 2.0(标准 / Fast / Mini)、MiniMax H3、阿里云百炼 Wan 3.0 (Prime / 标准)<br>Volcano Engine Seedance 2.0 (Standard / Fast / Mini), MiniMax H3, Alibaba Bailian Wan 3.0 (Prime / Standard)|

---

## 🚀 快速开始 / Quick Start

### 📋 环境要求 / Requirements

|软件<br>Software|版本要求<br>Version|说明<br>Notes|
|---|---|---|
| **Node.js** | 20+ |前后端运行环境<br>Runtime for frontend and backend|
| **npm** | 9+ |包管理工具<br>Package manager|

> **数据库零安装**：内置 SQLite（单文件，随项目数据目录存放），无需安装任何数据库服务。<br>
> **Zero-install database**: Bundled SQLite (single file in the project data directory) — no database server required.

> **FFmpeg 无需安装**：项目通过 `ffmpeg-static` / `ffprobe-static` npm 包内置二进制，开箱即用。<br>
> **No FFmpeg install needed**: Binaries ship via the `ffmpeg-static` / `ffprobe-static` npm packages — works out of the box.

### ⚙️ 环境变量 / Environment Variables

无需配置文件，通过环境变量设置（均有默认值，本地开发可零配置启动）：<br>
No config files — everything is set via environment variables (all have defaults; local dev needs zero configuration):

|变量<br>Variable|默认值<br>Default|说明<br>Description|
|---|---|---|
| `SQLITE_PATH` |`<仓库根>/data/huobao.sqlite3`<br>`<repo>/data/huobao.sqlite3`|SQLite 数据库文件位置<br>SQLite database file location|
| `PORT` | `5679` |后端服务端口<br>Backend service port|
| `STORAGE_PATH` |`<仓库根>/data/static`<br>`<repo>/data/static`|生成文件存储目录<br>Generated-file storage directory|
| `HUOBAO_DATA_DIR` | — |桌面版由 Electron 主进程注入（userData 数据根）<br>Injected by the Electron main process (userData data root)|
| `WORKSPACE_PATH` | `backend/workspace` |Agent 技能/提示词目录（桌面版指向 userData 可写副本）<br>Agent skills/prompts directory (desktop: writable copy under userData)|
| `FRONTEND_DIST` | `frontend/dist` |前端静态产物目录<br>Frontend static build directory|
| `FFMPEG_BIN` / `FFPROBE_BIN` |npm 内置二进制<br>bundled npm binaries|自定义 ffmpeg/ffprobe 可执行文件路径<br>Custom ffmpeg/ffprobe executable paths|
| `PUBLIC_BASE_URL` | — |Seedance 引用本地参考资源时所需的公网地址（服务器部署用）<br>Public URL Seedance needs to reference local assets (server deployments)|

> **说明**：AI 服务的 API Key、Base URL 和模型参数全部在 Web 界面的「设置」页配置并入库，不在配置文件/环境变量中维护。<br>
> **Note**: AI service API keys, base URLs, and model parameters are all configured in the web UI "Settings" page and stored in the database — never in config files or environment variables.

### 📥 安装依赖 / Installation

```bash
# 克隆项目 / Clone the repository
git clone https://github.com/chatfire-AI/huobao-drama.git
cd huobao-drama

# 安装后端依赖 / Install backend dependencies
cd backend && npm install

# 安装前端依赖 / Install frontend dependencies
cd ../frontend && npm install
```

### 🎯 启动项目 / Running

#### 方式一：开发模式（推荐） / Option 1: Development mode (recommended)

前后端分离，支持热重载：<br>
Frontend and backend run separately with hot reload:

```bash
# 终端1：启动后端 / Terminal 1: backend
cd backend
npm run dev

# 终端2：启动前端 / Terminal 2: frontend
cd frontend
npm run dev
```

- 前端地址: `http://localhost:3013`<br>
  Frontend: `http://localhost:3013`

- 后端 API: `http://localhost:5679/api/v1`<br>
  Backend API: `http://localhost:5679/api/v1`

- 前端自动代理 `/api` 和 `/static` 到后端<br>
  The frontend automatically proxies `/api` and `/static` to the backend

#### 方式二：单服务模式 / Option 2: Single-service mode

后端同时提供 API 和前端静态文件：<br>
The backend serves both the API and the frontend static files:

```bash
# 1. 构建前端 / Build the frontend
cd frontend && npm run generate

# 2. 复制构建产物到后端读取的目录 / Copy the build output where the backend expects it
# generate 产物在 .output/public，后端只读取 frontend/dist
# generate outputs to .output/public; the backend reads frontend/dist
cp -r .output/public dist

# 3. 启动后端 / Start the backend
cd ../backend && npm start
```

访问: `http://localhost:5679`<br>
Visit: `http://localhost:5679`

### 🗄️ 数据库 / Database

内置 SQLite（`better-sqlite3` + WAL 模式），数据库表在首次启动时自动创建（幂等重放 DDL 与种子数据），默认文件位于 `data/huobao.sqlite3`，可通过 `SQLITE_PATH` 重定向。桌面版数据存放在用户数据目录（`~/Library/Application Support/HuobaoDrama/data/`）。<br>
Bundled SQLite (`better-sqlite3` + WAL mode). Tables are created automatically on first launch (idempotent DDL replay + seed data). Default file: `data/huobao.sqlite3`, overridable via `SQLITE_PATH`. The desktop app stores data in the user-data directory (`~/Library/Application Support/HuobaoDrama/data/`).

从旧版 MySQL 迁移数据：<br>
Migrating data from a legacy MySQL deployment:

**启动时自动迁移（推荐）**：显式配置了 MySQL（`DATABASE_URL` 或 `MYSQL_HOST`）且 SQLite 为空库时，后端启动会自动探测并一次性导入全部表（行数逐表校验、单事务原子写入、失败自动回滚并在下次启动重试、成功后写 `.mysql-imported` 标记避免重复）。设 `MYSQL_AUTO_IMPORT=false` 可关闭。<br>
**Automatic migration on startup (recommended)**: When MySQL is explicitly configured (`DATABASE_URL` or `MYSQL_HOST`) and the SQLite database is empty, the backend automatically detects and imports all tables once (per-table row-count validation, single-transaction atomic writes, automatic rollback with retry on next launch, and a `.mysql-imported` marker to avoid re-importing). Set `MYSQL_AUTO_IMPORT=false` to disable.

```bash
# 也可手动执行（目标库非空需加 --force，写入前自动备份） / Or run manually (non-empty target requires --force; automatic backup before writing)
cd backend && npx tsx scripts/import-mysql-to-sqlite.ts
```

> 迁移只覆盖数据库行；旧部署 `data/static/` 下的图片/视频等媒体文件需手动拷贝，否则历史素材无法访问。<br>
> Migration covers database rows only; media files (images/videos) under the old deployment's `data/static/` must be copied manually, or historical assets won't load.

### 🔑 首次使用：配置 AI 服务 / First Use: Configure AI Services

启动后所有 AI 功能（文本/生图/视频）都需要先配置模型服务，未配置时页面顶部会有横幅引导：<br>
All AI features (text/image/video) require model services to be configured first — a banner at the top of the page guides you until then:

1. 打开「设置」页<br>
   Open the "Settings" page

2. 在「火宝快捷配置」中粘贴 Huobao API Key（[前往 api.firemux.cn 获取](https://api.firemux.cn)），一键写入文本、图片、视频三条推荐配置<br>
   Paste your Huobao API key in "Huobao Quick Setup" ([get one at api.firemux.com](https://api.firemux.com)) to write three recommended configs (text, image, video) in one click

3. 或使用「手动模板」按厂商逐个添加，支持连通性测试<br>
   Or add providers one by one via "Manual Templates", with connectivity testing

配置完成横幅自动消失，即可开始创建剧集生产。<br>
Once configured, the banner disappears and you can start producing episodes.

---

## 📖 图文教程 / Visual Walkthrough

从小说到成片的完整制作流程。左侧进度栏始终标示当前所处阶段，跟着走即可。<br>
The complete pipeline from novel to finished episode. The left progress rail always shows where you are.

### 第 1 步 · 创建项目 / Step 1 · Create a Project

首页点「新建项目」，填写剧名并选择**画面比例**（横屏 16:9 / 竖屏 9:16，创建后不可改）与**画面风格**（3D / 真实感等，影响全局生图提示词）。<br>
On the home page click "New Project", pick a **aspect ratio** (16:9 landscape / 9:16 portrait, fixed after creation) and a **visual style** (3D, realistic, … — injected into every image prompt).

<p align="center">
  <img src="docs/screenshots/02-create-drama.png" alt="新建项目 / Create a project" width="800">
</p>

项目卡片即项目列表，随时点入续作：

<p align="center">
  <img src="docs/screenshots/01-projects.png" alt="项目列表 / Project list" width="800">
</p>

### 第 2 步 · 配置 AI 服务（首次） / Step 2 · Configure AI Services (first run)

设置页「火宝快捷配置」粘贴 API Key 一键写入三条推荐配置；或用「手动模板」按厂商自选模型（顶栏可随时切换当前模型，见第 5 步）。<br>
Paste an API key in Settings → "Huobao Quick Setup" to write the three recommended configs at once, or add providers manually. The current model can be switched any time from the top bar (see Step 5).

<p align="center">
  <img src="docs/screenshots/03-settings-quick.png" alt="AI 服务配置 / AI service setup" width="800">
</p>

### 第 3 步 · 剧本阶段 / Step 3 · Script Stage

进入剧集工作台，先粘贴**原始内容**（小说文本），再点「AI 改写」生成拍摄剧本——按集拆分、标注场景与角色，改写时可换文本模型、调语气。满意后「保存并进入制作」。<br>
Paste your **source novel** into the workbench, then hit "AI Rewrite" to produce a shooting script — split by episode with scenes and characters annotated. You can switch text models and tone while rewriting.

<p align="center">
  <img src="docs/screenshots/05-script.png" alt="剧本阶段 / Script stage" width="800">
</p>

### 第 4 步 · 资产制作 / Step 4 · Assets

对剧本执行**提取**，自动获得角色 / 场景 / 道具清单；逐个点「生成形象」产出一致性参考图（也可批量）。生成的资产图会在后续生视频时作为参考素材注入。<br>
Run **extraction** on the script to get the character / scene / prop list, then generate a consistent reference image for each (or in batch). These images are injected as reference material when generating videos.

<p align="center">
  <img src="docs/screenshots/06-assets.png" alt="资产制作 / Asset production" width="800">
</p>

### 第 5 步 · 分镜与视频 / Step 5 · Storyboard & Videos

「视频制作」页先**拆分分镜**（AI 按镜头节奏切分并生成视频提示词），然后：<br>
On the "Video Production" page, first run **storyboard breakdown** (AI splits shots and writes video prompts). Then:

- 顶栏选择本次使用的**视频模型**（Seedance / Wan 3.0 / MiniMax…），分辨率与时长档位随之联动<br>
  Pick the **video model** in the top bar (Seedance / Wan 3.0 / MiniMax…); resolution and duration tiers follow the model

- 右侧检查 / 微调每个分镜的提示词（`@角色名` 自动映射参考图）<br>
  Review and tweak each shot's prompt on the right (`@character` references map to reference images automatically)

- 点「批量生成视频」发起任务，失败任务可一键「重试失败」<br>
  Click "Batch Generate Videos"; failed tasks can be retried in one click

<p align="center">
  <img src="docs/screenshots/07-storyboard.png" alt="分镜拆分 / Storyboard breakdown" width="800">
</p>

<p align="center">
  <img src="docs/screenshots/08-videos.png" alt="视频生成 / Video generation" width="800">
</p>

### 第 6 步 · 拼接导出 / Step 6 · Merge & Export

勾选镜头（悬停可预览单个镜头视频），点「开始拼接」，FFmpeg 自动合成为完整剧集成片，支持在线播放与下载。完成后点「标记完成」，左侧进度栏点亮。<br>
Select shots (hover to preview each clip), click "Start Merging" and FFmpeg assembles the full episode — play online or download. Click "Mark Done" when finished to light up the progress rail.

<p align="center">
  <img src="docs/screenshots/09-export.png" alt="拼接导出 / Merge & export" width="800">
</p>

剧集列表随时展示各集制作状态，点「进入制作」继续未完成的集：<br>
The episode list shows the production status of every episode — click "Enter Studio" to continue:

<p align="center">
  <img src="docs/screenshots/04-episodes.png" alt="剧集列表 / Episode list" width="800">
</p>

---

## 📦 部署指南 / Deployment

### 🖥️ 桌面应用（推荐） / Desktop App (recommended)

**⬇️ 预编译安装包下载：[国内镜像（腾讯云，推荐）](https://installer.chatfire.site/huobao-drama/v4.0.5/) · [GitHub Releases（海外）](https://github.com/chatfire-AI/huobao-drama/releases/latest)**<br>
**⬇️ Prebuilt installers: [GitHub Releases](https://github.com/chatfire-AI/huobao-drama/releases/latest) · [Mirror for China (Tencent COS)](https://installer.chatfire.site/huobao-drama/v4.0.5/)**

|平台<br>Platform|下载文件<br>File to download|
|---|---|
|macOS（Apple Silicon，M 系列）<br>macOS (Apple Silicon, M-series)| `HuobaoDrama-4.0.5-arm64.dmg` |
|macOS（Intel）<br>macOS (Intel)| `HuobaoDrama-4.0.5.dmg` |
| Windows | `HuobaoDrama.Setup.4.0.5.exe` |

> 国内用户请用腾讯云镜像直链下载（GitHub 在国内访问不稳定）。应用内更新器同样国内源优先、GitHub 兜底。<br>
> China users: use the COS mirror above (GitHub is slow/unreachable in mainland China). The in-app updater also checks the COS mirror first, then falls back to GitHub.

**命令行安装（推荐，免修复）**：用 curl 下载不会触发 macOS 隔离属性，安装后双击即开，不会遇到「已损坏」提示（Apple Silicon 把 `arm64` 文件名换成对应版本，Intel 用无后缀 dmg）：<br>
**Command-line install (recommended, no Gatekeeper fix needed)**: downloading via curl never sets macOS's quarantine attribute, so the app opens cleanly with no "damaged" prompt (use the `-arm64.dmg` for Apple Silicon, the plain dmg for Intel):

```bash
curl -L -o /tmp/HuobaoDrama.dmg https://installer.chatfire.site/huobao-drama/v4.0.5/HuobaoDrama-4.0.5-arm64.dmg \
  && hdiutil attach -nobrowse /tmp/HuobaoDrama.dmg \
  && cp -R /Volumes/HuobaoDrama*/HuobaoDrama.app /Applications/ \
  && hdiutil detach /Volumes/HuobaoDrama*
```

无需构建 —— 下载 dmg/exe 直接安装即可，已安装客户端会通过内置更新器自动升级。（如需从源码自行打包，见下方命令。）<br>
No build required — download the dmg/exe and install. Installed clients auto-update via the built-in updater. (To package from source instead, see the commands below.)

双击安装、开箱即用的桌面版（macOS + Windows）：数据库（SQLite）、生成的媒体文件、Agent 技能全部存放在用户数据目录，卸载应用不影响数据。<br>
Double-click to install, works out of the box (macOS + Windows): the SQLite database, generated media, and Agent skills all live in the user-data directory — uninstalling the app does not affect your data.

```bash
# 一键打包（前端 generate → 后端 esbuild → electron-builder） / One-command packaging (frontend generate → backend esbuild → electron-builder)
npm run dist        # macOS dmg（arm64 + Intel） / macOS dmg (arm64 + Intel)
npm run dist:win    # Windows NSIS 安装器（win-x64，可在 macOS 上交叉打包） / Windows NSIS installer (win-x64, cross-buildable on macOS)

# 产物 / Artifacts
# desktop/release/HuobaoDrama-<版本>-arm64.dmg        (Apple Silicon) / desktop/release/HuobaoDrama-<version>-arm64.dmg     (Apple Silicon)
# desktop/release/HuobaoDrama-<版本>.dmg              (Intel) / desktop/release/HuobaoDrama-<version>.dmg           (Intel)
# desktop/release/HuobaoDrama Setup <版本>.exe        (Windows) / desktop/release/HuobaoDrama Setup <version>.exe     (Windows)
```

安装说明：<br>
Installation notes:

- macOS 未签名包首次打开可能提示「App 已损坏，无法打开」（Apple Silicon 常见），这是 Gatekeeper 隔离属性导致，并非文件损坏。两种修复方式任选：<br>
  The macOS build is unsigned — on first launch you may see "App is damaged and can't be opened" (common on Apple Silicon). This is Gatekeeper's quarantine attribute, not actual file damage. Two ways to fix it:

  1. **dmg 内自带修复脚本**：把 app 拖入「应用程序」后，双击 dmg 窗口底部的「如提示已损坏请双击我.command」，自动完成修复；<br>
     **The dmg bundles a fix script**: after dragging the app into Applications, double-click the "如提示已损坏请双击我.command" script at the bottom of the dmg window — it removes the quarantine attribute automatically;

  2. 或终端执行 `sudo xattr -cr /Applications/HuobaoDrama.app`。<br>
     Or run `sudo xattr -cr /Applications/HuobaoDrama.app` in Terminal.

  修复只需一次，之后双击图标即可启动，应用内自动更新也不受影响。<br>
  The fix is one-time only — the app then launches normally, and in-app auto-updates are not affected.

- Windows 未签名包 SmartScreen 会提示「更多信息 → 仍要运行」<br>
  The Windows build is unsigned — SmartScreen will prompt "More info → Run anyway"

- 用户数据目录：`~/Library/Application Support/HuobaoDrama/`（数据库、生成的媒体、技能在线编辑的副本）<br>
  User-data directory: `~/Library/Application Support/HuobaoDrama/` (database, generated media, writable copies of online-edited skills)

- 内置 FFmpeg/FFprobe 二进制，无需系统安装<br>
  FFmpeg/FFprobe binaries are bundled — no system install needed

- Electron 锁定 37.x：better-sqlite3 的 win32 预编译最高覆盖到该版本的 ABI（交叉打包免编译的关键）<br>
  Electron is pinned to 37.x: better-sqlite3's win32 prebuilds max out at that ABI (the key to compilation-free cross-packaging)

- 应用内点击外部链接（如「前往 api.firemux.cn 获取 Key」）直接用系统浏览器打开<br>
  External links open in the system browser (e.g. "Get a key at api.firemux.com")

#### 🔄 应用内更新（无需 Apple 签名） / In-App Updates (no Apple signing required)

桌面版内置更新器（与 Tauri 同类方案：macOS 目录替换 / Windows 静默安装，本地 sha256 校验）。发布新版流程：<br>
The desktop app ships with a built-in updater (same class of solution as Tauri: directory replacement on macOS / silent installer on Windows, with local sha256 verification). To publish a new release:

```bash
# 1. 改 desktop/package.json 的 version，然后打包 / 1. Bump version in desktop/package.json, then package
npm run dist        # macOS（产出 dmg + 更新用 zip） / macOS (produces dmg + update zip)
npm run dist:win    # Windows（产出 Setup.exe） / Windows (produces Setup.exe)

# 2. 生成版本清单 release/latest.json（含各平台产物 sha256） / 2. Generate the release manifest release/latest.json (with per-platform sha256)
cd desktop && npm run feed

# 3. 发布：把 latest.json + 安装包 + zip 上传到 GitHub Release（tag 形如 v1.0.1） / 3. Publish: upload latest.json + installers + zips to a GitHub Release (tag like v1.0.1)
```

已安装的客户端会在启动后自动检查清单（也可在「设置 → 关于更新」手动检查），发现新版即提示下载安装。自定义清单地址：`HUOBAO_UPDATE_FEED` 环境变量。<br>
Installed clients check the manifest automatically after launch (manual check available in "Settings → About & Updates") and prompt to download and install when a new version is found. Override the manifest URL with the `HUOBAO_UPDATE_FEED` environment variable.

桌面版开发调试：<br>
Desktop development:

```bash
npm run build:frontend   # 前端静态产物（frontend/.output/public） / frontend static output (frontend/.output/public)
cd desktop && npm run dev  # 打包后端 bundle 并以 Electron 窗口运行 / bundle the backend and run in an Electron window
```

> 已知限制：Seedance 视频模型引用本地参考资源时需要 `PUBLIC_BASE_URL` 公网地址，桌面版无公网入口，该场景会得到明确的中文报错；文生视频/图片等其余能力不受影响。<br>
> Known limitation: Seedance video models need a `PUBLIC_BASE_URL` public address to reference local assets; the desktop app has no public entry point, so that scenario produces a clear error message. Text-to-video, image generation, and all other capabilities are unaffected.

---

### 🏭 服务器部署方式 / Server Deployment

```bash
# 1. 构建前端 / Build the frontend
cd frontend && npm run generate

# 2. 复制构建产物 / Copy the build output
# generate 产物在 frontend/.output/public，后端只读取 frontend/dist，缺此步 API 正常但页面 404
# generate outputs to frontend/.output/public; the backend reads frontend/dist — skip this step and the API works but pages 404
cp -r .output/public dist && cd ..

# 3. 启动后端 / Start the backend
cd backend && npm start
```

需要上传到服务器的文件：<br>
Files to upload to the server:

```
backend/                    # 后端源码 + node_modules / backend source + node_modules
backend/workspace/skills/   # Agent 技能文件 / Agent skill files
frontend/dist/              # 前端构建产物 / frontend build output
data/                       # 数据目录（首次运行自动创建） / data directory (auto-created on first run)
```

#### Nginx 反向代理 / Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 参考视频/音频上传最大 50MB / Max 50MB for reference video/audio uploads
    client_max_body_size 100m;

    # 生成的图片/视频直连磁盘，不经过 Node / Generated images/videos served straight from disk, bypassing Node
    # sendfile 零拷贝 + 长缓存 / sendfile zero-copy + long-lived caching
    # 产物按 uuid 命名、内容不变，可安全 immutable 缓存 / Files are uuid-named and immutable, so immutable caching is safe
    location /static/ {
        alias /path/to/huobao-drama/data/static/;
        sendfile on;
        tcp_nopush on;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://localhost:5679;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

> 媒体加载优化：生成图片时后端会自动产出 400px 缩略图（`*_thumb.webp`）供列表页加载，视频会抽取海报帧（`*_poster.jpg`）作为封面，前端仅在点开大图/播放时才加载原文件。历史存量文件可在 `backend/` 下执行 `npm run backfill-artwork` 一次性补齐。<br>
> Media loading optimization: the backend automatically generates 400px thumbnails (`*_thumb.webp`) for list pages and extracts poster frames (`*_poster.jpg`) as video covers — the frontend only loads original files when opening the full image or playing. To backfill historical files, run `npm run backfill-artwork` under `backend/`.

### 🐳 Docker 部署（含应用内更新） / Docker Deployment (with in-app updates)

**方式一：预构建镜像（免克隆、免构建）**：多架构镜像（`linux/amd64` + `linux/arm64`），x86 服务器与 ARM 设备自动匹配<br>
**Option A — prebuilt image (no clone, no build):** multi-arch (`linux/amd64` + `linux/arm64`), x86 servers and ARM devices match automatically

```bash
docker pull huobao/huobao-drama:4.0.6

docker run -d \
  --name huobao-drama \
  -p 5679:5679 \
  -v huobao-data:/app/data \
  --restart unless-stopped \
  huobao/huobao-drama:4.0.6
```

**方式二：docker compose（源码构建 + Watchtower 应用内更新）**：根目录提供一体化 `Dockerfile`（前端 generate + 后端依赖/运行时三阶段，后端与服务器部署一致走 tsx）与 `docker-compose.yml`（应用 + Watchtower）：<br>
**Option B — docker compose (source build + Watchtower in-app updates):** the repo root provides an all-in-one `Dockerfile` (three stages: frontend generate + backend dependencies + runtime; the backend runs via tsx just like server deployment) and `docker-compose.yml` (app + Watchtower):

```bash
# 1. 配置环境（Watchtower 令牌，app 与 watchtower 两侧必须一致） / 1. Configure the environment (Watchtower token — must match on the app and watchtower sides)
cp .env.example .env   # 修改 WATCHTOWER_TOKEN / edit WATCHTOWER_TOKEN

# 2. 构建并启动（发布时注入版本号，供「关于更新」比对） / 2. Build and start (inject a version at publish time for "About & Updates" comparison)
HUOBAO_VERSION=4.0.5 docker compose up -d --build

# 3. 访问 http://localhost:5679 / 3. Visit http://localhost:5679
```

- **数据持久化**：命名卷 `huobao-data` 挂载 `/app/data`（SQLite + 生成的图片/视频 + workspace/skills，更新镜像不丢数据）<br>
  **Data persistence**: the named volume `huobao-data` mounts `/app/data` (SQLite + generated images/videos + workspace/skills) — image updates don't lose data

- **应用内更新**：compose 自带 [Watchtower](https://containrrr.dev/watchtower/) sidecar（`--label-enable` 只更新标记容器，`--cleanup` 清旧镜像，每天自检一次）。设置页「关于更新」可检查新版本并「立即更新」——后端经 Watchtower HTTP API 触发，拉新镜像重建容器，几分钟后刷新页面即可<br>
  **In-app updates**: the compose file ships a [Watchtower](https://containrrr.dev/watchtower/) sidecar (`--label-enable` only updates labeled containers, `--cleanup` removes old images, daily self-check). "Settings → About & Updates" can check for new versions and "Update Now" — the backend triggers it via the Watchtower HTTP API, which pulls the new image and rebuilds the container; refresh the page after a few minutes

- **手动模式**：`docker-compose.yml` 中删除 app 的 `HUOBAO_WATCHTOWER_*` 两个环境变量（或整个 watchtower 服务）后，「关于更新」退化为新版本提示 + 手动命令 `docker compose pull && docker compose up -d`<br>
  **Manual mode**: remove the app's two `HUOBAO_WATCHTOWER_*` env vars (or the whole watchtower service) from `docker-compose.yml` — "About & Updates" then degrades to a new-version notice + manual `docker compose pull && docker compose up -d`

- **发布镜像**：`docker buildx build --platform linux/amd64,linux/arm64 --build-arg HUOBAO_VERSION=x.y.z -t huobao/huobao-drama:x.y.z -t huobao/huobao-drama:latest --push .`，版本清单与桌面版共用 GitHub Releases 的 `latest.json`（可用 `HUOBAO_UPDATE_FEED` 覆盖）<br>
  **Publishing images**: `docker buildx build --platform linux/amd64,linux/arm64 --build-arg HUOBAO_VERSION=x.y.z -t huobao/huobao-drama:x.y.z -t huobao/huobao-drama:latest --push .` — the version manifest is shared with the desktop app via `latest.json` on GitHub Releases (overridable with `HUOBAO_UPDATE_FEED`)

---

## 🎨 技术栈 / Tech Stack

### 后端 / Backend

- **运行时**: Node.js 20+<br>
  **Runtime**: Node.js 20+

- **Web 框架**: Hono<br>
  **Web framework**: Hono

- **ORM**: Drizzle ORM + better-sqlite3（WAL 模式）<br>
  **ORM**: Drizzle ORM + better-sqlite3 (WAL mode)

- **AI Agent**: Mastra + AI SDK (OpenAI compatible)<br>
  **AI Agents**: Mastra + AI SDK (OpenAI compatible)

- **视频处理**: FFmpeg (fluent-ffmpeg + 内置二进制)<br>
  **Video processing**: FFmpeg (fluent-ffmpeg + bundled binaries)

- **图片处理**: Sharp<br>
  **Image processing**: Sharp

### 桌面端 / Desktop

- **壳**: Electron（utilityProcess 承载后端，BrowserWindow 同源加载）<br>
  **Shell**: Electron (utilityProcess hosts the backend; BrowserWindow loads same-origin)

- **打包**: esbuild（后端单文件 bundle）+ electron-builder（dmg arm64/x64，NSIS win-x64）<br>
  **Packaging**: esbuild (single-file backend bundle) + electron-builder (dmg arm64/x64, NSIS win-x64)

### 前端 / Frontend

- **框架**: Nuxt 3 (SPA 模式)<br>
  **Framework**: Nuxt 3 (SPA mode)

- **语言**: Vue 3 + TypeScript<br>
  **Language**: Vue 3 + TypeScript

- **路由**: 文件路由 (Vue Router 4)<br>
  **Routing**: File-based routing (Vue Router 4)

- **样式**: 纯 CSS + CSS Variables<br>
  **Styling**: Pure CSS + CSS Variables

- **图标**: Lucide Vue<br>
  **Icons**: Lucide Vue

- **国际化**: vue-i18n（中文 / English / 日本語 / 한국어）<br>
  **i18n**: vue-i18n (中文 / English / 日本語 / 한국어)

---

## 📝 常见问题 / FAQ

### Q: 桌面版数据存在哪里？ / Q: Where does the desktop app store data?

A: `~/Library/Application Support/HuobaoDrama/data/`（SQLite 数据库 + 生成的图片/视频），技能在线编辑的副本在同级 `workspace/` 目录。开发模式下则使用仓库 `data/` 目录。<br>
A: `~/Library/Application Support/HuobaoDrama/data/` (SQLite database + generated images/videos); writable copies of online-edited skills live in the sibling `workspace/` directory. In development mode the repo's `data/` directory is used instead.

### Q: 旧版 MySQL 数据怎么迁移到 SQLite？ / Q: How do I migrate legacy MySQL data to SQLite?

A: 保持 MySQL 可连接（环境变量或 `backend/.env`），执行 `cd backend && npx tsx scripts/import-mysql-to-sqlite.ts`，脚本会自动建表、逐表导入并校验行数（目标库非空需加 `--force`，写入前自动备份）。<br>
A: Keep MySQL reachable (environment variables or `backend/.env`), then run `cd backend && npx tsx scripts/import-mysql-to-sqlite.ts`. The script creates tables automatically, imports table-by-table, and validates row counts (non-empty targets require `--force`; a backup is made before writing).

### Q: FFmpeg 未安装或找不到？ / Q: FFmpeg not installed or not found?

A: 无需安装。项目内置 `ffmpeg-static` / `ffprobe-static` 二进制（桌面版随包携带）。系统 `PATH` 中的 FFmpeg 也不会冲突，也可通过 `FFMPEG_BIN`/`FFPROBE_BIN` 显式指定。<br>
A: No install needed. The project bundles `ffmpeg-static` / `ffprobe-static` binaries (carried along in the desktop package). A system `PATH` FFmpeg won't conflict either, and you can point explicitly via `FFMPEG_BIN`/`FFPROBE_BIN`.

### Q: 页面顶部提示「尚未配置模型」？ / Q: The top of the page says "No model configured"?

A: 这是正常的首次部署引导。前往「设置」页，用「火宝快捷配置」粘贴 API Key 一键写入，或通过「手动模板」按厂商添加。文本、图片、视频三类均有启用中的配置后横幅自动消失。<br>
A: That's the normal first-deploy guidance. Go to "Settings" and use "Huobao Quick Setup" to paste an API key and write configs in one click, or add providers via "Manual Templates". The banner disappears once text, image, and video all have an enabled config.

### Q: 前端无法连接后端 API？ / Q: The frontend can't reach the backend API?

A: 检查后端是否启动，端口是否正确。开发模式下前端代理配置在 `frontend/nuxt.config.ts`。<br>
A: Check that the backend is running and the port is correct. In dev mode the proxy config lives in `frontend/nuxt.config.ts`.

### Q: 数据库表未创建？ / Q: Database tables not created?

A: 后端会在首次启动时自动创建所有表，检查日志确认初始化是否成功。<br>
A: The backend creates all tables automatically on first launch — check the logs to confirm initialization succeeded.

---

## 📋 更新日志 / Changelog

### v4.0.0 (2026-08)

#### 🖥️ 桌面应用 + 数据库迁移 / Desktop App + Database Migration

- Electron 桌面版（macOS dmg，arm64/x64 双架构）<br>
  Electron desktop app (macOS dmg, arm64/x64 dual architecture)

  - 双击安装、开箱即用：自动选择端口、单实例锁、崩溃隔离的后端子进程<br>
    Double-click install, works out of the box: automatic port selection, single-instance lock, crash-isolated backend subprocess

  - 用户数据隔离：SQLite 库 / 生成媒体 / 技能副本均存放于 userData 目录<br>
    User-data isolation: SQLite database / generated media / skill copies all live in the userData directory

  - 内置 FFmpeg/FFprobe 随包分发；workspace 技能模板首启动拷贝、升级只补缺不覆盖<br>
    FFmpeg/FFprobe bundled; workspace skill templates copied on first launch, upgrades only fill gaps without overwriting

- 数据库从 MySQL 完全迁移到 SQLite（better-sqlite3 + WAL）<br>
  Database fully migrated from MySQL to SQLite (better-sqlite3 + WAL)

  - 业务代码零改动（Drizzle 查询层天然可移植），DDL 幂等重放<br>
    Zero business-code changes (the Drizzle query layer is naturally portable); idempotent DDL replay

  - 新增一次性导入脚本 `import-mysql-to-sqlite.ts`（逐表行数校验 + 自动备份）<br>
    New one-shot import script `import-mysql-to-sqlite.ts` (per-table row-count validation + automatic backup)

- 后端 esbuild 单文件打包（externals：sharp/better-sqlite3/ffmpeg 二进制包）<br>
  Backend bundled to a single file with esbuild (externals: sharp/better-sqlite3/ffmpeg binary packages)

- 移除 Docker/MySQL 部署方式（git 历史可找回）<br>
  Removed Docker/MySQL deployment (recoverable from git history)

### v3.1.0 (2026-09)

- 新增阿里云百炼 Wan 3.0 视频模型（Prime / 标准，支持官方 input.media/parameters 入参）<br>
  Added Alibaba Bailian Wan 3.0 video models (Prime / Standard, official `input.media`/`parameters` payloads)

- 工作台顶栏新增分辨率选择器，按厂商显示原生档位（Seedance 480p/720p、MiniMax 768P/2K、Wan 480P/720P/1080P）<br>
  Resolution selector in the workbench top bar with native tiers per provider (Seedance 480p/720p, MiniMax 768P/2K, Wan 480P/720P/1080P)

- 默认视频模型调整为 Seedance 2.0 Mini<br>
  Default video model changed to Seedance 2.0 Mini

- 修复切换视频模型时厂商/模型错配导致的生成报错<br>
  Fixed generation errors caused by provider/model mismatch when switching video models

- 批量视频：选择模式 + 生成前确认（镜头数/总时长/模型/分辨率），失败任务一键重试<br>
  Batch video: selection mode + pre-generation confirmation (shot count / total duration / model / resolution), one-click retry for failed tasks

- 分镜时长在视频生成参数区直接编辑保存，单次/批量生成统一生效<br>
  Storyboard duration now editable directly in the video-generation params area, applied to single and batch generation

- 真人/敏感内容审核失败时提示切换模型重试<br>
  Content-moderation failures (real-person / sensitive content) now prompt to switch models and retry

### v3.0.0 (2026-08)

#### 🚀 部署与体验优化 / Deployment & Experience Improvements

- Docker 部署就绪改造<br>
  Docker deployment readiness

  - MySQL / 应用健康检查，应用等待数据库就绪后启动<br>
    MySQL / app health checks; the app waits for the database before starting

  - 数据库初始化增加重试，容器编排下首次部署零人工干预<br>
    Database initialization retries — zero manual intervention on first containerized deploy

  - 移除系统 FFmpeg 依赖，全面使用内置二进制<br>
    Removed the system FFmpeg dependency; bundled binaries everywhere

  - Agent skills 目录 volume 持久化（设置页在线编辑不丢失）<br>
    Agent skills directory volume persistence (online edits in Settings survive)

  - 新增 `docker/init.sql` 及导出脚本（DBA 审核 / 预建表）<br>
    New `docker/init.sql` and export scripts (DBA review / pre-created tables)

- 首次使用引导<br>
  First-use guidance

  - 未配置 AI 服务时全站顶部横幅提示并引导至设置页<br>
    Site-wide banner guiding to Settings when no AI service is configured

  - 设置页新增「火宝快捷配置」：一个 Key 写入文本/图片/视频三条推荐配置<br>
    New "Huobao Quick Setup" in Settings: one key writes three recommended configs (text/image/video)

  - 未配置模型的报错中文化并指引设置页<br>
    Unconfigured-model errors localized with pointers to Settings

- 视频模型默认调整为 Seedance 2.0 Fast<br>
  Default video model changed to Seedance 2.0 Fast

- 厂商收敛：仅保留 OpenAI / Gemini / 火山引擎<br>
  Provider consolidation: OpenAI / Gemini / Volcano Engine only

- 工作台：任务列表抽屉、流水线大环节状态、选择性拼接（拼接前校验视频文件存在）<br>
  Workbench: task-list drawer, pipeline stage status, selective stitching (validates video files exist before merging)

- 素材库改版、@提及优化、剧集列表重构<br>
  Asset library redesign, @mention improvements, episode list rework

### v2.0.0 (2026-04)

#### 🚀 重大更新 / Major Update

- 项目全面迁移至 TypeScript 技术栈<br>
  Full migration to a TypeScript stack

  - 后端：Hono + Drizzle ORM + mysql2<br>
    Backend: Hono + Drizzle ORM + mysql2

  - 前端：Nuxt 3 + Vue 3<br>
    Frontend: Nuxt 3 + Vue 3

  - AI Agent：Mastra 框架<br>
    AI Agents: Mastra framework

- 重做单集工作台 UI 和生产流程<br>
  Episode workbench UI and production flow rebuilt

  - 更紧凑的控制台布局<br>
    More compact console layout

  - 重做分镜编辑区<br>
    Storyboard editing area rebuilt

  - 重做镜头图、视频、合成、导出界面<br>
    Shot image, video, compositing, and export screens rebuilt

- 新增 Docker 部署支持，前后端合并为单镜像<br>
  Docker deployment support — frontend and backend merged into a single image

- 增加运行时 Skill 加载机制<br>
  Runtime Skill loading mechanism

- 扩展多厂商媒体 Adapter<br>
  Expanded multi-provider media adapters

  - 图片：OpenAI、Gemini、火山引擎、阿里<br>
    Image: OpenAI, Gemini, Volcano Engine, Alibaba

  - 视频：火山引擎/Seedance、Vidu、阿里<br>
    Video: Volcano Engine/Seedance, Vidu, Alibaba

- 优化本地文件处理与参考图按需转码<br>
  Improved local file handling and on-demand reference-image transcoding

### v1.0.4 (2026-01-27)

- 引入本地存储策略，规避外部资源链接失效<br>
  Local storage strategy to avoid dead external asset links

- Base64 参考图嵌入式传输<br>
  Base64 reference-image embedded transport

- 修复镜头切换状态重置问题<br>
  Fixed shot-switch state reset

- 添加场景迁移至章节<br>
  Scene migration to chapters

### v1.0.3 (2026-01-16)

- 优化数据库并发访问性能<br>
  Database concurrency performance improvements

- Docker 跨平台支持 host.docker.internal<br>
  Docker cross-platform support for host.docker.internal

### v1.0.2 (2026-01-14)

- 修复视频生成 API 响应解析问题<br>
  Fixed video-generation API response parsing

- 添加 OpenAI Sora 视频端点配置<br>
  OpenAI Sora video endpoint configuration

- 优化错误处理和日志输出<br>
  Improved error handling and logging

---

## 📄 许可证 / License

本项目采用 **[CC BY-NC-SA 4.0](LICENSE)**（署名-非商业性使用-相同方式共享 4.0 国际）许可证。<br>
This project is licensed under **[CC BY-NC-SA 4.0](LICENSE)** (Attribution-NonCommercial-ShareAlike 4.0 International).

- ✅ 个人使用、学习研究、非商业项目均可自由使用<br>
  ✅ Personal use, learning, and non-commercial projects are welcome

- ✅ 允许修改与再分发，但须署名并以相同许可证共享<br>
  ✅ Modifications and redistribution allowed under the same license with attribution

- ❌ **禁止商用**——未经作者书面许可，不得将本项目整体或部分用于任何商业目的（包括付费服务、商业部署、转售等）<br>
  ❌ **Commercial use is prohibited** — you may not use this project, in whole or in part, for any commercial purpose (including paid services, commercial deployments, or resale) without prior written permission from the author

许可证全文见 [LICENSE](LICENSE)。<br>
Full license text: see [LICENSE](LICENSE).

---

## 🤝 贡献指南 / Contributing

欢迎提交 Issue 和 Pull Request！<br>
Issues and Pull Requests are welcome!

1. Fork 本项目<br>
   Fork the project

2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)<br>
   Create a feature branch (`git checkout -b feature/AmazingFeature`)

3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)<br>
   Commit your changes (`git commit -m 'Add some AmazingFeature'`)

4. 推送到分支 (`git push origin feature/AmazingFeature`)<br>
   Push to the branch (`git push origin feature/AmazingFeature`)

5. 开启 Pull Request<br>
   Open a Pull Request

常用检查命令：<br>
Common checks:

```bash
cd backend && npm run typecheck
cd ../frontend && npm run generate  # emits index.html (npm run build does not)
```

---

## 💬 微信群 / WeChat Group

扫码加入微信群交流：<br>
Scan the QR code to join the WeChat group:

<div align="center">
  <img src="docs/images/wx-group.png" width="200" alt="微信群二维码 / WeChat group QR code" />
</div>

---

> _"让 AI 帮我们做更有创造力的事"_<br>
> _"Let AI do the creating with us"_

## 🔗 友情链接 / Links

本项目已获得 [LINUX DO](https://linux.do/) 社区链接认可。<br>
This project has been recognized with a link from the [LINUX DO](https://linux.do/) community.

- [LINUX DO](https://linux.do/) — 真正的开源精神，共建共享的技术社区<br>
  [LINUX DO](https://linux.do/) — a genuine open-source spirit, a community built on sharing

---

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=chatfire-ai/huobao-drama&type=date&legend=top-left)](https://www.star-history.com/?repos=chatfire-ai%2Fhuobao-drama&type=date&legend=top-left)
