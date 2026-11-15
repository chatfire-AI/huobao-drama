/**
 * 应用内引导漫游（driver.js）— 轻量方案
 *
 * - 各页面定义步骤（selector + i18n 文案 key），经 startTour() 启动
 * - 「看过」标记存服务端 app_settings（tours_seen）：桌面端每次启动端口随机，
 *   localStorage 随 origin 失效，故落库；localStorage 仅作离线兜底缓存
 * - 首次自动弹、帮助按钮随时重看；跳过/完成都算看过
 * - 主题样式沿用设计 token（火焰橙 accent），见 app.vue 内 .driver-theme 覆写
 */
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const SEEN_KEY = 'huobao:tours'

let seenSet = new Set<string>()
let hydrated = false
let hydratePromise: Promise<void> | null = null

function readLocal(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') } catch { return [] }
}

function writeLocal(ids: string[]) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
}

/**
 * 从服务端拉取已看过的 tour id，与本地缓存取并集（保留升级前 localStorage 里的标记）。
 * 由客户端插件在应用启动时调用；autoTour 在 onMounted 后延迟数百 ms 触发，此时已就绪。
 */
export function hydrateTours(): Promise<void> {
  if (hydratePromise) return hydratePromise
  hydratePromise = (async () => {
    try {
      const res = await fetch('/api/v1/settings/tours-seen')
      const json = await res.json().catch(() => null)
      const server: string[] = Array.isArray(json?.data?.seen) ? json.data.seen : []
      seenSet = new Set([...server, ...readLocal()])
    } catch {
      seenSet = new Set(readLocal())
    }
    hydrated = true
    writeLocal([...seenSet])
  })()
  return hydratePromise
}

export function tourSeen(id: string): boolean {
  return seenSet.has(id) || readLocal().includes(id)
}

export function markTourSeen(id: string) {
  if (seenSet.has(id)) return
  seenSet.add(id)
  writeLocal([...seenSet])
  // 落库（fire-and-forget）；未水合时先合并服务端数据避免覆盖其他页面已标记的 tour
  void (async () => {
    try {
      if (!hydrated) await hydrateTours()
      seenSet.add(id)
      await fetch('/api/v1/settings/tours-seen', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seen: [...seenSet] }),
      })
    } catch { /* 服务端不可达时 localStorage 已兜底 */ }
  })()
}

export interface TourStep {
  element: string            // CSS selector；'#__nuxt' 等兜底表示居中弹窗（无高亮）
  titleKey: string           // i18n key
  descKey: string            // i18n key
  popoverSide?: 'top' | 'bottom' | 'left' | 'right'
  popoverAlign?: 'start' | 'center' | 'end'
}

/**
 * 启动一段引导。t 为 useI18n 的翻译函数。
 * 返回是否真正启动（元素缺失或步骤为空时静默跳过）。
 */
export function startTour(id: string, steps: TourStep[], t: (key: string) => string): boolean {
  const usable = steps.filter(s => s.element === '#__nuxt' || document.querySelector(s.element))
  if (!usable.length) return false

  const drv = driver({
    showProgress: true,
    allowClose: true,
    overlayClickBehavior: 'nextStep',
    popoverClass: 'huobao-tour-popover',
    progressText: '{{current}} / {{total}}',
    nextBtnText: t('tour.next'),
    prevBtnText: t('tour.prev'),
    doneBtnText: t('tour.done'),
    onDestroyed: () => markTourSeen(id),
    steps: usable.map(s => ({
      element: s.element,
      popover: {
        title: t(s.titleKey),
        description: t(s.descKey),
        side: s.popoverSide || 'bottom',
        align: s.popoverAlign || 'start',
      },
    })),
  })
  drv.drive()
  return true
}

/** 首次进入自动引导：看过或元素未就绪则跳过 */
export function autoTour(id: string, steps: TourStep[], t: (key: string) => string) {
  if (tourSeen(id)) return
  startTour(id, steps, t)
}
