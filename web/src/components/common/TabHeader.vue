<template>
  <div class="tab-header">
    <div v-if="!insideFlow" class="tab-header-top">
      <h2 class="tab-header-title">{{ title }}</h2>
      <div v-if="$slots.actions" class="tab-header-actions">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.filter" class="tab-header-filter">
      <slot name="filter" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'

defineProps<{
  title: string
}>()

const insideFlow = inject('insideFlowSection', false)
</script>

<style scoped>
.tab-header {
  margin-bottom: var(--space-4);
}

.tab-header-top {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

@media (min-width: 640px) {
  .tab-header-top {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.tab-header-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.tab-header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tab-header-filter {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-3);
  flex-wrap: wrap;
}
</style>
