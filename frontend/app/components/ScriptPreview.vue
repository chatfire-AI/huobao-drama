<template>
  <div class="script-preview" :title="t('scriptLinks.dblclickEdit')" @dblclick="emit('edit')">
    <template v-for="(seg, i) in segments" :key="i">
      <a
        v-if="seg.asset"
        href="#"
        class="asset-link"
        :class="`is-${seg.asset.type}`"
        :title="tooltip(seg.asset)"
        @click.prevent="emit('open', seg.asset.type, seg.asset.item)"
        @dblclick.stop
      >{{ seg.text }}</a>
      <template v-else>{{ seg.text }}</template>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * 剧本预览：把文中出现的本剧已有素材（角色名 / 场景地点 / 道具名）渲染为可点击链接。
 * 同一位置多个名字重叠时取最长匹配（如「刀哥」与「刀」）；单字名不匹配，避免误伤。
 */
const props = defineProps({
  text: { type: String, default: '' },
  characters: { type: Array, default: () => [] },
  scenes: { type: Array, default: () => [] },
  propItems: { type: Array, default: () => [] },
})
const emit = defineEmits(['open', 'edit'])
const { t } = useI18n()

const dictionary = computed(() => {
  const map = new Map()
  const add = (type, item, name) => {
    const key = String(name || '').trim()
    if (key.length < 2 || item.deleted_at || item.deletedAt) return
    if (!map.has(key)) map.set(key, { type, item })
  }
  // 角色优先：同名时角色胜出
  for (const c of props.characters) add('character', c, c.name)
  for (const s of props.scenes) add('scene', s, s.location)
  for (const p of props.propItems) add('prop', p, p.name)
  return map
})

const matcher = computed(() => {
  const names = [...dictionary.value.keys()].sort((a, b) => b.length - a.length)
  if (!names.length) return null
  const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(escaped.join('|'), 'g')
})

const segments = computed(() => {
  const text = props.text || ''
  const re = matcher.value
  if (!re) return [{ text }]
  const out = []
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) })
    out.push({ text: m[0], asset: dictionary.value.get(m[0]) })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
})

function tooltip({ type, item }) {
  const kind = t(`scriptLinks.kind.${type}`)
  const ready = item.image_url || item.imageUrl
  return `${kind} · ${ready ? t('scriptLinks.imageReady') : t('scriptLinks.imageTodo')} · ${t('scriptLinks.clickOpen')}`
}
</script>

<style scoped>
.script-preview {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.85;
  color: var(--text-1);
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: text;
}
.asset-link {
  font-weight: 600;
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
  border-radius: 4px;
  padding: 0 1px;
  cursor: pointer;
  transition: background 0.15s;
}
.asset-link.is-character { color: var(--accent-text); text-decoration-color: var(--accent); }
.asset-link.is-scene { color: var(--tag-info-text); text-decoration-color: currentColor; }
.asset-link.is-prop { color: var(--tag-success-text); text-decoration-color: currentColor; }
.asset-link:hover { background: var(--accent-bg); }
</style>
