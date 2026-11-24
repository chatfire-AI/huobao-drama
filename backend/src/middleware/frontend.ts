import type { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'

export function mountFrontend(app: Hono, root: string, previousRoot: string) {
  // API routes are mounted first; unmatched API requests must not receive the SPA.
  app.all('/api/*', c => c.notFound())
  app.use('*', async (c, next) => {
    await next()
    if (c.res.headers.get('Content-Type')?.startsWith('text/html')) c.header('Cache-Control', 'no-store')
  })
  // Keep an open tab's lazy imports working across one frontend update.
  app.use('/_nuxt/*', serveStatic({ root }))
  app.use('/_nuxt/*', serveStatic({ root: previousRoot }))
  // A missing script must never receive the SPA's HTML with status 200.
  app.all('/_nuxt/*', c => c.text('Frontend asset not found', 404))
  app.use('*', serveStatic({ root }))
  app.get('*', serveStatic({ root, path: 'index.html' }))
}
