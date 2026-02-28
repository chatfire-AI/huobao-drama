<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">{{ $t('sidebar.assets') }}</h1>
    </div>
    <div class="page-content">
      <el-empty :description="$t('common.comingSoon')" />
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.page-container {
  height: 100%;
}

.page-header {
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}
</style>
