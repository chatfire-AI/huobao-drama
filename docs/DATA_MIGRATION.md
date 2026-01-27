# 数据清洗服务文档

## 概述

数据清洗服务（Data Migration Service）用于自动下载并迁移数据库中 `local_path` 字段为空的数据。该服务会在应用启动时自动执行，将远程 URL 的文件下载到本地存储，并更新数据库中的 `local_path` 字段。

## 功能特性

- ✅ **自动执行**：服务启动时自动运行，无需手动干预
- ✅ **异步处理**：后台异步执行，不阻塞服务启动
- ✅ **多表支持**：支持场景、角色、视频、分镜等多个表
- ✅ **智能分类**：根据数据类型自动分类存储到不同目录
- ✅ **错误容忍**：单个文件下载失败不影响其他文件的处理
- ✅ **详细日志**：提供完整的执行日志和统计信息

## 处理的数据表

### 1. 场景表（scenes）

- **字段**：`image_url` → `local_path`
- **存储目录**：`data/storage/images/`
- **文件命名**：`scene_{id}_{timestamp}.{ext}`

### 2. 角色表（characters）

- **字段**：`image_url` → `local_path`
- **存储目录**：`data/storage/characters/`
- **文件命名**：`character_{id}_{timestamp}.{ext}`

### 3. 视频生成表（video_generations）

- **字段**：`video_url` → `local_path`
- **存储目录**：`data/storage/videos/`
- **文件命名**：`video_{id}_{timestamp}.{ext}`

### 4. 分镜表（storyboards）

- **字段**：`image_url` → `local_path`
- **存储目录**：`data/storage/images/`
- **文件命名**：`storyboard_{id}_{timestamp}.{ext}`

## 执行流程

```
1. 服务启动
   ↓
2. 数据库连接和迁移
   ↓
3. 启动数据清洗任务（异步）
   ↓
4. 创建存储目录
   ↓
5. 查询各表中 local_path 为空的数据
   ↓
6. 遍历每条记录
   ├─ 下载文件到本地
   ├─ 更新 local_path 字段
   └─ 记录成功/失败统计
   ↓
7. 输出执行统计
```

## 日志示例

### 启动日志

```
INFO  启动数据清洗任务...
INFO  开始数据清洗：迁移 local_path 为空的数据
INFO  存储目录创建成功  root=data/storage
```

### 处理日志

```
INFO  开始迁移场景数据...
INFO  找到需要迁移的场景  数量=5
INFO  处理场景  id=1 location=大型超市 image_url=https://...
INFO  开始下载文件  url=https://... filepath=data/storage/images/scene_1_1706345678.jpg
INFO  文件下载成功  filepath=data/storage/images/scene_1_1706345678.jpg size=245678
INFO  场景迁移成功  scene_id=1 local_path=images/scene_1_1706345678.jpg
```

### 完成日志

```
INFO  数据清洗完成
      总耗时=15.234s
      场景成功=5 场景失败=0
      角色成功=3 角色失败=1
      视频成功=2 视频失败=0
      分镜成功=4 分镜失败=0
```

### 错误日志

```
ERROR 下载场景图片失败  scene_id=10 error=HTTP 状态码错误: 404
ERROR 更新角色 local_path 失败  character_id=5 error=database connection lost
```

## 配置说明

### 存储根目录

默认存储根目录为 `data/storage`，可在代码中修改：

```go
storageRoot: "data/storage"  // 可自定义路径
```

### 下载超时设置

默认 HTTP 请求超时为 60 秒：

```go
client := &http.Client{
    Timeout: 60 * time.Second,  // 可根据需要调整
}
```

## 错误处理

### 跳过的情况

- URL 为空
- URL 已经是本地路径（以 `/static/` 或 `data/` 开头）
- HTTP 请求失败（404、超时等）
- 文件写入失败
- 数据库更新失败

### 错误不会导致

- ❌ 服务启动失败
- ❌ 其他数据处理中断
- ❌ 数据库回滚

## 手动触发

如果需要手动触发数据清洗（例如在运行时），可以通过以下方式：

```go
// 创建服务实例
migrationService := services.NewDataMigrationService(db, logger)

// 执行迁移
if err := migrationService.MigrateLocalPaths(); err != nil {
    log.Printf("数据清洗失败: %v", err)
}
```

## 性能考虑

### 异步执行

数据清洗任务在后台异步执行，不会阻塞服务启动。服务可以立即开始处理用户请求。

### 网络带宽

- 大量文件下载可能占用网络带宽
- 建议在低峰期执行或限制并发下载数

### 存储空间

- 确保服务器有足够的磁盘空间
- 定期清理不再使用的文件

## 监控建议

### 关键指标

- 成功迁移数量
- 失败迁移数量
- 总执行时间
- 磁盘使用率

### 告警条件

- 失败率 > 10%
- 执行时间 > 5 分钟
- 磁盘使用率 > 90%

## 故障排查

### 问题：所有下载都失败

**可能原因**：

- 网络连接问题
- 防火墙阻止外部请求
- 源服务器不可用

**解决方案**：

- 检查网络连接
- 检查防火墙配置
- 验证源 URL 是否可访问

### 问题：部分下载失败

**可能原因**：

- 特定 URL 无效或过期
- 文件格式不支持
- 临时网络波动

**解决方案**：

- 查看错误日志定位具体 URL
- 手动验证 URL 有效性
- 重启服务重试

### 问题：数据库更新失败

**可能原因**：

- 数据库连接断开
- 权限不足
- 字段约束冲突

**解决方案**：

- 检查数据库连接
- 验证数据库用户权限
- 检查表结构和约束

## 代码位置

- **服务实现**：`application/services/data_migration_service.go`
- **集成代码**：`main.go`（第 45-55 行）
- **文档**：`docs/DATA_MIGRATION.md`

## 版本历史

- **v1.0.0** (2026-01-27)
  - 初始版本
  - 支持场景、角色、视频、分镜数据迁移
  - 异步执行，详细日志
