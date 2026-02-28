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
  tags?: string[]
  metadata?: Record<string, unknown>
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
  reference_images?: string[]
  seed_value?: string
  sort_order?: number
  image_url?: string
  local_path?: string
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
  shots?: Record<string, unknown>[]
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
  atmosphere?: string
  image_prompt?: string
  video_prompt?: string
  characters?: (string | Character)[]
  scenes?: (string | Scene)[]
  image_url?: string
  video_url?: string
  composed_image?: string
  composed_url?: string
  background_id?: string
  background_url?: string
  background?: Scene
  local_path?: string
  image_generation_status?: string
  image_generation_error?: string
  error_msg?: string
  status?: string
  character_ids?: number[]
  prop_ids?: number[]
  props?: any[]
  scene_id?: string
  scene?: Scene
  shot_type?: string
  movement?: string
  angle?: string
  result?: string
  sound_effect?: string
  bgm_prompt?: string
  created_at: string
  updated_at: string
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
  local_path?: string
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
  style?: string
  tags?: string
}

export interface UpdateDramaRequest {
  title?: string
  description?: string
  genre?: string
  style?: string
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
