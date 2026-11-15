import type { Context } from 'hono'

export function success(c: Context, data: any = null) {
  return c.json({ code: 200, data, message: 'success' })
}

export function created(c: Context, data: any = null) {
  return c.json({ code: 201, data, message: 'created' }, 201)
}

export function badRequest(c: Context, message = '请求参数错误') {
  return c.json({ code: 400, message }, 400)
}

export function notFound(c: Context, message = '资源不存在') {
  return c.json({ code: 404, message }, 404)
}

export function serverError(c: Context, message = '服务器内部错误') {
  return c.json({ code: 500, message }, 500)
}

export function now() {
  return new Date().toISOString()
}
