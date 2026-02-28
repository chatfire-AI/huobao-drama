<script setup lang="ts">
interface Props {
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
}

withDefaults(defineProps<Props>(), {
  variant: 'neutral',
})
</script>

<template>
  <span :class="['glass-chip', `glass-chip-${variant}`]">
    <slot />
  </span>
</template>
