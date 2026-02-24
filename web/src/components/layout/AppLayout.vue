<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="app-main">
      <div class="app-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-6);
  background: var(--bg-primary);
}
</style>
