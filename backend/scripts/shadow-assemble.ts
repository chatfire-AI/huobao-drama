/**
 * P0-08 影子装配：8 套模板 × 5 个阶段，同时按 legacy 与 policy 装配并对比。
 * 只读：不写库、不调用模型、不切换运行时行为。
 *
 * 运行：cd backend && npx tsx scripts/shadow-assemble.ts
 */
import { listTemplates } from '../src/services/templates.js'
import { assembleShadow } from '../src/agents/index.js'

const STAGES: Array<[agent: string, stage: string]> = [
  ['script_rewriter', 'script'],
  ['extractor', 'extract'],
  ['storyboard_breaker', 'storyboard'],
  ['prompt_generator', 'video_prompt'],
  ['prompt_generator', 'image'],
]

async function main() {
  let failures = 0
  for (const tpl of listTemplates()) {
    const policyStages = Object.keys(tpl.skill_policy || {})
    console.log(`\n${tpl.name} (${tpl.id}) schema=${tpl.schema_version || 1} policy=${policyStages.length}`)

    for (const [agent, stage] of STAGES) {
      const result = await assembleShadow(agent, tpl.id, stage)
      const delta = result.policy.totalChars - result.legacy.totalChars
      const mark = policyStages.includes(stage) ? '*' : ' '
      console.log(
        `  ${mark} ${stage.padEnd(12)} ${agent.padEnd(18)}` +
        ` legacy=${result.legacy.totalChars}(${result.legacy.skills.length})` +
        ` policy=${result.policy.totalChars}(${result.policy.skills.length})` +
        ` Δ=${delta >= 0 ? '+' : ''}${delta}` +
        `${result.identical ? ' same' : ''}`,
      )

      if (policyStages.includes(stage)) {
        if (result.policy.skillSource !== 'policy') {
          console.error(`    FAIL ${stage}: 期望 policy，实际 ${result.policy.skillSource}`)
          failures++
        }
        if (result.policy.missing.length) {
          console.error(`    FAIL ${stage}: 缺技能 ${result.policy.missing.join(',')}`)
          failures++
        }
      }
    }
  }

  console.log(`\n影子装配完成：${listTemplates().length} 套模板 / ${STAGES.length} 个阶段；失败 ${failures}`)
  process.exitCode = failures ? 1 : 0
}

main()
