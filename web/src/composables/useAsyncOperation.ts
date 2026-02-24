import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

interface AsyncOperationOptions {
  successMessage?: string
  errorMessage?: string
  showSuccessMessage?: boolean
  showErrorMessage?: boolean
}

export function useAsyncOperation() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function execute<T>(
    fn: () => Promise<T>,
    options: AsyncOperationOptions = {}
  ): Promise<T | undefined> {
    const {
      successMessage,
      errorMessage,
      showSuccessMessage = false,
      showErrorMessage = true
    } = options

    loading.value = true
    error.value = null

    try {
      const result = await fn()
      if (showSuccessMessage && successMessage) {
        ElMessage.success(successMessage)
      }
      return result
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : errorMessage || 'Operation failed'
      error.value = message
      if (showErrorMessage) {
        ElMessage.error(message)
      }
      return undefined
    } finally {
      loading.value = false
    }
  }

  return { loading, error, execute }
}
