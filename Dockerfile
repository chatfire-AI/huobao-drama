# syntax=docker/dockerfile:1

# ===== 前端构建：Nuxt generate 产出静态站点 =====
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
# lockfile 的 resolved 可能指向带鉴权的私有 registry（开发者本机 .npmrc），镜像内会 401。
# 构建期删除 resolved 字段（integrity 校验不受影响），让 npm 统一走公共 registry
RUN node -e "const fs=require('fs');const l=JSON.parse(fs.readFileSync('package-lock.json'));for(const p of Object.values(l.packages||{}))delete p.resolved;fs.writeFileSync('package-lock.json',JSON.stringify(l,null,2))" \
  && npm ci --no-audit --no-fund --registry=https://registry.npmjs.org
COPY frontend/ ./
RUN npm run generate

# ===== 后端构建：安装依赖（含原生模块编译） =====
FROM node:20-bookworm AS backend-build
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN node -e "const fs=require('fs');const l=JSON.parse(fs.readFileSync('package-lock.json'));for(const p of Object.values(l.packages||{}))delete p.resolved;fs.writeFileSync('package-lock.json',JSON.stringify(l,null,2))" \
  && npm ci --no-audit --no-fund --registry=https://registry.npmjs.org
COPY backend/ ./
# 运行时与既有服务器部署一致走 tsx（源码存在 bundler 风格无扩展名 import，tsc 产物 node 直跑不可行）；
# tsx 是 devDependency，prune 后单独补装
RUN npm prune --omit=dev && npm i tsx@^4.21.0 --no-save --no-audit --no-fund --registry=https://registry.npmjs.org

# ===== 运行时 =====
FROM node:20-bookworm-slim
ARG HUOBAO_VERSION=dev
ENV NODE_ENV=production \
    HUOBAO_VERSION=${HUOBAO_VERSION} \
    PORT=5679 \
    HUOBAO_DATA_DIR=/app/data \
    SQLITE_PATH=/app/data/huobao.sqlite3 \
    WORKSPACE_PATH=/app/data/workspace \
    FRONTEND_DIST=/app/frontend-dist

WORKDIR /app
COPY --from=backend-build /build/backend/src ./backend/src
COPY --from=backend-build /build/backend/node_modules ./backend/node_modules
COPY --from=backend-build /build/backend/package.json ./backend/package.json
COPY --from=backend-build /build/backend/tsconfig.json ./backend/tsconfig.json
# workspace 模板（skills/prompts），entrypoint copy-once 到数据卷后可在线编辑
COPY backend/workspace ./workspace-template
COPY --from=frontend-build /build/frontend/.output/public ./frontend-dist
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && mkdir -p /app/data

# 数据卷（/app/data）：SQLite + 生成的静态文件 + 可编辑 workspace
# 不在此声明 VOLUME：Railway 构建直接拒绝（docker VOLUME ... is not supported, use Railway Volumes）。
# 卷统一由编排侧声明：docker-compose 的 huobao-data 命名卷 / Railway Volume；裸 docker run 需自行加 -v。
EXPOSE 5679

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||5679)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./entrypoint.sh"]
