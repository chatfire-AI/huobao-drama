<template>
  <div class="te-page" v-if="drama">
    <header class="te-top">
      <button type="button" class="back-btn" @click="navigateTo(`/drama/${dramaId}/episode/${episodeNumber}`)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        返回本集工作台
      </button>
      <div class="te-title-block">
        <h1 class="te-title">{{ drama.title }}</h1>
        <span class="te-chip">第 {{ episodeNumber }} 集 · 简易剪辑</span>
      </div>
      <div class="te-actions">
        <span class="te-timecode" title="播放头 / 总时长">{{ formatTc(playheadSec) }} / {{ formatTc(totalDuration) }}</span>
        <label class="te-zoom">
          缩放
          <input v-model.number="pxPerSec" type="range" min="28" max="100" />
        </label>
        <button type="button" class="btn btn-primary" :disabled="!exportableClips.length || rendering" @click="doRender">
          {{ rendering ? `导出中 ${renderProgress}%` : '导出成片' }}
        </button>
      </div>
    </header>

    <div v-if="loadError" class="te-empty">{{ loadError }}</div>
    <div v-else-if="loading" class="te-empty">加载中…</div>
    <template v-else>
      <section class="te-preview">
        <video
          v-if="previewSrcUrl"
          ref="previewRef"
          :src="previewSrcUrl"
          class="te-video"
          controls
          playsinline
          preload="metadata"
          @play="previewFollowTimeline = true"
          @pause="previewFollowTimeline = false"
          @timeupdate="onPreviewTimeUpdate"
          @seeked="onPreviewSeeked"
        />
        <p v-else class="te-hint">本集暂无可剪辑的镜头视频（需已生成视频；若无生成视频则可使用已合成成片）</p>
        <p v-if="previewSrcUrl" class="te-preview-hint">空格 播放/暂停 · 时间线可点按拖动红线对位 · 播放时播放头跟随</p>
      </section>

      <section class="te-toolbar card-like">
        <div class="te-toolbar-group">
          <span class="te-toolbar-label">片段</span>
          <button type="button" class="btn btn-sm" :disabled="selectedVideoIdx === null" @click="splitAtPlayhead">在当前位置分割</button>
          <button type="button" class="btn btn-sm" :disabled="selectedVideoIdx === null" @click="duplicateSelected">复制</button>
          <button type="button" class="btn btn-sm" :disabled="selectedVideoIdx === null" @click="deleteSelected">删除</button>
          <button type="button" class="btn btn-sm" :disabled="selectedVideoIdx === null" @click="toggleSelectedEnabled">
            {{ selectedClip && selectedClip.enabled === false ? '启用选中' : '禁用选中' }}
          </button>
        </div>
        <div class="te-toolbar-group">
          <span class="te-toolbar-label">编辑</span>
          <button type="button" class="btn btn-sm btn-ghost" :disabled="!canUndo" @click="undo">撤销</button>
          <button type="button" class="btn btn-sm btn-ghost" :disabled="!canRedo" @click="redo">重做</button>
          <label class="te-check te-check-inline">
            <input v-model="snapEnabled" type="checkbox" />
            吸附 0.1s
          </label>
        </div>
        <div class="te-toolbar-hint">
          快捷键：Space 播放 · ←/→ 逐帧感移动 · Home/End 到头尾 · Ctrl+Z / Ctrl+Shift+Z 撤销/重做 · Delete 删选中
        </div>
      </section>

      <section class="te-panel">
        <div class="te-row">
          <label class="te-check">
            <input v-model="audioLinked" type="checkbox" />
            音画联动（改顺序或入出点会同步到音轨）
          </label>
        </div>
        <div class="te-row te-source-row">
          <label class="te-check">
            <input v-model="preferComposedVideo" type="checkbox" />
            素材改用「视频合成」成片（默认用「视频生成」原始视频）
          </label>
        </div>

        <div class="te-track-head">
          <span class="te-track-label">视频轨</span>
          <span class="te-dim">点击片段可选中；拖排序；左右黄条裁剪；灰条为禁用（导出跳过）</span>
        </div>

        <div
          ref="scrubAreaRef"
          class="te-scrub-stack"
          :style="{ width: Math.max(totalWidthPx, 320) + 'px' }"
          @pointerdown="onScrubAreaPointerDown"
        >
          <div class="te-ruler te-ruler-scrub" :style="{ width: totalWidthPx + 'px' }">
            <span v-for="t in rulerTicks" :key="t" class="te-tick" :style="{ left: t * pxPerSec + 'px' }">{{ t }}s</span>
          </div>
          <div class="te-playhead" :style="{ left: playheadXPx + 'px' }" title="拖动或点击时间线移动播放头" @pointerdown.stop="startPlayheadDrag" />

          <div class="te-track te-track-video" :style="{ width: totalWidthPx + 'px' }">
            <div
              v-for="(c, idx) in videoClips"
              :key="c.id"
              class="te-clip"
              :class="{
                dragging: dragVideoIdx === idx,
                selected: selectedVideoIdx === idx,
                disabled: c.enabled === false,
              }"
              :style="{ width: clipWidthPx(c) + 'px' }"
              draggable="true"
              @dragstart="onDragStart('v', idx, $event)"
              @dragend="clearDrag"
              @dragover.prevent
              @drop="onDrop('v', idx)"
              @pointerdown="onClipPointerDown('v', idx, $event)"
            >
              <div
                class="te-handle te-handle-l"
                title="拖曳裁剪入点"
                @pointerdown.stop="startTrim($event, 'v', idx, 'in')"
              />
              <div class="te-clip-body" :title="c.label">
                <span class="te-clip-name">{{ c.label }}</span>
                <span class="te-clip-meta">{{ c.in.toFixed(2) }}s · {{ c.dur.toFixed(2) }}s</span>
              </div>
              <div
                class="te-handle te-handle-r"
                title="拖曳裁剪出点"
                @pointerdown.stop="startTrim($event, 'v', idx, 'out')"
              />
            </div>
          </div>

          <div class="te-track-head te-track-head-inner">
            <span class="te-track-label">音频轨</span>
            <span class="te-dim">{{ audioLinked ? '与视频轨一致' : '可单独排序与裁剪' }}</span>
          </div>
          <div class="te-track te-track-audio" :style="{ width: audioTotalWidthPx + 'px' }">
            <div
              v-for="(c, idx) in displayAudioClips"
              :key="c.id"
              class="te-clip te-clip-audio"
              :class="{
                dragging: dragAudioIdx === idx,
                muted: audioLinked,
                disabled: c.enabled === false,
                selected: !audioLinked && selectedAudioIdx === idx,
              }"
              :style="{ width: clipWidthPx(c) + 'px' }"
              :draggable="!audioLinked"
              @dragstart="!audioLinked && onDragStart('a', idx, $event)"
              @dragend="clearDrag"
              @dragover.prevent
              @drop="!audioLinked && onDrop('a', idx)"
              @pointerdown="!audioLinked && onClipPointerDown('a', idx, $event)"
            >
              <div
                class="te-handle te-handle-l"
                @pointerdown.stop="!audioLinked && startTrim($event, 'a', idx, 'in')"
              />
              <div class="te-clip-body">
                <span class="te-clip-name">{{ c.label }}</span>
                <span class="te-clip-meta">{{ c.in.toFixed(2) }}s · {{ c.dur.toFixed(2) }}s</span>
              </div>
              <div
                class="te-handle te-handle-r"
                @pointerdown.stop="!audioLinked && startTrim($event, 'a', idx, 'out')"
              />
            </div>
          </div>
        </div>

        <p v-if="exportUrl" class="te-export">
          已生成：
          <a :href="'/' + exportUrl" target="_blank" rel="noopener">{{ exportUrl }}</a>
          <a :href="'/' + exportUrl" download class="btn btn-sm" style="margin-left:8px">下载</a>
        </p>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { dramaAPI, episodeAPI, timelineAPI } from '~/composables/useApi'

interface Clip {
  id: string
  sbId: number
  label: string
  path: string
  full: number
  in: number
  dur: number
  /** false 时导出跳过该段，时间轴仍占位 */
  enabled?: boolean
}

const route = useRoute()
const dramaId = Number(route.params.id)
const episodeNumber = Number(route.params.episodeNumber)

const drama = ref<any>(null)
const loading = ref(true)
const loadError = ref('')
const videoClips = ref<Clip[]>([])
const audioClips = ref<Clip[]>([])
const audioLinked = ref(true)
const preferComposedVideo = ref(false)
const pxPerSec = ref(48)
const rendering = ref(false)
/** 导出成片进度 0–100（按服务端 ffmpeg 阶段计步） */
const renderProgress = ref(0)
const exportUrl = ref('')
const previewRef = ref<HTMLVideoElement | null>(null)
const previewSrcUrl = ref('')
const previewClipIdx = ref(0)
const playheadSec = ref(0)
const previewFollowTimeline = ref(false)
const snapEnabled = ref(true)
const selectedVideoIdx = ref<number | null>(null)
const selectedAudioIdx = ref<number | null>(null)
const scrubAreaRef = ref<HTMLElement | null>(null)

const dragVideoIdx = ref<number | null>(null)
const dragAudioIdx = ref<number | null>(null)
let dragKind: 'v' | 'a' | null = null

const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])
const MAX_HISTORY = 40

const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

const exportableClips = computed(() => videoClips.value.filter((c) => c.enabled !== false))

const totalDuration = computed(() =>
  videoClips.value.reduce((s, c) => s + c.dur, 0),
)

const clipStartTimes = computed(() => {
  const arr: number[] = []
  let acc = 0
  for (const c of videoClips.value) {
    arr.push(acc)
    acc += c.dur
  }
  return arr
})

const playheadXPx = computed(() => playheadSec.value * pxPerSec.value)

const selectedClip = computed(() => {
  const i = selectedVideoIdx.value
  if (i === null) return null
  return videoClips.value[i] ?? null
})

function clipWidthPx(c: Clip) {
  return Math.max(24, c.dur * pxPerSec.value)
}

const totalWidthPx = computed(() =>
  videoClips.value.reduce((s, c) => s + clipWidthPx(c), 0),
)

const displayAudioClips = computed<Clip[]>(() => {
  if (audioLinked.value) {
    return videoClips.value.map((c) => ({
      ...c,
      id: `${c.id}-audio-mirror`,
      label: `${c.label} · 音`,
    }))
  }
  return audioClips.value
})

const audioTotalWidthPx = computed(() =>
  displayAudioClips.value.reduce((s, c) => s + clipWidthPx(c), 0),
)

const rulerTicks = computed(() => {
  const totalSec = totalDuration.value
  const step = totalSec > 120 ? 15 : totalSec > 60 ? 10 : 5
  const ticks: number[] = []
  for (let t = 0; t <= totalSec + 0.001; t += step) ticks.push(Math.round(t))
  return ticks
})

function formatTc(sec: number) {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${m}:${r.toFixed(1).padStart(4, '0')}`
}

function snapshotState(): string {
  return JSON.stringify({
    v: videoClips.value,
    a: audioClips.value,
    linked: audioLinked.value,
    playhead: playheadSec.value,
  })
}

function pushHistory() {
  undoStack.value.push(snapshotState())
  if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
  redoStack.value = []
}

function restoreState(raw: string) {
  try {
    const o = JSON.parse(raw)
    videoClips.value = o.v
    audioClips.value = o.a
    audioLinked.value = o.linked
    playheadSec.value = Math.min(o.playhead ?? 0, totalDuration.value || 0)
    selectedVideoIdx.value = null
    selectedAudioIdx.value = null
    nextTick(() => syncPreviewToPlayhead())
  } catch {
    /* ignore */
  }
}

function undo() {
  if (!undoStack.value.length) return
  const cur = snapshotState()
  const prev = undoStack.value.pop()!
  redoStack.value.push(cur)
  restoreState(prev)
}

function redo() {
  if (!redoStack.value.length) return
  const cur = snapshotState()
  const next = redoStack.value.pop()!
  undoStack.value.push(cur)
  restoreState(next)
}

watch(audioLinked, (linked) => {
  if (!linked) {
    audioClips.value = videoClips.value.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      label: `${c.label} · 音`,
    }))
  }
})

function getEditClipPath(sb: any): string | null {
  const raw = sb.video_url || sb.videoUrl
  const composed = sb.composed_video_url || sb.composedVideoUrl
  const p = preferComposedVideo.value
    ? (composed || raw)
    : (raw || composed)
  return p ? String(p).replace(/^\//, '') : null
}

async function rebuildClipsFromStoryboards(sbs: any[]) {
  const clips: Clip[] = []
  let i = 0
  for (const sb of sbs) {
    const path = getEditClipPath(sb)
    if (!path) continue
    const num = sb.storyboard_number ?? sb.storyboardNumber ?? ++i
    const full = await probeDuration(path)
    clips.push({
      id: crypto.randomUUID(),
      sbId: sb.id,
      label: `镜${String(num).padStart(2, '0')}`,
      path,
      full,
      in: 0,
      dur: full,
      enabled: true,
    })
  }
  videoClips.value = clips
}

watch(preferComposedVideo, async () => {
  if (loading.value || !drama.value) return
  const ep = (drama.value.episodes || []).find(
    (e: any) => (e.episode_number ?? e.episodeNumber) === episodeNumber,
  )
  if (!ep?.id) return
  try {
    const sbs = await episodeAPI.storyboards(ep.id)
    await rebuildClipsFromStoryboards(sbs)
    if (!audioLinked.value) {
      audioClips.value = videoClips.value.map((c) => ({
        ...c,
        id: crypto.randomUUID(),
        label: `${c.label} · 音`,
      }))
    }
    playheadSec.value = 0
    nextTick(() => syncPreviewToPlayhead())
  } catch (e: any) {
    toast.error(e?.message || '切换素材来源失败')
  }
})

function probeDuration(relPath: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.src = `/${relPath.replace(/^\//, '')}`
    const done = (sec: number) => {
      v.remove()
      resolve(sec > 0 && Number.isFinite(sec) ? sec : 8)
    }
    v.onloadedmetadata = () => done(v.duration)
    v.onerror = () => done(8)
  })
}

function clipAtSequenceTime(sec: number): { idx: number; local: number } | null {
  const clips = videoClips.value
  if (!clips.length) return null
  let acc = 0
  const t = Math.max(0, Math.min(sec, totalDuration.value))
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i]
    const d = c.dur
    if (t < acc + d - 1e-6) return { idx: i, local: t - acc }
    acc += d
  }
  const last = clips.length - 1
  return { idx: last, local: clips[last].dur }
}

function syncPreviewToPlayhead() {
  const hit = clipAtSequenceTime(playheadSec.value)
  const v = previewRef.value
  if (!hit || !v || !videoClips.value.length) {
    if (videoClips.value[0]) {
      const c0 = videoClips.value[0]
      previewSrcUrl.value = `/${c0.path.replace(/^\//, '')}`
      previewClipIdx.value = 0
    } else {
      previewSrcUrl.value = ''
    }
    return
  }
  const c = videoClips.value[hit.idx]
  const src = `/${c.path.replace(/^\//, '')}`
  const mediaTime = Math.min(c.in + hit.local, c.in + c.dur - 0.04)
  if (previewClipIdx.value !== hit.idx || previewSrcUrl.value !== src) {
    previewClipIdx.value = hit.idx
    previewSrcUrl.value = src
    v.pause()
    const setT = () => {
      try {
        v.currentTime = Math.max(c.in, mediaTime)
      } catch {
        /* ignore */
      }
    }
    if (v.readyState >= 1) setT()
    else v.addEventListener('loadedmetadata', setT, { once: true })
  } else {
    try {
      v.currentTime = Math.max(c.in, mediaTime)
    } catch {
      /* ignore */
    }
  }
}

watch([playheadSec, videoClips], () => {
  if (!previewFollowTimeline.value) syncPreviewToPlayhead()
})

watch(totalDuration, (d) => {
  if (playheadSec.value > d) playheadSec.value = Math.max(0, d)
})

let playheadDrag: { startX: number; startSec: number } | null = null

function startPlayheadDrag(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture?.(e.pointerId)
  playheadDrag = { startX: e.clientX, startSec: playheadSec.value }
  previewFollowTimeline.value = false
}

function onScrubAreaPointerDown(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('.te-playhead')) return
  if ((e.target as HTMLElement).closest('.te-clip')) return
  if ((e.target as HTMLElement).closest('.te-handle')) return
  const area = scrubAreaRef.value
  if (!area) return
  const r = area.getBoundingClientRect()
  const x = e.clientX - r.left
  playheadSec.value = Math.max(0, Math.min(x / pxPerSec.value, totalDuration.value))
  previewFollowTimeline.value = false
  syncPreviewToPlayhead()
}

function applyPlayheadMove(e: PointerEvent) {
  if (!playheadDrag) return
  const dx = e.clientX - playheadDrag.startX
  const ds = dx / pxPerSec.value
  playheadSec.value = Math.max(0, Math.min(playheadDrag.startSec + ds, totalDuration.value))
}

function onPlayheadPointerUp(e: PointerEvent) {
  if (playheadDrag) {
    try {
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
    playheadDrag = null
    syncPreviewToPlayhead()
  }
}

function onPreviewTimeUpdate() {
  if (!previewFollowTimeline.value) return
  const v = previewRef.value
  if (!v) return
  const idx = previewClipIdx.value
  const c = videoClips.value[idx]
  if (!c) return
  const starts = clipStartTimes.value
  const seq = (starts[idx] ?? 0) + (v.currentTime - c.in)
  playheadSec.value = Math.max(0, Math.min(seq, totalDuration.value))
}

function onPreviewSeeked() {
  if (previewFollowTimeline.value) onPreviewTimeUpdate()
}

function togglePreviewPlay() {
  const v = previewRef.value
  if (!v || !previewSrcUrl.value) return
  if (v.paused) {
    previewFollowTimeline.value = true
    void v.play()
  } else {
    v.pause()
  }
}

function onKeyDown(e: KeyboardEvent) {
  const t = e.target as HTMLElement
  if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return
  if (e.code === 'Space') {
    e.preventDefault()
    togglePreviewPlay()
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    deleteSelected()
    return
  }
  if (e.ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault()
    undo()
    return
  }
  if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
    e.preventDefault()
    redo()
    return
  }
  const step = e.shiftKey ? 1 : 1 / 6
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    playheadSec.value = Math.max(0, playheadSec.value - step)
    previewFollowTimeline.value = false
    syncPreviewToPlayhead()
    return
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    playheadSec.value = Math.min(totalDuration.value, playheadSec.value + step)
    previewFollowTimeline.value = false
    syncPreviewToPlayhead()
    return
  }
  if (e.key === 'Home') {
    e.preventDefault()
    playheadSec.value = 0
    previewFollowTimeline.value = false
    syncPreviewToPlayhead()
    return
  }
  if (e.key === 'End') {
    e.preventDefault()
    playheadSec.value = totalDuration.value
    previewFollowTimeline.value = false
    syncPreviewToPlayhead()
    return
  }
}

function onClipPointerDown(kind: 'v' | 'a', idx: number, e: PointerEvent) {
  if ((e.target as HTMLElement).closest('.te-handle')) return
  if (kind === 'v') {
    selectedVideoIdx.value = idx
    selectedAudioIdx.value = null
  } else {
    selectedAudioIdx.value = idx
    selectedVideoIdx.value = null
  }
}

function splitAtPlayhead() {
  const t = playheadSec.value
  const hit = clipAtSequenceTime(t)
  if (!hit) return
  const i = hit.idx
  const c = videoClips.value[i]
  const local = hit.local
  if (local <= MIN_DUR || local >= c.dur - MIN_DUR) {
    toast.warning('播放头需落在片段中间（距两端至少 0.2s）')
    return
  }
  pushHistory()
  const left: Clip = {
    ...c,
    id: crypto.randomUUID(),
    dur: local,
  }
  const right: Clip = {
    ...c,
    id: crypto.randomUUID(),
    in: c.in + local,
    dur: c.dur - local,
  }
  const arr = [...videoClips.value]
  arr.splice(i, 1, left, right)
  videoClips.value = arr
  if (!audioLinked.value) {
    const ac = audioClips.value[i]
    if (ac) {
      const al: Clip = { ...ac, id: crypto.randomUUID(), dur: local }
      const ar: Clip = { ...ac, id: crypto.randomUUID(), in: ac.in + local, dur: ac.dur - local }
      const a2 = [...audioClips.value]
      a2.splice(i, 1, al, ar)
      audioClips.value = a2
    }
  }
  selectedVideoIdx.value = i + 1
  nextTick(() => syncPreviewToPlayhead())
  toast.success('已分割')
}

function duplicateSelected() {
  const i = selectedVideoIdx.value
  if (i === null) return
  pushHistory()
  const c = videoClips.value[i]
  const copy: Clip = { ...c, id: crypto.randomUUID() }
  const arr = [...videoClips.value]
  arr.splice(i + 1, 0, copy)
  videoClips.value = arr
  if (!audioLinked.value) {
    const ac = audioClips.value[i]
    if (ac) {
      const acopy: Clip = { ...ac, id: crypto.randomUUID() }
      const a2 = [...audioClips.value]
      a2.splice(i + 1, 0, acopy)
      audioClips.value = a2
    }
  }
  selectedVideoIdx.value = i + 1
  nextTick(() => syncPreviewToPlayhead())
}

function deleteSelected() {
  const i = selectedVideoIdx.value
  if (i === null) return
  if (videoClips.value.length <= 1) {
    toast.warning('至少保留一段视频')
    return
  }
  pushHistory()
  const arr = [...videoClips.value]
  arr.splice(i, 1)
  videoClips.value = arr
  if (!audioLinked.value) {
    const a2 = [...audioClips.value]
    if (a2[i]) a2.splice(i, 1)
    audioClips.value = a2
  }
  selectedVideoIdx.value = null
  if (playheadSec.value > totalDuration.value) playheadSec.value = totalDuration.value
  nextTick(() => syncPreviewToPlayhead())
}

function toggleSelectedEnabled() {
  const i = selectedVideoIdx.value
  if (i === null) return
  pushHistory()
  const c = videoClips.value[i]
  const turnOn = c.enabled === false
  videoClips.value = videoClips.value.map((x, j) =>
    j === i ? { ...x, enabled: turnOn } : x,
  )
  if (!audioLinked.value && audioClips.value[i]) {
    const en = videoClips.value[i].enabled !== false
    audioClips.value = audioClips.value.map((x, j) =>
      j === i ? { ...x, enabled: en } : x,
    )
  }
}

onMounted(async () => {
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUpGlobal)
  window.addEventListener('pointercancel', onPointerUpGlobal)
  window.addEventListener('keydown', onKeyDown)

  try {
    const d = await dramaAPI.get(dramaId)
    drama.value = d
    const ep = (d.episodes || []).find(
      (e: any) => (e.episode_number ?? e.episodeNumber) === episodeNumber,
    )
    if (!ep) {
      loadError.value = '找不到该集'
      return
    }
    const sbs = await episodeAPI.storyboards(ep.id)
    await rebuildClipsFromStoryboards(sbs)
    playheadSec.value = 0
    await nextTick()
    syncPreviewToPlayhead()
  } catch (e: any) {
    loadError.value = e?.message || '加载失败'
    toast.error(loadError.value)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUpGlobal)
  window.removeEventListener('pointercancel', onPointerUpGlobal)
  window.removeEventListener('keydown', onKeyDown)
})

function onDragStart(kind: 'v' | 'a', idx: number, e: DragEvent) {
  dragKind = kind
  if (kind === 'v') dragVideoIdx.value = idx
  else dragAudioIdx.value = idx
  e.dataTransfer!.effectAllowed = 'move'
  try {
    e.dataTransfer!.setData('text/plain', String(idx))
  } catch {
    /* ignore */
  }
}

function clearDrag() {
  dragVideoIdx.value = dragAudioIdx.value = null
  dragKind = null
}

function onDrop(kind: 'v' | 'a', toIdx: number) {
  const fromIdx = kind === 'v' ? dragVideoIdx.value : dragAudioIdx.value
  if (fromIdx === null || fromIdx === undefined || fromIdx === toIdx) {
    clearDrag()
    return
  }
  pushHistory()
  const arr = kind === 'v' ? [...videoClips.value] : [...audioClips.value]
  const [item] = arr.splice(fromIdx, 1)
  arr.splice(toIdx, 0, item)
  if (kind === 'v') {
    videoClips.value = arr
    selectedVideoIdx.value = toIdx
  } else {
    audioClips.value = arr
    selectedAudioIdx.value = toIdx
  }
  clearDrag()
  nextTick(() => syncPreviewToPlayhead())
}

const MIN_DUR = 0.2

type TrimEdge = 'in' | 'out'
let trimState: {
  kind: 'v' | 'a'
  idx: number
  edge: TrimEdge
  startX: number
  clip: Clip
  captureEl: HTMLElement | null
} | null = null

function startTrim(e: PointerEvent, kind: 'v' | 'a', idx: number, edge: TrimEdge) {
  const list = kind === 'v' ? videoClips.value : audioClips.value
  const c = list[idx]
  if (!c) return
  pushHistory()
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture?.(e.pointerId)
  trimState = {
    kind,
    idx,
    edge,
    startX: e.clientX,
    clip: { ...c },
    captureEl: el,
  }
}

function snapClipTimes(c: Clip) {
  if (!snapEnabled.value) return
  c.in = Math.round(c.in * 10) / 10
  c.dur = Math.round(c.dur * 10) / 10
  c.in = Math.max(0, Math.min(c.in, c.full - MIN_DUR))
  c.dur = Math.max(MIN_DUR, Math.min(c.dur, c.full - c.in))
}

function onPointerMove(e: PointerEvent) {
  if (playheadDrag) {
    applyPlayheadMove(e)
    syncPreviewToPlayhead()
    return
  }
  if (!trimState) return
  const dx = e.clientX - trimState.startX
  const ds = dx / pxPerSec.value
  const orig = trimState.clip
  const list = trimState.kind === 'v' ? videoClips.value : audioClips.value
  const cur = list[trimState.idx]
  if (!cur) return

  if (trimState.edge === 'in') {
    const end = orig.in + orig.dur
    let newIn = orig.in + ds
    newIn = Math.max(0, Math.min(newIn, end - MIN_DUR))
    cur.in = newIn
    cur.dur = end - newIn
  } else {
    let newDur = orig.dur + ds
    newDur = Math.max(MIN_DUR, Math.min(newDur, orig.full - orig.in))
    cur.dur = newDur
  }
}

function onPointerUpGlobal(e: PointerEvent) {
  if (trimState?.captureEl) {
    try {
      trimState.captureEl.releasePointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
    const list = trimState.kind === 'v' ? videoClips.value : audioClips.value
    const cur = list[trimState.idx]
    if (cur) snapClipTimes(cur)
    if (!audioLinked.value) {
      const vc = videoClips.value[trimState.idx]
      const ac = audioClips.value[trimState.idx]
      if (vc && ac) {
        if (trimState.kind === 'v') {
          ac.in = vc.in
          ac.dur = vc.dur
        } else {
          vc.in = ac.in
          vc.dur = ac.dur
        }
      }
    }
    trimState = null
    nextTick(() => syncPreviewToPlayhead())
  }
  onPlayheadPointerUp(e)
}

async function doRender() {
  const enabledIdx = videoClips.value.reduce<number[]>((acc, c, i) => {
    if (c.enabled !== false) acc.push(i)
    return acc
  }, [])
  if (!enabledIdx.length) {
    toast.warning('没有可导出的片段（请启用至少一段视频）')
    return
  }
  rendering.value = true
  exportUrl.value = ''
  try {
    const video_segments = enabledIdx.map((i) => {
      const c = videoClips.value[i]
      return {
        path: c.path.replace(/^\//, ''),
        in_sec: c.in,
        duration_sec: c.dur,
      }
    })
    let audio_segments: { path: string; in_sec: number; duration_sec: number }[]
    if (audioLinked.value) {
      audio_segments = video_segments.map((s) => ({ ...s }))
    } else {
      if (audioClips.value.length !== videoClips.value.length) {
        toast.warning('音轨与视频轨条数不一致，请改回音画联动或重新载入本页')
        rendering.value = false
        renderProgress.value = 0
        return
      }
      audio_segments = enabledIdx.map((i) => {
        const c = audioClips.value[i]
        return {
          path: c.path.replace(/^\//, ''),
          in_sec: c.in,
          duration_sec: c.dur,
        }
      })
    }
    const { path } = await timelineAPI.renderStream({ video_segments, audio_segments }, (pct) => {
      renderProgress.value = pct
    })
    exportUrl.value = path
    renderProgress.value = 100
    toast.success('导出完成')
  } catch (err: any) {
    toast.error(err?.message || '导出失败')
  } finally {
    rendering.value = false
    renderProgress.value = 0
  }
}
</script>

<style scoped>
.te-page {
  min-height: 100vh;
  background: var(--bg-base);
  font-family: var(--font-body);
  color: var(--text-0);
  padding: var(--sp-5) var(--sp-6) var(--sp-10);
}

.te-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--sp-4);
  margin-bottom: var(--sp-6);
}

.te-title-block {
  flex: 1;
  min-width: 200px;
}

.te-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
}

.te-chip {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-2);
  padding: 2px 8px;
  background: var(--bg-2);
  border-radius: 99px;
}

.te-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.te-timecode {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-1);
  padding: 4px 8px;
  background: var(--bg-2);
  border-radius: var(--radius-sm);
}

.te-zoom {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-2);
}

.te-zoom input {
  width: 100px;
}

.te-preview {
  margin-bottom: var(--sp-4);
}

.te-video {
  max-width: 720px;
  width: 100%;
  border-radius: var(--radius-lg);
  background: #000;
}

.te-preview-hint {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-3);
}

.te-hint,
.te-empty {
  color: var(--text-2);
  font-size: 14px;
}

.card-like {
  background: var(--bg-0);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.te-toolbar {
  padding: var(--sp-4);
  margin-bottom: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.te-toolbar-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.te-toolbar-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-right: 4px;
}

.te-toolbar-hint {
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.45;
}

.te-check-inline {
  margin: 0;
}

.te-panel {
  background: var(--bg-0);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--sp-5);
  overflow-x: auto;
}

.te-row {
  margin-bottom: var(--sp-4);
}

.te-check {
  font-size: 13px;
  color: var(--text-1);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.te-track-head {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  margin-bottom: 6px;
}

.te-track-head-inner {
  margin-top: 10px;
}

.te-track-label {
  font-weight: 600;
  font-size: 13px;
}

.te-dim {
  font-size: 11px;
  color: var(--text-3);
}

.te-scrub-stack {
  position: relative;
  min-width: 0;
}

.te-ruler {
  position: relative;
  height: 18px;
  margin-bottom: 4px;
  border-bottom: 1px dashed var(--border);
}

.te-ruler-scrub {
  cursor: pointer;
}

.te-tick {
  position: absolute;
  top: 0;
  font-size: 10px;
  color: var(--text-3);
  transform: translateX(-2px);
}

.te-playhead {
  position: absolute;
  top: 0;
  width: 2px;
  margin-left: -1px;
  height: calc(100% - 4px);
  background: var(--error);
  z-index: 4;
  pointer-events: auto;
  cursor: ew-resize;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.te-track {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  min-height: 52px;
  gap: 0;
  background: var(--bg-2);
  border-radius: var(--radius);
  padding: 4px;
  position: relative;
  z-index: 1;
}

.te-clip {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background: linear-gradient(180deg, var(--bg-1), var(--bg-2));
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  cursor: grab;
  user-select: none;
  z-index: 2;
}

.te-clip.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent-bg);
}

.te-clip.disabled {
  opacity: 0.45;
  filter: grayscale(0.35);
}

.te-clip.dragging {
  opacity: 0.65;
}

.te-clip-audio.muted {
  opacity: 0.55;
  pointer-events: none;
}

.te-clip-audio:not(.muted) {
  cursor: grab;
}

.te-handle {
  width: 10px;
  flex-shrink: 0;
  background: rgba(200, 170, 60, 0.35);
  cursor: ew-resize;
  z-index: 3;
}

.te-handle:hover {
  background: rgba(200, 170, 60, 0.55);
}

.te-clip-body {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.te-clip-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.te-clip-meta {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-3);
}

.te-export {
  margin-top: var(--sp-5);
  font-size: 13px;
}

.te-export a {
  color: var(--accent);
}
</style>
