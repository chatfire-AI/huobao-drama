import { Hono } from 'hono'
import fs from 'fs'
import path from 'path'
import { success, badRequest } from '../utils/response.js'

const app = new Hono()
const SKILLS_DIR = path.resolve(process.cwd(), '../skills')

// GET /skills — List all skills (recursive, supports nested dirs)
app.get('/', async (c) => {
  const skills: { id: string; name: string; description: string }[] = []

  function scanDir(dir: string, prefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const fullPath = path.join(dir, entry.name)
      const skillPath = path.join(fullPath, 'SKILL.md')
      if (fs.existsSync(skillPath)) {
        const content = fs.readFileSync(skillPath, 'utf-8')
        const nameMatch = content.match(/^name:\s*(.+)$/m)
        const descMatch = content.match(/^description:\s*(.+)$/m)
        const id = prefix ? `${prefix}/${entry.name}` : entry.name
        skills.push({
          id,
          name: nameMatch ? nameMatch[1].trim() : entry.name,
          description: descMatch ? descMatch[1].trim() : '',
        })
      }
      // Always recurse — nested skills may exist even if this dir has SKILL.md
      scanDir(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name)
    }
  }

  scanDir(SKILLS_DIR)
  return success(c, skills)
})

// GET /skills/:id — Get skill content
app.get('/*', async (c) => {
  const id = c.req.path.slice('/api/v1/skills/'.length)
  const skillPath = path.join(SKILLS_DIR, id, 'SKILL.md')
  if (!fs.existsSync(skillPath)) return badRequest(c, 'Skill not found')
  const content = fs.readFileSync(skillPath, 'utf-8')
  return success(c, { id, content })
})

// PUT /skills/:id — Update skill content
app.put('/*', async (c) => {
  const id = c.req.path.slice('/api/v1/skills/'.length)
  const body = await c.req.json()
  const skillDir = path.join(SKILLS_DIR, id)
  const skillPath = path.join(skillDir, 'SKILL.md')
  if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(skillPath, body.content, 'utf-8')
  return success(c)
})

// POST /skills — Create new skill directory
app.post('/', async (c) => {
  const body = await c.req.json()
  const { id, name, description } = body
  if (!id) return badRequest(c, 'Skill id is required')

  const skillDir = path.join(SKILLS_DIR, id)
  if (fs.existsSync(skillDir)) return badRequest(c, 'Skill already exists')

  fs.mkdirSync(skillDir, { recursive: true })
  const content = `---
name: ${name || id}
description: ${description || ''}
---

# ${name || id}

Write your skill content here.
`
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf-8')
  return success(c, { id, name: name || id, description: description || '' })
})

// DELETE /skills/:id — Delete skill directory
app.delete('/*', async (c) => {
  const id = c.req.path.slice('/api/v1/skills/'.length)
  const skillDir = path.join(SKILLS_DIR, id)
  if (!fs.existsSync(skillDir)) return badRequest(c, 'Skill not found')
  fs.rmSync(skillDir, { recursive: true, force: true })
  return success(c)
})

export default app
