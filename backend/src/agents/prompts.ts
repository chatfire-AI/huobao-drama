/**
 * Agent prompt 文件加载 — workspace/prompts/<agent_type>.md
 * 文件格式（参照 SKILL.md 惯例）：
 *   ---
 *   name: 分镜拆解
 *   model: ""        # 可选，覆盖文本模型；空 = 用 AI 服务默认
 *   ---
 *   <系统提示词正文>
 * 文件即唯一事实来源；文件缺失时由调用方回退到代码默认值。
 */
import { skillsManagerWorkspace } from './skills.js'

export interface AgentPromptFile {
  name: string
  model: string
  instructions: string
}

const fsm = () => skillsManagerWorkspace.filesystem!
/** prompt 文件路径；lang 为 en/ja/ko 时返回语言变体（<type>.<lang>.md），zh/空为基础版 */
export const promptFilePath = (agentType: string, lang?: string | null) =>
  `prompts/${agentType}${lang && lang !== 'zh' ? `.${lang}` : ''}.md`

/** 解析 prompt 文件（frontmatter 仅支持 name/model 两个标量字段，无需 yaml 依赖） */
export function parsePromptFile(raw: string): AgentPromptFile {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  let name = ''
  let model = ''
  let body = raw
  if (fmMatch) {
    const fm = fmMatch[1]
    const get = (key: string) => {
      const m = fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?\\s*$`, 'm'))
      return (m?.[1] || '').trim()
    }
    name = get('name')
    model = get('model')
    body = raw.slice(fmMatch[0].length)
  }
  return { name, model, instructions: body.trim() }
}

/** 序列化为 prompt 文件内容（供保存接口使用） */
export function serializePromptFile(file: AgentPromptFile): string {
  return `---\nname: ${file.name}\nmodel: "${file.model}"\n---\n\n${file.instructions.trim()}\n`
}

/** 读取指定路径的 prompt 文件；文件不存在或解析失败返回 null */
async function readPromptFile(path: string): Promise<AgentPromptFile | null> {
  try {
    if (!await fsm().exists(path)) return null
    const raw = String(await fsm().readFile(path, { encoding: 'utf-8' }))
    const parsed = parsePromptFile(raw)
    return parsed.instructions ? parsed : null
  } catch {
    return null
  }
}

/** 读取基础版（中文）prompt 文件 — model 字段永远只从基础版解析，避免多语言文件漂移 */
export function loadBasePromptFile(agentType: string): Promise<AgentPromptFile | null> {
  return readPromptFile(promptFilePath(agentType))
}

/**
 * 读取 Agent 的 prompt 文件；lang 非 zh 时优先语言变体（<type>.<lang>.md），缺失回退基础版。
 * 变体的 model 字段无效：返回时 model 始终取基础版的值。
 */
export async function loadAgentPromptFile(agentType: string, lang?: string | null): Promise<AgentPromptFile | null> {
  const base = await loadBasePromptFile(agentType)
  if (!lang || lang === 'zh') return base
  const localized = await readPromptFile(promptFilePath(agentType, lang))
  if (!localized) return base
  return { ...localized, model: base?.model || '' }
}
