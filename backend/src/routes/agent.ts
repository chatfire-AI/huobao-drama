/**
 * Agent SSE 聊天路由 — 完整日志版
 */
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { createAgent, validAgentTypes } from '../agents/index.js'
import { success, badRequest } from '../utils/response.js'

const C = {
  r: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
}

function ts() { return new Date().toLocaleTimeString('zh-CN', { hour12: false }) }

function log(tag: string, color: string, ...args: any[]) {
  console.log(`${C.dim}${ts()}${C.r} ${color}[${tag}]${C.r}`, ...args)
}

const app = new Hono()

// POST /agent/:type/chat — SSE 流式 Agent 对话
app.post('/:type/chat', async (c) => {
  const agentType = c.req.param('type')
  if (!validAgentTypes.includes(agentType)) {
    return badRequest(c, `Invalid agent type: ${agentType}`)
  }

  const body = await c.req.json()
  const { message, drama_id, episode_id } = body

  log('Agent', C.cyan, `START ${C.bold}${agentType}${C.r} | drama=${drama_id} episode=${episode_id}`)
  log('Agent', C.cyan, `message: "${message}"`)

  if (!episode_id || !drama_id) {
    log('Agent', C.red, 'MISSING drama_id or episode_id')
    return badRequest(c, 'drama_id and episode_id are required')
  }

  const agent = createAgent(agentType, episode_id, drama_id)
  if (!agent) {
    log('Agent', C.red, `UNKNOWN agent type: ${agentType}`)
    return badRequest(c, 'Agent not found')
  }

  const startTime = performance.now()

  return streamSSE(c, async (stream) => {
    try {
      log('Agent', C.blue, 'calling LLM stream...')
      const result = await agent.stream([
        { role: 'user', content: message },
      ])

      let chunkCount = 0
      let textLength = 0
      let toolCallCount = 0
      let toolResultCount = 0

      for await (const chunk of result.fullStream) {
        chunkCount++

        switch (chunk.type) {
          case 'text-delta':
            textLength += (chunk.textDelta || '').length
            await stream.writeSSE({
              data: JSON.stringify({ type: 'content', data: chunk.textDelta }),
            })
            break

          case 'tool-call':
            toolCallCount++
            const argsStr = chunk.args != null ? JSON.stringify(chunk.args) : '{}'
            log('Tool', C.magenta, `CALL ${C.bold}${chunk.toolName}${C.r}(${argsStr.slice(0, 300)})`)
            await stream.writeSSE({
              data: JSON.stringify({
                type: 'tool_call',
                data: argsStr,
                tool_name: chunk.toolName,
              }),
            })
            break

          case 'tool-result':
            toolResultCount++
            const resultStr = chunk.result != null
              ? (typeof chunk.result === 'string' ? chunk.result : JSON.stringify(chunk.result))
              : '(empty)'
            log('Tool', C.green, `RESULT ${C.bold}${chunk.toolName}${C.r} → ${resultStr.slice(0, 200)}`)
            await stream.writeSSE({
              data: JSON.stringify({
                type: 'tool_result',
                data: resultStr.length > 2000 ? resultStr.slice(0, 2000) + '...[truncated]' : resultStr,
                tool_name: chunk.toolName,
              }),
            })
            break

          case 'error':
            log('Agent', C.red, `STREAM ERROR:`, (chunk as any).error || chunk)
            break

          default:
            // Log unknown chunk types for debugging
            if (!['step-start', 'step-finish', 'finish'].includes(chunk.type)) {
              log('Agent', C.dim, `chunk: ${chunk.type}`)
            }
            break
        }
      }

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1)
      log('Agent', C.green, `DONE ${C.bold}${agentType}${C.r} | ${elapsed}s | chunks=${chunkCount} text=${textLength}chars tools=${toolCallCount}→${toolResultCount}`)

      await stream.writeSSE({
        data: JSON.stringify({ type: 'done', data: '' }),
      })
    } catch (err: any) {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1)
      log('Agent', C.red, `ERROR ${C.bold}${agentType}${C.r} | ${elapsed}s`)
      console.error(err.stack || err)
      await stream.writeSSE({
        data: JSON.stringify({ type: 'error', data: err.message || 'Agent execution failed' }),
      })
    }
  })
})

// GET /agent/:type/debug
app.get('/:type/debug', async (c) => {
  const agentType = c.req.param('type')
  if (!validAgentTypes.includes(agentType)) return badRequest(c, 'Invalid agent type')
  return success(c, { agent_type: agentType, valid: true })
})

export default app
