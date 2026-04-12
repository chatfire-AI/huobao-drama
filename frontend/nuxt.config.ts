export default defineNuxtConfig({
  srcDir: 'app/',
  ssr: false,
  runtimeConfig: {
    public: {
      /** 为 true 时隐藏「视频合成」步骤，视频生成完成后可直接去拼接导出（本地设置可覆盖） */
      skipVideoCompose:
        process.env.NUXT_PUBLIC_SKIP_VIDEO_COMPOSE === '1'
        || process.env.NUXT_PUBLIC_SKIP_VIDEO_COMPOSE === 'true',
    },
  },
  devtools: { enabled: false },
  experimental: {
    appManifest: false,
  },
  app: {
    head: {
      title: '火宝短剧',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'shortcut icon', type: 'image/png', href: '/favicon.png' },
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
