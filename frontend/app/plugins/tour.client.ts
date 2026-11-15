/**
 * 启动时预取「已看过的引导漫游」标记（存服务端 app_settings）。
 * 不 await：autoTour 在各页面 onMounted 后延迟数百 ms 触发，水合早已完成；
 * 失败时 useTour 自动回退 localStorage。
 */
import { hydrateTours } from '~/composables/useTour'

export default defineNuxtPlugin(() => {
  void hydrateTours()
})
