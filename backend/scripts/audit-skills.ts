/**
 * 技能分层审计：全局基础技能 vs 模板技能
 * - 体积统计
 * - 重复规则检测（同一 Agent 下，基础技能与模板技能正文的重复行）
 * - 超预算提示（单 Agent 技能总量 > 8000 字符）
 *
 * 运行：cd backend && npx tsx scripts/audit-skills.ts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { listTemplates, resolveSkillSelection } from '../src/services/templates.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKSPACE = path.resolve(__dirname, '../workspace')
const SKILLS_DIR = path.join(WORKSPACE, 'skills')

const AGENT_DIR: Record<string, string> = {
  script_rewriter: 'script-rewriter',
  extractor: 'extractor',
  storyboard_breaker: 'storyboard-breaker',
  prompt_generator: 'prompt-generator',
  image: 'prompt-generator',
  video_prompt: 'prompt-generator',
}

function readSkill(rel: string): string {
  const p = path.join(SKILLS_DIR, rel, 'SKILL.md')
  try { return fs.readFileSync(p, 'utf8') } catch { return '' }
}

function listBaseSkills(agentType: string): { id: string; chars: number; content: string }[] {
  const dir = AGENT_DIR[agentType] || agentType
  const root = path.join(SKILLS_DIR, dir)
  const out: { id: string; chars: number; content: string }[] = []
  const walk = (d: string, rel: string) => {
    let entries: fs.Dirent[] = []
    try { entries = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    if (entries.some(e => e.isFile() && e.name === 'SKILL.md')) {
      const content = readSkill(rel)
      out.push({ id: rel, chars: content.length, content })
    }
    for (const e of entries) if (e.isDirectory()) walk(path.join(d, e.name), `${rel}/${e.name}`)
  }
  walk(root, dir)
  return out
}

function normalizeLine(line: string): string {
  return line
    .replace(/[#>*`\-\[\]\(\)]/g, '')
    .replace(/[，。；：！？、,.;:!?]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

function duplicateLines(base: string, template: string): string[] {
  const baseSet = new Set(
    base.split('\n').map(normalizeLine).filter(l => l.length >= 8),
  )
  const seen = new Set<string>()
  const dup: string[] = []
  for (const raw of template.split('\n')) {
    if (/^(name|description):/.test(raw.trim())) continue
    const line = normalizeLine(raw)
    if (line.length < 8 || seen.has(line)) continue
    seen.add(line)
    if (baseSet.has(line)) dup.push(raw.trim())
  }
  return dup
}

const templates = listTemplates()
const agentKeys = ['script_rewriter', 'extractor', 'storyboard_breaker', 'prompt_generator']
const stageOf: Record<string, string> = {
  script_rewriter: 'script',
  extractor: 'extract',
  storyboard_breaker: 'storyboard',
  prompt_generator: 'video_prompt',
}
const SKILL_BUDGET = 8000

const baseStats = new Map<string, { chars: number; content: string; count: number }>()
for (const agent of agentKeys) {
  const skills = listBaseSkills(agent)
  baseStats.set(agent, {
    chars: skills.reduce((s, x) => s + x.chars, 0),
    content: skills.map(x => x.content).join('\n'),
    count: skills.length,
  })
}

console.log('基础技能（全局）：')
for (const agent of agentKeys) {
  const s = baseStats.get(agent)!
  console.log(`  ${agent}: ${s.count} 个 / ${s.chars} 字`)
}

console.log('\n模板技能：')
let overBudget = 0
for (const tpl of templates) {
  for (const agent of agentKeys) {
    const selection = resolveSkillSelection(tpl, stageOf[agent], agent)

    if (selection.source === 'policy') {
      const skills = selection.skills.map(skill => ({
        id: skill.id,
        layer: skill.layer,
        content: readSkill(skill.id),
      }))
      const chars = skills.reduce((sum, skill) => sum + skill.content.length, 0)
      const missing = skills.filter(skill => !skill.content).map(skill => skill.id)
      if (chars > SKILL_BUDGET) overBudget++
      console.log(
        `${chars > SKILL_BUDGET ? '⚠' : '✓'} ${tpl.name} / ${agent}: policy ${skills.length} 个 / ${chars} 字` +
        (missing.length ? ` | 缺失 ${missing.join(',')}` : ''),
      )
      continue
    }

    const dirs = (tpl.agent_skills?.[agent] || []).map(ref => ref.id)
    const skills = dirs.map(rel => ({ rel, content: readSkill(rel) }))
    const chars = skills.reduce((s, x) => s + x.content.length, 0)
    const base = baseStats.get(agent)!
    const dups: string[] = []
    for (const s of skills) dups.push(...duplicateLines(base.content, s.content))
    const total = base.chars + chars
    if (total > SKILL_BUDGET) overBudget++
    console.log(
      `${total > SKILL_BUDGET ? '⚠' : '✓'} ${tpl.name} / ${agent}: template ${chars} 字 + base ${base.chars} 字 = ${total} 字` +
      (dups.length ? ` | 重复行 ${dups.length}: ${dups.slice(0, 2).join(' / ').slice(0, 80)}` : ''),
    )
  }
}

console.log(`\n超预算（>${SKILL_BUDGET} 字）组合：${overBudget} 个`)
