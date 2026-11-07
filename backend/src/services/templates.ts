/**
 * 制作模板（制作模式）— workspace/templates/<id>/template.json
 *
 * 模板只决定「每个阶段用哪套专业规范 + 加载哪些技能」，不改变流水线阶段顺序，
 * 也不参与视觉风格：图片画风始终由项目的 dramas.style（硬约束）决定。
 * 未选模板/旧项目返回 null，保持原有行为。
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKSPACE_DIR = process.env.WORKSPACE_PATH
  ? path.resolve(process.env.WORKSPACE_PATH)
  : path.resolve(__dirname, '../../workspace')
const TEMPLATES_DIR = path.join(WORKSPACE_DIR, 'templates')

export interface SkillRef {
  id: string
  /** 默认 true；false 表示该模式不加载这套技能 */
  enabled?: boolean
}

export type SkillPolicyStage = 'script' | 'extract' | 'storyboard' | 'video_prompt' | 'image'
export const SKILL_POLICY_STAGES: readonly SkillPolicyStage[] = ['script', 'extract', 'storyboard', 'video_prompt', 'image']

export interface SkillPolicySpecialist {
  id: string
  /** 条件标记；未命中时不加载。P0 先保留字段，P1 接内容标记 */
  when?: string
}

export interface SkillPolicyEntry {
  /** 岗位专属手艺；每个阶段必须有 */
  craft?: string[]
  /** 跨岗位共性底线；可选 */
  shared?: string[]
  /** 当前模板的模式差异包 */
  mode?: string[]
  /** 条件专项包 */
  specialists?: SkillPolicySpecialist[]
  /** auto 表示按当前视频服务商解析；P0 只保留标记 */
  provider?: string
}

export type SkillPolicy = Partial<Record<SkillPolicyStage, SkillPolicyEntry>>

export type SkillLayer = 'craft' | 'shared' | 'mode' | 'specialist' | 'provider' | 'template'

export interface ResolvedSkill {
  id: string
  layer: SkillLayer
}

export interface SkillSelection {
  source: 'policy' | 'legacy'
  stage: string | null
  skills: ResolvedSkill[]
  legacySkillIds: string[]
}

export type SkillSelectionMode = 'auto' | 'policy' | 'legacy'

export interface ProductionTemplate {
  id: string
  name: string
  version: string
  /** manifest 结构版本；1 = 旧 agent_skills，2 = skill_policy */
  schema_version?: number
  description?: string
  /** 列表展示顺序（越小越靠前） */
  sort?: number
  /** 每个 Agent 的模板专属规范，追加到系统提示词 */
  agent_prompts?: Record<string, string>
  /** 兼容旧格式：每个 Agent 的技能套件 */
  agent_skills?: Record<string, SkillRef[]>
  /** 新格式：按阶段声明 craft/mode/specialist/provider */
  skill_policy?: SkillPolicy
  /** 固化流程：阶段顺序、开关与确认点；缺失时回退默认流程 */
  workflow?: WorkflowDefinition
  /** 阶段运行参数：temperature / maxSteps；未配置回退全局 */
  stage_runtime?: Record<string, { temperature?: number; maxSteps?: number }>
}

// ─── 工作流契约 v1 ─────────────────────────────────────

export type WorkflowStageId = 'script' | 'extract' | 'storyboard' | 'video_prompt' | 'image' | 'video' | 'merge'
export type WorkflowServiceId = 'image_generation' | 'video_generation' | 'merge'

export interface WorkflowStage {
  id: WorkflowStageId
  label: string
  /** Agent 阶段必填；服务阶段留空 */
  agent?: string
  /** 服务阶段必填；Agent 阶段留空 */
  service?: WorkflowServiceId
  /** 是否属于必经阶段（默认 true） */
  required?: boolean
  /** 完成后是否需要人工确认（默认 false） */
  confirm?: boolean
  /** extract 阶段的任务拆分 */
  tasks?: string[]
}

export interface WorkflowDefinition {
  version: number
  stages: WorkflowStage[]
}

const STAGE_IDS: readonly WorkflowStageId[] = ['script', 'extract', 'storyboard', 'video_prompt', 'image', 'video', 'merge']
export const WORKFLOW_STAGE_IDS = STAGE_IDS
const AGENT_IDS = ['script_rewriter', 'extractor', 'storyboard_breaker', 'prompt_generator']
const SERVICE_IDS: readonly WorkflowServiceId[] = ['image_generation', 'video_generation', 'merge']
const EXTRACT_TASKS = ['characters', 'scenes', 'props']

const STAGE_LABELS: Record<WorkflowStageId, string> = {
  script: '剧本',
  extract: '资产制作',
  storyboard: '分镜拆解',
  video_prompt: '视频提示词',
  image: '图片生成',
  video: '视频生成',
  merge: '拼接导出',
}

/** 默认流程 = 现有固定流水线；未选模板的旧项目走这里，行为与改造前一致 */
export const DEFAULT_WORKFLOW: WorkflowDefinition = {
  version: 1,
  stages: [
    { id: 'script', label: STAGE_LABELS.script, agent: 'script_rewriter', required: true, confirm: true },
    { id: 'extract', label: STAGE_LABELS.extract, agent: 'extractor', required: true, tasks: ['characters', 'scenes', 'props'] },
    { id: 'storyboard', label: STAGE_LABELS.storyboard, agent: 'storyboard_breaker', required: true, confirm: true },
    { id: 'video_prompt', label: STAGE_LABELS.video_prompt, agent: 'prompt_generator', required: true },
    { id: 'image', label: STAGE_LABELS.image, service: 'image_generation', required: true },
    { id: 'video', label: STAGE_LABELS.video, service: 'video_generation', required: true },
    { id: 'merge', label: STAGE_LABELS.merge, service: 'merge', required: true },
  ],
}

/** 校验并归一化模板工作流；非法配置返回 null（调用方回退默认流程，不阻断模板其余能力） */
export function normalizeWorkflow(raw: any): WorkflowDefinition | null {
  if (!raw || typeof raw !== 'object') return null
  const version = Number(raw.version ?? 1)
  if (version !== 1) return null
  if (!Array.isArray(raw.stages) || !raw.stages.length) return null

  const seen = new Set<string>()
  const stages: WorkflowStage[] = []
  for (const item of raw.stages) {
    if (!item || typeof item !== 'object') return null
    const id = String(item.id || '') as WorkflowStageId
    if (!STAGE_IDS.includes(id) || seen.has(id)) return null
    seen.add(id)

    const agent = item.agent ? String(item.agent) : undefined
    const service = item.service ? String(item.service) as WorkflowServiceId : undefined
    if (!agent && !service) return null
    if (agent && !AGENT_IDS.includes(agent)) return null
    if (service && !SERVICE_IDS.includes(service)) return null

    let tasks: string[] | undefined
    if (id === 'extract') {
      const rawTasks = Array.isArray(item.tasks) ? item.tasks.map(String) : EXTRACT_TASKS
      if (!rawTasks.length || rawTasks.some((t: string) => !EXTRACT_TASKS.includes(t))) return null
      tasks = rawTasks
    }

    stages.push({
      id,
      label: item.label ? String(item.label) : STAGE_LABELS[id],
      agent,
      service,
      required: item.required !== false,
      confirm: item.confirm === true,
      tasks,
    })
  }
  return { version, stages }
}

/** 校验阶段运行参数；非法项丢弃，不阻断模板其余能力 */
export function normalizeStageRuntime(raw: any): Record<string, { temperature?: number; maxSteps?: number }> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const result: Record<string, { temperature?: number; maxSteps?: number }> = {}
  for (const [stage, value] of Object.entries(raw)) {
    if (!STAGE_IDS.includes(stage as WorkflowStageId) || !value || typeof value !== 'object') continue
    const entry: { temperature?: number; maxSteps?: number } = {}
    const temperature = Number((value as any).temperature)
    if (Number.isFinite(temperature) && temperature >= 0 && temperature <= 2) entry.temperature = temperature
    const maxSteps = Number((value as any).maxSteps)
    if (Number.isInteger(maxSteps) && maxSteps >= 1 && maxSteps <= 50) entry.maxSteps = maxSteps
    if (Object.keys(entry).length) result[stage] = entry
  }
  return Object.keys(result).length ? result : undefined
}

/** 读取项目在指定阶段的运行参数（模板未配置返回 null） */
export async function getDramaStageRuntime(
  dramaId?: number | null,
  stage?: string | null,
): Promise<{ temperature?: number; maxSteps?: number } | null> {
  if (!dramaId || !stage) return null
  const template = await getDramaTemplate(dramaId)
  return template?.stage_runtime?.[stage] || null
}

/** 读取项目在指定阶段应使用的 Agent；未配置返回 fallback（执行层按 workflow 选 Agent） */
export async function getStageAgent(
  dramaId?: number | null,
  stage?: string | null,
  fallback?: string | null,
): Promise<string | null> {
  if (!dramaId || !stage) return fallback || null
  const { workflow } = await getDramaWorkflow(dramaId)
  const stageDef = workflow.stages.find(s => s.id === stage)
  return stageDef?.agent || fallback || null
}

/** 读取项目生效的工作流：模板自定义优先，否则默认流程 */
export async function getDramaWorkflow(dramaId?: number | null): Promise<{
  workflow: WorkflowDefinition
  templateId: string | null
  templateName: string | null
  source: 'template' | 'default'
}> {
  const template = await getDramaTemplate(dramaId)
  if (template?.workflow) {
    return { workflow: template.workflow, templateId: template.id, templateName: template.name, source: 'template' }
  }
  return { workflow: DEFAULT_WORKFLOW, templateId: template?.id || null, templateName: template?.name || null, source: 'default' }
}

/** 归一化技能引用：兼容旧格式 string[] 与新格式 {id,enabled}[] */
export function normalizeAgentSkills(raw: any): Record<string, SkillRef[]> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Record<string, SkillRef[]> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue
    const refs: SkillRef[] = []
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) refs.push({ id: item.trim(), enabled: true })
      else if (item && typeof item === 'object' && typeof (item as any).id === 'string' && (item as any).id.trim()) {
        refs.push({ id: (item as any).id.trim(), enabled: (item as any).enabled !== false })
      }
    }
    if (refs.length) out[key] = refs
  }
  return Object.keys(out).length ? out : undefined
}

/** 取某 Agent 当前启用的技能目录（兼容快照中的旧格式 string[]） */
export function getEnabledSkills(template: ProductionTemplate | null | undefined, key: string): string[] {
  const refs = template?.agent_skills?.[key] as any[] | undefined
  if (!Array.isArray(refs)) return []
  return refs
    .filter(ref => typeof ref === 'string' || ref?.enabled !== false)
    .map(ref => typeof ref === 'string' ? ref : ref?.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
}

const SKILL_ID_RE = /^[a-z0-9][a-z0-9._/-]*$/i

function normalizeSkillId(raw: any): string | null {
  if (typeof raw !== 'string') return null
  const id = raw.trim().replace(/^skills\//, '').replace(/^\/+|\/+$/g, '')
  if (!id || id.includes('..') || !SKILL_ID_RE.test(id)) return null
  return id
}

function normalizeSkillIdList(raw: any): string[] {
  if (raw === undefined || raw === null) return []
  const list = Array.isArray(raw) ? raw : [raw]
  const out: string[] = []
  for (const item of list) {
    const id = normalizeSkillId(item)
    if (id && !out.includes(id)) out.push(id)
  }
  return out
}

/** 归一化 skill_policy：非法 ID/阶段直接丢弃，不阻断模板其余能力 */
export function normalizeSkillPolicy(raw: any): SkillPolicy | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: SkillPolicy = {}
  for (const stage of SKILL_POLICY_STAGES) {
    const entry = (raw as any)[stage]
    if (!entry || typeof entry !== 'object') continue
    const craft = normalizeSkillIdList(entry.craft)
    const shared = normalizeSkillIdList(entry.shared)
    const mode = normalizeSkillIdList(entry.mode)
    const specialists: SkillPolicySpecialist[] = []
    if (Array.isArray(entry.specialists)) {
      for (const item of entry.specialists) {
        if (typeof item === 'string') {
          const id = normalizeSkillId(item)
          if (id) specialists.push({ id })
        } else if (item && typeof item === 'object') {
          const id = normalizeSkillId(item.id)
          if (!id) continue
          const when = typeof item.when === 'string' && item.when.trim() ? item.when.trim() : undefined
          specialists.push({ id, ...(when ? { when } : {}) })
        }
      }
    }
    const provider = entry.provider === 'auto'
      ? 'auto'
      : normalizeSkillId(entry.provider) || undefined
    if (!craft.length && !shared.length && !mode.length && !specialists.length && !provider) continue
    out[stage] = {
      ...(craft.length ? { craft } : {}),
      ...(shared.length ? { shared } : {}),
      ...(mode.length ? { mode } : {}),
      ...(specialists.length ? { specialists } : {}),
      ...(provider ? { provider } : {}),
    }
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * 解析某模板/阶段应装载的技能。
 * - 有 skill_policy 且至少包含一个 craft：走 policy
 * - 否则回退旧 agent_skills
 * - 条件专项只有 when 为空或命中 flags 时才装载
 */
export function resolveSkillSelection(
  template: ProductionTemplate | null | undefined,
  stage: string | null | undefined,
  agentType: string,
  flags: string[] = [],
  mode: SkillSelectionMode = 'auto',
): SkillSelection {
  const skillKey = stage && template?.agent_skills?.[stage] ? stage : agentType
  const legacySkillIds = getEnabledSkills(template, skillKey)
  const policyStage = stage && SKILL_POLICY_STAGES.includes(stage as SkillPolicyStage)
    ? stage as SkillPolicyStage
    : null
  const policy = mode === 'legacy'
    ? undefined
    : policyStage ? template?.skill_policy?.[policyStage] : undefined

  if (!policy) {
    return {
      source: 'legacy',
      stage: stage || null,
      skills: legacySkillIds.map(id => ({ id, layer: 'template' as const })),
      legacySkillIds,
    }
  }

  const skills: ResolvedSkill[] = []
  const seen = new Set<string>()
  const add = (id: string, layer: SkillLayer) => {
    if (!id || seen.has(id)) return
    seen.add(id)
    skills.push({ id, layer })
  }

  for (const id of policy.craft || []) add(id, 'craft')
  for (const id of policy.shared || []) add(id, 'shared')
  for (const id of policy.mode || []) add(id, 'mode')
  for (const specialist of policy.specialists || []) {
    if (specialist.when && !flags.includes(specialist.when)) continue
    add(specialist.id, 'specialist')
  }
  if (policy.provider && policy.provider !== 'auto') add(policy.provider, 'provider')

  // 每个阶段必须有岗位专属手艺；缺失视为配置不完整，回退旧格式
  if (!skills.some(skill => skill.layer === 'craft')) {
    return {
      source: 'legacy',
      stage: stage || null,
      skills: legacySkillIds.map(id => ({ id, layer: 'template' as const })),
      legacySkillIds,
    }
  }

  return { source: 'policy', stage: stage || null, skills, legacySkillIds }
}

function safeReadTemplate(dir: string): ProductionTemplate | null {
  const file = path.join(dir, 'template.json')
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.id || !parsed.name) return null
    return {
      id: String(parsed.id),
      name: String(parsed.name),
      version: String(parsed.version || '1.0.0'),
      schema_version: Number.isFinite(Number(parsed.schema_version)) ? Number(parsed.schema_version) : 1,
      description: parsed.description ? String(parsed.description) : undefined,
      sort: Number.isFinite(Number(parsed.sort)) ? Number(parsed.sort) : undefined,
      agent_prompts: parsed.agent_prompts && typeof parsed.agent_prompts === 'object' ? parsed.agent_prompts : undefined,
      agent_skills: normalizeAgentSkills(parsed.agent_skills),
      skill_policy: normalizeSkillPolicy(parsed.skill_policy),
      workflow: normalizeWorkflow(parsed.workflow) ?? undefined,
      stage_runtime: normalizeStageRuntime(parsed.stage_runtime),
    }
  } catch {
    return null
  }
}

/** 列出所有可用模板（目录下含合法 template.json 的） */
export function listTemplates(): ProductionTemplate[] {
  let entries: fs.Dirent[] = []
  try {
    entries = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
  } catch {
    return []
  }
  const templates: ProductionTemplate[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const tpl = safeReadTemplate(path.join(TEMPLATES_DIR, entry.name))
    if (tpl) templates.push(tpl)
  }
  return templates.sort((a, b) =>
    (a.sort ?? 999) - (b.sort ?? 999) || a.name.localeCompare(b.name, 'zh-CN'))
}

/** 按 id 读取模板；不存在返回 null */
export function getTemplate(id?: string | null): ProductionTemplate | null {
  if (!id) return null
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) return null
  return safeReadTemplate(path.join(TEMPLATES_DIR, id))
}

/** 读取项目绑定的模板；旧项目（template_id 为空）返回 null，走默认行为 */
export async function getDramaTemplate(dramaId?: number | null): Promise<ProductionTemplate | null> {
  if (!dramaId) return null
  const [drama] = await db.select().from(schema.dramas).where(eq(schema.dramas.id, dramaId))
  return getTemplate(drama?.templateId ? String(drama.templateId) : null)
}

// ─── 模板编辑（P1：规范 + 参数 + 备份/恢复）────────────────

const PROMPT_KEYS = ['script_rewriter', 'extractor', 'storyboard_breaker', 'prompt_generator', 'image', 'video_prompt']
const RUNTIME_STAGES = ['script', 'extract', 'storyboard', 'video_prompt', 'image']
const BACKUP_DIR = path.join(TEMPLATES_DIR, '.backups')

function templateFilePath(id: string) {
  return path.join(TEMPLATES_DIR, id, 'template.json')
}

function bumpVersion(version: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version || '')
  if (!m) return '1.0.1'
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`
}

function backupTemplate(id: string, raw: string) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
    const defaultPath = path.join(BACKUP_DIR, `${id}-default.json`)
    if (!fs.existsSync(defaultPath)) fs.writeFileSync(defaultPath, raw, 'utf8')
    fs.writeFileSync(path.join(BACKUP_DIR, `${id}-${Date.now()}.json`), raw, 'utf8')
  } catch {
    // 备份失败不阻断保存；恢复功能会提示无备份
  }
}

function writeTemplateFile(id: string, data: any) {
  const file = templateFilePath(id)
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8')
  fs.renameSync(tmp, file)
}

export interface TemplatePatch {
  agent_prompts?: Record<string, string>
  stage_runtime?: Record<string, { temperature?: number; maxSteps?: number }>
  agent_skills?: Record<string, Array<string | SkillRef>>
  description?: string
}

/** 保存模板规范/参数；自动备份 + 小版本号递增；只允许改 agent_prompts / stage_runtime / description */
export function updateTemplate(id: string, patch: TemplatePatch): ProductionTemplate {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) throw new Error('非法的模板 id')
  const file = templateFilePath(id)
  if (!fs.existsSync(file)) throw new Error('模板不存在')

  const rawText = fs.readFileSync(file, 'utf8')
  let raw: any
  try { raw = JSON.parse(rawText) } catch { throw new Error('模板文件不是合法 JSON') }

  if (patch.agent_prompts !== undefined) {
    if (!patch.agent_prompts || typeof patch.agent_prompts !== 'object') throw new Error('agent_prompts 格式错误')
    const prompts: Record<string, string> = { ...(raw.agent_prompts || {}) }
    for (const [key, value] of Object.entries(patch.agent_prompts)) {
      if (!PROMPT_KEYS.includes(key)) throw new Error(`不支持的规范阶段：${key}`)
      if (typeof value !== 'string') throw new Error(`规范内容必须是文本：${key}`)
      if (value.length > 8000) throw new Error(`规范内容过长（上限 8000 字）：${key}`)
      const trimmed = value.trim()
      if (trimmed) prompts[key] = trimmed
      else delete prompts[key]
    }
    raw.agent_prompts = prompts
  }

  if (patch.stage_runtime !== undefined) {
    if (!patch.stage_runtime || typeof patch.stage_runtime !== 'object') throw new Error('stage_runtime 格式错误')
    const runtime: Record<string, { temperature?: number; maxSteps?: number }> = { ...(raw.stage_runtime || {}) }
    for (const [stage, value] of Object.entries(patch.stage_runtime)) {
      if (!RUNTIME_STAGES.includes(stage)) throw new Error(`不支持的阶段参数：${stage}`)
      if (value === null || value === undefined) { delete runtime[stage]; continue }
      if (typeof value !== 'object') throw new Error(`阶段参数格式错误：${stage}`)
      const entry: { temperature?: number; maxSteps?: number } = {}
      const temperature = Number((value as any).temperature)
      if (Number.isFinite(temperature)) {
        if (temperature < 0 || temperature > 2) throw new Error(`温度必须在 0~2：${stage}`)
        entry.temperature = temperature
      }
      const maxSteps = Number((value as any).maxSteps)
      if (Number.isFinite(maxSteps)) {
        if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 50) throw new Error(`maxSteps 必须是 1~50 的整数：${stage}`)
        entry.maxSteps = maxSteps
      }
      if (Object.keys(entry).length) runtime[stage] = entry
      else delete runtime[stage]
    }
    raw.stage_runtime = runtime
  }

  if (patch.agent_skills !== undefined) {
    if (!patch.agent_skills || typeof patch.agent_skills !== 'object') throw new Error('agent_skills 格式错误')
    const current = normalizeAgentSkills(raw.agent_skills) || {}
    for (const [key, refs] of Object.entries(patch.agent_skills)) {
      if (!Array.isArray(refs)) throw new Error(`agent_skills 必须是数组：${key}`)
      const normalized = normalizeAgentSkills({ [key]: refs })?.[key] || []
      if (normalized.length) current[key] = normalized
      else delete current[key]
    }
    raw.agent_skills = current
  }

  if (patch.description !== undefined) {
    if (typeof patch.description !== 'string') throw new Error('description 必须是文本')
    raw.description = patch.description.trim()
  }

  raw.version = bumpVersion(String(raw.version || '1.0.0'))
  backupTemplate(id, rawText)
  writeTemplateFile(id, raw)

  const updated = safeReadTemplate(path.dirname(file))
  if (!updated) throw new Error('保存后读取模板失败')
  return updated
}

/** 恢复为首次保存前的默认备份；当前内容会先自动备份 */
export function restoreTemplate(id: string): ProductionTemplate {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) throw new Error('非法的模板 id')
  const file = templateFilePath(id)
  if (!fs.existsSync(file)) throw new Error('模板不存在')
  const defaultPath = path.join(BACKUP_DIR, `${id}-default.json`)
  if (!fs.existsSync(defaultPath)) throw new Error('没有可用的默认备份')

  const currentText = fs.readFileSync(file, 'utf8')
  let current: any
  try { current = JSON.parse(currentText) } catch { throw new Error('当前模板文件不是合法 JSON') }
  let original: any
  try { original = JSON.parse(fs.readFileSync(defaultPath, 'utf8')) } catch { throw new Error('默认备份损坏') }

  backupTemplate(id, currentText)
  original.version = bumpVersion(String(current.version || '1.0.0'))
  writeTemplateFile(id, original)

  const restored = safeReadTemplate(path.dirname(file))
  if (!restored) throw new Error('恢复后读取模板失败')
  return restored
}
