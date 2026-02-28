<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="app-main">
      <div class="glass-page">
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
  background: var(--bg-primary);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.glass-page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-6);
  background:
    radial-gradient(ellipse at top left, rgba(47, 123, 255, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(92, 168, 255, 0.06) 0%, transparent 50%),
    var(--bg-primary);
}

.glass-page:has(.fullscreen) {
  padding: 0;
  background: var(--bg-primary);
}

.dark .glass-page {
  background:
    radial-gradient(ellipse at top left, rgba(47, 123, 255, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(92, 168, 255, 0.08) 0%, transparent 50%),
    var(--bg-primary);
}
</style>
