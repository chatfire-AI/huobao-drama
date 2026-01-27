# 多阶段构建 Dockerfile for Huobao Drama

# ==================== 阶段1: 构建前端 ====================
# 声明构建参数（支持镜像源配置）
ARG DOCKER_REGISTRY=
ARG NPM_REGISTRY=

FROM ${DOCKER_REGISTRY:-}node:20-alpine AS frontend-builder

# 重新声明 ARG（FROM 之后 ARG 作用域失效，需要重新声明）
ARG NPM_REGISTRY=

# 配置 npm 镜像源（条件执行）
ENV NPM_REGISTRY=${NPM_REGISTRY:-}
RUN if [ -n "$NPM_REGISTRY" ]; then \
    npm config set registry "$NPM_REGISTRY" || true; \
    fi

WORKDIR /app/web

# 复制前端依赖文件
COPY web/package*.json ./

# 安装前端依赖（包括 devDependencies，构建需要）
RUN npm install

# 复制前端源码
COPY web/ ./

# 构建前端
RUN npm run build

# ==================== 阶段2: 构建后端 ====================
# 每个阶段前重新声明构建参数
ARG DOCKER_REGISTRY=
ARG GO_PROXY=
ARG ALPINE_MIRROR=

FROM ${DOCKER_REGISTRY:-}golang:1.23-alpine AS backend-builder

# 重新声明 ARG（FROM 之后 ARG 作用域失效，需要重新声明）
ARG GO_PROXY=
ARG ALPINE_MIRROR=

# 配置 Alpine 镜像源（条件执行）
ENV ALPINE_MIRROR=${ALPINE_MIRROR:-}
RUN if [ -n "$ALPINE_MIRROR" ]; then \
    sed -i "s@dl-cdn.alpinelinux.org@$ALPINE_MIRROR@g" /etc/apk/repositories 2>/dev/null || true; \
    fi

# 配置 Go 代理（使用 ENV 持久化到运行时）
ENV GOPROXY=${GO_PROXY:-https://goproxy.cn,direct}
ENV GO111MODULE=on

# 安装必要的构建工具（纯 Go 编译，无需 CGO）
RUN apk add --no-cache \
    git \
    ca-certificates \
    tzdata

WORKDIR /app

# 复制 Go 模块文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制后端源码
COPY . .

# 复制前端构建产物
COPY --from=frontend-builder /app/web/dist ./web/dist

# 构建后端可执行文件（纯 Go 编译，使用 modernc.org/sqlite）
RUN CGO_ENABLED=0 go build -ldflags="-w -s" -o huobao-drama .

# 构建迁移脚本可执行文件
RUN CGO_ENABLED=0 go build -ldflags="-w -s" -o migrate cmd/migrate/main.go

# ==================== 阶段3: 运行时镜像 ====================
# 每个阶段前重新声明构建参数
ARG DOCKER_REGISTRY=
ARG ALPINE_MIRROR=

FROM ${DOCKER_REGISTRY:-}alpine:latest

# 重新声明 ARG（FROM 之后 ARG 作用域失效，需要重新声明）
ARG ALPINE_MIRROR=

# 配置 Alpine 镜像源（条件执行）
ENV ALPINE_MIRROR=${ALPINE_MIRROR:-}
RUN if [ -n "$ALPINE_MIRROR" ]; then \
    sed -i "s@dl-cdn.alpinelinux.org@$ALPINE_MIRROR@g" /etc/apk/repositories 2>/dev/null || true; \
    fi

# 安装运行时依赖
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    ffmpeg \
    wget \
    && rm -rf /var/cache/apk/*

# 设置时区
ENV TZ=Asia/Shanghai

WORKDIR /app

# 从构建阶段复制可执行文件
COPY --from=backend-builder /app/huobao-drama .
COPY --from=backend-builder /app/migrate .

# 复制前端构建产物
COPY --from=frontend-builder /app/web/dist ./web/dist

# 复制配置文件模板并创建默认配置
COPY configs/config.example.yaml ./configs/
RUN cp ./configs/config.example.yaml ./configs/config.yaml

# 复制数据库迁移文件
COPY migrations ./migrations/

# 创建数据目录（root 用户运行，无需权限设置）
RUN mkdir -p /app/data/storage

# 暴露端口
EXPOSE 5678

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5678/health || exit 1

# 启动应用
CMD ["./huobao-drama"]
