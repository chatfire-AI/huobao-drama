/**
 * 制作流水线偏好（本地持久化 + 可选构建时默认）
 */
const STORAGE_KEY = 'huobao:pipeline:skipVideoCompose'

const skipVideoCompose = ref(false)
let synced = false

function readInitial(): boolean {
  if (!import.meta.client) return false
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw !== null) return raw === '1' || raw === 'true'
  try {
    const pub = useRuntimeConfig().public as { skipVideoCompose?: boolean }
    return !!pub.skipVideoCompose
  } catch {
    return false
  }
}

export function usePipelinePrefs() {
  if (import.meta.client && !synced) {
    synced = true
    skipVideoCompose.value = readInitial()
  }

  function setSkipVideoCompose(v: boolean) {
    skipVideoCompose.value = v
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
  }

  return { skipVideoCompose, setSkipVideoCompose }
}
