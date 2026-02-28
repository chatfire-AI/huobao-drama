/**
 * AI Provider 配置常量与工具函数
 * 厂商和模型数据从后端 /api/v1/ai-providers 获取
 */
import type { AIServiceType, AIServiceProvider } from '@/types/ai'

export interface ProviderGroup {
  key: string
  name: string
  ids: string[]  // 该分组包含的 provider id 列表
}

/** Provider 分组映射（合并同一厂商不同 provider id） */
export const PROVIDER_GROUPS: ProviderGroup[] = [
  { key: 'chatfire', name: 'Chatfire', ids: ['chatfire'] },
  { key: 'gemini', name: 'Google Gemini', ids: ['gemini', 'google'] },
  { key: 'openai', name: 'OpenAI', ids: ['openai'] },
  { key: 'volcengine', name: '火山引擎', ids: ['volcengine', 'volces'] },
  { key: 'minimax', name: 'MiniMax 海螺', ids: ['minimax'] },
  { key: 'vidu', name: '生数科技 Vidu', ids: ['vidu'] },
  { key: 'openrouter', name: 'OpenRouter', ids: ['openrouter'] },
  { key: 'fal', name: 'FAL', ids: ['fal'] },
  { key: 'qwen', name: '阿里百炼', ids: ['qwen'] },
]

/**
 * 从后端 provider 列表构建每个 group 的预设模型
 * 返回 Record<groupKey, Record<serviceType, string[]>>
 */
export function buildPresetModels(
  providers: AIServiceProvider[]
): Record<string, Record<AIServiceType, string[]>> {
  const result: Record<string, Record<AIServiceType, string[]>> = {}

  for (const group of PROVIDER_GROUPS) {
    const presetModels: Record<AIServiceType, string[]> = { text: [], image: [], video: [], audio: [], lipsync: [] }
    const types: AIServiceType[] = ['text', 'image', 'video', 'audio', 'lipsync']

    for (const t of types) {
      const models = new Set<string>()
      const matchingProviders = providers.filter(
        p => p.service_type === t && group.ids.includes(p.provider)
      )
      for (const p of matchingProviders) {
        if (p.preset_models) {
          for (const m of p.preset_models) models.add(m)
        }
      }
      presetModels[t] = Array.from(models)
    }

    result[group.key] = presetModels
  }

  return result
}

/**
 * 根据 provider id 查找所属的 group key
 */
export function getGroupKeyForProvider(providerId: string): string | undefined {
  for (const group of PROVIDER_GROUPS) {
    if (group.ids.includes(providerId)) return group.key
  }
  return undefined
}
