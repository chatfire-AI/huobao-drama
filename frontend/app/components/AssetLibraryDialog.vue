<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="emit('close')">
      <div class="dialog lib-dialog" role="dialog" aria-modal="true">
        <header class="dialog-head">
          <h2 class="dialog-title">{{ t('assetLibrary.title', { type: typeLabel }) }}</h2>
          <button class="btn btn-ghost btn-icon" @click="emit('close')"><X :size="14" /></button>
        </header>
        <div class="dialog-body lib-body">
          <p class="lib-hint dim">{{ t('assetLibrary.hint', { type: typeLabel }) }}</p>
          <div v-if="loading" class="lib-empty"><Loader2 :size="18" class="animate-spin" /></div>
          <div v-else-if="!candidates.length" class="lib-empty dim">{{ t('assetLibrary.empty', { type: typeLabel }) }}</div>
          <div v-else class="lib-grid">
            <button
              v-for="a in candidates"
              :key="a.id"
              type="button"
              class="lib-item"
              :class="{ selected: selected.has(a.id) }"
              @click="toggle(a.id)"
            >
              <div class="lib-cover" :class="{ portrait: type === 'character' }">
                <img v-if="imageOf(a)" :src="thumbOf(imageOf(a))" loading="lazy" @error="thumbFallback($event, imageOf(a))" />
                <span v-else class="lib-cover-empty">{{ nameOf(a).slice(0, 1) }}</span>
                <span class="lib-check"><Check :size="12" /></span>
              </div>
              <div class="lib-name" :title="nameOf(a)">{{ nameOf(a) }}</div>
              <div class="lib-meta dim">{{ a.episode_count ? t('assetLibrary.usedIn', { n: a.episode_count }) : t('assetLibrary.unused') }}</div>
            </button>
          </div>
        </div>
        <footer class="dialog-foot">
          <button class="btn" @click="emit('close')">{{ t('common.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!selected.size || saving" @click="confirm">
            <Loader2 v-if="saving" :size="13" class="animate-spin" />
            {{ t('assetLibrary.add', { n: selected.size }) }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Loader2, X } from 'lucide-vue-next'
import { episodeAPI } from '~/composables/useApi'
import { thumbOf, thumbFallback } from '~/composables/useMedia'
import { toastError } from '~/composables/useToast'

const props = defineProps({
  open: { type: Boolean, default: false },
  episodeId: { type: Number, required: true },
  type: { type: String, default: 'character' }, // character | scene | prop
  typeLabel: { type: String, default: '' },
})
const emit = defineEmits(['close', 'linked'])
const { t } = useI18n()

const loading = ref(false)
const saving = ref(false)
const items = ref([])
const selected = ref(new Set())

// 只列出本集还没有的素材
const candidates = computed(() => items.value.filter(a => !a.linked))

function nameOf(a) { return a.name || a.location || '' }
function imageOf(a) {
  const raw = a.image_url || ''
  if (!raw) return ''
  return /^https?:\/\//i.test(raw) || raw.startsWith('/') ? raw : `/${raw}`
}
function toggle(id) {
  const s = new Set(selected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selected.value = s
}

async function load() {
  loading.value = true
  selected.value = new Set()
  try {
    items.value = await episodeAPI.assetLibrary(props.episodeId, props.type) || []
  } catch (e) {
    toastError(e)
  } finally {
    loading.value = false
  }
}

async function confirm() {
  saving.value = true
  try {
    const r = await episodeAPI.linkAssets(props.episodeId, props.type, [...selected.value])
    emit('linked', r?.added || 0)
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}

watch(() => props.open, (v) => { if (v) load() })
</script>

<style scoped>
.lib-dialog { width: 720px; max-width: calc(100vw - 48px); }
.lib-body { display: flex; flex-direction: column; gap: 10px; max-height: 62vh; overflow-y: auto; }
.lib-hint { font-size: 12px; margin: 0; }
.lib-empty { display: flex; justify-content: center; padding: 36px 0; font-size: 12px; }
.lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.lib-item {
  display: flex; flex-direction: column; gap: 4px; padding: 6px; text-align: left; cursor: pointer;
  background: var(--bg-surface); border: 1.5px solid var(--border); border-radius: 12px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.lib-item:hover { border-color: var(--border-strong); }
.lib-item.selected { border-color: var(--accent); box-shadow: 0 0 0 3px var(--button-focus); }
.lib-cover { position: relative; aspect-ratio: 16 / 9; border-radius: 8px; overflow: hidden; background: var(--bg-2); display: flex; align-items: center; justify-content: center; }
.lib-cover img { width: 100%; height: 100%; object-fit: cover; }
.lib-cover-empty { font-size: 22px; font-weight: 700; color: var(--text-3); }
.lib-check {
  position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.85); color: transparent; border: 1.5px solid var(--border-strong);
}
.lib-item.selected .lib-check { background: var(--accent); border-color: var(--accent); color: #fff; }
.lib-name { font-size: 12.5px; font-weight: 600; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lib-meta { font-size: 11px; }
</style>
