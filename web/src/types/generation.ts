export interface GenerateCharactersRequest {
  drama_id: string
  episode_id?: number
  outline?: string
  count?: number
  temperature?: number
  model?: string  // 指定使用的文本模型
}

export interface ParseScriptRequest {
  drama_id: string
  script_content: string
  auto_split?: boolean
}

export interface ParseScriptResult {
  episodes: ParsedEpisode[]
  characters: ParsedCharacter[]
  summary: string
}

export interface ParsedCharacter {
  name: string
  role: string
  description: string
  personality: string
}

export interface ParsedEpisode {
  episode_number: number
  title: string
  description: string
  script_content: string
  duration: number
  chapter_start?: number
  chapter_end?: number
  start_marker?: string
  end_marker?: string
  scenes?: any[]
}
