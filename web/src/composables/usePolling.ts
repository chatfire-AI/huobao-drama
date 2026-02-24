import { ref, onUnmounted } from 'vue'

interface UsePollingOptions {
  /** Polling interval in ms */
  interval?: number
  /** Max number of attempts before stopping (0 = unlimited) */
  maxAttempts?: number
  /** Called when polling completes naturally (max attempts reached) */
  onTimeout?: () => void
}

interface PollController {
  stop: () => void
}

export function usePolling() {
  const isPolling = ref(false)
  const timers = new Set<ReturnType<typeof setInterval>>()

  /**
   * Start polling with a callback. The callback can return `true` to stop polling early.
   * Returns a controller with a stop() method.
   */
  function poll(
    fn: () => Promise<boolean | void>,
    options: UsePollingOptions = {}
  ): PollController {
    const { interval = 3000, maxAttempts = 0, onTimeout } = options

    let attempts = 0
    let stopped = false
    isPolling.value = true

    const timer = setInterval(async () => {
      if (stopped) return

      attempts++
      try {
        const shouldStop = await fn()
        if (shouldStop) {
          controller.stop()
          return
        }
      } catch (error) {
        console.error('[usePolling] callback error:', error)
      }

      if (maxAttempts > 0 && attempts >= maxAttempts) {
        controller.stop()
        onTimeout?.()
      }
    }, interval)

    timers.add(timer)

    const controller: PollController = {
      stop() {
        if (stopped) return
        stopped = true
        clearInterval(timer)
        timers.delete(timer)
        if (timers.size === 0) {
          isPolling.value = false
        }
      }
    }

    return controller
  }

  /**
   * Async polling that blocks until complete/fail/timeout.
   * The checker function should return:
   * - 'continue' to keep polling
   * - 'done' to resolve
   * - 'error' to reject with an optional error message
   */
  function pollAsync(
    fn: () => Promise<'continue' | 'done' | { status: 'error'; message?: string }>,
    options: UsePollingOptions = {}
  ): Promise<void> {
    const { interval = 3000, maxAttempts = 60 } = options

    return new Promise((resolve, reject) => {
      let attempts = 0
      let stopped = false

      const timer = setInterval(async () => {
        if (stopped) return

        attempts++
        try {
          const result = await fn()
          if (result === 'done') {
            cleanup()
            resolve()
          } else if (typeof result === 'object' && result.status === 'error') {
            cleanup()
            reject(new Error(result.message || 'Polling failed'))
          }
          // 'continue' - keep going
        } catch (error) {
          cleanup()
          reject(error)
        }

        if (maxAttempts > 0 && attempts >= maxAttempts) {
          cleanup()
          reject(new Error('Polling timeout'))
        }
      }, interval)

      timers.add(timer)
      isPolling.value = true

      function cleanup() {
        if (stopped) return
        stopped = true
        clearInterval(timer)
        timers.delete(timer)
        if (timers.size === 0) {
          isPolling.value = false
        }
      }
    })
  }

  function stopAll() {
    timers.forEach((timer) => clearInterval(timer))
    timers.clear()
    isPolling.value = false
  }

  onUnmounted(() => {
    stopAll()
  })

  return { isPolling, poll, pollAsync, stopAll }
}