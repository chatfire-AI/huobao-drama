/**
 * Agent 请求上下文 — 通过 Mastra RequestContext 按请求注入
 * 路由层 build → generate({ requestContext }) → 工具 execute 内读取
 */
import { RequestContext } from '@mastra/core/request-context'
import { getContentLanguage, type applyBannedWords, type ContentLanguage } from '../services/app-settings.js'

export interface ScriptRewriteState {
  source?: { id: number; dramaId: number; content: string | null; scriptContent: string | null }
  draft?: { text: string; replaced: ReturnType<typeof applyBannedWords>['replaced'] }
}

export interface AgentRequestContextValues {
  episodeId: number
  dramaId: number
  modelOverride?: string
  textConfigId?: number
  scriptRewrite?: ScriptRewriteState
  /** AI 内容语言；缺省时读全局设置（app_settings.content_language） */
  language?: ContentLanguage
}

export function buildAgentRequestContext(values: AgentRequestContextValues): RequestContext<AgentRequestContextValues> {
  const rc = new RequestContext<AgentRequestContextValues>()
  rc.set('episodeId', values.episodeId)
  rc.set('dramaId', values.dramaId)
  if (values.modelOverride) rc.set('modelOverride', values.modelOverride)
  if (values.textConfigId) rc.set('textConfigId', values.textConfigId)
  if (values.scriptRewrite) rc.set('scriptRewrite', values.scriptRewrite)
  // 语言在构建处统一解析：4 条链路（chat/提取/图片提示词/视频提示词）都经过这里，
  // 全局设置一处生效；显式传入 values.language 可按请求覆盖
  rc.set('language', values.language ?? getContentLanguage())
  return rc
}

export function getEpisodeId(requestContext: RequestContext | undefined): number | null {
  const v = requestContext?.get('episodeId' as never)
  return typeof v === 'number' ? v : null
}

export function getDramaId(requestContext: RequestContext | undefined): number | null {
  const v = requestContext?.get('dramaId' as never)
  return typeof v === 'number' ? v : null
}

export function getScriptRewriteState(requestContext: RequestContext | undefined) {
  return requestContext?.get('scriptRewrite' as never) as ScriptRewriteState | undefined
}

/** 读取请求上下文中的内容语言；未设置返回 null（调用方按 zh 处理） */
export function getContentLanguageFromRC(requestContext: RequestContext | undefined): ContentLanguage | null {
  const v = requestContext?.get('language' as never)
  return typeof v === 'string' && v ? (v as ContentLanguage) : null
}
