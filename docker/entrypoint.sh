#!/bin/sh
# 容器入口：workspace 模板 copy-once 到数据卷（与桌面版 userData 同一语义），然后启动后端
set -e

if [ ! -e /app/data/workspace/.template-version ]; then
  mkdir -p /app/data/workspace
  cp -a /app/workspace-template/. /app/data/workspace/
  touch /app/data/workspace/.template-version
fi

cd /app/backend
exec node_modules/.bin/tsx src/index.ts
