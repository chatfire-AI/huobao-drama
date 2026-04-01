<template>
  <div class="base-select" ref="rootEl">
    <!-- Trigger -->
    <button type="button" class="base-select-trigger" :class="{ open: isOpen }" @click="toggle">
      <span :class="selectedLabel ? '' : 'placeholder'" class="base-select-label">{{ selectedLabel || placeholder }}</span>
      <ChevronDown :size="13" class="base-select-arrow" />
    </button>

    <!-- Dropdown -->
    <Teleport to="body">
      <div v-if="isOpen" class="base-select-dropdown" :style="dropdownStyle" ref="dropdownEl">
        <!-- Search -->
        <div v-if="searchable" class="base-select-search">
          <Search :size="12" />
          <input
            ref="searchInputEl"
            v-model="searchQuery"
            class="base-select-search-input"
            placeholder="搜索..."
            @keydown="onSearchKeydown"
          />
        </div>

        <!-- Options -->
        <div class="base-select-options" ref="optionsEl">
          <template v-if="flatOptions.length">
            <template v-for="(group, gi) in filteredGroups" :key="gi">
              <div v-if="group.label" class="base-select-group-label">{{ group.label }}</div>
              <button
                v-for="(opt, oi) in group.options"
                :key="opt.value"
                type="button"
                :class="['base-select-option', { selected: opt.value === modelValue, highlighted: highlightedIdx === getGlobalIdx(gi, oi) }]"
                @click="pick(opt)"
                @mousemove="highlightedIdx = getGlobalIdx(gi, oi)"
              >{{ opt.label }}</button>
            </template>
          </template>
          <div v-else class="base-select-empty">无匹配结果</div>
        </div>
      </div>
    </Teleport>

    <!-- Backdrop -->
    <Teleport to="body">
      <div v-if="isOpen" class="base-select-backdrop" @click="isOpen = false" />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { ChevronDown, Search } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] }, // [{ label, value, group? }, ...] or [{ label, group, options: [] }]
  placeholder: { type: String, default: '请选择...' },
  searchable: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const searchQuery = ref('')
const rootEl = ref()
const dropdownEl = ref()
const searchInputEl = ref()
const optionsEl = ref()
const highlightedIdx = ref(-1)
const dropdownStyle = ref({})

// Normalize options: support both flat list and grouped format
const normalizedGroups = computed(() => {
  if (!props.options.length) return []
  // Check if already grouped
  if (props.options[0]?.options) {
    return props.options.map(g => ({
      label: g.label || '',
      options: g.options.map(o => ({ label: o.label ?? o, value: o.value ?? o })),
    }))
  }
  // Flat list with optional group property
  const map = new Map()
  for (const o of props.options) {
    const label = o.group || ''
    if (!map.has(label)) map.set(label, [])
    map.get(label).push({ label: o.label ?? o, value: o.value ?? o })
  }
  return Array.from(map.entries()).map(([label, options]) => ({ label, options }))
})

// Filter by search query
const filteredGroups = computed(() => {
  if (!searchQuery.value) return normalizedGroups.value
  const q = searchQuery.value.toLowerCase()
  return normalizedGroups.value
    .map(g => ({
      label: g.label,
      options: g.options.filter(o => o.label.toLowerCase().includes(q)),
    }))
    .filter(g => g.options.length > 0)
})

// Flatten for keyboard nav
const flatOptions = computed(() => filteredGroups.value.flatMap(g => g.options))

function getGlobalIdx(gi, oi) {
  let idx = 0
  for (let i = 0; i < gi; i++) idx += normalizedGroups.value[i].options.length
  return idx + oi
}

function resolveIdx(globalIdx) {
  for (let gi = 0; gi < filteredGroups.value.length; gi++) {
    const cnt = filteredGroups.value[gi].options.length
    if (globalIdx < cnt) return [gi, globalIdx]
    globalIdx -= cnt
  }
  return [0, 0]
}

const selectedLabel = computed(() => {
  for (const g of normalizedGroups.value) {
    const found = g.options.find(o => o.value === props.modelValue)
    if (found) return found.label
  }
  return ''
})

function toggle() {
  isOpen.value ? close() : open()
}

async function open() {
  isOpen.value = true
  highlightedIdx.value = flatOptions.value.findIndex(o => o.value === props.modelValue)
  await nextTick()
  searchQuery.value = ''
  searchInputEl.value?.focus()
  positionDropdown()
}

function close() {
  isOpen.value = false
  searchQuery.value = ''
}

function pick(opt) {
  emit('update:modelValue', opt.value)
  close()
}

function positionDropdown() {
  const rect = rootEl.value?.getBoundingClientRect()
  if (!rect) return
  const top = rect.bottom + 4
  const left = rect.left
  // Keep within viewport
  const maxHeight = window.innerHeight - top - 16
  dropdownStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${rect.width}px`,
    maxHeight: `${Math.min(maxHeight, 400)}px`,
  }
}

function onSearchKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightedIdx.value = Math.min(highlightedIdx.value + 1, flatOptions.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightedIdx.value = Math.max(highlightedIdx.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (highlightedIdx.value >= 0 && flatOptions.value[highlightedIdx.value]) {
      pick(flatOptions.value[highlightedIdx.value])
    }
  } else if (e.key === 'Escape') {
    close()
  }
}

watch(isOpen, val => {
  if (val) document.addEventListener('scroll', positionDropdown, true)
  else document.removeEventListener('scroll', positionDropdown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('scroll', positionDropdown, true)
})
</script>

<style scoped>
.base-select {
  position: relative;
  display: inline-flex;
  width: 100%;
  min-width: 0;
}

.base-select-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 7px 28px 7px 10px;
  font-size: 12px;
  font-family: var(--font-body);
  color: var(--text-0);
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
  white-space: nowrap;
  min-width: 0;
  width: 100%;
  max-width: none;
  flex-shrink: 0;
}
.base-select-trigger:hover {
  border-color: var(--border-strong);
  background: var(--bg-0);
}
.base-select-trigger.open {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-glow);
  background: var(--bg-0);
}
.base-select-trigger .placeholder {
  color: var(--text-3);
  font-weight: 300;
}
.base-select-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  text-align: left;
}

.base-select-arrow {
  margin-left: auto;
  color: var(--text-2);
  transition: transform 0.2s var(--ease-out);
  flex-shrink: 0;
}
.base-select-trigger.open .base-select-arrow {
  transform: rotate(180deg);
}

/* Dropdown */
.base-select-dropdown {
  background: var(--bg-0);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 9999;
  animation: baseSelectIn 0.15s var(--ease-out);
}

.base-select-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text-2);
}
.base-select-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  font-family: var(--font-body);
  color: var(--text-0);
}
.base-select-search-input::placeholder {
  color: var(--text-3);
}

.base-select-options {
  overflow-y: auto;
  max-height: 260px;
  padding: 4px;
}

.base-select-group-label {
  padding: 6px 10px 3px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-3);
  margin-top: 4px;
}
.base-select-group-label:first-child {
  margin-top: 0;
}

.base-select-option {
  display: block;
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  font-family: var(--font-body);
  color: var(--text-1);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
  word-break: break-all;
}
.base-select-option:hover,
.base-select-option.highlighted {
  background: var(--bg-hover);
  color: var(--text-0);
}
.base-select-option.selected {
  background: var(--accent-bg);
  color: var(--accent-dark);
  font-weight: 600;
}

.base-select-empty {
  padding: 16px 12px;
  font-size: 13px;
  color: var(--text-3);
  text-align: center;
}

.base-select-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

@keyframes baseSelectIn {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
