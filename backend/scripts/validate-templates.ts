/**
 * 8 套题材模板的可执行性校验（不调用外部模型、不写库）：
 * 1) workflow 结构合法且至少有 6 个阶段
 * 2) 每个阶段的 agent/service 存在
 * 3) 模板引用的技能目录真实存在
 * 4) 每个 Agent 在该模板/阶段下能装配出非空 instructions
 * 5) 6 阶段流程（无 video_prompt）依赖分镜产出 video_prompt —— 校验基础分镜提示词仍要求产出
 *
 * 运行：cd backend && npx tsx scripts/validate-templates.ts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { listTemplates, SKILL_POLICY_STAGES } from '../src/services/templates.js'
import { assembleInstructions } from '../src/agents/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKSPACE = path.resolve(__dirname, '../workspace')
const AGENTS = new Set(['script_rewriter', 'extractor', 'storyboard_breaker', 'prompt_generator'])
const SERVICES = new Set(['image_generation', 'video_generation', 'merge'])
const FALLBACK_STAGE_AGENT: Record<string, string> = {
  script: 'script_rewriter',
  extract: 'extractor',
  storyboard: 'storyboard_breaker',
  video_prompt: 'prompt_generator',
  image: 'prompt_generator',
}

async function main() {
  const storyboardPrompt = fs.readFileSync(path.join(WORKSPACE, 'prompts/storyboard_breaker.md'), 'utf8')
  const storyboardProducesVideoPrompt = /video_prompt/.test(storyboardPrompt)
  const rows: any[] = []
  let failed = 0

  for (const tpl of listTemplates()) {
    const issues: string[] = []
    const wf = tpl.workflow
    if (!wf) issues.push('无 workflow 定义')
    else {
      if (wf.stages.length < 6) issues.push(`阶段数过少：${wf.stages.length}`)
      for (const stage of wf.stages) {
        if (stage.agent && !AGENTS.has(stage.agent)) issues.push(`${stage.id}: 未知 Agent ${stage.agent}`)
        if (stage.service && !SERVICES.has(stage.service)) issues.push(`${stage.id}: 未知服务 ${stage.service}`)
        if (!stage.agent && !stage.service) issues.push(`${stage.id}: 缺 agent/service`)
      }
      const hasVideoPromptStage = wf.stages.some(s => s.id === 'video_prompt')
      if (!hasVideoPromptStage && !storyboardProducesVideoPrompt) {
        issues.push('6 阶段流程但分镜不产 video_prompt，视频生成会缺提示词')
      }
    }

    for (const [agentType, refs] of Object.entries(tpl.agent_skills || {})) {
      for (const ref of refs) {
        const dir = typeof ref === 'string' ? ref : ref?.id
        if (!dir) continue
        if (typeof ref !== 'string' && ref.enabled === false) continue
        const p = path.join(WORKSPACE, 'skills', dir, 'SKILL.md')
        if (!fs.existsSync(p)) issues.push(`技能缺失：${agentType} → ${dir}`)
      }
    }

    if (tpl.skill_policy) {
      if ((tpl.schema_version || 1) < 2) issues.push('存在 skill_policy 但 schema_version < 2')
      for (const [stage, entry] of Object.entries(tpl.skill_policy)) {
        if (!SKILL_POLICY_STAGES.includes(stage as any)) {
          issues.push(`skill_policy 未知阶段：${stage}`)
          continue
        }
        if (!entry.craft?.length) issues.push(`skill_policy ${stage}: 缺 craft`)
        const ids = [
          ...(entry.craft || []),
          ...(entry.shared || []),
          ...(entry.mode || []),
          ...(entry.specialists || []).map(s => s.id),
          ...(entry.provider && entry.provider !== 'auto' ? [entry.provider] : []),
        ]
        for (const id of ids) {
          const p = path.join(WORKSPACE, 'skills', id, 'SKILL.md')
          if (!fs.existsSync(p)) issues.push(`skill_policy 技能缺失：${stage} → ${id}`)
        }
      }
    }

    const stageByAgent: Record<string, string> = {}
    for (const stage of wf?.stages || []) {
      if (stage.agent) stageByAgent[stage.agent] = stage.id
    }
    for (const agentType of AGENTS) {
      const stage = stageByAgent[agentType]
        || Object.keys(FALLBACK_STAGE_AGENT).find(s => FALLBACK_STAGE_AGENT[s] === agentType)
      const assembled = await assembleInstructions(agentType, tpl.id, stage)
      if (!assembled.instructions || assembled.instructions.length < 300) {
        issues.push(`装配过短：${agentType}/${stage} (${assembled.instructions.length})`)
      }
    }

    // 每个声明了 skill_policy 的阶段都要实际装配一次（含 image 这类服务阶段）
    for (const stage of Object.keys(tpl.skill_policy || {})) {
      const agentType = FALLBACK_STAGE_AGENT[stage]
      if (!agentType) continue
      const assembled = await assembleInstructions(agentType, tpl.id, stage)
      if (!assembled.instructions || assembled.instructions.length < 300) {
        issues.push(`policy 装配过短：${stage} (${assembled.instructions.length})`)
      }
      if (assembled.missingSkills.length) {
        issues.push(`policy 技能缺失：${stage} → ${assembled.missingSkills.join(',')}`)
      }
      if (assembled.skillSource === 'legacy-fallback') {
        issues.push(`policy 意外回退 legacy：${stage}`)
      }
    }

    if (issues.length) failed++
    rows.push({
      id: tpl.id,
      name: tpl.name,
      stages: wf?.stages.length || 0,
      agents: (wf?.stages || []).map(s => s.agent).filter(Boolean),
      videoPromptStage: Boolean(wf?.stages.some(s => s.id === 'video_prompt')),
      policyStages: Object.keys(tpl.skill_policy || {}).length,
      issues,
    })
  }

  for (const r of rows) {
    console.log(`${r.issues.length ? '✗' : '✓'} ${r.name} (${r.id}) | 阶段 ${r.stages} | ${r.videoPromptStage ? '含视频提示词阶段' : '分镜直产提示词'} | policy ${r.policyStages} | ${r.agents.join(',')}`)
    for (const issue of r.issues) console.log(`    - ${issue}`)
  }
  console.log(JSON.stringify({ templates: rows.length, failed, storyboardProducesVideoPrompt }, null, 2))
  process.exitCode = failed ? 1 : 0
}

main()
