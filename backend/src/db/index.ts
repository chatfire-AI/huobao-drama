import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'
import { initSqliteSchema } from './sqlite-schema.js'
import { maybeAutoImportMysql } from './mysql-import.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// src/db → 上三级为仓库根（与 utils/paths.ts 的推断层级一致）
const repoRoot = path.resolve(__dirname, '../../..')

// 桌面版由 Electron 主进程注入 SQLITE_PATH（userData 下）；dev 默认仓库根 data/
// 注意：勿沿用旧文件名 huobao_drama.db —— 那是早期 SQLite 时代的遗留库，表名重叠但列不同
export const dbPath = process.env.SQLITE_PATH || path.join(repoRoot, 'data', 'huobao.sqlite3')
fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)

// WAL：生成任务轮询与页面读并发时不互相阻塞；busy_timeout 兜底写锁竞争
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('busy_timeout = 5000')
sqlite.pragma('synchronous = NORMAL')

/** 启动建表（DDL 幂等重放 + 种子补缺）。SQLite 无连接就绪问题，无需重试 */
export function initDb() {
  initSqliteSchema(sqlite)
}

initDb()

// MySQL 老用户一次性自动迁移：仅在显式配置 MySQL + 空库 + 无标记时触发（详见 mysql-import.ts 头注释）
await maybeAutoImportMysql(sqlite, dbPath)

/** better-sqlite3 的 lastInsertRowid 可能是 bigint，统一转 number */
export function getInsertId(result: unknown) {
  const res = result as { lastInsertRowid?: number | bigint } | undefined
  if (res?.lastInsertRowid === undefined || res.lastInsertRowid === null) {
    throw new Error('SQLite insert did not return lastInsertRowid')
  }
  return Number(res.lastInsertRowid)
}

export const db = drizzle(sqlite, { schema })
export { schema }
export type DB = typeof db
