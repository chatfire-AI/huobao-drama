/**
 * Agent 工作区（Workspace）— Mastra 原生能力
 * 每个 Agent 一个 Workspace：
 * - filesystem：jail 到 backend/workspace/ 目录，Agent 获得文件读写工具
 * - skills：从 workspace/skills/ 下注册各 Agent 专属的 SKILL.md
 * 注入 instructions 时仍拼接技能全文（原生注入只有元数据，全文注入保证行为一致）
 *
 * 注意：filesystem instructions 刻意覆写为无 "workspace" 字样的中文描述——
 * 默认文案含绝对路径（路径里有 workspace 目录名），Gemini 系低思考档位下
 * 偶发把其脑补成 Google Workspace 然后以"组织政策"为由拒绝调用工具。
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Workspace, LocalFilesystem } from '@mastra/core/workspace'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// 桌面版由 Electron 主进程注入 WORKSPACE_PATH（userData 下的可写副本）；dev 锚定 backend/workspace
const WORKSPACE_DIR = process.env.WORKSPACE_PATH
  ? path.resolve(process.env.WORKSPACE_PATH)
  : path.resolve(__dirname, '../../workspace')
const SKILLS_DIR = path.join(WORKSPACE_DIR, 'skills')

// 覆写默认 filesystem instructions（默认文案带绝对路径，暴露 workspace 字样）
const FILESYSTEM_INSTRUCTIONS =
  '本地文件目录：用于读写技能定义、提示词等项目文件。相对路径均以此目录为根解析；文件访问仅限此目录之内。'
const localFilesystem = () => new LocalFilesystem({ basePath: WORKSPACE_DIR, instructions: FILESYSTEM_INSTRUCTIONS })

// 启动时确保工作目录存在（Agent 文件读写的 jail 根）
// 桌面版打包后模块可能仍从只读位置加载，失败不阻断启动（路由层会给出明确报错）
try {
  fs.mkdirSync(SKILLS_DIR, { recursive: true })
} catch (err) {
  console.warn(`[skills] 工作目录创建失败（只读环境？）: ${(err as Error).message}`)
}

/** 每个 Agent 注册的 skill 目录（相对 workspace/skills/，含子规范目录；目录名需符合 Agent Skills 规范：小写+连字符） */
const AGENT_SKILL_MAP: Record<string, string[]> = {
  script_rewriter: ['script-rewriter'],
  extractor: ['extractor'],
  storyboard_breaker: ['storyboard-breaker'],
  prompt_generator: [
    'prompt-generator/character-prompt',
    'prompt-generator/scene-prompt',
    'prompt-generator/prop-prompt',
    'prompt-generator/video-prompt',
  ],
}

/** 每个 Agent 的 Workspace（filesystem 工作目录 + 原生技能注册）
 *  skills 用动态解析器按目录前缀匹配：设置页新建的子技能无需重启即可被发现 */
export const skillWorkspaces: Record<string, Workspace> = Object.fromEntries(
  Object.entries(AGENT_SKILL_MAP).map(([agentType, prefixes]) => [
    agentType,
    new Workspace({
      id: `workspace-${agentType}`,
      name: `${agentType} workspace`,
      filesystem: localFilesystem(),
      skills: () => scanSkillPaths().filter(p =>
        prefixes.some(prefix => p === `skills/${prefix}` || p.startsWith(`skills/${prefix}/`))),
    }),
  ]),
)

/** 递归扫描 workspace/skills/ 下所有含 SKILL.md 的目录（相对 workspace 根的路径） */
function scanSkillPaths(): string[] {
  const found: string[] = []
  const walk = (dir: string, prefix: string) => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      const full = path.join(dir, entry.name)
      if (fs.existsSync(path.join(full, 'SKILL.md'))) found.push(`skills/${rel}`)
      walk(full, rel)
    }
  }
  walk(SKILLS_DIR, '')
  return found
}

/**
 * 技能管理 Workspace（设置页 CRUD 用）
 * skills 用动态解析器，新建/删除技能目录后无需重启即可发现
 */
export const skillsManagerWorkspace = new Workspace({
  id: 'workspace-skills-manager',
  name: 'skills manager',
  filesystem: localFilesystem(),
  skills: () => scanSkillPaths(),
})

function formatSkillSection(skillId: string, content: string): string {
  return [`## Skill: ${skillId}`, content].join('\n')
}

/** 剥离 SKILL.md 风格文件的 frontmatter，返回正文（供语言变体直读使用） */
function stripFrontmatter(raw: string): string {
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  return (m ? raw.slice(m[0].length) : raw).trim()
}

/** 读取技能的语言变体正文（SKILL.<lang>.md，直读绕缓存永远最新）；不存在返回 null */
async function readLocalizedSkill(relPath: string, lang: string): Promise<string | null> {
  const fsm = skillsManagerWorkspace.filesystem!
  const p = `skills/${relPath}/SKILL.${lang}.md`
  try {
    if (!await fsm.exists(p)) return null
    const body = stripFrontmatter(String(await fsm.readFile(p, { encoding: 'utf-8' })))
    return body || null
  } catch {
    return null
  }
}

/** 读取 Agent 专属技能全文（经 workspace.skills API，保持原注入格式）
 *  AGENT_SKILL_MAP 的目录按前缀匹配：目录自身及其子目录下所有 SKILL.md 都会注入，
 *  因此设置页新建的子技能（如 storyboard-breaker/xxx）无需改代码即可生效。
 *  lang 非 zh 时逐技能优先 SKILL.<lang>.md，缺失回退基础版（中文） */
export async function loadAgentSkills(agentType: string, lang?: string | null): Promise<string> {
  const workspace = skillWorkspaces[agentType]
  const prefixes = AGENT_SKILL_MAP[agentType] || []
  if (!workspace || !prefixes.length) return ''

  const allPaths = scanSkillPaths().map(p => p.replace(/^skills\//, ''))
  const relPaths = allPaths.filter(p =>
    prefixes.some(prefix => p === prefix || p.startsWith(prefix + '/')))

  const useLocalized = Boolean(lang && lang !== 'zh')
  const contents: string[] = []
  for (const relPath of relPaths) {
    let body: string | null | undefined
    if (useLocalized) body = await readLocalizedSkill(relPath, lang!)
    if (!body) {
      const skill = await workspace.skills?.get(`skills/${relPath}`)
      body = skill?.instructions?.trim()
    }
    if (body) contents.push(formatSkillSection(relPath, body))
  }

  if (!contents.length) return ''

  return [
    '以下是该 Agent 专属的项目技能规范（SKILL.md）。',
    '不同 Agent 会加载不同 skill；你只需要遵守当前注入的这些技能。',
    '你必须在不违背当前工具边界的前提下优先遵守这些规范；若与用户明确要求冲突，以用户要求为准。',
    '',
    contents.join('\n\n'),
  ].join('\n')
}

/**
 * 强制重新扫描全部 Agent 的技能（SKILL.md 编辑后调用）
 * maybeRefresh 负责感知目录增删（动态 resolver 路径变化），refresh 负责内容更新
 * （目录 mtime 不会因文件内容编辑而更新，单靠 maybeRefresh 的 staleness 检查不可靠）
 */
export async function refreshSkillWorkspaces(): Promise<void> {
  await Promise.all(
    [...Object.values(skillWorkspaces), skillsManagerWorkspace]
      .map(async workspace => {
        await workspace.skills?.maybeRefresh()
        await workspace.skills?.refresh()
      }),
  )
}
