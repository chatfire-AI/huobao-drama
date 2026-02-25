# Docker 容器访问宿主机服务指南

## 核心配置

Docker 容器内使用 `http://host.docker.internal:端口号` 访问宿主机服务。

### macOS / Windows

直接使用，无需额外配置。

### Linux

**docker-compose** - 已在 `docker-compose.yml` 配置：
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

**docker run** - 需添加参数：
```bash
docker run --add-host=host.docker.internal:host-gateway ...
```

## Ollama 配置示例

### 1. 宿主机启动服务

```bash
# 监听所有接口（重要）
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

### 2. 前端 AI 服务配置

| 字段 | 值 |
|------|-----|
| Base URL | `http://host.docker.internal:11434/v1` |
| Provider | `openai` |
| Model | `qwen2.5:latest` |
| API Key | `ollama` 或留空 |

### 3. 其他服务端口

| 服务 | 默认端口 | Base URL |
|------|---------|----------|
| Ollama | 11434 | `http://host.docker.internal:11434/v1` |
| LM Studio | 1234 | `http://host.docker.internal:1234/v1` |
| vLLM | 8000 | `http://host.docker.internal:8000/v1` |

## 验证和故障排查

### 测试连接

```bash
# 进入容器测试
docker exec -it QianHai-drama sh
wget -O- http://host.docker.internal:11434/api/tags

# 查看容器日志
docker logs QianHai-drama -f
```

### 常见问题

**Connection refused**

1. **宿主机服务未运行** - 检查服务状态
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **服务未监听 0.0.0.0** - Ollama 默认只监听 127.0.0.1
   ```bash
   export OLLAMA_HOST=0.0.0.0:11434
   ollama serve
   ```

3. **防火墙阻止** - 检查防火墙规则或临时关闭测试
