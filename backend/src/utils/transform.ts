/**
 * 将 Drizzle 返回的 camelCase 对象转换为 snake_case
 * 保持前端 API 兼容（和旧 Go 后端一致）
 */
export function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
    result[snakeKey] = value
  }
  return result
}

export function toSnakeCaseArray(arr: Record<string, any>[]): Record<string, any>[] {
  return arr.map(toSnakeCase)
}
