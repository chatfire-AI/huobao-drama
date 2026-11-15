/**
 * 厂商图标 — 双主题本地托管（app/public/icons/{light,dark}/，源自 chatfire-gateway）
 * resolvedTheme 是模块级 computed，模板中调用本函数会随主题切换响应式更新
 */
import { resolvedTheme } from '~/composables/useTheme'

const FILENAMES: Record<string, string> = {
  openai: 'openai.png',
  gemini: 'gemini-color.png',
  volcengine: 'volcengine-color.png',
  minimax: 'minimax-color.png',
  claude: 'claude-color.png',
  deepseek: 'deepseek-color.png',
  doubao: 'doubao-color.png',
  moonshot: 'kimi-color.png',
  qwen: 'qwen-color.png',
  aliyun: 'qwen-color.png',  // 阿里云 Wan 系列与 Qwen 同属阿里，共用图标
  zhipu: 'zhipu-color.png',
  xai: 'grok.png',
  xiaomi: 'xiaomi-color.png',
  vidu: 'vidu-color.png',
  ollama: 'ollama.png',
  midjourney: 'midjourney.png',
}

/** provider → 当前主题下的图标 URL；未知厂商返回 undefined（调用方回退字母徽标） */
export function providerIconUrl(provider?: string | null): string | undefined {
  const file = FILENAMES[(provider || '').toLowerCase()]
  return file ? `/icons/${resolvedTheme.value}/${file}` : undefined
}

/**
 * 模型名 → 厂商推断（按优先级从上到下，命中即返回）。
 * 场景：配置走 openai 兼容网关（provider=openai）但模型实为 deepseek/gemini 等，
 * 此时图标应按模型名而非 provider 展示。
 * 不含 doubao/seedance：它们由 volcengine 服务，provider 图标更准确。
 */
const MODEL_PROVIDER_HINTS: [RegExp, string][] = [
  [/deepseek/i, 'deepseek'],
  [/claude/i, 'claude'],
  [/gemini/i, 'gemini'],
  [/kimi|moonshot/i, 'moonshot'],
  [/qwen|^wan[\d.-]/i, 'qwen'],
  [/glm|zhipu|chatglm/i, 'zhipu'],
  [/grok/i, 'xai'],
  [/^(gpt|chatgpt|o[1-9])/i, 'openai'],
]

/** 模型感知的图标：模型名可识别厂商时优先，否则回退 provider */
export function modelIconUrl(provider?: string | null, model?: string | null): string | undefined {
  const m = model || ''
  for (const [re, p] of MODEL_PROVIDER_HINTS) {
    if (re.test(m)) return providerIconUrl(p)
  }
  return providerIconUrl(provider)
}
