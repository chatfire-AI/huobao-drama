/**
 * Agent prompt 管理路由 — 读写 workspace/prompts/<agent_type>[.<lang>].md
 * 文件操作 jail 在 backend/workspace/ 目录内（仿 skills 路由）
 * ?lang=en/ja/ko 读写语言变体；zh/缺省为基础版（历史行为）
 */
import { Hono } from 'hono'
import { success, badRequest } from '../utils/response.js'
import { skillsManagerWorkspace } from '../agents/skills.js'
import { validAgentTypes, DEFAULT_PROMPTS } from '../agents/index.js'
import { loadAgentPromptFile, serializePromptFile, promptFilePath } from '../agents/prompts.js'

const app = new Hono()
const fsm = () => skillsManagerWorkspace.filesystem!

const checkType = (type: string) => validAgentTypes.includes(type)
const LANGS = ['zh', 'en', 'ja', 'ko']
const normalizeLang = (v?: string) => (v && LANGS.includes(v) ? v : 'zh')

// GET /prompts — 列出全部 Agent 的 prompt 状态（基础版口径；name/model 只属于基础版）
app.get('/', async (c) => {
  const list = await Promise.all(validAgentTypes.map(async (type) => {
    const file = await loadAgentPromptFile(type)
    return {
      agent_type: type,
      name: file?.name || DEFAULT_PROMPTS[type].name,
      model: file?.model || '',
      is_default: !file,
    }
  }))
  return success(c, list)
})

// GET /prompts/:type?lang= — 有效内容（语言变体优先，缺失回退基础版，再缺失回退代码默认）
// is_default=true 表示当前语言无独立文件（内容为回退版本），前端据此提示「跟随中文」
app.get('/:type', async (c) => {
  const type = c.req.param('type')
  if (!checkType(type)) return badRequest(c, '未知的 Agent 类型')
  const lang = normalizeLang(c.req.query('lang'))
  const [file, base] = await Promise.all([
    loadAgentPromptFile(type, lang),
    lang === 'zh' ? Promise.resolve(null) : loadAgentPromptFile(type),
  ])
  // 非 zh 且变体不存在时 file 即基础版；通过路径再确认一次变体存在性
  const variantExists = lang !== 'zh' && await fsm().exists(promptFilePath(type, lang))
  if (file) {
    return success(c, {
      agent_type: type,
      lang,
      name: base?.name || file.name || DEFAULT_PROMPTS[type].name,
      model: base?.model || file.model,
      system_prompt: file.instructions,
      is_default: lang === 'zh' ? false : !variantExists,
    })
  }
  return success(c, {
    agent_type: type,
    lang,
    name: DEFAULT_PROMPTS[type].name,
    model: '',
    system_prompt: DEFAULT_PROMPTS[type].instructions,
    is_default: true,
  })
})

// PUT /prompts/:type?lang= — 保存为 prompt 文件（lang 非 zh 写语言变体；model 只随基础版保存）
app.put('/:type', async (c) => {
  const type = c.req.param('type')
  if (!checkType(type)) return badRequest(c, '未知的 Agent 类型')
  const body = await c.req.json()
  const lang = normalizeLang(c.req.query('lang') ?? body.lang)
  const instructions = String(body.system_prompt ?? '').trim()
  if (!instructions) return badRequest(c, 'system_prompt 必填')
  if (lang === 'zh') {
    const name = String(body.name || DEFAULT_PROMPTS[type].name)
    const model = String(body.model ?? '').trim()
    await fsm().writeFile(promptFilePath(type), serializePromptFile({ name, model, instructions }), { recursive: true })
    return success(c, { agent_type: type, lang, name, model, is_default: false })
  }
  // 语言变体：model 不从变体读取，name 仅作展示；保留变体自己的 name（缺省用基础版/默认名）
  const base = await loadAgentPromptFile(type)
  const name = String(body.name || base?.name || DEFAULT_PROMPTS[type].name)
  await fsm().writeFile(promptFilePath(type, lang), serializePromptFile({ name, model: '', instructions }), { recursive: true })
  return success(c, { agent_type: type, lang, name, is_default: false })
})

// POST /prompts/:type/reset?lang= — 删除对应语言文件，回退（变体→基础版；基础版→代码默认）
app.post('/:type/reset', async (c) => {
  const type = c.req.param('type')
  if (!checkType(type)) return badRequest(c, '未知的 Agent 类型')
  const lang = normalizeLang(c.req.query('lang'))
  const path = promptFilePath(type, lang)
  if (await fsm().exists(path)) await fsm().deleteFile(path)
  return success(c, { agent_type: type, lang, is_default: true })
})

export default app
