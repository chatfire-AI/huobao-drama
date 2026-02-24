import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'http://localhost:5678'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      host: '0.0.0.0',
      port: 3012,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/static': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    },
    build: {
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['vue', 'vue-router', 'pinia', 'vue-i18n', 'axios'],
            'element-plus': ['element-plus', '@element-plus/icons-vue'],
          }
        }
      }
    }
  }
})
