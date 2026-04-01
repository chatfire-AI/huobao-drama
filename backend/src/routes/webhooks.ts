/**
 * Vidu Webhook 回调处理
 * Vidu 在任务完成后会 POST 到此端点通知结果
 */
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, badRequest } from '../utils/response.js'
import { downloadFile } from '../utils/storage.js'
import { ViduVideoAdapter } from '../services/adapters/vidu-video'
import { logTaskError, logTaskProgress, logTaskSuccess, logTaskWarn } from '../utils/task-logger.js'

const app = new Hono()

// POST /webhooks/vidu
// Vidu 回调格式: { task_id, state, video_url, ... }
app.post('/vidu', async (c) => {
  const body = await c.req.json()
  const { task_id, state, video_url, error } = body
  logTaskProgress('Webhook', 'vidu-callback', {
    taskId: task_id,
    state,
    hasVideoUrl: !!video_url,
    error,
  })

  if (!task_id) {
    logTaskWarn('Webhook', 'vidu-callback-missing-task-id', { state })
    return badRequest(c, 'Missing task_id')
  }

  // 查找对应的 video_generation 记录
  const rows = db.select().from(schema.videoGenerations)
    .where(eq(schema.videoGenerations.taskId, task_id))
    .all()

  if (rows.length === 0) {
    // 可能任务还没写入（极少见），返回成功避免重复回调
    logTaskWarn('Webhook', 'vidu-task-not-found', { taskId: task_id })
    return success(c, { message: 'Task not found' })
  }

  const record = rows[0]

  if (state === 'success' && video_url) {
    try {
      const localPath = await downloadFile(video_url, 'videos')
      db.update(schema.videoGenerations)
        .set({
          videoUrl: video_url,
          localPath,
          status: 'completed',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.videoGenerations.id, record.id))
        .run()

      // 更新 storyboard
      if (record.storyboardId) {
        db.update(schema.storyboards)
          .set({ videoUrl: localPath, updatedAt: new Date().toISOString() })
          .where(eq(schema.storyboards.id, record.storyboardId))
          .run()
      }

      logTaskSuccess('Webhook', 'vidu-video-updated', {
        taskId: task_id,
        generationId: record.id,
        storyboardId: record.storyboardId,
        localPath,
      })
      return success(c, { message: 'Video updated successfully' })
    } catch (err: any) {
      logTaskError('Webhook', 'vidu-download-failed', { taskId: task_id, generationId: record.id, error: err.message })
      db.update(schema.videoGenerations)
        .set({ status: 'failed', errorMsg: `Webhook download failed: ${err.message}` })
        .where(eq(schema.videoGenerations.id, record.id))
        .run()
      return badRequest(c, err.message)
    }
  }

  if (state === 'failed') {
    logTaskError('Webhook', 'vidu-generation-failed', { taskId: task_id, generationId: record.id, error: error || 'Vidu generation failed' })
    db.update(schema.videoGenerations)
      .set({
        status: 'failed',
        errorMsg: error || 'Vidu generation failed',
      })
      .where(eq(schema.videoGenerations.id, record.id))
      .run()
    return success(c, { message: 'Error recorded' })
  }

  // 其他状态（processing 等），不处理
  logTaskProgress('Webhook', 'vidu-status-noted', { taskId: task_id, generationId: record.id, state })
  return success(c, { message: 'Status noted' })
})

export default app
