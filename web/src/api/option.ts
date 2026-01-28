import request from '@/utils/request'

export interface Option {
  Label: string
  Value: string
}

export interface RatioConfig {
  Image: Option[]
  Video: Option[]
  Role: Option[]
  Prop: Option[]
}

export interface VisualOptions {
  ShotTypes: string[]
  Angles: string[]
  Movements: string[]
  VisualEffects: string[]
  Ratios: RatioConfig
  ImageSizes: Option[]
}

export const optionAPI = {
  getVisualOptions(lang?: string) {
    return request.get<VisualOptions>('/options/visual', { params: { lang } })
  }
}
