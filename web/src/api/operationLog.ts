import request from '../utils/request'
import type { OperationLog, OperationLogQuery } from '@/types/operationLog'

export const operationLogAPI = {
  list(params: OperationLogQuery) {
    return request.get<{ items: OperationLog[]; pagination: { total: number } }>(
      '/operation-logs',
      { params }
    )
  }
}
