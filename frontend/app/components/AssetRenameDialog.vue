<template>
  <Teleport to="body">
    <div v-if="open" class="overlay rename-overlay" @click.self="cancel">
      <div class="dialog rename-dialog" role="dialog" aria-modal="true">
        <header class="dialog-head">
          <h2 class="dialog-title">{{ t('assetRename.title', { type: typeLabel }) }}</h2>
        </header>
        <div class="dialog-body rename-body">
          <label class="field">
            <span class="field-label">{{ t('assetRename.newName') }}</span>
            <input
              ref="inputEl"
              v-model="name"
              class="input"
              :placeholder="oldName"
              @keydown.enter.prevent="confirm"
            />
          </label>

          <div v-if="error" class="rename-error">{{ error }}</div>
          <template v-else-if="changed">
            <label v-if="hits && hits.total" class="rename-cascade">
              <input v-model="cascade" type="checkbox" />
              <span>{{ t('assetRename.cascade', { old: oldName, n: hits.total }) }}</span>
            </label>
            <div v-if="hits && hits.total && cascade" class="rename-detail dim">
              {{ t('assetRename.detail', { ep: hits.episodes, sb: hits.storyboards, as: hits.assets }) }}
            </div>
            <div v-else-if="oldName.length < 2" class="rename-detail dim">{{ t('assetRename.singleChar') }}</div>
            <div v-else-if="hits && !hits.total" class="rename-detail dim">{{ t('assetRename.noRefs', { old: oldName }) }}</div>
          </template>
        </div>
        <footer class="dialog-foot">
          <button class="btn" :disabled="saving" @click="cancel">{{ t('common.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!canSave" @click="confirm">
            <Loader2 v-if="saving" :size="13" class="animate-spin" />
            {{ t('assetRename.save') }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'
import { episodeAPI } from '~/composables/useApi'
import { toastError } from '~/composables/useToast'

const props = defineProps({
  open: { type: Boolean, default: false },
  type: { type: String, default: 'character' }, // character | scene | prop
  item: { type: Object, default: null },
  typeLabel: { type: String, default: '' },
})
const emit = defineEmits(['close', 'renamed'])
const { t } = useI18n()

const name = ref('')
const cascade = ref(true)
const hits = ref(null)
const error = ref('')
const saving = ref(false)
const inputEl = ref(null)
let timer = null

const oldName = computed(() => (props.type === 'scene' ? props.item?.location : props.item?.name) || '')
const changed = computed(() => name.value.trim() && name.value.trim() !== oldName.value)
const canSave = computed(() => changed.value && !error.value && !saving.value)

// 输入停顿后试算：重名检查 + 将同步替换的处数（不落库）
async function preview() {
  if (!changed.value) { hits.value = null; error.value = ''; return }
  try {
    const r = await episodeAPI.renameAsset(props.type, props.item.id, { name: name.value.trim(), dry_run: true })
    hits.value = r.hits
    error.value = ''
  } catch (e) {
    hits.value = null
    error.value = e.message
  }
}
watch(name, () => {
  clearTimeout(timer)
  timer = setTimeout(preview, 300)
})

watch(() => props.open, async (v) => {
  if (!v) return
  name.value = oldName.value
  cascade.value = true
  hits.value = null
  error.value = ''
  await nextTick()
  inputEl.value?.focus()
  inputEl.value?.select()
})

function cancel() { if (!saving.value) emit('close') }

async function confirm() {
  if (!canSave.value) return
  saving.value = true
  try {
    const r = await episodeAPI.renameAsset(props.type, props.item.id, { name: name.value.trim(), cascade: cascade.value })
    emit('renamed', r)
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.rename-overlay { z-index: 1100; }
.rename-dialog { width: 440px; max-width: calc(100vw - 48px); }
.rename-body { display: flex; flex-direction: column; gap: 10px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; color: var(--text-2); }
.rename-cascade { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--text-1); cursor: pointer; line-height: 1.5; }
.rename-cascade input { margin-top: 3px; accent-color: var(--accent); }
.rename-detail { font-size: 12px; padding-left: 22px; }
.rename-error { font-size: 12px; color: var(--error); }
</style>
