-- 添加 local_path 字段到相关表
-- 创建时间: 2026-01-26
-- 说明: 为 characters, scenes, props, character_libraries 表添加 local_path 字段以支持本地存储路径

-- 为 characters 表添加 local_path 字段
ALTER TABLE characters ADD COLUMN local_path TEXT;

-- 为 scenes 表添加 local_path 字段
ALTER TABLE scenes ADD COLUMN local_path TEXT;

-- 为 props 表添加 local_path 字段
ALTER TABLE props ADD COLUMN local_path TEXT;

-- 为 character_libraries 表添加 local_path 字段
ALTER TABLE character_libraries ADD COLUMN local_path TEXT;
