import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  srcDir: 'app/',
  ssr: false,
  devtools: { enabled: false },
  experimental: {
    appManifest: false,
  },
  hooks: {
    // 动态路由页面统一放在 app/views/ 手动注册，避免文件路径中出现 [id] 方括号
    // （方括号路径在 git/shell 中需转义，且部分部署环境不兼容）。URL 保持不变。
    'pages:extend'(pages) {
      pages.push(
        {
          name: 'drama-detail',
          path: '/drama/:id',
          file: fileURLToPath(new URL('./app/views/drama/detail.vue', import.meta.url)),
        },
        {
          name: 'drama-episode',
          path: '/drama/:id/episode/:episodeNumber',
          file: fileURLToPath(new URL('./app/views/drama/episode.vue', import.meta.url)),
        },
      )
    },
  },
  app: {
    head: {
      title: '火宝短剧',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        // v 参数用于 favicon 缓存穿透（浏览器对 favicon 缓存独立于 HTTP 缓存，换图必须 bump）
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon.png?v=20261002' },
        { rel: 'shortcut icon', type: 'image/png', href: '/favicon.png?v=20261002' },
      ],
    },
  },
  vite: {
    server: {
      proxy: {
        '/api': { target: 'http://localhost:5679', changeOrigin: true },
        '/static': { target: 'http://localhost:5679', changeOrigin: true },
      },
    },
  },
  compatibilityDate: '2025-05-15',
})
