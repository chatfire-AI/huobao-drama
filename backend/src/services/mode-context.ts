/**
 * 制作模式上下文解析（生产级唯一入口）
 *
 * 关联链：项目 → 模式快照 → 阶段 → Agent → 预设 → 技能 → 参数
 * 兼容策略：
 * - 无模板/旧项目：返回默认流程与空模板，行为与改造前一致
 * - 快照损坏：告警并回退实时模板
 * - 模板缺失：回退默认流程
 * 只读，不写库、不触发 Agent。
 */
import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { getTemplate, getEnabledSkills, DEFAULT_WORKFLOW, type ProductionTemplate, type WorkflowDefinition } from './templates.js'
import { logTaskWarn } from '../utils/task-logger.js'

export interface ModeContext {
  dramaId: number
  modeId: string | null
  modeVersion: string | null
  manifestHash: string | null
  source: 'snapshot' | 'template' | 'default'
  template: ProductionTemplate | null
  workflow: WorkflowDefinition
  stage: string | null
  agent: string | null
  presetKey: string | null
  skills: string[]
  runtime: { temperature?: number; maxSteps?: number } | null
}

export function hashTemplate(template: ProductionTemplate | null): string | null {
  if (!template) return null
  try {
    return crypto.createHash('sha1').update(JSON.stringify(template)).digest('hex')
  } catch {
    return null
  }
}

function parseSnapshot(raw: unknown): ProductionTemplate | null {
  if (!raw) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.id || !parsed.name) return null
    return parsed as ProductionTemplate
  } catch {
    return null
  }
}

export async function resolveModeContext(
  dramaId?: number | null,
  opts: { stage?: string | null; agentType?: string | null } = {},
): Promise<ModeContext> {
  const stage = opts.stage || null
  const agentType = opts.agentType || null
  const ctx: ModeContext = {
    dramaId: dramaId || 0,
    modeId: null,
    modeVersion: null,
    manifestHash: null,
    source: 'default',
    template: null,
    workflow: DEFAULT_WORKFLOW,
    stage,
    agent: null,
    presetKey: null,
    skills: [],
    runtime: null,
  }
  if (!dramaId) return ctx

  let drama: typeof schema.dramas.$inferSelect | undefined
  try {
    ;[drama] = await db.select().from(schema.dramas).where(eq(schema.dramas.id, dramaId))
  } catch (err: any) {
    logTaskWarn('ModeContext', 'drama-query-failed', { dramaId, error: err?.message })
    return ctx
  }
  if (!drama) return ctx

  let template: ProductionTemplate | null = null
  let source: ModeContext['source'] = 'default'

  const snapshot = parseSnapshot((drama as any).templateSnapshot)
  if (snapshot) {
    template = snapshot
    source = 'snapshot'
  } else if ((drama as any).templateSnapshot) {
    logTaskWarn('ModeContext', 'snapshot-invalid', { dramaId, templateId: drama.templateId })
  }

  if (!template && drama.templateId) {
    template = getTemplate(String(drama.templateId))
    if (template) source = 'template'
    else logTaskWarn('ModeContext', 'template-missing', { dramaId, templateId: drama.templateId })
  }

  if (template) {
    ctx.template = template
    ctx.modeId = template.id
    ctx.modeVersion = template.version
    ctx.manifestHash = hashTemplate(template)
    ctx.source = source
    ctx.workflow = template.workflow || DEFAULT_WORKFLOW
  }

  if (stage) {
    const stageDef = ctx.workflow.stages.find(s => s.id === stage)
    ctx.agent = stageDef?.agent || agentType || null
    const presetKey = template && stage && template.agent_prompts?.[stage] ? stage : agentType
    ctx.presetKey = presetKey || null
    if (template && presetKey) {
      ctx.skills = getEnabledSkills(template, presetKey)
    }
    ctx.runtime = template?.stage_runtime?.[stage] || null
  }

  return ctx
}
