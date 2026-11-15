/**
 * usePopover — 全站统一的浮层定位与生命周期
 *
 * 行为规范（所有下拉/菜单强制一致）：
 * - 定位：fixed + getBoundingClientRect，水平按 placement 对齐并钳制视口，
 *   下方空间不足且上方更大时翻转到上方
 * - 滚动（面板自身滚动除外）/ resize → 关闭
 * - Escape → 关闭并把焦点还回触发器
 * - pointerdown outside → 关闭（点击继续生效，不用 backdrop 元素：
 *   backdrop 会盖住触发器导致点触发器关不掉，且要成对维护 z-index）
 */
import { ref, watch, nextTick, onBeforeUnmount, type CSSProperties, type Ref } from 'vue'

export interface PopoverOptions {
  placement?: 'bottom-start' | 'bottom-end' | 'bottom'
  offset?: number
  matchWidth?: boolean
  minWidth?: number
  maxHeight?: number
  viewportMargin?: number
}

export interface PopoverReturn {
  isOpen: Ref<boolean>
  anchorEl: Ref<HTMLElement | null>
  panelEl: Ref<HTMLElement | null>
  panelStyle: Ref<CSSProperties>
  placement: Ref<'bottom' | 'top'>
  open: () => void
  close: () => void
  toggle: () => void
}

export function usePopover(opts: PopoverOptions = {}): PopoverReturn {
  const isOpen = ref(false)
  const anchorEl = ref<HTMLElement | null>(null)
  const panelEl = ref<HTMLElement | null>(null)
  const panelStyle = ref<CSSProperties>({})
  const placement = ref<'bottom' | 'top'>('bottom')

  const offset = opts.offset ?? 6
  const margin = opts.viewportMargin ?? 12
  const minWidth = opts.minWidth ?? 160
  const maxHeight = opts.maxHeight ?? 320

  async function position() {
    const rect = anchorEl.value?.getBoundingClientRect()
    if (!rect) return
    const width = opts.matchWidth ? rect.width : Math.max(minWidth, rect.width)

    let left = rect.left
    if (opts.placement === 'bottom-end') left = rect.right - width
    else if (opts.placement === 'bottom') left = rect.left + rect.width / 2 - width / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))

    placement.value = 'bottom'
    panelStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + offset}px`,
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
    }

    // 面板渲染后测真实高度，下方不够且上方更大则翻转
    await nextTick()
    const h = panelEl.value?.offsetHeight ?? 0
    const below = window.innerHeight - rect.bottom - margin
    const above = rect.top - margin
    if (below < Math.min(h, 240) && above > below) {
      placement.value = 'top'
      panelStyle.value = {
        ...panelStyle.value,
        top: `${Math.max(margin, rect.top - h - offset)}px`,
      }
    }
  }

  function onScroll(e: Event) {
    if (panelEl.value && e.target instanceof Node && panelEl.value.contains(e.target)) return
    close()
  }
  function onResize() { close() }
  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    close()
    anchorEl.value?.focus?.()
  }
  function onPointerDown(e: PointerEvent) {
    const t = e.target as Node
    if (anchorEl.value?.contains(t) || panelEl.value?.contains(t)) return
    close()
  }

  function detachListeners() {
    document.removeEventListener('scroll', onScroll, true)
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('keydown', onKeydown)
    window.removeEventListener('resize', onResize)
  }

  watch(isOpen, async (v) => {
    if (v) {
      await position()
      document.addEventListener('scroll', onScroll, true)
      document.addEventListener('pointerdown', onPointerDown, true)
      document.addEventListener('keydown', onKeydown)
      window.addEventListener('resize', onResize)
    } else {
      detachListeners()
    }
  })
  onBeforeUnmount(detachListeners)

  function open() { isOpen.value = true }
  function close() { isOpen.value = false }
  function toggle() { isOpen.value ? close() : open() }

  return { isOpen, anchorEl, panelEl, panelStyle, placement, open, close, toggle }
}
