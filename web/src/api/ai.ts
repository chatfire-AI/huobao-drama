import type {
    APIAliveRequest,
    APIAliveResponse,
    AIServiceConfig,
    AIServiceType,
    CreateAIConfigRequest,
    TestConnectionRequest,
    UpdateAIConfigRequest
} from '../types/ai'
import request from '../utils/request'

export const aiAPI = {
  list(serviceType?: AIServiceType) {
    return request.get<AIServiceConfig[]>('/ai-configs', {
      params: { service_type: serviceType }
    })
  },

  create(data: CreateAIConfigRequest) {
    return request.post<AIServiceConfig>('/ai-configs', data)
  },

  get(id: number) {
    return request.get<AIServiceConfig>(`/ai-configs/${id}`)
  },

  update(id: number, data: UpdateAIConfigRequest) {
    return request.put<AIServiceConfig>(`/ai-configs/${id}`, data)
  },

  delete(id: number) {
    return request.delete(`/ai-configs/${id}`)
  },

  testConnection(data: TestConnectionRequest) {
    return request.post('/ai-configs/test', data)
  },

  checkAlive(data: APIAliveRequest) {
    return request.post<APIAliveResponse>('/ai-configs/alive', data)
  }
}
