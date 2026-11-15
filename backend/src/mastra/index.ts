/**
 * Mastra 中央实例 — Agent 注册表挂载点
 * 不用 Mastra logger（项目已有 pino + task-logger）
 */
import { Mastra } from '@mastra/core/mastra'
import { agentRegistry } from '../agents/index.js'

export const mastra = new Mastra({
  agents: agentRegistry,
  logger: false,
})
