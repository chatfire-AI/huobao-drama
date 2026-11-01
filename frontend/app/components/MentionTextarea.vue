<template>
  <div class="mention-textarea" ref="wrapEl">
    <!-- 高亮镜像层：渲染与 textarea 完全相同的文本，@引用 着彩色；textarea 文字透明、仅显示光标 -->
    <div ref="backdropEl" :class="[inputClass, 'mention-backdrop']" aria-hidden="true">
      <div class="mention-backdrop-content" v-html="highlightedHtml"></div>
    </div>
    <textarea
      ref="taEl"
      :class="[inputClass, 'mention-input']"
      :rows="rows"
      :placeholder="placeholder"
      :value="text"
      @input="onInput"
      @keydown="onKeydown"
      @blur="onBlur"
      @click="closeMention"
      @scroll="onScroll"
    />
    <Teleport to="body">
      <div v-if="mention.open" ref="dropdownEl" class="mention-dropdown" :style="mentionStyle">
        <template v-if="groupedFiltered.length">
          <template v-for="(group, gi) in groupedFiltered" :key="group.group">
            <div class="mention-group-label">{{ group.group }}</div>
            <button
              v-for="(opt, oi) in group.options"
              :key="group.group + '-' + opt.value"
              type="button"
              :class="['mention-option', { highlighted: flatIndex(gi, oi) === highlightIdx }]"
              @mousedown.prevent="pick(opt)"
              @mousemove="highlightIdx = flatIndex(gi, oi)"
            >
              <span :class="['mention-avatar', `mention-avatar-${opt.kind === 'scene' ? 'scene' : (opt.kind === 'prop' ? 'prop' : 'role')}`]">
                <img v-if="opt.image" :src="opt.image" alt="" @error="$event.target.style.display = 'none'" />
                <component v-else :is="groupIcon(opt.kind)" :size="12" :stroke-width="2" />
              </span>
              <span class="mention-name">{{ opt.trigger || '@' }}{{ opt.label }}</span>
              <span class="mention-type">{{ opt.group }}</span>
            </button>
          </template>
        </template>
        <div v-else class="mention-empty">{{ t(mention.trigger === '#' ? 'characterVoice.noMatch' : 'components.mention.noMatch') }}</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { User, MapPin, Package, AudioLines } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { mentionToken, mentionEntries, activeMentionAt, highlightMentions, mentionDeletionRange } from '../utils/prompt-mentions.js'

const { t } = useI18n()

// 无图资产在下拉中显示分组图标兜底（场景=定位、道具=包裹、角色=人物）——按 kind code 判断，不依赖显示文案
const groupIcon = (kind) => (kind === 'voice' ? AudioLines : kind === 'scene' ? MapPin : kind === 'prop' ? Package : User)

const props = defineProps({
  modelValue: { type: String, default: '' },
  // [{ label, value, kind, group, image?, trigger? }] — 默认 @图片引用，#角色音色引用
  options: { type: Array, default: () => [] },
  rows: { type: [Number, String], default: 4 },
  placeholder: { type: String, default: '' },
  inputClass: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'commit'])

const wrapEl = ref(null)
const taEl = ref(null)
const backdropEl = ref(null)
const text = ref(props.modelValue)
const mention = ref({ open: false, start: 0, trigger: '@', query: '', top: 0, left: 0 })
const highlightIdx = ref(0)
const dropdownEl = ref(null)

// 键盘上下移动高亮时，让高亮项自动滚动进下拉可视区（鼠标 mousemove 触发的跳转也保持可见）
watch(highlightIdx, () => {
  nextTick(() => {
    dropdownEl.value
      ?.querySelector('.mention-option.highlighted')
      ?.scrollIntoView({ block: 'nearest' })
  })
})

const DROPDOWN_WIDTH = 240
const DROPDOWN_MAX_HEIGHT = 220

// 下拉 Teleport 到 body 后用 fixed 定位，任何外层滚动/窗口变化都会使其错位 → 直接关闭
function closeOnOuterScroll(e) {
  if (mention.value.open && e?.target !== taEl.value && !dropdownEl.value?.contains(e?.target)) closeMention()
}
onMounted(() => {
  window.addEventListener('scroll', closeOnOuterScroll, true)
  window.addEventListener('resize', closeOnOuterScroll)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', closeOnOuterScroll, true)
  window.removeEventListener('resize', closeOnOuterScroll)
})

watch(() => props.modelValue, (v) => {
  if (v !== text.value) { text.value = v; mention.value.open = false }
})

// 可引用名（按长度降序，保证最长匹配优先）及其分组样式（kind code 判断）
const mentionNames = computed(() => mentionEntries(props.options))
const highlightedHtml = computed(() => highlightMentions(text.value, props.options))

// 光标前最近一个 @token（@ 后不含空白），命中则处于引用输入态
function activeMention() {
  const ta = taEl.value
  if (!ta) return null
  return activeMentionAt(ta.value, ta.selectionStart, props.options)
}

// 光标紧邻一个完整 @引用（用于整体删除）
function mentionBeforeCaret() {
  const ta = taEl.value
  return mentionDeletionRange(ta.value, ta.selectionStart, props.options, true)
}
function mentionAfterCaret() {
  const ta = taEl.value
  return mentionDeletionRange(ta.value, ta.selectionStart, props.options, false)
}

const filteredOptions = computed(() => {
  const q = mention.value.query.trim().toLowerCase()
  const options = props.options.filter(o => (o.trigger || '@') === mention.value.trigger)
  if (!q) return options
  return options.filter(o =>
    String(o.value).toLowerCase().includes(q) || String(o.label || '').toLowerCase().includes(q),
  )
})

const groupedFiltered = computed(() => {
  const groups = []
  for (const opt of filteredOptions.value) {
    const name = opt.group || t('components.mention.fallbackGroup')
    const g = groups.find(item => item.group === name)
    if (g) g.options.push(opt)
    else groups.push({ group: name, options: [opt] })
  }
  return groups
})

const flatList = computed(() => groupedFiltered.value.flatMap(g => g.options))

function flatIndex(gi, oi) {
  let idx = 0
  for (let g = 0; g < gi; g++) idx += groupedFiltered.value[g].options.length
  return idx + oi
}

// 下拉为 fixed 定位（Teleport 到 body），坐标基于视口；下方空间不足时翻到光标上方
const mentionStyle = computed(() => mention.value.above
  ? { left: `${mention.value.left}px`, bottom: `${window.innerHeight - mention.value.top}px` }
  : { left: `${mention.value.left}px`, top: `${mention.value.top}px` })

// 镜像 div 测量 textarea 光标坐标
function getCaretCoordinates(textarea, position) {
  const div = document.createElement('div')
  const style = getComputedStyle(textarea)
  const propsToCopy = [
    'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textIndent',
  ]
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordWrap = 'break-word'
  div.style.top = '0'
  div.style.left = '-9999px'
  for (const p of propsToCopy) div.style[p] = style[p]
  div.textContent = textarea.value.substring(0, position)
  const span = document.createElement('span')
  span.textContent = textarea.value.substring(position) || '.'
  div.appendChild(span)
  document.body.appendChild(div)
  const rect = { top: span.offsetTop, left: span.offsetLeft }
  document.body.removeChild(div)
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.7 || 20
  return { ...rect, lineHeight }
}

function updateMentionState() {
  const active = activeMention()
  if (!active) { mention.value.open = false; return }
  // @后文本已精确等于某个完整引用名时不再弹列表（如删除引用尾部空格后光标落在完整引用上）
  if (mentionNames.value.some(([token]) => token === active.trigger + active.query)) {
    mention.value.open = false
    return
  }
  const ta = taEl.value
  const caret = getCaretCoordinates(ta, ta.selectionStart)
  const rect = ta.getBoundingClientRect()
  const maxLeft = Math.max(0, (wrapEl.value?.clientWidth || DROPDOWN_WIDTH) - DROPDOWN_WIDTH)
  const belowTop = rect.top + caret.top + caret.lineHeight - ta.scrollTop + 4
  // 下方放不下时下拉翻到光标上方（top 记为光标行的视口上沿）
  const above = belowTop + DROPDOWN_MAX_HEIGHT > window.innerHeight - 8 && caret.top > DROPDOWN_MAX_HEIGHT
  mention.value = {
    open: true,
    start: active.start,
    trigger: active.trigger,
    query: active.query,
    top: above ? rect.top + caret.top - ta.scrollTop - 4 : belowTop,
    left: rect.left + Math.min(caret.left, maxLeft),
    above,
  }
  highlightIdx.value = 0
}

function closeMention() {
  mention.value.open = false
}

function setText(next, caret) {
  const ta = taEl.value
  if (ta) {
    ta.value = next
    ta.focus()
    if (caret != null) ta.setSelectionRange(caret, caret)
  }
  text.value = next
  closeMention()
  emit('update:modelValue', next)
  emit('commit', next)
}

function onInput(e) {
  text.value = e.target.value
  emit('update:modelValue', e.target.value)
  updateMentionState()
}

function onScroll() {
  if (backdropEl.value && taEl.value) {
    backdropEl.value.scrollTop = taEl.value.scrollTop
    backdropEl.value.scrollLeft = taEl.value.scrollLeft
  }
  closeMention()
}

function onKeydown(e) {
  if (e.isComposing) return
  const ta = taEl.value
  // @引用整体删除：光标在完整引用后按退格 / 在完整引用前按 Delete，整段一次删除
  if (ta && (e.key === 'Backspace' || e.key === 'Delete') && ta.selectionStart === ta.selectionEnd) {
    const hit = e.key === 'Backspace' ? mentionBeforeCaret() : mentionAfterCaret()
    if (hit) {
      e.preventDefault()
      const next = ta.value.slice(0, hit.start) + ta.value.slice(hit.end)
      setText(next, hit.start)
      return
    }
  }
  if (!mention.value.open) return
  const total = flatList.value.length
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (total) highlightIdx.value = (highlightIdx.value + 1) % total
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (total) highlightIdx.value = (highlightIdx.value - 1 + total) % total
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    if (total) {
      e.preventDefault()
      pick(flatList.value[highlightIdx.value] || flatList.value[0])
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    closeMention()
  }
}

function pick(opt) {
  const ta = taEl.value
  if (!ta) return
  const pos = ta.selectionStart
  const before = ta.value.slice(0, mention.value.start)
  const after = ta.value.slice(pos)
  const insert = `${mentionToken(opt)}${opt.trigger === '#' ? '' : ' '}`
  const next = before + insert + after
  setText(next, before.length + insert.length)
}

function onBlur(e) {
  closeMention()
  emit('commit', e.target.value)
}
</script>

<style scoped>
.mention-textarea {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  min-height: 0;
}
/* 高亮镜像层：与 textarea 同款类名保证排版一致，仅背景/边框透明 */
.mention-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  overflow: hidden;
  pointer-events: none;
}
.mention-backdrop-content {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
/* textarea 文本透明，只显示光标；高亮由镜像层透出 */
.mention-input {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  width: 100%;
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: var(--text-0);
}
.mention-input::placeholder {
  color: var(--text-3);
}
/* @引用 着色：不改字距/内边距，保证与透明文本逐字对齐 */
.mention-backdrop :deep(.mention-token) {
  border-radius: 4px;
  font-weight: 600;
}
.mention-backdrop :deep(.mention-token-role) {
  color: var(--accent-text);
  background: var(--accent-bg);
}
.mention-backdrop :deep(.mention-token-scene) {
  color: var(--tag-success-text);
  background: var(--success-bg);
}
.mention-backdrop :deep(.mention-token-voice) {
  color: var(--tag-success-text);
  background: var(--success-bg);
}
.mention-dropdown {
  position: fixed;
  z-index: var(--z-menu);
  width: 240px;
  max-height: 220px;
  overflow-y: auto;
  padding: 5px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
  box-shadow: var(--shadow-lg);
}
.mention-group-label {
  padding: 6px 8px 3px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-3);
  letter-spacing: 0.02em;
}
.mention-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 8px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.mention-option.highlighted {
  background: var(--accent-bg);
}
.mention-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-2);
  color: var(--text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  overflow: hidden;
  flex-shrink: 0;
}
.mention-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* 无图时按分组着色图标底色 */
.mention-avatar-role { color: var(--accent-text); background: var(--accent-bg); }
.mention-avatar-scene { color: var(--tag-success-text); background: var(--success-bg); }
.mention-avatar-prop { color: var(--text-2); background: var(--bg-2); }
.mention-name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 550;
  color: var(--text-0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mention-type {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--text-3);
}
.mention-empty {
  padding: 10px;
  font-size: 12px;
  color: var(--text-3);
  text-align: center;
}
</style>
