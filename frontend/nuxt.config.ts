export default defineNuxtConfig({
  srcDir: 'app/',
  ssr: false,
  devtools: { enabled: false },
  app: {
    head: {
      title: 'HuoBao Drama',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
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
