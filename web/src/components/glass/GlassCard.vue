<script setup lang="ts">
interface Props {
  elevated?: boolean
  hoverable?: boolean
}

withDefaults(defineProps<Props>(), {
  elevated: false,
  hoverable: false,
})
</script>

<template>
  <div
    :class="[
      elevated ? 'glass-surface-elevated' : 'glass-surface',
      hoverable && 'hover-lift'
    ]"
  >
    <slot />
  </div>
</template>
