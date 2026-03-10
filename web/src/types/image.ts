export interface ImageGeneration {
  id: number
  storyboard_id?: number
  scene_id?: string
  drama_id: string
  character_id?: number
  prop_id?: number
  image_type?: string
  frame_type?: string
  provider: string
  prompt: string
  negative_prompt?: string
  model: string
  size?: string
  quality?: string
  style?: string
  steps?: number
  cfg_scale?: number
  seed?: number
  image_url?: string
  image_generation?: any
  local_path?: string
  status: ImageStatus
  task_id?: string
  error_msg?: string
  width?: number
  height?: number
  created_at: string
  updated_at: string
  completed_at?: string
}

export type ImageStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type ImageProvider = 'openai' | 'dalle' | 'midjourney' | 'stable_diffusion' | 'sd'

export interface GenerateImageRequest {
  scene_id?: number | string
  storyboard_id?: number
  drama_id: string
  image_type?: string
  frame_type?: string
  prompt: string
  negative_prompt?: string
  reference_images?: string[]
  provider?: string
  model?: string
  size?: string
  quality?: string
  style?: string
  steps?: number
  cfg_scale?: number
  seed?: number
  width?: number
  height?: number
}

export interface ImageGenerationListParams {
  drama_id?: string
  scene_id?: string
  storyboard_id?: number
  frame_type?: string
  status?: ImageStatus
  page?: number
  page_size?: number
}
