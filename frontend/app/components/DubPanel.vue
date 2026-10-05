<template>
  <div class="dub-panel">
    <!-- 顶栏：统计 + 主操作 -->
    <div class="dub-bar">
      <label class="dub-switch">
        <input type="checkbox" class="sr-only" :checked="enabled" :disabled="loading || toggling" @change="toggleEnabled">
        <span class="switch" :class="{ on: enabled }"></span>
        <span class="dub-switch-label">{{ t('dub.enable') }}</span>
      </label>
      <span class="dim dub-hint">{{ enabled ? t('dub.enabledHint') : t('dub.disabledHint') }}</span>
      <span v-if="enabled && lines.length" class="tag mono">{{ t('dub.stats', { done: doneCount, total: lines.length, sec: totalSec }) }}</span>
      <div v-if="enabled" class="ml-auto dub-actions">
        <button class="btn btn-sm" :disabled="extracting || !storyboards.length" @click="onExtractClick">
          <Loader2 v-if="extracting" :size="13" class="spin" />
          <Wand2 v-else :size="13" />
          {{ extracting ? t('dub.extracting') : (lines.length ? t('dub.reextract') : t('dub.extract')) }}
        </button>
        <button class="btn btn-sm btn-primary" :disabled="!lines.length || !configured || synthesizing" @click="synthesizeAll">
          <Loader2 v-if="synthesizing" :size="13" class="spin" />
          <AudioLines v-else :size="13" />
          {{ synthesizing ? t('dub.synthesizing', { done: doneCount, total: lines.length }) : t('dub.synthAll') }}
        </button>
      </div>
    </div>

    <div v-if="enabled && !configured" class="dub-banner">
      <TriangleAlert :size="14" />
      <span>{{ t('dub.notConfigured') }}</span>
      <NuxtLink to="/settings" class="dub-banner-link">{{ t('dub.goSettings') }}</NuxtLink>
    </div>

    <div v-if="loading" class="dub-empty"><Loader2 :size="18" class="spin" /></div>

    <template v-else-if="enabled">
      <!-- 角色音色 -->
      <section v-if="castSpeakers.length" class="dub-section">
        <div class="dub-section-head">
          <span class="dub-section-title">{{ t('dub.voicesTitle') }}</span>
          <span class="dim dub-hint">{{ t('dub.voicesHint') }}</span>
        </div>
        <div class="voice-grid">
          <div v-for="sp in castSpeakers" :key="sp.name" class="voice-card">
            <div class="voice-card-head">
              <span class="voice-name">{{ sp.name }}</span>
              <span v-if="sp.count" class="tag mono">{{ t('dub.lineCount', { n: sp.count }) }}</span>
            </div>
            <BaseSelect
              :model-value="voices[sp.name] || ''"
              :options="voiceOptions(voices[sp.name])"
              :placeholder="t('dub.noVoice')"
              @update:model-value="v => changeVoice(sp.name, v)"
            />
            <div class="voice-card-foot">
              <input
                class="input voice-custom"
                :placeholder="t('dub.customVoicePh')"
                :value="customDraft[sp.name] ?? ''"
                @input="e => customDraft[sp.name] = e.target.value"
                @keydown.enter="applyCustom(sp.name)"
              />
              <button class="btn btn-sm" :disabled="!(customDraft[sp.name] || '').trim()" :title="t('dub.customVoiceTip')" @click="applyCustom(sp.name)">{{ t('dub.apply') }}</button>
              <button class="btn btn-sm btn-icon" :disabled="!voices[sp.name] || !configured || previewing === sp.name" :title="t('dub.preview')" @click="previewSpeaker(sp.name)">
                <Loader2 v-if="previewing === sp.name" :size="13" class="spin" />
                <Volume2 v-else :size="13" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 台词 -->
      <section class="dub-section dub-lines">
        <div class="dub-section-head">
          <span class="dub-section-title">{{ t('dub.linesTitle') }}</span>
          <span class="dim dub-hint">{{ t('dub.linesHint') }}</span>
        </div>

        <div v-if="!lines.length" class="dub-empty">
          <div class="empty-title">{{ t('dub.emptyTitle') }}</div>
          <div class="dim">{{ t('dub.emptyDesc') }}</div>
        </div>

        <template v-else>
          <div v-for="g in groups" :key="g.key" class="shot-group">
            <div class="shot-head">
              <span class="tag mono">{{ g.number != null ? t('dub.shot', { n: g.number }) : t('dub.unassigned') }}</span>
              <span v-if="g.shotDuration" class="dim mono shot-meta">{{ t('dub.shotFit', { dub: g.dubSec, shot: g.shotDuration }) }}</span>
              <span v-if="g.overflow" class="tag tag-warning">{{ t('dub.overflow', { s: g.overflow }) }}</span>
              <button v-if="g.storyboardId" class="btn btn-sm btn-ghost ml-auto" @click="addLine(g.storyboardId)"><Plus :size="13" />{{ t('dub.addLine') }}</button>
            </div>
            <div v-for="l in g.lines" :key="l.id" class="line-row" :class="`is-${l.status}`">
              <div class="line-speaker">
                <BaseSelect :model-value="l.speaker" :options="speakerOptions" @update:model-value="v => saveLine(l, { speaker: v })" />
              </div>
              <div class="line-body">
                <input class="input line-text" :value="l.text" @change="e => saveLine(l, { text: e.target.value })" />
                <input class="input line-emotion" :value="l.emotion || ''" :placeholder="t('dub.emotionPh')" @change="e => saveLine(l, { emotion: e.target.value })" />
                <div v-if="l.status === 'failed' && l.error_msg" class="line-error">{{ l.error_msg }}</div>
              </div>
              <div class="line-ops">
                <span class="tag" :class="statusClass(l.status)">{{ statusLabel(l) }}</span>
                <button class="btn btn-sm btn-icon" :disabled="!l.audio_url || l.status !== 'completed'" :title="t('dub.play')" @click="play(l)">
                  <Square v-if="playingId === l.id" :size="12" />
                  <Play v-else :size="13" />
                </button>
                <button class="btn btn-sm btn-icon" :disabled="!configured || l.status === 'processing'" :title="l.audio_url ? t('dub.resynth') : t('dub.synth')" @click="synthesizeOne(l)">
                  <Loader2 v-if="l.status === 'processing'" :size="13" class="spin" />
                  <RefreshCw v-else :size="13" />
                </button>
                <button class="btn btn-sm btn-icon" :title="t('dub.delete')" @click="removeLine(l)"><Trash2 :size="13" /></button>
              </div>
            </div>
          </div>

          <div class="add-shot">
            <BaseSelect v-model="addShotId" :options="shotOptions" :placeholder="t('dub.addToShot')" />
            <button class="btn btn-sm" :disabled="!addShotId" @click="addLine(addShotId); addShotId = ''"><Plus :size="13" />{{ t('dub.addLine') }}</button>
          </div>
        </template>
      </section>
    </template>

    <ConfirmDialog
      :open="confirmExtract"
      :title="t('dub.reextractTitle')"
      :message="t('dub.reextractMsg')"
      :loading="extracting"
      @confirm="extract"
      @cancel="confirmExtract = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Loader2, Wand2, AudioLines, Volume2, Play, Square, RefreshCw, Trash2, Plus, TriangleAlert } from 'lucide-vue-next'
import { dubAPI } from '~/composables/useApi'
import { toastError } from '~/composables/useToast'
import BaseSelect from '~/components/BaseSelect.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'

const props = defineProps({
  episodeId: { type: Number, required: true },
  dramaId: { type: Number, required: true },
  storyboards: { type: Array, default: () => [] }, // [{ id, storyboard_number, duration, ... }]
  textModel: { type: String, default: undefined },
  textConfigId: { type: Number, default: undefined },
  audioModel: { type: String, default: undefined },   // 顶栏选择的配音模型（资源 ID），空 = 跟随配置默认
  audioConfigId: { type: Number, default: undefined },
})

const { t } = useI18n()

const loading = ref(true)
const enabled = ref(false)
const toggling = ref(false)
const extracting = ref(false)
const confirmExtract = ref(false)
const lines = ref([])
const voices = ref({})
const speakers = ref([])
const configured = ref(true)
const catalog = ref([])
const narrator = ref('旁白')
const customDraft = reactive({})
const previewing = ref('')
const playingId = ref(0)
const addShotId = ref('')
let audio = null
let pollTimer = null

function applyState(d) {
  if ('enabled' in d) enabled.value = !!d.enabled
  lines.value = d.lines || []
  voices.value = d.voices || {}
  speakers.value = d.speakers || []
  configured.value = !!d.configured
}

async function load() {
  if (!props.episodeId) return
  try {
    applyState(await dubAPI.get(props.episodeId))
  } catch (e) {
    toastError(e)
  } finally {
    loading.value = false
  }
}

const synthesizing = computed(() => lines.value.some(l => l.status === 'processing'))
const doneCount = computed(() => lines.value.filter(l => l.status === 'completed').length)
const totalSec = computed(() => lines.value.reduce((s, l) => s + (l.status === 'completed' ? (l.duration || 0) : 0), 0).toFixed(1))

// 处理中时轮询，结束即停
watch(synthesizing, (on) => {
  clearInterval(pollTimer)
  pollTimer = on ? setInterval(load, 2000) : null
})

// 说话人：出现在台词里的 + 本剧角色 + 旁白
const castSpeakers = computed(() => {
  const counts = {}
  for (const l of lines.value) counts[l.speaker] = (counts[l.speaker] || 0) + 1
  return Object.keys(counts).map(name => ({ name, count: counts[name] }))
})
const speakerOptions = computed(() => {
  const names = new Set([...speakers.value.map(s => s.name), ...lines.value.map(l => l.speaker), narrator.value])
  return [...names].map(n => ({ label: n, value: n }))
})

function voiceOptions(current) {
  const opts = [
    { label: t('dub.male'), options: catalog.value.filter(v => v.gender === 'male').map(v => ({ label: `${v.name} · ${v.desc}`, value: v.id })) },
    { label: t('dub.female'), options: catalog.value.filter(v => v.gender === 'female').map(v => ({ label: `${v.name} · ${v.desc}`, value: v.id })) },
  ]
  if (current && !catalog.value.some(v => v.id === current)) {
    opts.unshift({ label: t('dub.custom'), options: [{ label: current, value: current }] })
  }
  return opts
}

// 按分镜分组；附上该镜头配音总长与画面时长，超长时提示
const sbById = computed(() => new Map(props.storyboards.map(s => [s.id, s])))
const groups = computed(() => {
  const map = new Map()
  for (const l of lines.value) {
    const key = l.storyboard_id || 0
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(l)
  }
  return [...map.entries()]
    .map(([key, ls]) => {
      const sb = sbById.value.get(key)
      const dub = ls.reduce((s, l) => s + (l.duration || 0), 0) + (ls.length ? 0.3 + 0.25 * (ls.length - 1) : 0)
      const shot = Number(sb?.duration) || 0
      const done = ls.every(l => l.duration)
      return {
        key,
        storyboardId: key || null,
        number: sb?.storyboard_number ?? ls[0]?.storyboard_number ?? null,
        lines: ls.sort((a, b) => a.line_index - b.line_index),
        dubSec: dub.toFixed(1),
        shotDuration: done && shot ? shot : 0,
        overflow: done && shot && dub > shot ? (dub - shot).toFixed(1) : 0,
      }
    })
    .sort((a, b) => (a.number ?? 1e9) - (b.number ?? 1e9))
})
const shotOptions = computed(() => props.storyboards.map(s => ({ label: t('dub.shot', { n: s.storyboard_number }), value: s.id })))

function statusClass(s) {
  return { completed: 'tag-success', failed: 'tag-error', processing: 'tag-info' }[s] || ''
}
function statusLabel(l) {
  if (l.status === 'completed') return `${(l.duration || 0).toFixed(1)}s`
  return t(`dub.status.${l.status || 'pending'}`)
}

async function toggleEnabled() {
  toggling.value = true
  try {
    const r = await dubAPI.setEnabled(props.dramaId, !enabled.value)
    enabled.value = !!r.enabled
  } catch (e) {
    toastError(e)
  } finally {
    toggling.value = false
  }
}

function onExtractClick() {
  if (lines.value.length) confirmExtract.value = true
  else extract()
}

async function extract() {
  extracting.value = true
  try {
    applyState(await dubAPI.extract(props.episodeId, props.textModel, props.textConfigId))
    toast.success(t('dub.extracted', { n: lines.value.length }))
  } catch (e) {
    toastError(e)
  } finally {
    extracting.value = false
    confirmExtract.value = false
  }
}

async function changeVoice(speaker, voice) {
  if (!voice) return
  try {
    voices.value = await dubAPI.setVoice(props.dramaId, speaker, voice)
    // 音色变了，该说话人的台词需要重新合成
    lines.value = lines.value.map(l => (l.speaker === speaker && l.status === 'completed') ? { ...l, status: 'pending' } : l)
  } catch (e) { toastError(e) }
}

function applyCustom(speaker) {
  const v = (customDraft[speaker] || '').trim()
  if (!v) return
  changeVoice(speaker, v)
  customDraft[speaker] = ''
}

function sampleFor(speaker) {
  const l = lines.value.find(x => x.speaker === speaker)
  return l ? { text: l.text, emotion: l.emotion } : { text: t('dub.previewText', { name: speaker }), emotion: '' }
}

function audioOpts() {
  return { audio_model: props.audioModel, audio_config_id: props.audioConfigId }
}

function stopAudio() {
  if (audio) { audio.pause(); audio = null }
  playingId.value = 0
}

function playUrl(url, id = 0) {
  stopAudio()
  audio = new Audio(url)
  playingId.value = id
  audio.onended = () => { if (playingId.value === id) playingId.value = 0 }
  audio.play().catch(() => { playingId.value = 0 })
}

async function previewSpeaker(speaker) {
  previewing.value = speaker
  try {
    const s = sampleFor(speaker)
    const blob = await dubAPI.preview(voices.value[speaker], s.text, s.emotion, audioOpts())
    playUrl(URL.createObjectURL(blob))
  } catch (e) {
    toastError(e)
  } finally {
    previewing.value = ''
  }
}

function play(l) {
  if (playingId.value === l.id) return stopAudio()
  playUrl(`/${l.audio_url}?v=${encodeURIComponent(l.updated_at || '')}`, l.id)
}

async function saveLine(l, patch) {
  const changed = Object.keys(patch).some(k => (patch[k] || '') !== (l[k] || ''))
  if (!changed) return
  Object.assign(l, patch)
  if (l.status === 'completed') l.status = 'pending'
  try { await dubAPI.updateLine(l.id, patch) } catch (e) { toastError(e) }
}

async function synthesizeOne(l) {
  l.status = 'processing'
  try {
    await dubAPI.synthesizeLine(l.id, true, audioOpts())
  } catch (e) {
    toastError(e)
  }
  await load()
}

async function synthesizeAll() {
  try {
    await dubAPI.synthesizeEpisode(props.episodeId, audioOpts())
    lines.value = lines.value.map(l => ({ ...l, status: 'processing' }))
  } catch (e) { toastError(e) }
}

async function addLine(storyboardId) {
  if (!storyboardId) return
  try {
    applyState(await dubAPI.addLine(props.episodeId, { storyboard_id: Number(storyboardId), speaker: narrator.value }))
  } catch (e) { toastError(e) }
}

async function removeLine(l) {
  try {
    await dubAPI.deleteLine(l.id)
    lines.value = lines.value.filter(x => x.id !== l.id)
  } catch (e) { toastError(e) }
}

onMounted(async () => {
  try {
    const c = await dubAPI.catalog()
    catalog.value = c.voices || []
    narrator.value = c.narrator || narrator.value
  } catch { /* 目录加载失败不阻塞 */ }
  load()
})
watch(() => props.episodeId, () => { loading.value = true; load() })
onBeforeUnmount(() => { clearInterval(pollTimer); stopAudio() })
</script>

<style scoped>
.dub-panel { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.dub-bar { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.dub-actions { display: flex; gap: 6px; }
.dub-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.dub-switch-label { font-size: 13px; font-weight: 600; color: var(--text-1); }
.ml-auto { margin-left: auto; }
.dub-banner {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 10px;
  background: var(--warning-bg); color: var(--tag-warning-text); font-size: 12px;
}
.dub-banner-link { margin-left: auto; color: var(--accent-text); font-weight: 600; }
.dub-section { display: flex; flex-direction: column; gap: 8px; }
.dub-section-head { display: flex; align-items: baseline; gap: 8px; }
.dub-section-title { font-size: 13px; font-weight: 600; color: var(--text-1); }
.dub-hint { font-size: 12px; }
.dub-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 36px 0; font-size: 12px; }
.empty-title { font-size: 13px; color: var(--text-1); }

.voice-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px; }
.voice-card {
  display: flex; flex-direction: column; gap: 8px; padding: 10px;
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px;
}
.voice-card-head { display: flex; align-items: center; gap: 6px; }
.voice-name { font-size: 13px; font-weight: 600; color: var(--text-1); }
.voice-card-foot { display: flex; gap: 6px; align-items: center; }
.voice-custom { flex: 1; min-width: 0; height: 30px; font-size: 12px; }

.shot-group {
  display: flex; flex-direction: column; gap: 6px; padding: 8px 10px;
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px;
}
.shot-head { display: flex; align-items: center; gap: 8px; }
.shot-meta { font-size: 11px; }
.line-row { display: grid; grid-template-columns: 130px 1fr auto; gap: 8px; align-items: start; padding: 6px 0; border-top: 1px dashed var(--border); }
.line-row:first-of-type { border-top: 0; }
.line-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.line-text { height: 32px; font-size: 13px; }
.line-emotion { height: 28px; font-size: 12px; color: var(--text-2); }
.line-error { font-size: 11px; color: var(--error); word-break: break-all; }
.line-ops { display: flex; align-items: center; gap: 4px; padding-top: 2px; }
.line-ops .tag { min-width: 46px; justify-content: center; }
.add-shot { display: flex; gap: 8px; align-items: center; max-width: 360px; }
.add-shot > :first-child { flex: 1; }
.spin { animation: dub-spin 1s linear infinite; }
@keyframes dub-spin { to { transform: rotate(360deg); } }

@media (max-width: 720px) {
  .line-row { grid-template-columns: 1fr; }
}
</style>
