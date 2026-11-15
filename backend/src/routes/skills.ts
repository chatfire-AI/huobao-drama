/**
 * 技能管理路由 — 全部经 Mastra Workspace API 读写
 * 文件操作 jail 在 backend/workspace/ 目录内
 */
import { Hono } from 'hono'
import { success, badRequest } from '../utils/response.js'
import { refreshSkillWorkspaces, skillsManagerWorkspace } from '../agents/skills.js'

const app = new Hono()
const fsm = () => skillsManagerWorkspace.filesystem!
const LANGS = ['zh', 'en', 'ja', 'ko']
const normalizeLang = (v?: string) => (v && LANGS.includes(v) ? v : 'zh')
/** 技能文件路径；lang 非 zh 时为语言变体 SKILL.<lang>.md */
const skillFile = (id: string, lang?: string) => `skills/${id}/SKILL${lang && lang !== 'zh' ? `.${lang}` : ''}.md`
const SKILL_ID_SEGMENT = /^[a-z0-9-]+$/

// GET /skills?lang= — List all skills (经 workspace.skills 原生发现)
// lang 非 zh 且变体存在时，名称/描述取自语言变体 frontmatter（缺失则回退基础版）
app.get('/', async (c) => {
  const lang = normalizeLang(c.req.query('lang'))
  const metas = await skillsManagerWorkspace.skills?.list() || []
  const out = []
  for (const meta of metas) {
    const id = meta.path.replace(/^skills\//, '')
    let name = meta.name
    let description = meta.description || ''
    if (lang !== 'zh' && await fsm().exists(skillFile(id, lang))) {
      const raw = String(await fsm().readFile(skillFile(id, lang), { encoding: 'utf-8' }))
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] || ''
      const n = /^name:\s*(.+)$/m.exec(fm)?.[1]?.trim()
      const d = /^description:\s*(.+)$/m.exec(fm)?.[1]?.trim()
      if (n) name = n
      if (d) description = d
    }
    out.push({ id, name, description })
  }
  return success(c, out)
})

// GET /skills/:id?lang= — Get skill content (raw, 含 frontmatter 供编辑)
// lang 非 zh 时读语言变体；变体缺失回退基础版内容并标记 is_default=true（前端提示「跟随中文」）
app.get('/*', async (c) => {
  const id = c.req.path.slice('/api/v1/skills/'.length)
  const lang = normalizeLang(c.req.query('lang'))
  if (!await fsm().exists(skillFile(id))) return badRequest(c, '技能不存在')
  const variantExists = lang !== 'zh' && await fsm().exists(skillFile(id, lang))
  const content = await fsm().readFile(skillFile(id, variantExists ? lang : undefined), { encoding: 'utf-8' })
  return success(c, { id, lang, content, is_default: lang !== 'zh' && !variantExists })
})

// PUT /skills/:id?lang= — Update skill content（lang 非 zh 写语言变体；基础版变更需刷新技能缓存）
app.put('/*', async (c) => {
  const id = c.req.path.slice('/api/v1/skills/'.length)
  const body = await c.req.json()
  const lang = normalizeLang(c.req.query('lang') ?? body.lang)
  if (lang !== 'zh' && !await fsm().exists(skillFile(id))) return badRequest(c, '技能不存在')
  await fsm().writeFile(skillFile(id, lang), body.content, { recursive: true })
  // 目录 mtime 不会因文件内容编辑而更新（APFS），显式刷新技能缓存；语言变体直读无需刷新
  if (lang === 'zh') await refreshSkillWorkspaces()
  return success(c)
})

// POST /skills — Create new skill directory
app.post('/', async (c) => {
  const body = await c.req.json()
  const { id, description } = body
  if (!id) return badRequest(c, 'Skill id 必填')
  // Mastra 技能规范：frontmatter name 必须与目录名一致，且只允许小写字母/数字/连字符
  const segments = String(id).split('/')
  if (!segments.every((seg: string) => SKILL_ID_SEGMENT.test(seg))) {
    return badRequest(c, 'Skill id 每段只能包含小写字母、数字和连字符')
  }
  if (await fsm().exists(skillFile(id))) return badRequest(c, '技能已存在')

  const name = segments[segments.length - 1]
  const content = `---
name: ${name}
description: ${description || ''}
---

# ${name}

Write your skill content here.
`
  await fsm().writeFile(skillFile(id), content, { recursive: true, overwrite: false })
  await refreshSkillWorkspaces()
  return success(c, { id, name, description: description || '' })
})

// DELETE /skills/:id — Delete skill directory
app.delete('/*', async (c) => {
  const id = c.req.path.slice('/api/v1/skills/'.length)
  if (!await fsm().exists(`skills/${id}`)) return badRequest(c, '技能不存在')
  await fsm().rmdir(`skills/${id}`, { recursive: true })
  await refreshSkillWorkspaces()
  return success(c)
})

export default app
