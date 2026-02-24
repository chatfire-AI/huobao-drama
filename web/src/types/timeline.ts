import type { Asset } from './asset'

export interface Timeline {
  id: number
  drama_id: number
  episode_id?: number
  name: string
  description?: string
  duration: number
  fps: number
  resolution?: string
  status: TimelineStatus
  tracks?: TimelineTrack[]
  created_at: string
  updated_at: string
}

export type TimelineStatus = 'draft' | 'editing' | 'completed' | 'exporting'

export interface TimelineTrack {
  id: number
  timeline_id: number
  name: string
  type: TrackType
  order: number
  is_locked: boolean
  is_muted: boolean
  volume?: number
  clips?: TimelineClip[]
  created_at: string
}

export type TrackType = 'video' | 'audio' | 'text'

export interface TimelineClip {
  id: number
  track_id: number
  asset_id?: number
  asset?: Asset
  scene_id?: string
  name: string
  start_time: number
  end_time: number
  duration: number
  trim_start?: number
  trim_end?: number
  speed?: number
  volume?: number
  is_muted: boolean
  fade_in?: number
  fade_out?: number
  transition_in_id?: number
  transition_out_id?: number
  in_transition?: ClipTransition
  out_transition?: ClipTransition
  effects?: ClipEffect[]
  created_at: string
}

export interface ClipTransition {
  id: number
  type: TransitionType
  duration: number
  easing?: string
  config?: Record<string, any>
}

export type TransitionType = 'fade' | 'crossfade' | 'slide' | 'wipe' | 'zoom' | 'dissolve'

export interface ClipEffect {
  id: number
  clip_id: number
  type: EffectType
  name: string
  is_enabled: boolean
  order: number
  config?: Record<string, any>
}

export type EffectType = 'filter' | 'color' | 'blur' | 'brightness' | 'contrast' | 'saturation'

export interface CreateTimelineRequest {
  drama_id: number
  episode_id?: number
  name: string
  description?: string
  fps?: number
  resolution?: string
}

export interface UpdateTimelineRequest {
  name?: string
  description?: string
  fps?: number
  resolution?: string
  status?: TimelineStatus
}

export interface CreateTrackRequest {
  name: string
  type: TrackType
  order?: number
  volume?: number
}

export interface UpdateTrackRequest {
  name?: string
  order?: number
  is_locked?: boolean
  is_muted?: boolean
  volume?: number
}

export interface CreateClipRequest {
  track_id: number
  asset_id?: number
  scene_id?: string
  name?: string
  start_time: number
  duration: number
  trim_start?: number
  trim_end?: number
  speed?: number
  volume?: number
  fade_in?: number
  fade_out?: number
}

export interface UpdateClipRequest {
  name?: string
  start_time?: number
  duration?: number
  trim_start?: number
  trim_end?: number
  speed?: number
  volume?: number
  is_muted?: boolean
  fade_in?: number
  fade_out?: number
}

export interface CreateTransitionRequest {
  type: TransitionType
  duration: number
  easing?: string
  config?: Record<string, any>
}

export const TRANSITION_TYPES = [
  { label: '淡入淡出', value: 'fade' },
  { label: '交叉淡化', value: 'crossfade' },
  { label: '滑动', value: 'slide' },
  { label: '擦除', value: 'wipe' },
  { label: '缩放', value: 'zoom' },
  { label: '溶解', value: 'dissolve' }
]

export const EFFECT_TYPES = [
  { label: '滤镜', value: 'filter' },
  { label: '色彩', value: 'color' },
  { label: '模糊', value: 'blur' },
  { label: '亮度', value: 'brightness' },
  { label: '对比度', value: 'contrast' },
  { label: '饱和度', value: 'saturation' }
]
