/**
 * MySQL → SQLite 数据导入（启动自动迁移 + CLI 脚本共用核心）
 *
 * 自动迁移触发条件（全部满足）：
 * 1. 未设 MYSQL_AUTO_IMPORT=false
 * 2. 显式配置了 MySQL（DATABASE_URL 或 MYSQL_HOST；纯默认值不触发，避免桌面/新装用户误连）
 * 3. SQLite 业务表为空（style_presets 种子不计）
 * 4. 无完成标记文件 <sqlite>.mysql-imported（导入成功后写入；MySQL 不可达时不写，下次启动重试）
 *
 * 导入为两段式：先从 MySQL 全量读出到内存，再在单个 SQLite 事务内写入，
 * 任一步失败整体回滚，不留半迁移状态。
 */
import fs from 'fs'
import mysql from 'mysql2/promise'
import type { Database as SqliteDB } from 'better-sqlite3'

/** 依赖序：被引用表先写（SQLite 未开外键时仅为可读性约定，保持导入顺序清晰） */
export const MIGRATE_TABLES = [
  'dramas',
  'characters',
  'props',
  'scenes',
  'episodes',
  'storyboards',
  'episode_characters',
  'episode_scenes',
  'episode_props',
  'storyboard_characters',
  'storyboard_props',
  'ai_service_configs',
  'ai_service_providers',
  'style_presets',
  'sys_task',
  'video_merges',
  'assets',
]

/** MySQL 行 → SQLite 可绑定值（boolean→0/1，undefined→null） */
export function sanitize(v: unknown): string | number | bigint | null {
  if (v === undefined || v === null) return null
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'bigint') return v
  return String(v)
}

/**
 * 仅在显式配置 MySQL 时返回连接串（DATABASE_URL 或 MYSQL_HOST）。
 * 纯默认值不触发，避免桌面/新装用户误连本机无关 MySQL。
 */
export function mysqlUrlFromEnv(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  if (!process.env.MYSQL_HOST) return null
  const host = process.env.MYSQL_HOST
  const port = process.env.MYSQL_PORT || '3306'
  const user = encodeURIComponent(process.env.MYSQL_USER || 'huobao')
  const password = encodeURIComponent(process.env.MYSQL_PASSWORD || 'huobao')
  const database = process.env.MYSQL_DATABASE || 'huobao_drama'
  return `mysql://${user}:${password}@${host}:${port}/${database}`
}

/** SQLite 业务表是否为空（style_presets 启动种子不计） */
export function sqliteBusinessRowCount(sqlite: SqliteDB): number {
  return MIGRATE_TABLES
    .filter(t => t !== 'style_presets')
    .reduce((sum, t) => {
      const { n } = sqlite.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get() as { n: number }
      return sum + n
    }, 0)
}

/**
 * 两段式导入：先全量读出，再单事务写入；行数不一致抛错（事务随之回滚）。
 */
export async function importMysqlData(
  pool: mysql.Pool,
  sqlite: SqliteDB,
  log: (msg: string) => void = console.log,
): Promise<{ totalSrc: number; totalDst: number }> {
  // 第一段：读出
  const dump: Record<string, Record<string, unknown>[]> = {}
  for (const table of MIGRATE_TABLES) {
    const [rows] = await pool.query(`SELECT * FROM \`${table}\``)
    dump[table] = rows as Record<string, unknown>[]
  }

  // 第二段：单事务写入
  let totalSrc = 0
  let totalDst = 0
  const mismatch: string[] = []

  sqlite.transaction(() => {
    for (const table of MIGRATE_TABLES) {
      const data = dump[table]
      const columns = data.length ? Object.keys(data[0]) : null

      // 导入前清空目标表：style_presets 的初始化种子会撞 UNIQUE(value)；重复执行保持幂等
      if (data.length) {
        sqlite.prepare(`DELETE FROM "${table}"`).run()
      }

      if (columns) {
        const colList = columns.map(c => `"${c}"`).join(', ')
        const placeholders = columns.map(() => '?').join(', ')
        const stmt = sqlite.prepare(`INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`)
        for (const row of data) {
          stmt.run(...columns.map(c => sanitize(row[c])))
        }
      }

      const dst = (sqlite.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get() as { n: number }).n
      totalSrc += data.length
      totalDst += dst
      log(`${data.length === dst ? '✓' : '✗'} ${table}: mysql=${data.length} sqlite=${dst}`)
      if (data.length !== dst) mismatch.push(table)
    }
  })()

  if (mismatch.length) {
    throw new Error(`行数不一致: ${mismatch.join(', ')}`)
  }
  return { totalSrc, totalDst }
}

/**
 * 启动时自动迁移（条件见文件头注释）。永不抛出：失败仅告警并回滚，不阻塞服务启动。
 */
export async function maybeAutoImportMysql(sqlite: SqliteDB, dbPath: string): Promise<void> {
  const tag = '[mysql-import]'
  if ((process.env.MYSQL_AUTO_IMPORT || 'true').toLowerCase() === 'false') return

  const url = mysqlUrlFromEnv()
  if (!url) return

  const marker = `${dbPath}.mysql-imported`
  if (fs.existsSync(marker)) return

  if (sqliteBusinessRowCount(sqlite) > 0) return // 已有业务数据，静默跳过

  let pool: mysql.Pool | null = null
  try {
    pool = mysql.createPool({ uri: url, connectionLimit: 4, charset: 'utf8mb4', connectTimeout: 3000 })
    await pool.query('SELECT 1')
  } catch (err) {
    console.warn(`${tag} 已配置 MySQL 但连接失败（${(err as Error).message}），本次跳过自动迁移，下次启动重试`)
    await pool?.end().catch(() => {})
    return
  }

  try {
    // MySQL 侧无业务数据 → 写标记，避免每次启动探测
    const [rows] = await pool.query('SELECT (SELECT COUNT(*) FROM `dramas`) + (SELECT COUNT(*) FROM `ai_service_configs`) AS n')
    const mysqlRows = Number((rows as { n: number }[])[0]?.n || 0)
    if (mysqlRows === 0) {
      fs.writeFileSync(marker, `mysql source empty at ${new Date().toISOString()}\n`)
      return
    }

    console.log(`${tag} 检测到 MySQL 旧数据（${mysqlRows} 行关键表记录），开始自动迁移到 SQLite…`)
    if (fs.existsSync(dbPath)) {
      const backup = `${dbPath}.bak-${Date.now()}`
      fs.copyFileSync(dbPath, backup)
      console.log(`${tag} 已备份现有库 → ${backup}`)
    }

    const { totalSrc, totalDst } = await importMysqlData(pool, sqlite, msg => console.log(`${tag} ${msg}`))
    fs.writeFileSync(marker, `imported ${totalSrc} rows at ${new Date().toISOString()}\n`)
    console.log(`${tag} 迁移完成 ✓（mysql=${totalSrc} sqlite=${totalDst}）`)
    console.log(`${tag} 提示：若旧部署的 data/static 媒体文件不在本机，请手动拷贝，否则历史素材将无法访问`)
  } catch (err) {
    console.error(`${tag} 自动迁移失败（已回滚，不影响本次启动，下次启动将重试）:`, (err as Error).message)
  } finally {
    await pool.end().catch(() => {})
  }
}
