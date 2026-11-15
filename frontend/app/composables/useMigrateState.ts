/**
 * 存储迁移全局状态（模块级单例）。
 * MigrateOverlay 据此渲染全屏遮罩；迁移由设置页触发，进度经 preload 订阅回填。
 */
import { reactive } from 'vue'
import { i18n } from './i18n'

interface MigrateState {
  active: boolean
  phase: string
  percent: number
  message: string
}

const state = reactive<MigrateState>({
  active: false,
  phase: '',
  percent: 0,
  message: '',
})

// 渲染/调用时经 i18n.global.t 求值，语言切换即时生效（不能模块级常量固化）
function phaseText(phase: string): string {
  const t = i18n.global.t
  const keys: Record<string, string> = {
    validating: 'migrate.phases.validating',
    stopping: 'migrate.phases.stopping',
    moving: 'migrate.phases.moving',
    config: 'migrate.phases.config',
    restarting: 'migrate.phases.restarting',
    done: 'migrate.phases.done',
    error: 'migrate.phases.error',
  }
  return keys[phase] ? t(keys[phase]) : phase
}

export function useMigrateState() {
  function begin() {
    state.active = true
    state.phase = 'validating'
    state.percent = 0
    state.message = phaseText('validating')
  }

  function update(p: { phase: string, message?: string, copiedBytes?: number, totalBytes?: number }) {
    state.phase = p.phase
    if (p.phase === 'moving' && p.totalBytes) {
      state.percent = Math.min(99, Math.round(((p.copiedBytes ?? 0) / p.totalBytes) * 100))
      state.message = i18n.global.t('migrate.phases.movingProgress', {
        copied: formatBytes(p.copiedBytes ?? 0),
        total: formatBytes(p.totalBytes),
      })
    } else {
      state.message = p.message || phaseText(p.phase)
      if (p.phase === 'done') state.percent = 100
    }
  }

  function end() {
    state.active = false
  }

  return { state, begin, update, end }
}

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${n} B`
}
