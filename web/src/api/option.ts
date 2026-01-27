import request from '@/utils/request'

export interface VisualOptions {
  ShotTypes: string[]
  Angles: string[]
  Movements: string[]
  VisualEffects: string[]
}

export const optionAPI = {
  getVisualOptions() {
    return request.get<VisualOptions>('/options/visual')
  }
}
