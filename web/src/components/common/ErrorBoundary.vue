<template>
  <slot v-if="!error" />
  <div v-else class="error-boundary">
    <div class="error-boundary__content">
      <el-icon :size="48" color="var(--error)"><WarningFilled /></el-icon>
      <h3>{{ $t('common.error') }}</h3>
      <p>{{ error.message }}</p>
      <el-button type="primary" @click="reset">{{ $t('common.reset') }}</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'

const error = ref<Error | null>(null)

onErrorCaptured((err: Error) => {
  error.value = err
  return false
})

function reset() {
  error.value = null
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 2rem;
}

.error-boundary__content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.error-boundary__content h3 {
  color: var(--text-primary);
  margin: 0;
}

.error-boundary__content p {
  color: var(--text-secondary);
  margin: 0;
}
</style>
