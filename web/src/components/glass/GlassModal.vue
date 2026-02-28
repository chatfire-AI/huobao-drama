<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'

interface Props {
  visible: boolean
  title?: string
  width?: string
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: '520px',
  closable: true,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const handleOverlayClick = (event: MouseEvent) => {
  if ((event.target as HTMLElement).classList.contains('glass-modal-overlay')) {
    handleClose()
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.visible) {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})

watch(() => props.visible, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="glass-modal">
      <div
        v-if="visible"
        class="glass-modal-overlay glass-overlay"
        @click="handleOverlayClick"
      >
        <div
          class="glass-modal-container glass-surface-modal"
          :style="{ width }"
        >
          <div v-if="title || closable" class="glass-modal-header">
            <h3 v-if="title" class="glass-modal-title">{{ title }}</h3>
            <button
              v-if="closable"
              class="glass-modal-close"
              @click="handleClose"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="glass-modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="glass-modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.glass-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.glass-modal-container {
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  animation: scale-in 0.2s ease-out;
}

.glass-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--glass-space-5) var(--glass-space-6);
  border-bottom: 1px solid var(--glass-stroke-soft);
}

.glass-modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--glass-text-primary);
  margin: 0;
}

.glass-modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--glass-text-tertiary);
  cursor: pointer;
  border-radius: var(--glass-radius-xs);
  transition: all 0.2s ease;
}

.glass-modal-close:hover {
  background: var(--glass-bg-muted);
  color: var(--glass-text-secondary);
}

.glass-modal-body {
  padding: var(--glass-space-6);
}

.glass-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--glass-space-3);
  padding: var(--glass-space-4) var(--glass-space-6);
  border-top: 1px solid var(--glass-stroke-soft);
}

/* Transition */
.glass-modal-enter-active,
.glass-modal-leave-active {
  transition: opacity 0.2s ease;
}

.glass-modal-enter-active .glass-modal-container,
.glass-modal-leave-active .glass-modal-container {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.glass-modal-enter-from,
.glass-modal-leave-to {
  opacity: 0;
}

.glass-modal-enter-from .glass-modal-container,
.glass-modal-leave-to .glass-modal-container {
  transform: scale(0.95);
  opacity: 0;
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
