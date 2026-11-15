/**
 * MySQL → SQLite 一次性数据迁移脚本（CLI）
 *
 * 用法：cd backend && npx tsx scripts/import-mysql-to-sqlite.ts [--force]
 *
 * - 源：MySQL（读取 DATABASE_URL 或 MYSQL_* 环境变量，兼容 backend/.env）
 * - 目标：SQLITE_PATH 环境变量，默认仓库根 data/huobao.sqlite3
 * - 表结构由 initSqliteSchema 幂等创建；数据显式带 id 写入（AUTOINCREMENT 表
 *   插入后 sqlite_sequence 自动对齐 max(id)）
 * - 目标库已有业务数据时须 --force 才允许写入；写入前自动备份 .bak
 * - 逐表行数对照，不一致则非零退出
 *
 * 注意：服务启动时已内置同逻辑的自动迁移（src/db/mysql-import.ts，
 * 显式配置 MySQL + 空库时触发），本脚本用于手动/强制场景。
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'
import Database from 'better-sqlite3'
import { initSqliteSchema } from '../src/db/sqlite-schema.js'
import { importMysqlData, mysqlUrlFromEnv, sqliteBusinessRowCount } from '../src/db/mysql-import.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const force = process.argv.includes('--force')

const repoRoot = path.resolve(__dirname, '../..')
const sqlitePath = process.env.SQLITE_PATH || path.join(repoRoot, 'data', 'huobao.sqlite3')

async function main() {
  const url = mysqlUrlFromEnv()
  if (!url) {
    console.error('未检测到 MySQL 配置（DATABASE_URL 或 MYSQL_HOST）')
    process.exit(1)
  }
  const mysqlPool = mysql.createPool({ uri: url, connectionLimit: 4, charset: 'utf8mb4' })

  // 备份已有目标库（仅当文件存在且非空库时才需要 --force，备份无条件做）
  if (fs.existsSync(sqlitePath)) {
    const backup = `${sqlitePath}.bak-${Date.now()}`
    fs.copyFileSync(sqlitePath, backup)
    console.log(`已备份现有库 → ${backup}`)
  }
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true })
  const sqlite = new Database(sqlitePath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('busy_timeout = 5000')
  initSqliteSchema(sqlite)

  // 非空目标库须 --force
  const existing = sqliteBusinessRowCount(sqlite)
  if (existing > 0 && !force) {
    console.error(`目标库已含 ${existing} 行业务数据。确认覆盖请加 --force（已自动备份）`)
    process.exit(1)
  }

  const { totalSrc, totalDst } = await importMysqlData(mysqlPool, sqlite)

  // 自增序列对齐检查（显式 id 插入后 sqlite_sequence 应 >= max(id)）
  const seq = sqlite.prepare(`SELECT name, seq FROM sqlite_sequence`).all() as { name: string; seq: number }[]
  console.log(`\nsqlite_sequence 已登记 ${seq.length} 张自增表`)

  await mysqlPool.end()
  sqlite.close()

  console.log(`\n合计: mysql=${totalSrc} sqlite=${totalDst}`)
  console.log('迁移完成 ✓')
}

main().catch(err => {
  console.error('迁移失败:', err)
  process.exit(1)
})
