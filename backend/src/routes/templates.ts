/**
 * 制作模板（制作模式）API
 * - GET /templates        列出模板（新建项目时选择）
 * - GET /templates/:id    模板详情
 * - GET /templates/:id/preview?agent=  预览该模板下某 Agent 的装配结果（系统提示词全文）
 */
import { Hono } from 'hono'
import { success, notFound, badRequest } from '../utils/response.js'
import { listTemplates, getTemplate, DEFAULT_WORKFLOW, WORKFLOW_STAGE_IDS, updateTemplate, restoreTemplate } from '../services/templates.js'
import { assembleInstructions, validAgentTypes } from '../agents/index.js'

const app = new Hono()

app.get('/', (c) => success(c, listTemplates()))

app.get('/:id/preview', async (c) => {
  const template = getTemplate(c.req.param('id'))
  if (!template) return notFound(c)
  const agentType = c.req.query('agent') || 'script_rewriter'
  if (!validAgentTypes.includes(agentType)) return badRequest(c, `无效的 Agent 类型：${agentType}`)
  const stage = c.req.query('stage') || undefined
  if (stage && !WORKFLOW_STAGE_IDS.includes(stage as never)) return badRequest(c, `无效的阶段：${stage}`)
  const assembled = await assembleInstructions(agentType, template.id, stage, c.req.query('lang'))
  return success(c, {
    template: template.id,
    template_name: template.name,
    agent: agentType,
    stage: stage || null,
    schema_version: template.schema_version || 1,
    skill_source: assembled.skillSource,
    template_skills: assembled.templateSkills,
    missing_skills: assembled.missingSkills,
    runtime: stage ? template.stage_runtime?.[stage] || null : null,
    sizes: assembled.sizes,
    estimated_tokens: Math.ceil(assembled.sizes.total / 1.8),
    length: assembled.instructions.length,
    system_prompt: assembled.instructions,
  })
})

app.get('/:id/workflow', (c) => {
  const template = getTemplate(c.req.param('id'))
  if (!template) return notFound(c)
  return success(c, {
    template_id: template.id,
    source: template.workflow ? 'template' : 'default',
    workflow: template.workflow || DEFAULT_WORKFLOW,
  })
})

// PUT /templates/:id — 保存模板规范/参数（自动备份 + 版本递增）
app.put('/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  try {
    const updated = updateTemplate(c.req.param('id'), {
      agent_prompts: body.agent_prompts,
      stage_runtime: body.stage_runtime,
      agent_skills: body.agent_skills,
      description: body.description,
    })
    return success(c, updated)
  } catch (err: any) {
    return badRequest(c, err?.message || '保存模板失败')
  }
})

// POST /templates/:id/restore — 恢复为首次保存前的默认备份
app.post('/:id/restore', (c) => {
  try {
    return success(c, restoreTemplate(c.req.param('id')))
  } catch (err: any) {
    return badRequest(c, err?.message || '恢复模板失败')
  }
})

app.get('/:id', (c) => {
  const template = getTemplate(c.req.param('id'))
  return template ? success(c, template) : notFound(c)
})

export default app
