<template>
  <button
    type="button"
    class="app-menu-item"
    :class="{ selected, danger }"
    :disabled="disabled"
    role="menuitem"
    :aria-selected="selected || undefined"
  >
    <Check :size="12" class="app-menu-item-check" />
    <span class="app-menu-item-label"><slot /></span>
    <span v-if="$slots.trailing" class="app-menu-item-trailing"><slot name="trailing" /></span>
  </button>
</template>

<script setup lang="ts">
import { Check } from 'lucide-vue-next'

/** AppMenuItem — 统一菜单项：选中左侧勾（占位对齐）、危险项、trailing 徽章槽 */
defineProps<{
  selected?: boolean
  danger?: boolean
  disabled?: boolean
}>()
</script>
