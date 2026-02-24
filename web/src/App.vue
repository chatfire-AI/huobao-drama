<template>
  <ErrorBoundary>
    <component :is="layout">
      <router-view />
    </component>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import AppLayout from '@/components/layout/AppLayout.vue'

const route = useRoute()

// Fullscreen pages (EpisodeWorkflow, ProfessionalEditor) use their own layout
const layout = computed(() => {
  return route.meta.fullscreen ? 'div' : AppLayout
})
</script>
