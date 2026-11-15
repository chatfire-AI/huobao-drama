/**
 * 主题模式（模块级单例）
 * - 与 i18n.ts 同构：ssr:false，模块顶层读 localStorage 安全
 * - 模块顶层同步写 <html data-theme>，先于首帧执行，避免深色/浅色闪烁
 *   （不能用 app.vue onMounted——首帧之后才执行必闪）
 * - 跟随系统：matchMedia('(prefers-color-scheme: dark)')，Web/桌面（Electron
 *   默认 nativeTheme.themeSource='system'）通用，无需桌面桥
 */
import { computed, readonly, ref, watch, type ComputedRef } from 'vue'

export const THEME_STORAGE_KEY = 'huobao:theme'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system']

export function readStoredThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (v && (THEME_MODES as string[]).includes(v)) return v as ThemeMode
  } catch { /* localStorage 不可用时回退默认 */ }
  return 'system'
}

export function persistThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch { /* 忽略持久化失败 */ }
}

const themeMode = ref<ThemeMode>(readStoredThemeMode())
const systemDark = ref(false)

export const resolvedTheme: ComputedRef<ResolvedTheme> = computed(() =>
  themeMode.value === 'system' ? (systemDark.value ? 'dark' : 'light') : themeMode.value,
)

function applyTheme() {
  document.documentElement.dataset.theme = resolvedTheme.value
}

if (typeof window !== 'undefined') {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = mql.matches
  applyTheme()
  mql.addEventListener('change', (e) => {
    systemDark.value = e.matches
    applyTheme()
  })
  watch(themeMode, applyTheme)
}

/** 切换主题模式并持久化（设置页外观卡片与 ThemeToggle 共用） */
export function setThemeMode(mode: ThemeMode) {
  themeMode.value = mode
  persistThemeMode(mode)
}

/** light → dark → system 循环（头部快捷按钮用） */
export function cycleThemeMode() {
  const i = THEME_MODES.indexOf(themeMode.value)
  setThemeMode(THEME_MODES[(i + 1) % THEME_MODES.length])
}

export function useTheme() {
  return {
    themeMode: readonly(themeMode),
    resolvedTheme,
    setThemeMode,
    cycleThemeMode,
  }
}
