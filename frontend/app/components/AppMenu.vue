<template>
  <span ref="anchorEl" class="app-menu-anchor" :class="{ block }" @click="toggle">
    <slot name="trigger" :open="isOpen" />
  </span>
  <Teleport to="body">
    <Transition name="app-menu">
      <div
        v-if="isOpen"
        ref="panelEl"
        class="app-menu"
        :style="panelStyle"
        :data-placement="placement"
        role="menu"
      >
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { usePopover } from '~/composables/usePopover'

/**
 * AppMenu — 全站统一的下拉菜单面板（Teleport + 统一定位/动效/层级）
 * 触发器由调用方通过 trigger slot 自定义（保留各自形态），只统一菜单层。
 * 菜单项请使用 AppMenuItem。
 */
const props = withDefaults(defineProps<{
  open?: boolean
  placement?: 'bottom-start' | 'bottom-end' | 'bottom'
  matchWidth?: boolean
  minWidth?: number
  maxHeight?: number
  block?: boolean
}>(), {
  open: undefined,
  placement: 'bottom-start',
  matchWidth: false,
  minWidth: 160,
  maxHeight: 320,
  block: false,
})
const emit = defineEmits<{ 'update:open': [boolean] }>()

const { isOpen, anchorEl, panelEl, panelStyle, placement: actualPlacement, toggle } = usePopover({
  placement: props.placement,
  matchWidth: props.matchWidth,
  minWidth: props.minWidth,
  maxHeight: props.maxHeight,
})

// 外部 v-model:open 与内部状态双向桥接
watch(() => props.open, (v) => { if (v !== undefined && v !== isOpen.value) isOpen.value = v })
watch(isOpen, (v) => emit('update:open', v))

const placement = actualPlacement
</script>
