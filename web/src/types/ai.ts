export interface AIServiceConfig {
  id: number
  service_type: AIServiceType
  provider?: string  // 厂商标识
  name: string
  base_url: string
  api_key: string
  model: string | string[]  // 支持单个或多个模型
  endpoint: string
  query_endpoint?: string  // 异步查询端点（用于视频等异步任务）
  priority: number  // 优先级，数值越大优先级越高
  is_active: boolean
  settings?: string
  created_at: string
  updated_at: string
}

export type AIServiceType = 'text' | 'image' | 'video'

export interface CreateAIConfigRequest {
  service_type: AIServiceType
  provider?: string  // 厂商标识
  name: string
  base_url: string
  api_key: string
  model: string | string[]  // 支持单个或多个模型
  endpoint?: string
  query_endpoint?: string  // 异步查询端点（用于视频等异步任务）
  priority?: number  // 优先级，数值越大优先级越高
  settings?: string
}

export interface UpdateAIConfigRequest {
  name?: string
  provider?: string  // 厂商标识
  base_url?: string
  api_key?: string
  model?: string | string[]  // 支持单个或多个模型
  endpoint?: string
  query_endpoint?: string  // 异步查询端点（用于视频等异步任务）
  priority?: number  // 优先级，数值越大优先级越高
  is_active?: boolean
  settings?: string
}

export interface TestConnectionRequest {
  base_url: string
  api_key: string
  model: string | string[]  // 支持单个或多个模型
  provider?: string  // 厂商标识
  endpoint?: string
  query_endpoint?: string  // 异步查询端点（用于视频等异步任务）
}

export interface AIServiceProvider {
  id: number
  name: string
  display_name: string
  service_type: AIServiceType
  default_url: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface APIAliveRequest {
  base_url: string
  api_key: string
  provider: string
  model?: string
  endpoint?: string
  prompt?: string
}

export interface APIAliveResponse {
  alive: boolean
  provider: string
  model: string
  endpoint: string
  reply: string
  latency_ms: number
  request_id?: string
  message: string
}
