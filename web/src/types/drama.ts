import { Prop } from './prop'

export interface Drama {
  id: string

  title: string
  description?: string
  genre?: string
  style?: string
  total_episodes: number
  total_duration: number
  total_scenes?: number
  duration?: number
  status: DramaStatus
  thumbnail?: string
  tags?: any
  metadata?: any
  created_at: string
  updated_at: string
  characters?: Character[]
  episodes?: Episode[]
  scenes?: Scene[]
  props?: Prop[]
}

export type DramaStatus = 'draft' | 'planning' | 'production' | 'completed' | 'archived' | 'generating' | 'error'

export interface Character {
  id: number
  drama_id: string
  name: string
  role?: string
  description?: string
  appearance?: string
  personality?: string
  voice_style?: string
  background?: string
  reference_images?: any
  seed_value?: string
  sort_order?: number
  image_url?: string
  image_generation_status?: string
  image_generation_error?: string
  created_at: string
  updated_at: string
}

export interface Episode {
  id: string
  drama_id: string
  episode_number: number
  title: string
  content: string
  description?: string
  script_content?: string
  duration?: number
  status: string
  video_url?: string
  thumbnail?: string
  storyboard_count?: number
  scene_count?: number
  composition_count?: number
  video_count?: number
  timeline_status?: string
  storyboards?: Storyboard[]
  scenes?: Scene[]
  characters?: Character[]
  shots?: any[]
  created_at: string
  updated_at: string
}

export interface Storyboard {
  id: string
  episode_id: string
  storyboard_number: number
  title?: string
  description?: string
  location?: string
  time?: string
  duration?: number
  dialogue?: string
  action?: string
  result?: string
  shot_type?: string
  movement?: string
  angle?: string
  visual_effect?: string
  sound_effect?: string
  bgm_prompt?: string
  image_prompt?: string
  video_prompt?: string
  characters?: any
  image_url?: string
  video_url?: string
  composed_image?: string
  scene_id?: string
  scene?: Scene
  created_at: string
  updated_at: string
  [key: string]: any
}

export interface Scene {
  id: string
  drama_id: string
  location: string
  time: string
  prompt: string
  description?: string
  title?: string
  storyboard_number?: number
  storyboard_count?: number
  image_url?: string
  video_url?: string
  status: string
  image_generation_status?: string
  image_generation_error?: string
  created_at: string
  updated_at: string
}

export interface CreateDramaRequest {
  title: string
  description?: string
  genre?: string
  tags?: string
}

export interface UpdateDramaRequest {
  title?: string
  description?: string
  genre?: string
  tags?: string
  status?: DramaStatus
}

export interface DramaListQuery {
  page?: number
  page_size?: number
  status?: DramaStatus
  genre?: string
  keyword?: string
}

export interface DramaStats {
  total: number
  by_status: Array<{
    status: string
    count: number
  }>
}
