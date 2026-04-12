/** 从 DB 中 JSON 字符串字段解析本地静态路径数组（如 reference_images） */
export function parseStoredPathArray(raw: string | null | undefined, max = 6): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((x) => x.trim())
      .slice(0, max)
  } catch {
    return []
  }
}
