import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'system'

export const useUIStore = defineStore('ui', () => {
  const theme = ref<ThemeMode>(
    (localStorage.getItem('theme') as ThemeMode) || 'system'
  )
  const language = ref(localStorage.getItem('language') || 'zh-CN')
  const globalLoading = ref(false)

  const isDark = ref(document.documentElement.classList.contains('dark'))

  function applyTheme(mode: ThemeMode) {
    theme.value = mode
    localStorage.setItem('theme', mode)

    if (mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
      isDark.value = true
    } else {
      document.documentElement.classList.remove('dark')
      isDark.value = false
    }
  }

  function setLanguage(lang: string) {
    language.value = lang
    localStorage.setItem('language', lang)
  }

  return {
    theme,
    language,
    globalLoading,
    isDark,
    applyTheme,
    setLanguage
  }
})
