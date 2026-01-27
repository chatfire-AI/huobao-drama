# 数据清洗工具使用说明

## 使用方法

### 方式一：直接运行（推荐）

```bash
# 在项目根目录执行
go run cmd/migrate/main.go
```

### 方式二：编译后运行

```bash
# 编译
go build -o migrate cmd/migrate/main.go

# 运行
./migrate
```

## 配置要求

脚本会自动读取项目配置文件，确保以下配置正确：

- 数据库连接信息（`config/config.yaml` 或环境变量）
- 存储目录：`data/storage`（自动创建）

## 输出示例

```
=== 数据清洗工具：迁移 local_path ===
开始时间: 2026-01-27 14:30:00

INFO  初始化日志系统...
INFO  配置加载成功
INFO  数据库连接成功
INFO  开始数据清洗：迁移 local_path 为空的数据
INFO  存储目录创建成功  root=data/storage

INFO  开始迁移 assets 数据...
INFO  找到需要迁移的 assets  数量=5
INFO  处理 asset  id=1 name=背景图 type=image url=https://...
INFO  开始下载文件  url=https://... filepath=data/storage/images/asset_1_1738048200.jpg
INFO  文件下载成功  filepath=data/storage/images/asset_1_1738048200.jpg size=245678
INFO  已缓存 URL 映射  url=https://... local_path=images/asset_1_1738048200.jpg
INFO  asset 迁移成功  asset_id=1 local_path=images/asset_1_1738048200.jpg

INFO  开始迁移 character_libraries 数据...
INFO  找到需要迁移的 character_libraries  数量=3
INFO  使用缓存的本地路径  url=https://... local_path=characters/charlib_2_1738048201.jpg

INFO  开始迁移 image_generations 数据...
INFO  找到需要迁移的 image_generations  数量=10
INFO  处理 image_generation  id=15 image_type=character image_url=https://...
INFO  image_generation 迁移成功  imggen_id=15 local_path=characters/imggen_15_1738048205.jpg

INFO  数据清洗完成
      总耗时=25.5s
      URL映射缓存数=8
      Assets成功=5 Assets失败=0
      角色库成功=3 角色库失败=0
      角色成功=4 角色失败=0
      图片生成成功=10 图片生成失败=0
      场景成功=6 场景失败=0
      视频成功=2 视频失败=0

=== 数据清洗完成 ===
结束时间: 2026-01-27 14:30:25
```

## 注意事项

1. **运行前确保**：
   - 数据库可访问
   - 有足够的磁盘空间
   - 网络连接正常

2. **安全提示**：
   - 脚本会修改数据库中的 `local_path` 字段
   - 建议先在测试环境运行
   - 可以多次运行，已处理的数据会自动跳过

3. **性能优化**：
   - URL 缓存机制避免重复下载
   - 下载失败会跳过，不影响其他数据
   - 超时时间设置为 60 秒

## 常见问题

### Q: 脚本可以重复运行吗？

A: 可以。脚本只处理 `local_path` 为空的记录，已处理的数据会自动跳过。

### Q: 下载失败怎么办？

A: 单个文件下载失败会记录错误日志并继续处理其他文件。可以查看日志定位问题后重新运行。

### Q: 如何查看详细日志？

A: 日志会实时输出到控制台，包含每个文件的处理状态和最终统计信息。

### Q: 存储路径可以修改吗？

A: 可以。修改脚本中的 `storageRoot` 变量（默认为 `data/storage`）。

## 技术支持

如有问题，请查看日志输出或联系开发团队。
