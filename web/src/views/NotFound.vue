<template>
  <div class="not-found">
    <div class="not-found__content">
      <h1 class="not-found__code">404</h1>
      <p class="not-found__message">{{ $t('common.noData') }}</p>
      <el-button type="primary" @click="$router.push('/')">
        {{ $t('nav.home') }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  flex: 1;
  background: var(--bg-primary);
}

.not-found__content {
  text-align: center;
}

.not-found__code {
  font-size: 6rem;
  font-weight: 700;
  color: var(--text-muted);
  margin: 0;
  line-height: 1;
}

.not-found__message {
  color: var(--text-secondary);
  margin: 1rem 0 2rem;
  font-size: 1.125rem;
}
</style>
