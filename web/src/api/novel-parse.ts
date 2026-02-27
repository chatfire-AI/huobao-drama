import request from '../utils/request'

export interface NovelParseTask {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  total_episodes: number
  created_episodes: number
  error_message?: string
  drama_id?: number
}

export const novelParseAPI = {
  // 创建解析任务（上传文件）
  createTask(dramaId: number | null, file: File, title?: string) {
    const formData = new FormData()
    if (dramaId) {
      formData.append('drama_id', String(dramaId))
    }
    if (title) {
      formData.append('title', title)
    }
    formData.append('file', file)
    return request.post<NovelParseTask>('/novel-parse/tasks', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 开始解析任务
  startTask(taskId: string) {
    return request.post(`/novel-parse/tasks/${taskId}/start`)
  },

  // 获取任务状态
  getTask(taskId: string) {
    return request.get<NovelParseTask>(`/novel-parse/tasks/${taskId}`)
  },

  // 取消任务
  cancelTask(taskId: string) {
    return request.post(`/novel-parse/tasks/${taskId}/cancel`)
  }
}
