export interface VideoGeneration {
  id: number
  storyboard_id?: number
  scene_id?: string | number
  drama_id: string
  image_gen_id?: number
  provider: string
  prompt: string
  model?: string
  image_url?: string
  first_frame_url?: string
  duration?: number
  fps?: number
  resolution?: string
  aspect_ratio?: string
  style?: string
  motion_level?: number
  camera_motion?: string
  seed?: number
  video_url?: string
  local_path?: string
  status: VideoStatus
  task_id?: string
  error_msg?: string
  width?: number
  height?: number
  created_at: string
  updated_at: string
  completed_at?: string
}

export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type VideoProvider = 'runway' | 'pika' | 'doubao' | 'openai'

export interface GenerateVideoRequest {
  storyboard_id?: number
  scene_id?: string | number
  drama_id: string
  image_gen_id?: number
  image_url?: string
  prompt: string
  provider?: string
  model?: string
  duration?: number
  fps?: number
  aspect_ratio?: string
  style?: string
  motion_level?: number
  camera_motion?: string
  seed?: number
  reference_mode?: string
  first_frame_url?: string
  last_frame_url?: string
  reference_image_urls?: string[]
}

export interface VideoGenerationListParams {
  drama_id?: string
  storyboard_id?: string
  scene_id?: string | number
  status?: string
  page?: number
  page_size?: number
}

export const VIDEO_ASPECT_RATIOS = [
  { label: '16:9 (Landscape)', value: '16:9' },
  { label: '9:16 (Portrait)', value: '9:16' },
  { label: '1:1 (Square)', value: '1:1' },
  { label: '4:3 (Classic)', value: '4:3' }
]

export const CAMERA_MOTIONS = [
  { label: 'Static', value: 'static' },
  { label: 'Zoom In', value: 'zoom_in' },
  { label: 'Zoom Out', value: 'zoom_out' },
  { label: 'Pan Left', value: 'pan_left' },
  { label: 'Pan Right', value: 'pan_right' },
  { label: 'Tilt Up', value: 'tilt_up' },
  { label: 'Tilt Down', value: 'tilt_down' },
  { label: 'Orbit', value: 'orbit' }
]
