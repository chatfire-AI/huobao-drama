# 🎬 Huobao Drama - AIショートドラマ制作プラットフォーム

<div align="center">

**Go + Vue3 ベースのフルスタックAIショートドラマ自動化プラットフォーム**

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Vue Version](https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat&logo=vue.js)](https://vuejs.org)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

[機能](#機能) • [クイックスタート](#クイックスタート) • [デプロイ](#デプロイ)

[简体中文](README.md) | [English](README-EN.md) | [日本語](README-JA.md)

</div>

---

## 📖 概要

Huobao Dramaは、脚本生成、キャラクターデザイン、絵コンテ作成から動画合成までの全ワークフローを自動化するAI駆動のショートドラマ制作プラットフォームです。

### 🎯 主要機能

- **🤖 AI駆動**: 大規模言語モデルを使用して脚本を解析し、キャラクター、シーン、絵コンテ情報を抽出
- **🎨 インテリジェント創作**: AIによるキャラクターポートレートとシーン背景の生成
- **📹 動画生成**: テキストから動画、画像から動画モデルによる絵コンテ動画の自動生成
- **🔄 完全なワークフロー**: アイデアから完成動画までのエンドツーエンド制作ワークフロー

### 🛠️ 技術アーキテクチャ

**DDD（ドメイン駆動設計）** に基づく明確なレイヤー構造：

```
├── APIレイヤー (Gin HTTP)
├── アプリケーションサービスレイヤー (ビジネスロジック)
├── ドメインレイヤー (ドメインモデル)
└── インフラストラクチャレイヤー (データベース、外部サービス)
```

### 🎥 デモ動画

AIショートドラマ生成を体験：

<div align="center">

**サンプル作品 1**

<video src="https://ffile.chatfire.site/cf/public/20260114094337396.mp4" controls width="640"></video>

**サンプル作品 2**

<video src="https://ffile.chatfire.site/cf/public/fcede75e8aeafe22031dbf78f86285b8.mp4" controls width="640"></video>

[動画1を見る](https://ffile.chatfire.site/cf/public/20260114094337396.mp4) | [動画2を見る](https://ffile.chatfire.site/cf/public/fcede75e8aeafe22031dbf78f86285b8.mp4)

</div>

---

## ✨ 機能

### 🎭 キャラクター管理
- ✅ AI生成キャラクターポートレート
- ✅ バッチキャラクター生成
- ✅ キャラクター画像のアップロードと管理

### 🎬 絵コンテ制作
- ✅ 自動絵コンテスクリプト生成
- ✅ シーン説明とショットデザイン
- ✅ 絵コンテ画像生成（テキストから画像）
- ✅ フレームタイプ選択（先頭フレーム/キーフレーム/末尾フレーム/パネル）

### 🎥 動画生成
- ✅ 画像から動画の自動生成
- ✅ 動画合成と編集
- ✅ トランジション効果

### 📦 アセット管理
- ✅ 統合アセットライブラリ管理
- ✅ ローカルストレージサポート
- ✅ アセットのインポート/エクスポート
- ✅ タスク進捗トラッキング

---

## 🚀 クイックスタート

### 📋 前提条件

| ソフトウェア | バージョン | 説明 |
|-------------|----------|------|
| **Go** | 1.23+ | バックエンドランタイム |
| **Node.js** | 18+ | フロントエンドビルド環境 |
| **npm** | 9+ | パッケージマネージャー |
| **FFmpeg** | 4.0+ | 動画処理（**必須**） |
| **SQLite** | 3.x | データベース（内蔵） |

#### FFmpegのインストール

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
[FFmpeg公式サイト](https://ffmpeg.org/download.html)からダウンロードし、環境変数を設定

インストール確認：
```bash
ffmpeg -version
```

### ⚙️ 設定

設定ファイルをコピーして編集：

```bash
cp configs/config.example.yaml configs/config.yaml
vim configs/config.yaml
```

設定ファイル形式（`configs/config.yaml`）：

```yaml
app:
  name: "Huobao Drama API"
  version: "1.0.0"
  debug: true  # 開発環境ではtrue、本番環境ではfalseに設定

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

**主要設定項目：**
- `app.debug`: デバッグモードスイッチ（開発環境ではtrueを推奨）
- `server.port`: サービスポート
- `server.cors_origins`: フロントエンドの許可CORSオリジン
- `database.path`: SQLiteデータベースファイルパス
- `storage.local_path`: ローカルファイルストレージパス
- `storage.base_url`: 静的リソースアクセスURL
- `ai.default_*_provider`: AIサービスプロバイダー設定（APIキーはWeb UIで設定）

### 📥 インストール

```bash
# プロジェクトをクローン
git clone https://github.com/chatfire-AI/huobao-drama.git
cd huobao-drama

# Go依存関係をインストール
go mod download

# フロントエンド依存関係をインストール
cd web
npm install
cd ..
```

### 🎯 プロジェクトの起動

#### 方法1: 開発モード（推奨）

**フロントエンドとバックエンドを分離、ホットリロード対応**

```bash
# ターミナル1: バックエンドサービスを起動
go run main.go

# ターミナル2: フロントエンド開発サーバーを起動
cd web
npm run dev
```

- フロントエンド: `http://localhost:3012`
- バックエンドAPI: `http://localhost:5678/api/v1`
- フロントエンドはAPIリクエストを自動的にバックエンドにプロキシ

#### 方法2: シングルサービスモード

**バックエンドがAPIとフロントエンド静的ファイルの両方を提供**

```bash
# 1. フロントエンドをビルド
cd web
npm run build
cd ..

# 2. サービスを起動
go run main.go
```

アクセス: `http://localhost:5678`

### 🗄️ データベース初期化

データベーステーブルは初回起動時に自動作成されます（GORM AutoMigrateを使用）。手動マイグレーションは不要です。

---

## 📦 デプロイ

### 🐳 Dockerデプロイ（推奨）

#### 方法1: Docker Compose（推奨）

```bash
# サービスを起動
docker-compose up -d

# ログを表示
docker-compose logs -f

# サービスを停止
docker-compose down
```

#### 方法2: Dockerコマンド

> **注意**: Linuxユーザーはホストサービスにアクセスするために `--add-host=host.docker.internal:host-gateway` を追加する必要があります

```bash
# Docker Hubから実行
docker run -d \
  --name huobao-drama \
  -p 5678:5678 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  huobao/huobao-drama:latest

# ログを表示
docker logs -f huobao-drama
```

**ローカルビルド**（オプション）：
```bash
docker build -t huobao-drama:latest .
docker run -d --name huobao-drama -p 5678:5678 -v $(pwd)/data:/app/data huobao-drama:latest
```

**Dockerデプロイの利点：**
- ✅ デフォルト設定ですぐに使用可能
- ✅ 環境の一貫性、依存関係の問題を回避
- ✅ ワンクリック起動、Go、Node.js、FFmpegのインストール不要
- ✅ 移行とスケーリングが容易
- ✅ 自動ヘルスチェックと再起動
- ✅ ファイル権限の自動処理

#### 🔗 ホストサービスへのアクセス（Ollama/ローカルモデル）

コンテナは `http://host.docker.internal:ポート番号` を使用してホストサービスにアクセスするよう設定されています。

**設定手順：**

1. **ホストでサービスを起動（全インターフェースでリッスン）**
   ```bash
   export OLLAMA_HOST=0.0.0.0:11434 && ollama serve
   ```

2. **フロントエンドAIサービス設定**
   - Base URL: `http://host.docker.internal:11434/v1`
   - Provider: `openai`
   - Model: `qwen2.5:latest`

---

### 🏭 従来のデプロイ方法

#### 1. ビルド

```bash
# 1. フロントエンドをビルド
cd web
npm run build
cd ..

# 2. バックエンドをコンパイル
go build -o huobao-drama .
```

生成ファイル：
- `huobao-drama` - バックエンド実行ファイル
- `web/dist/` - フロントエンド静的ファイル（バックエンドに埋め込み）

#### 2. デプロイファイルの準備

サーバーにアップロードするファイル：
```
huobao-drama            # バックエンド実行ファイル
configs/config.yaml     # 設定ファイル
data/                   # データディレクトリ（オプション、初回実行時に自動作成）
```

#### 3. サーバー設定

```bash
# ファイルをサーバーにアップロード
scp huobao-drama user@server:/opt/huobao-drama/
scp configs/config.yaml user@server:/opt/huobao-drama/configs/

# サーバーにSSH接続
ssh user@server

# 設定ファイルを編集
cd /opt/huobao-drama
vim configs/config.yaml
# modeをproductionに設定
# ドメインとストレージパスを設定

# データディレクトリを作成し権限を設定（重要！）
# 注意: YOUR_USERを実際にサービスを実行するユーザー名に置き換え（例: www-data、ubuntu、deploy）
sudo mkdir -p /opt/huobao-drama/data/storage
sudo chown -R YOUR_USER:YOUR_USER /opt/huobao-drama/data
sudo chmod -R 755 /opt/huobao-drama/data

# 実行権限を付与
chmod +x huobao-drama

# サービスを起動
./huobao-drama
```

#### 4. systemdでサービス管理

サービスファイル `/etc/systemd/system/huobao-drama.service` を作成：

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

# 環境変数（オプション）
# Environment="GIN_MODE=release"

[Install]
WantedBy=multi-user.target
```

サービスを起動：
```bash
sudo systemctl daemon-reload
sudo systemctl enable huobao-drama
sudo systemctl start huobao-drama
sudo systemctl status huobao-drama
```

**⚠️ よくある問題: SQLite書き込み権限エラー**

`attempt to write a readonly database` エラーが発生した場合：

```bash
# 1. サービスを実行中のユーザーを確認
sudo systemctl status huobao-drama | grep "Main PID"
ps aux | grep huobao-drama

# 2. 権限を修正（YOUR_USERを実際のユーザー名に置き換え）
sudo chown -R YOUR_USER:YOUR_USER /opt/huobao-drama/data
sudo chmod -R 755 /opt/huobao-drama/data

# 3. 権限を確認
ls -la /opt/huobao-drama/data
# サービスを実行するユーザーが所有者として表示されるはず

# 4. サービスを再起動
sudo systemctl restart huobao-drama
```

**原因：**
- SQLiteはデータベースファイル**と**そのディレクトリの両方に書き込み権限が必要
- ディレクトリ内に一時ファイル（例: `-wal`、`-journal`）を作成する必要がある
- **重要**: systemdの`User`がデータディレクトリの所有者と一致していることを確認

**一般的なユーザー名：**
- Ubuntu/Debian: `www-data`、`ubuntu`
- CentOS/RHEL: `nginx`、`apache`
- カスタムデプロイ: `deploy`、`app`、現在ログインしているユーザー

#### 5. Nginxリバースプロキシ

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

    # 静的ファイルへの直接アクセス
    location /static/ {
        alias /opt/huobao-drama/data/storage/;
    }
}
```

---

## 🎨 技術スタック

### バックエンド
- **言語**: Go 1.23+
- **Webフレームワーク**: Gin 1.9+
- **ORM**: GORM
- **データベース**: SQLite
- **ログ**: Zap
- **動画処理**: FFmpeg
- **AIサービス**: OpenAI、Gemini、Doubaoなど

### フロントエンド
- **フレームワーク**: Vue 3.4+
- **言語**: TypeScript 5+
- **ビルドツール**: Vite 5
- **UIコンポーネント**: Element Plus
- **CSSフレームワーク**: TailwindCSS
- **状態管理**: Pinia
- **ルーター**: Vue Router 4

### 開発ツール
- **パッケージ管理**: Go Modules、npm
- **コード規約**: ESLint、Prettier
- **バージョン管理**: Git

---

## 📝 よくある質問

### Q: DockerコンテナからホストのOllamaにアクセスするには？
A: Base URLとして `http://host.docker.internal:11434/v1` を使用します。注意点：
1. ホストのOllamaは `0.0.0.0` でリッスンする必要があります: `export OLLAMA_HOST=0.0.0.0:11434 && ollama serve`
2. `docker run` を使用するLinuxユーザーは追加が必要: `--add-host=host.docker.internal:host-gateway`

詳細: [DOCKER_HOST_ACCESS.md](docs/DOCKER_HOST_ACCESS.md)

### Q: FFmpegがインストールされていない、または見つからない？
A: FFmpegがインストールされ、PATH環境変数に含まれていることを確認してください。`ffmpeg -version` で確認。

### Q: フロントエンドがバックエンドAPIに接続できない？
A: バックエンドが実行中で、ポートが正しいか確認してください。開発モードでは、フロントエンドプロキシ設定は `web/vite.config.ts` にあります。

### Q: データベーステーブルが作成されない？
A: GORMは初回起動時にテーブルを自動作成します。ログでマイグレーション成功を確認してください。

---

## 📋 更新履歴

### v1.0.2 (2026-01-16)

#### 🚀 主要アップデート
- 純粋なGo SQLiteドライバー（`modernc.org/sqlite`）、`CGO_ENABLED=0` クロスプラットフォームコンパイルをサポート
- 並行性能を最適化（WALモード）、"database is locked" エラーを解決
- ホストサービスへのアクセス用 `host.docker.internal` のDockerクロスプラットフォームサポート
- ドキュメントとデプロイガイドの簡素化

### v1.0.1 (2026-01-14)

#### 🐛 バグ修正 / 🔧 改善
- 動画生成APIレスポンスのパース問題を修正
- OpenAI Sora動画エンドポイント設定を追加
- エラー処理とログ出力を最適化

---

## 🤝 コントリビューション

IssueとPull Requestを歓迎します！

1. このプロジェクトをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. Pull Requestを作成

---

## API設定サイト
2分で設定完了: [API集約サイト](https://api.chatfire.site/models)

## 📧 連絡先
ビジネス連絡先（WeChat）: dangbao1117

## コミュニティグループ
![コミュニティグループ](drama.png)
- [Issue](../../issues)を提出
- プロジェクトメンテナにメール

---

<div align="center">

**⭐ このプロジェクトが役に立ったら、Starをお願いします！**

## Star履歴

[![Star History Chart](https://api.star-history.com/svg?repos=chatfire-AI/huobao-drama&type=date&legend=top-left)](https://www.star-history.com/#chatfire-AI/huobao-drama&type=date&legend=top-left)

Made with ❤️ by Huobao Team

</div>
