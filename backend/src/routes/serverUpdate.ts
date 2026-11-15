/**
 * 服务器 / Docker 部署的版本检查与更新路由（桌面版更新走 Electron 桥，不经此路由）
 */
import { Hono } from 'hono'
import { getServerUpdateState, checkServerUpdate, triggerWatchtowerUpdate } from '../services/server-update.js'
import { success, badRequest } from '../utils/response.js'

const app = new Hono()

// GET /state — 当前版本 + 更新模式 + 上次检查结果
app.get('/state', (c) => success(c, getServerUpdateState()))

// POST /check — 拉取发布清单比较版本
app.post('/check', async (c) => success(c, await checkServerUpdate()))

// POST /apply — 触发 Watchtower 拉新镜像并重建本容器（仅 watchtower 模式可用）
app.post('/apply', async (c) => {
  try {
    await triggerWatchtowerUpdate()
    return success(c, { triggered: true })
  } catch (err) {
    return badRequest(c, (err as Error).message)
  }
})

export default app
