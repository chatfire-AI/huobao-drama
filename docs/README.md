# Swagger 文档

开发模式（app.debug=true）会开放 Swagger UI：

- http://localhost:5678/docs/index.html

生成文档（swagger.json）：

```bash
scripts/generate_swagger.sh
```

说明：
- 文档文件默认输出到 `docs/swagger.json`
- `/docs` 只在 debug 模式下启用
