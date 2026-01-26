-- AI短剧生成平台 - SQLite数据库初始化脚本 (开源版本 - 无用户认证)
-- 创建时间: 2026-01-07
-- 说明: 此版本适配SQLite，移除外键约束，适合单机部署

-- ======================================
-- 1. 剧本相关表
-- ======================================

-- 剧本表
CREATE TABLE IF NOT EXISTS dramas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    genre TEXT,
    style TEXT NOT NULL DEFAULT 'realistic',
    total_episodes INTEGER NOT NULL DEFAULT 1,
    total_duration INTEGER NOT NULL DEFAULT 0, -- 总时长(秒)
    status TEXT NOT NULL DEFAULT 'draft', -- draft, in_progress, completed
    thumbnail TEXT,
    tags TEXT, -- JSON存储
    metadata TEXT, -- JSON存储
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_dramas_status ON dramas(status);
CREATE INDEX IF NOT EXISTS idx_dramas_deleted_at ON dramas(deleted_at);

-- 章节表
CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drama_id INTEGER NOT NULL,
    episode_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    script_content TEXT,
    description TEXT,
    duration INTEGER NOT NULL DEFAULT 0, -- 时长(秒)
    status TEXT NOT NULL DEFAULT 'draft',
    video_url TEXT,
    thumbnail TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_episodes_drama_id ON episodes(drama_id);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status);
CREATE INDEX IF NOT EXISTS idx_episodes_deleted_at ON episodes(deleted_at);

-- 角色表
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drama_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    role TEXT,
    description TEXT,
    appearance TEXT,
    personality TEXT,
    voice_style TEXT,
    image_url TEXT,
    local_path TEXT,
    reference_images TEXT, -- JSON存储
    seed_value TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_characters_drama_id ON characters(drama_id);
CREATE INDEX IF NOT EXISTS idx_characters_deleted_at ON characters(deleted_at);

-- 场景表
CREATE TABLE IF NOT EXISTS scenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drama_id INTEGER NOT NULL,
    location TEXT NOT NULL,
    time TEXT NOT NULL,
    prompt TEXT NOT NULL,
    storyboard_count INTEGER NOT NULL DEFAULT 1,
    image_url TEXT,
    local_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, generated, failed
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_scenes_drama_id ON scenes(drama_id);
CREATE INDEX IF NOT EXISTS idx_scenes_status ON scenes(status);
CREATE INDEX IF NOT EXISTS idx_scenes_deleted_at ON scenes(deleted_at);

-- 道具表
CREATE TABLE IF NOT EXISTS props (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drama_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    description TEXT,
    prompt TEXT,
    image_url TEXT,
    local_path TEXT,
    reference_images TEXT, -- JSON存储
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_props_drama_id ON props(drama_id);
CREATE INDEX IF NOT EXISTS idx_props_deleted_at ON props(deleted_at);

-- 分镜表
CREATE TABLE IF NOT EXISTS storyboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id INTEGER NOT NULL,
    scene_id INTEGER,
    storyboard_number INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    location TEXT,
    time TEXT,
    duration INTEGER NOT NULL DEFAULT 0, -- 时长(秒)
    dialogue TEXT,
    action TEXT,
    atmosphere TEXT,
    image_prompt TEXT,
    video_prompt TEXT,
    characters TEXT, -- JSON存储
    composed_image TEXT,
    video_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_storyboards_episode_id ON storyboards(episode_id);
CREATE INDEX IF NOT EXISTS idx_storyboards_scene_id ON storyboards(scene_id);
CREATE INDEX IF NOT EXISTS idx_storyboards_storyboard_number ON storyboards(storyboard_number);
CREATE INDEX IF NOT EXISTS idx_storyboards_status ON storyboards(status);
CREATE INDEX IF NOT EXISTS idx_storyboards_deleted_at ON storyboards(deleted_at);

-- ======================================
-- 2. AI生成相关表
-- ======================================

-- 图片生成记录表
CREATE TABLE IF NOT EXISTS image_generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    storyboard_id INTEGER, -- 修正：引用storyboards表
    drama_id INTEGER NOT NULL,
    provider TEXT NOT NULL, -- openai, midjourney, stable_diffusion
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    model TEXT,
    size TEXT,
    quality TEXT,
    style TEXT,
    steps INTEGER,
    cfg_scale REAL,
    seed INTEGER,
    image_url TEXT,
    minio_url TEXT,
    local_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    task_id TEXT,
    error_msg TEXT,
    width INTEGER,
    height INTEGER,
    reference_images TEXT, -- JSON存储
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_image_generations_storyboard_id ON image_generations(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_image_generations_drama_id ON image_generations(drama_id);
CREATE INDEX IF NOT EXISTS idx_image_generations_status ON image_generations(status);
CREATE INDEX IF NOT EXISTS idx_image_generations_task_id ON image_generations(task_id);
CREATE INDEX IF NOT EXISTS idx_image_generations_deleted_at ON image_generations(deleted_at);

-- 视频生成记录表
CREATE TABLE IF NOT EXISTS video_generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    storyboard_id INTEGER, -- 修正：引用storyboards表
    drama_id INTEGER NOT NULL,
    provider TEXT NOT NULL, -- runway, pika, doubao, openai
    prompt TEXT NOT NULL,
    model TEXT,
    image_gen_id INTEGER,
    image_url TEXT,
    first_frame_url TEXT,
    duration INTEGER, -- 时长(秒)
    fps INTEGER,
    resolution TEXT,
    aspect_ratio TEXT,
    style TEXT,
    motion_level INTEGER,
    camera_motion TEXT,
    seed INTEGER,
    video_url TEXT,
    minio_url TEXT,
    local_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    task_id TEXT,
    error_msg TEXT,
    completed_at DATETIME,
    width INTEGER,
    height INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_video_generations_storyboard_id ON video_generations(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_drama_id ON video_generations(drama_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_provider ON video_generations(provider);
CREATE INDEX IF NOT EXISTS idx_video_generations_status ON video_generations(status);
CREATE INDEX IF NOT EXISTS idx_video_generations_task_id ON video_generations(task_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_image_gen_id ON video_generations(image_gen_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_deleted_at ON video_generations(deleted_at);

-- 视频合成记录表
CREATE TABLE IF NOT EXISTS video_merges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id INTEGER NOT NULL,
    drama_id INTEGER NOT NULL,
    title TEXT,
    provider TEXT NOT NULL,
    model TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    scenes TEXT NOT NULL, -- JSON存储：场景片段列表
    merged_url TEXT,
    duration INTEGER, -- 总时长(秒)
    task_id TEXT,
    error_msg TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_video_merges_episode_id ON video_merges(episode_id);
CREATE INDEX IF NOT EXISTS idx_video_merges_drama_id ON video_merges(drama_id);
CREATE INDEX IF NOT EXISTS idx_video_merges_status ON video_merges(status);
CREATE INDEX IF NOT EXISTS idx_video_merges_deleted_at ON video_merges(deleted_at);

-- ======================================
-- 3. 角色库表
-- ======================================

-- 角色库表 (开源版本 - 全局共享)
CREATE TABLE IF NOT EXISTS character_libraries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    image_url TEXT NOT NULL,
    local_path TEXT,
    description TEXT,
    tags TEXT,
    source_type TEXT NOT NULL DEFAULT 'generated', -- generated, uploaded
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_character_libraries_category ON character_libraries(category);
CREATE INDEX IF NOT EXISTS idx_character_libraries_deleted_at ON character_libraries(deleted_at);

-- ======================================
-- 4. 时间线相关表
-- ======================================

-- 时间线表
CREATE TABLE IF NOT EXISTS timelines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drama_id INTEGER NOT NULL,
    episode_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL DEFAULT 0, -- 总时长(秒)
    fps INTEGER NOT NULL DEFAULT 30,
    resolution TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, editing, completed, exporting
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_timelines_drama_id ON timelines(drama_id);
CREATE INDEX IF NOT EXISTS idx_timelines_episode_id ON timelines(episode_id);
CREATE INDEX IF NOT EXISTS idx_timelines_status ON timelines(status);
CREATE INDEX IF NOT EXISTS idx_timelines_deleted_at ON timelines(deleted_at);

-- 时间线轨道表
CREATE TABLE IF NOT EXISTS timeline_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timeline_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- video, audio, text
    track_order INTEGER NOT NULL DEFAULT 0,
    is_locked INTEGER NOT NULL DEFAULT 0,
    is_muted INTEGER NOT NULL DEFAULT 0,
    volume INTEGER DEFAULT 100,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_timeline_tracks_timeline_id ON timeline_tracks(timeline_id);
CREATE INDEX IF NOT EXISTS idx_timeline_tracks_type ON timeline_tracks(type);
CREATE INDEX IF NOT EXISTS idx_timeline_tracks_deleted_at ON timeline_tracks(deleted_at);

-- 时间线片段表
CREATE TABLE IF NOT EXISTS timeline_clips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL,
    asset_id INTEGER,
    storyboard_id INTEGER, -- 修正：引用storyboards而非scenes
    name TEXT,
    start_time INTEGER NOT NULL, -- 开始时间(毫秒)
    end_time INTEGER NOT NULL, -- 结束时间(毫秒)
    duration INTEGER NOT NULL, -- 时长(毫秒)
    trim_start INTEGER, -- 裁剪开始(毫秒)
    trim_end INTEGER, -- 裁剪结束(毫秒)
    speed REAL DEFAULT 1.0,
    volume INTEGER,
    is_muted INTEGER NOT NULL DEFAULT 0,
    fade_in INTEGER, -- 淡入时长(毫秒)
    fade_out INTEGER, -- 淡出时长(毫秒)
    transition_in_id INTEGER,
    transition_out_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_timeline_clips_track_id ON timeline_clips(track_id);
CREATE INDEX IF NOT EXISTS idx_timeline_clips_asset_id ON timeline_clips(asset_id);
CREATE INDEX IF NOT EXISTS idx_timeline_clips_storyboard_id ON timeline_clips(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_timeline_clips_transition_in ON timeline_clips(transition_in_id);
CREATE INDEX IF NOT EXISTS idx_timeline_clips_transition_out ON timeline_clips(transition_out_id);
CREATE INDEX IF NOT EXISTS idx_timeline_clips_deleted_at ON timeline_clips(deleted_at);

-- 片段转场表
CREATE TABLE IF NOT EXISTS clip_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- fade, crossfade, slide, wipe, zoom, dissolve
    duration INTEGER NOT NULL DEFAULT 500, -- 转场时长(毫秒)
    easing TEXT,
    config TEXT, -- JSON存储
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_clip_transitions_type ON clip_transitions(type);
CREATE INDEX IF NOT EXISTS idx_clip_transitions_deleted_at ON clip_transitions(deleted_at);

-- 片段效果表
CREATE TABLE IF NOT EXISTS clip_effects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clip_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- filter, color, blur, brightness, contrast, saturation
    name TEXT,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    effect_order INTEGER NOT NULL DEFAULT 0,
    config TEXT, -- JSON存储
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_clip_effects_clip_id ON clip_effects(clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_effects_type ON clip_effects(type);
CREATE INDEX IF NOT EXISTS idx_clip_effects_deleted_at ON clip_effects(deleted_at);

-- ======================================
-- 5. 资源管理相关表
-- ======================================

-- 资源表
CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drama_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- image, video, audio
    category TEXT,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    local_path TEXT,
    file_size INTEGER,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- 时长(秒)
    format TEXT,
    image_gen_id INTEGER,
    video_gen_id INTEGER,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_assets_drama_id ON assets(drama_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_image_gen_id ON assets(image_gen_id);
CREATE INDEX IF NOT EXISTS idx_assets_video_gen_id ON assets(video_gen_id);
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON assets(deleted_at);

-- 资源标签表
CREATE TABLE IF NOT EXISTS asset_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_asset_tags_deleted_at ON asset_tags(deleted_at);

-- 资源集合表
CREATE TABLE IF NOT EXISTS asset_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drama_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_asset_collections_drama_id ON asset_collections(drama_id);
CREATE INDEX IF NOT EXISTS idx_asset_collections_deleted_at ON asset_collections(deleted_at);

-- 资源标签关系表(多对多)
CREATE TABLE IF NOT EXISTS asset_tag_relations (
    asset_id INTEGER NOT NULL,
    asset_tag_id INTEGER NOT NULL,
    PRIMARY KEY (asset_id, asset_tag_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_tag_relations_asset_id ON asset_tag_relations(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tag_relations_tag_id ON asset_tag_relations(asset_tag_id);

-- 资源集合关系表(多对多)
CREATE TABLE IF NOT EXISTS asset_collection_relations (
    asset_id INTEGER NOT NULL,
    asset_collection_id INTEGER NOT NULL,
    PRIMARY KEY (asset_id, asset_collection_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_collection_relations_asset_id ON asset_collection_relations(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_collection_relations_collection_id ON asset_collection_relations(asset_collection_id);

-- ======================================
-- 6. AI服务配置表 (开源版本 - 全局配置)
-- ======================================

-- AI服务配置表 (全局配置，无用户隔离)
CREATE TABLE IF NOT EXISTS ai_service_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_type TEXT NOT NULL, -- text, image, video
    provider TEXT, -- openai, gemini, volcengine, etc.
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    model TEXT,
    endpoint TEXT,
    query_endpoint TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    settings TEXT, -- JSON存储
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_ai_service_configs_service_type ON ai_service_configs(service_type);
CREATE INDEX IF NOT EXISTS idx_ai_service_configs_deleted_at ON ai_service_configs(deleted_at);

-- AI服务提供商表
CREATE TABLE IF NOT EXISTS ai_service_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    service_type TEXT NOT NULL, -- text, image, video
    default_url TEXT,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_ai_service_providers_service_type ON ai_service_providers(service_type);
CREATE INDEX IF NOT EXISTS idx_ai_service_providers_deleted_at ON ai_service_providers(deleted_at);

-- ======================================
-- 7. 初始数据
-- ======================================

-- 插入默认AI服务提供商
INSERT OR IGNORE INTO ai_service_providers (name, display_name, service_type, default_url, description) VALUES
('openai', 'OpenAI', 'text', 'https://api.openai.com/v1', 'OpenAI GPT模型'),
('openai-dalle', 'OpenAI DALL-E', 'image', 'https://api.openai.com/v1', 'OpenAI DALL-E图片生成'),
('openai-sora', 'OpenAI Sora', 'video', 'https://api.openai.com/v1', 'OpenAI Sora视频生成'),
('midjourney', 'Midjourney', 'image', '', 'Midjourney图片生成'),
('doubao-image', '豆包(火山引擎)', 'image', 'https://ark.cn-beijing.volces.com', '火山引擎豆包图片生成'),
('gemini-image', 'Google Gemini', 'image', 'https://generativelanguage.googleapis.com', 'Google Gemini原生图片生成(base64)'),
('runway', 'Runway', 'video', '', 'Runway视频生成'),
('pika', 'Pika Labs', 'video', '', 'Pika视频生成'),
('doubao', '豆包(火山引擎)', 'video', 'https://ark.cn-beijing.volces.com', '火山引擎豆包视频生成'),
('minimax', 'MiniMax', 'video', '', 'MiniMax视频生成');
