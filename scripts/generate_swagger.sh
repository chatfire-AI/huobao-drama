#!/usr/bin/env bash
set -euo pipefail

SWAG_BIN="$(command -v swag || true)"
if [ -z "$SWAG_BIN" ]; then
  echo "swag 未安装，开始安装..."
  go install github.com/swaggo/swag/cmd/swag@v1.8.12
  SWAG_BIN="$(go env GOPATH)/bin/swag"
fi

if [ ! -x "$SWAG_BIN" ]; then
  echo "swag 安装失败或不在 PATH：$SWAG_BIN" >&2
  exit 1
fi

"$SWAG_BIN" init \
  --generalInfo main.go \
  --output ./docs \
  --outputTypes json \
  --parseDependency \
  --parseInternal

echo "Swagger 文档已生成：docs/swagger.json"
