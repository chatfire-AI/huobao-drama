/**
 * 数据目录占用统计 + 磁盘剩余空间
 *
 * - dirUsage：单次异步递归 walk（fs.promises，不阻塞事件循环），按相对路径归桶
 * - 数据库文件（huobao.sqlite3/-wal/-shm）不在 walk 中重复计数，单独 stat
 *   （server 模式 STORAGE_PATH 覆盖时 SQLITE_PATH 可能位于数据根之外）
 */
import type { Dirent } from 'fs'
import fsp from 'fs/promises'
import path from 'path'

export interface UsageBuckets {
  db: number
  images: number
  videos: number
  merged: number
  uploads: number
  temp: number
  other: number
  total: number
}

const DB_FILE_BASE = 'huobao.sqlite3'

/** 递归 walk，对每个普通文件回调（完整路径 + 大小）；目录不可读/文件竞态静默跳过 */
async function walkFiles(dir: string, onFile: (filePath: string, size: number) => void): Promise<void> {
  let entries: Dirent[]
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkFiles(full, onFile)
    } else if (entry.isFile()) {
      try {
        const st = await fsp.stat(full)
        onFile(full, st.size)
      } catch { /* 文件在 walk 期间消失等竞态，忽略 */ }
    }
  }
}

/** 统计数据目录占用（按用途分桶）；db 桶 = SQLITE_PATH 主库 + -wal/-shm 三文件 */
export async function dirUsage(dataRoot: string, sqlitePath: string): Promise<UsageBuckets> {
  const usage: UsageBuckets = { db: 0, images: 0, videos: 0, merged: 0, uploads: 0, temp: 0, other: 0, total: 0 }
  const add = (bucket: keyof UsageBuckets, size: number) => {
    usage[bucket] += size
    usage.total += size
  }

  // db 桶：直接 stat 三个文件（无论是否在 dataRoot 内，walk 侧会跳过避免双计）
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      const st = await fsp.stat(sqlitePath + suffix)
      if (st.isFile()) add('db', st.size)
    } catch { /* 文件不存在（如未开 WAL 时 -wal 缺失）*/ }
  }

  await walkFiles(dataRoot, (filePath, size) => {
    const rel = path.relative(dataRoot, filePath)
    if (rel === DB_FILE_BASE || rel.startsWith(DB_FILE_BASE + '-')) return // 已单独计入 db 桶
    const parts = rel.split(path.sep)
    if (parts[0] === 'static' && parts.length >= 2) {
      const sub = parts[1]
      if (sub === 'images' || sub === 'videos' || sub === 'merged' || sub === 'uploads' || sub === 'temp') {
        add(sub, size)
        return
      }
    }
    add('other', size)
  })
  return usage
}

/** 目标目录所在卷的剩余字节；statfs 不可用时返回 null（调用方跳过空间校验） */
export async function volumeFreeBytes(dir: string): Promise<number | null> {
  try {
    const st = await fsp.statfs(dir)
    return st.bavail * st.bsize
  } catch {
    return null
  }
}
