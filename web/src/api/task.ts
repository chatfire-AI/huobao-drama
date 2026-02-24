import request from '../utils/request'

export interface AsyncTask {
    id: string
    type: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress: number
    message: string
    result?: Record<string, unknown>
    error?: string
    created_at: string
}

export const taskAPI = {
    getStatus(taskId: string) {
        return request.get<AsyncTask>(`/tasks/${taskId}`)
    }
}
