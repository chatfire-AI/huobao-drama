export interface OperationLog {
  id: number
  user_id?: string
  module: string
  action: string
  api: string
  request_data?: Record<string, any>
  result: 'success' | 'failed'
  error_message?: string
  created_at: string
}

export interface OperationLogQuery {
  page: number
  page_size: number
  user_id?: string
  module?: string
  action?: string
  api?: string
  result?: string
  start_time?: string
  end_time?: string
}
