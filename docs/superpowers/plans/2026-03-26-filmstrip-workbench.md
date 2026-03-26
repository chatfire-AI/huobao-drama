# Filmstrip 工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing Grid/Edit dual-mode EpisodeWorkbench with a Tab-based workbench (Script Tab + Storyboard Table Tab) featuring inline editing, collapsible icon sidebar, and updated pipeline flow.

**Architecture:** Two-tab layout with shared left sidebar. Script Tab handles script editing and pipeline operations (rewrite, extract). Storyboard Table Tab renders an inline-editable table with toolbar for batch operations. ResourcePanel collapses to icon-only rail by default.

**Tech Stack:** Vue 3, TypeScript, Shadcn Vue (tabs, select, checkbox, badge, button, tooltip, sheet), Lucide icons, existing composables and API layer.

**Spec:** `docs/superpowers/specs/2026-03-26-filmstrip-workbench-design.md`

---

## File Structure

### New Files
- `web/src/views/drama/episode/workbench/ScriptTab.vue` — Script editing tab with pipeline operations
- `web/src/views/drama/episode/workbench/StoryboardTable.vue` — Table view with toolbar and status bar
- `web/src/views/drama/episode/workbench/StoryboardTableRow.vue` — Single table row with inline editing
- `web/src/views/drama/episode/workbench/TableToolbar.vue` — Batch operation toolbar
- `web/src/composables/useStoryboardTable.ts` — Table selection, sorting, batch state

### Modified Files
- `web/src/views/drama/episode/EpisodeWorkbench.vue` — Replace grid/edit with tab layout
- `web/src/views/drama/episode/workbench/ResourcePanel.vue` — Collapsible icon rail
- `web/src/composables/useEpisodeWorkbench.ts` — Wire new composable, remove grid
- `web/src/composables/useResourcePanel.ts` — Add pipeline stage for formatted script

### Deleted Files (after new components are working)
- `web/src/views/drama/episode/workbench/StoryboardGrid.vue`
- `web/src/views/drama/episode/workbench/StoryboardCard.vue`
- `web/src/views/drama/episode/workbench/StoryboardEditor.vue`
- `web/src/views/drama/episode/workbench/StoryboardStrip.vue`
- `web/src/views/drama/episode/workbench/PreviewPane.vue`
- `web/src/views/drama/episode/workbench/PropertiesPanel.vue`

---

### Task 1: Create useStoryboardTable composable

**Files:**
- Create: `web/src/composables/useStoryboardTable.ts`

Replaces `useStoryboardGrid.ts`. Manages table selection state (multi-select via checkboxes), computed progress/status, and active tab.

- [ ] **Step 1: Create the composable**

```typescript
// web/src/composables/useStoryboardTable.ts
import { ref, computed, type Ref } from 'vue'
import type { Storyboard } from '@/types/drama'

export type WorkbenchTab = 'script' | 'storyboard'

export function useStoryboardTable(storyboards: Ref<Storyboard[]>) {
  const activeTab = ref<WorkbenchTab>('script')
  const selectedIds = ref<Set<string>>(new Set())

  const safeStoryboards = computed(() =>
    Array.isArray(storyboards.value) ? storyboards.value : []
  )

  const progress = computed(() => {
    const all = safeStoryboards.value
    const withImage = all.filter(s => s.image_url || s.local_path).length
    const withVideo = all.filter(s => s.video_url).length
    const generating = all.filter(s =>
      s.image_generation_status === 'processing' ||
      s.image_generation_status === 'generating' ||
      s.status === 'processing' ||
      s.status === 'generating'
    ).length
    const totalDuration = all.reduce((sum, s) => sum + (s.duration || 0), 0)
    return { total: all.length, withImage, withVideo, generating, totalDuration }
  })

  const allSelected = computed(() =>
    safeStoryboards.value.length > 0 &&
    safeStoryboards.value.every(s => selectedIds.value.has(s.id))
  )

  const hasSelection = computed(() => selectedIds.value.size > 0)

  const selectedStoryboards = computed(() =>
    safeStoryboards.value.filter(s => selectedIds.value.has(s.id))
  )

  function toggleSelect(id: string) {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }

  function toggleSelectAll() {
    if (allSelected.value) {
      selectedIds.value = new Set()
    } else {
      selectedIds.value = new Set(safeStoryboards.value.map(s => s.id))
    }
  }

  function clearSelection() {
    selectedIds.value = new Set()
  }

  return {
    activeTab,
    selectedIds,
    safeStoryboards,
    progress,
    allSelected,
    hasSelection,
    selectedStoryboards,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
  }
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/connor/AiProject/huobao-drama/web && npx tsc --noEmit --skipLibCheck 2>&1 | grep useStoryboardTable || echo "No errors"`

- [ ] **Step 3: Commit**

```bash
git add web/src/composables/useStoryboardTable.ts
git commit -m "feat: add useStoryboardTable composable for table selection and progress"
```

---

### Task 2: Create TableToolbar component

**Files:**
- Create: `web/src/views/drama/episode/workbench/TableToolbar.vue`

Toolbar above the storyboard table with batch action buttons. Shows selection-aware actions when rows are selected.

- [ ] **Step 1: Create the component**

```vue
<!-- web/src/views/drama/episode/workbench/TableToolbar.vue -->
<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Image, Video, Grid3X3, X } from 'lucide-vue-next'

defineProps<{
  total: number
  withImage: number
  withVideo: number
  generating: number
  hasSelection: boolean
  selectionCount: number
}>()

defineEmits<{
  add: []
  batchImages: []
  batchVideos: []
  generateGrid: []
  clearSelection: []
}>()
</script>

<template>
  <div class="table-toolbar">
    <div class="toolbar-left">
      <span class="toolbar-title">镜头 ({{ total }})</span>
      <div class="toolbar-badges">
        <Badge v-if="withVideo > 0" class="badge badge--complete">完成 {{ withVideo }}</Badge>
        <Badge v-if="withImage - withVideo > 0" class="badge badge--image">有图 {{ withImage - withVideo }}</Badge>
        <Badge v-if="generating > 0" class="badge badge--generating">生成中 {{ generating }}</Badge>
        <Badge v-if="total - withImage - generating > 0" class="badge badge--pending">
          待处理 {{ total - withImage - generating }}
        </Badge>
      </div>
    </div>
    <div class="toolbar-actions">
      <!-- Selection mode actions -->
      <template v-if="hasSelection">
        <span class="selection-count">已选 {{ selectionCount }}</span>
        <Button variant="ghost" size="sm" class="toolbar-btn" @click="$emit('generateGrid')">
          <Grid3X3 :size="14" />
          生成宫格图
        </Button>
        <Button variant="ghost" size="sm" class="toolbar-btn" @click="$emit('batchImages')">
          <Image :size="14" />
          批量生成图片
        </Button>
        <Button variant="ghost" size="sm" class="toolbar-btn" @click="$emit('batchVideos')">
          <Video :size="14" />
          批量生成视频
        </Button>
        <Button variant="ghost" size="icon" class="toolbar-btn toolbar-btn--clear" @click="$emit('clearSelection')">
          <X :size="14" />
        </Button>
      </template>
      <!-- Normal mode actions -->
      <template v-else>
        <Button variant="ghost" size="sm" class="toolbar-btn" @click="$emit('add')">
          <Plus :size="14" />
          添加
        </Button>
        <Button variant="ghost" size="sm" class="toolbar-btn" @click="$emit('batchImages')">
          <Image :size="14" />
          批量生成图片
        </Button>
        <Button variant="ghost" size="sm" class="toolbar-btn" @click="$emit('batchVideos')">
          <Video :size="14" />
          批量生成视频
        </Button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-primary, rgba(255, 255, 255, 0.06));
  flex-shrink: 0;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.toolbar-badges {
  display: flex;
  align-items: center;
  gap: 4px;
}

.badge {
  font-size: 10px !important;
  padding: 1px 7px !important;
  height: auto !important;
  border-radius: 9999px !important;
  font-weight: 500 !important;
  border: none !important;
}

.badge--complete {
  background: rgba(94, 230, 176, 0.15) !important;
  color: rgba(94, 230, 176, 0.9) !important;
}

.badge--image {
  background: rgba(232, 162, 67, 0.15) !important;
  color: rgba(232, 162, 67, 0.9) !important;
}

.badge--generating {
  background: rgba(96, 165, 250, 0.15) !important;
  color: rgba(96, 165, 250, 0.9) !important;
}

.badge--pending {
  background: rgba(255, 255, 255, 0.06) !important;
  color: rgba(255, 255, 255, 0.45) !important;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.selection-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--accent, #e8a243);
  margin-right: 4px;
}

.toolbar-btn {
  font-size: 11px !important;
  height: 28px !important;
  padding: 0 8px !important;
  color: var(--text-secondary) !important;
}

.toolbar-btn:hover {
  color: var(--text-primary) !important;
}

.toolbar-btn--clear {
  width: 28px !important;
  padding: 0 !important;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/views/drama/episode/workbench/TableToolbar.vue
git commit -m "feat: add TableToolbar component for storyboard batch operations"
```

---

### Task 3: Create StoryboardTableRow component

**Files:**
- Create: `web/src/views/drama/episode/workbench/StoryboardTableRow.vue`

Single table row with inline editing. Each cell is editable: dropdowns for scene/shot_type, textareas for description/video_prompt/dialogue, multi-select tags for characters. Hover shows action buttons at row end.

- [ ] **Step 1: Create the component**

The row renders as a `<tr>` with inline-editable cells. Key behaviors:
- Checkbox cell for multi-select
- Sequence number cell (read-only, format S##-##)
- Thumbnail cell (160x90 image, read-only)
- Scene cell (dropdown from available scenes)
- Shot type cell (dropdown: 远景/全景/中景/近景/特写)
- Description cell (textarea, click to edit)
- Video prompt cell (textarea, click to edit)
- Characters cell (badge tags, click to open selector)
- Dialogue cell (textarea, click to edit)
- Status cell (badge indicator)
- Actions cell (hover: generate image/video buttons)

```vue
<!-- web/src/views/drama/episode/workbench/StoryboardTableRow.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageIcon, Video, Loader2 } from 'lucide-vue-next'
import type { Storyboard, Character, Scene } from '@/types/drama'
import { getImageUrl } from '@/utils/image'

const props = defineProps<{
  storyboard: Storyboard
  index: number
  selected: boolean
  characters: Character[]
  scenes: Scene[]
}>()

const emit = defineEmits<{
  toggleSelect: [id: string]
  saveField: [id: string, field: string, value: any]
  generateImage: [id: string]
  generateVideo: [id: string]
}>()

const shotTypeOptions = ['远景', '全景', '中景', '近景', '特写']

const editingField = ref<string | null>(null)
const editValue = ref('')

const thumbnailUrl = computed(() => getImageUrl(props.storyboard))

const hasImage = computed(() => !!props.storyboard.image_url || !!props.storyboard.local_path)
const hasVideo = computed(() => !!props.storyboard.video_url)
const isGenerating = computed(() =>
  props.storyboard.image_generation_status === 'processing' ||
  props.storyboard.image_generation_status === 'generating' ||
  props.storyboard.status === 'processing' ||
  props.storyboard.status === 'generating'
)

const statusText = computed(() => {
  if (isGenerating.value) return '生成中'
  if (hasVideo.value) return '有视频'
  if (hasImage.value) return '有图'
  return '待处理'
})

const statusClass = computed(() => {
  if (isGenerating.value) return 'status--generating'
  if (hasVideo.value) return 'status--complete'
  if (hasImage.value) return 'status--image'
  return 'status--pending'
})

const sceneDisplay = computed(() => {
  const s = props.storyboard.scene
  if (!s) return ''
  return `${s.location || ''}${s.time ? ' · ' + s.time : ''}`
})

const storyboardCharacters = computed(() => {
  if (!props.storyboard.character_ids?.length) return []
  return props.characters.filter(c =>
    props.storyboard.character_ids!.includes(c.id)
  )
})

const sequenceNumber = computed(() => {
  const sceneNum = props.storyboard.scene_id ? 'S' + String(props.storyboard.scene_id).padStart(2, '0') : 'S00'
  return `${sceneNum}-${String(props.index + 1).padStart(2, '0')}`
})

function startEdit(field: string, currentValue: string) {
  editingField.value = field
  editValue.value = currentValue || ''
}

function commitEdit(field: string) {
  if (editingField.value === field) {
    emit('saveField', props.storyboard.id, field, editValue.value)
    editingField.value = null
  }
}

function onSelectChange(field: string, value: string) {
  emit('saveField', props.storyboard.id, field, value)
}
</script>

<template>
  <tr class="table-row" :class="{ 'table-row--selected': selected }">
    <!-- Checkbox -->
    <td class="cell cell--checkbox">
      <Checkbox
        :checked="selected"
        @update:checked="emit('toggleSelect', storyboard.id)"
      />
    </td>

    <!-- Sequence number -->
    <td class="cell cell--seq">
      <span class="seq-num">{{ sequenceNumber }}</span>
    </td>

    <!-- Thumbnail -->
    <td class="cell cell--thumb">
      <div class="thumb-wrapper">
        <img v-if="thumbnailUrl" :src="thumbnailUrl" class="thumb-img" />
        <div v-else-if="isGenerating" class="thumb-placeholder">
          <Loader2 :size="16" class="animate-spin" />
        </div>
        <div v-else class="thumb-placeholder">
          <ImageIcon :size="16" />
        </div>
      </div>
    </td>

    <!-- Scene -->
    <td class="cell cell--scene">
      <Select
        :model-value="storyboard.scene_id || ''"
        @update:model-value="(v: string) => onSelectChange('scene_id', v)"
      >
        <SelectTrigger class="inline-select">
          <SelectValue :placeholder="sceneDisplay || '选择场景'" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="s in scenes" :key="s.id" :value="s.id">
            {{ s.location }}{{ s.time ? ' · ' + s.time : '' }}
          </SelectItem>
        </SelectContent>
      </Select>
    </td>

    <!-- Shot type -->
    <td class="cell cell--shot">
      <Select
        :model-value="storyboard.shot_type || ''"
        @update:model-value="(v: string) => onSelectChange('shot_type', v)"
      >
        <SelectTrigger class="inline-select">
          <SelectValue placeholder="景别" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="opt in shotTypeOptions" :key="opt" :value="opt">
            {{ opt }}
          </SelectItem>
        </SelectContent>
      </Select>
    </td>

    <!-- Description -->
    <td class="cell cell--text" @dblclick="startEdit('description', storyboard.description || '')">
      <textarea
        v-if="editingField === 'description'"
        v-model="editValue"
        class="inline-textarea"
        rows="2"
        @blur="commitEdit('description')"
        @keydown.enter.ctrl="commitEdit('description')"
        ref="descInput"
      />
      <span v-else class="cell-text" :class="{ 'cell-text--empty': !storyboard.description }">
        {{ storyboard.description || '双击编辑...' }}
      </span>
    </td>

    <!-- Video prompt -->
    <td class="cell cell--text cell--prompt" @dblclick="startEdit('video_prompt', storyboard.video_prompt || '')">
      <textarea
        v-if="editingField === 'video_prompt'"
        v-model="editValue"
        class="inline-textarea"
        rows="3"
        @blur="commitEdit('video_prompt')"
        @keydown.enter.ctrl="commitEdit('video_prompt')"
      />
      <span v-else class="cell-text" :class="{ 'cell-text--empty': !storyboard.video_prompt }">
        {{ storyboard.video_prompt || '双击编辑...' }}
      </span>
    </td>

    <!-- Characters -->
    <td class="cell cell--chars">
      <div class="char-tags">
        <Badge v-for="char in storyboardCharacters" :key="char.id" class="char-tag">
          {{ char.name }}
        </Badge>
        <span v-if="!storyboardCharacters.length" class="cell-text--empty">-</span>
      </div>
    </td>

    <!-- Dialogue -->
    <td class="cell cell--text" @dblclick="startEdit('dialogue', storyboard.dialogue || '')">
      <textarea
        v-if="editingField === 'dialogue'"
        v-model="editValue"
        class="inline-textarea"
        rows="2"
        @blur="commitEdit('dialogue')"
        @keydown.enter.ctrl="commitEdit('dialogue')"
      />
      <span v-else class="cell-text" :class="{ 'cell-text--empty': !storyboard.dialogue }">
        {{ storyboard.dialogue || '双击编辑...' }}
      </span>
    </td>

    <!-- Status -->
    <td class="cell cell--status">
      <Badge class="status-badge" :class="statusClass">
        <Loader2 v-if="isGenerating" :size="10" class="animate-spin" />
        {{ statusText }}
      </Badge>
    </td>

    <!-- Actions (visible on hover) -->
    <td class="cell cell--actions">
      <div class="row-actions">
        <Button
          variant="ghost"
          size="icon"
          class="action-btn"
          title="生成图片"
          @click="emit('generateImage', storyboard.id)"
        >
          <ImageIcon :size="14" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="action-btn"
          title="生成视频"
          @click="emit('generateVideo', storyboard.id)"
        >
          <Video :size="14" />
        </Button>
      </div>
    </td>
  </tr>
</template>

<style scoped>
.table-row {
  border-bottom: 1px solid var(--border-primary, rgba(255, 255, 255, 0.06));
  transition: background 0.1s;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.table-row--selected {
  background: rgba(232, 162, 67, 0.06);
}

.cell {
  padding: 6px 8px;
  vertical-align: middle;
  font-size: 12px;
  color: var(--text-primary);
}

.cell--checkbox {
  width: 32px;
  text-align: center;
}

.cell--seq {
  width: 64px;
}

.seq-num {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  font-family: monospace;
}

.cell--thumb {
  width: 168px;
  padding: 4px 8px;
}

.thumb-wrapper {
  width: 160px;
  height: 90px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.06));
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.cell--scene {
  width: 140px;
}

.cell--shot {
  width: 80px;
}

.cell--text {
  min-width: 120px;
  max-width: 200px;
}

.cell--prompt {
  min-width: 200px;
  max-width: 300px;
}

.cell-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
  cursor: default;
}

.cell-text--empty {
  color: var(--text-muted, rgba(255, 255, 255, 0.3));
  font-style: italic;
}

.inline-select {
  height: 28px !important;
  font-size: 11px !important;
  background: transparent !important;
  border-color: var(--border-primary) !important;
}

.inline-textarea {
  width: 100%;
  font-size: 12px;
  line-height: 1.5;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid var(--accent, #e8a243);
  background: var(--bg-primary);
  color: var(--text-primary);
  resize: vertical;
  font-family: inherit;
  outline: none;
}

.cell--chars {
  min-width: 100px;
}

.char-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.char-tag {
  font-size: 10px !important;
  padding: 1px 6px !important;
  height: auto !important;
  border-radius: 9999px !important;
  background: rgba(232, 162, 67, 0.15) !important;
  color: rgba(232, 162, 67, 0.9) !important;
  border: none !important;
}

.cell--status {
  width: 72px;
}

.status-badge {
  font-size: 10px !important;
  padding: 1px 7px !important;
  height: auto !important;
  border-radius: 9999px !important;
  border: none !important;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.status--pending {
  background: rgba(255, 255, 255, 0.06) !important;
  color: rgba(255, 255, 255, 0.45) !important;
}

.status--generating {
  background: rgba(96, 165, 250, 0.15) !important;
  color: rgba(96, 165, 250, 0.9) !important;
}

.status--image {
  background: rgba(232, 162, 67, 0.15) !important;
  color: rgba(232, 162, 67, 0.9) !important;
}

.status--complete {
  background: rgba(94, 230, 176, 0.15) !important;
  color: rgba(94, 230, 176, 0.9) !important;
}

.cell--actions {
  width: 72px;
}

.row-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.table-row:hover .row-actions {
  opacity: 1;
}

.action-btn {
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  color: var(--text-muted) !important;
}

.action-btn:hover {
  color: var(--accent) !important;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/views/drama/episode/workbench/StoryboardTableRow.vue
git commit -m "feat: add StoryboardTableRow with inline editing"
```

---

### Task 4: Create StoryboardTable component

**Files:**
- Create: `web/src/views/drama/episode/workbench/StoryboardTable.vue`

Wraps TableToolbar + table header + StoryboardTableRow list + status bar.

- [ ] **Step 1: Create the component**

```vue
<!-- web/src/views/drama/episode/workbench/StoryboardTable.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Wand2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import type { Storyboard, Character, Scene } from '@/types/drama'
import TableToolbar from './TableToolbar.vue'
import StoryboardTableRow from './StoryboardTableRow.vue'

const props = defineProps<{
  storyboards: Storyboard[]
  characters: Character[]
  scenes: Scene[]
  selectedIds: Set<string>
  allSelected: boolean
  hasSelection: boolean
  progress: {
    total: number
    withImage: number
    withVideo: number
    generating: number
    totalDuration: number
  }
}>()

const emit = defineEmits<{
  toggleSelect: [id: string]
  toggleSelectAll: []
  clearSelection: []
  saveField: [id: string, field: string, value: any]
  generateImage: [id: string]
  generateVideo: [id: string]
  add: []
  batchImages: []
  batchVideos: []
  generateGrid: []
  breakdown: []
}>()

const durationDisplay = computed(() => {
  const secs = props.progress.totalDuration
  const min = Math.floor(secs / 60)
  const sec = secs % 60
  return `${min}:${String(sec).padStart(2, '0')}`
})
</script>

<template>
  <div class="storyboard-table-root">
    <template v-if="storyboards.length > 0">
      <TableToolbar
        :total="progress.total"
        :with-image="progress.withImage"
        :with-video="progress.withVideo"
        :generating="progress.generating"
        :has-selection="hasSelection"
        :selection-count="selectedIds.size"
        @add="emit('add')"
        @batch-images="emit('batchImages')"
        @batch-videos="emit('batchVideos')"
        @generate-grid="emit('generateGrid')"
        @clear-selection="emit('clearSelection')"
      />

      <div class="table-scroll">
        <table class="sb-table">
          <thead>
            <tr class="table-header">
              <th class="th th--checkbox">
                <Checkbox :checked="allSelected" @update:checked="emit('toggleSelectAll')" />
              </th>
              <th class="th th--seq">#</th>
              <th class="th th--thumb">缩略图</th>
              <th class="th">场景</th>
              <th class="th">景别</th>
              <th class="th">描述</th>
              <th class="th">视频提示词</th>
              <th class="th">角色</th>
              <th class="th">对白</th>
              <th class="th">状态</th>
              <th class="th th--actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <StoryboardTableRow
              v-for="(sb, idx) in storyboards"
              :key="sb.id"
              :storyboard="sb"
              :index="idx"
              :selected="selectedIds.has(sb.id)"
              :characters="characters"
              :scenes="scenes"
              @toggle-select="emit('toggleSelect', $event)"
              @save-field="(id, field, value) => emit('saveField', id, field, value)"
              @generate-image="emit('generateImage', $event)"
              @generate-video="emit('generateVideo', $event)"
            />
          </tbody>
        </table>
      </div>

      <!-- Status bar -->
      <div class="status-bar">
        <span>共 {{ progress.total }} 镜头</span>
        <span class="status-sep">|</span>
        <span>有图 {{ progress.withImage }}</span>
        <span class="status-sep">|</span>
        <span>有视频 {{ progress.withVideo }}</span>
        <span class="status-sep">|</span>
        <span>预计 {{ durationDisplay }}</span>
      </div>
    </template>

    <!-- Empty state -->
    <div v-else class="table-empty">
      <Wand2 :size="32" class="table-empty__icon" />
      <p class="table-empty__text">暂无分镜</p>
      <p class="table-empty__hint">请先在「剧本」页完成改写和角色场景提取，然后拆解分镜</p>
      <Button variant="outline" size="sm" @click="emit('breakdown')">
        <Wand2 :size="14" />
        Agent 拆解分镜
      </Button>
    </div>
  </div>
</template>

<style scoped>
.storyboard-table-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.table-scroll {
  flex: 1;
  overflow: auto;
}

.sb-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

.table-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-card, rgba(255, 255, 255, 0.04));
  border-bottom: 1px solid var(--border-primary, rgba(255, 255, 255, 0.08));
}

.th {
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: left;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.th--checkbox {
  width: 32px;
  text-align: center;
}

.th--seq {
  width: 64px;
}

.th--thumb {
  width: 168px;
}

.th--actions {
  width: 72px;
}

/* Status bar */
.status-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-top: 1px solid var(--border-primary, rgba(255, 255, 255, 0.06));
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-card);
}

.status-sep {
  color: var(--border-primary);
}

/* Empty state */
.table-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.table-empty__icon {
  color: var(--text-muted);
}

.table-empty__text {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.table-empty__hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/views/drama/episode/workbench/StoryboardTable.vue
git commit -m "feat: add StoryboardTable component with toolbar and status bar"
```

---

### Task 5: Create ScriptTab component

**Files:**
- Create: `web/src/views/drama/episode/workbench/ScriptTab.vue`

Full-height script editing tab. Reuses the editing logic from ScriptBlock but in a full-page layout with larger textarea and pipeline action buttons.

- [ ] **Step 1: Create the component**

```vue
<!-- web/src/views/drama/episode/workbench/ScriptTab.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  Wand2,
  FileText,
  Save,
  Users,
  MapPin,
} from 'lucide-vue-next'

const props = defineProps<{
  scriptContent: string
  hasScript: boolean
  hasCharacters: boolean
  hasScenes: boolean
  characterCount: number
  sceneCount: number
}>()

const emit = defineEmits<{
  save: [content: string]
  upload: []
  rewrite: []
  extract: []
}>()

const localContent = ref(props.scriptContent)
const isDirty = ref(false)

watch(
  () => props.scriptContent,
  (val) => {
    localContent.value = val
    isDirty.value = false
  },
)

function onInput(e: Event) {
  localContent.value = (e.target as HTMLTextAreaElement).value
  isDirty.value = localContent.value !== props.scriptContent
}

function handleSave() {
  emit('save', localContent.value)
  isDirty.value = false
}

const wordCount = computed(() => {
  return localContent.value.replace(/\s/g, '').length
})

const pipelineHint = computed(() => {
  if (!props.hasScript) return '上传或粘贴剧本内容开始制作'
  if (!props.hasCharacters && !props.hasScenes) return '剧本就绪，可以改写为格式化剧本或提取角色场景'
  return '角色场景已提取，可以切换到分镜 Tab 拆解分镜'
})
</script>

<template>
  <div class="script-tab">
    <!-- Toolbar -->
    <div class="script-toolbar">
      <div class="script-toolbar-left">
        <span class="script-toolbar-title">剧本</span>
        <Badge v-if="hasScript" variant="secondary" class="word-badge">{{ wordCount.toLocaleString() }}字</Badge>
        <Badge v-if="hasCharacters" class="resource-badge resource-badge--char">
          <Users :size="10" />
          {{ characterCount }}
        </Badge>
        <Badge v-if="hasScenes" class="resource-badge resource-badge--scene">
          <MapPin :size="10" />
          {{ sceneCount }}
        </Badge>
      </div>
      <div class="script-toolbar-right">
        <Button variant="ghost" size="sm" class="tb-btn" @click="emit('upload')">
          <Upload :size="13" />
          上传
        </Button>
        <Button variant="ghost" size="sm" class="tb-btn" :disabled="!hasScript" @click="emit('rewrite')">
          <Wand2 :size="13" />
          AI 改写
        </Button>
        <Button variant="ghost" size="sm" class="tb-btn" :disabled="!hasScript" @click="emit('extract')">
          <FileText :size="13" />
          提取角色&场景
        </Button>
        <Button v-if="isDirty" size="sm" class="tb-btn tb-btn--save" @click="handleSave">
          <Save :size="13" />
          保存
        </Button>
      </div>
    </div>

    <!-- Editor -->
    <div class="script-editor">
      <textarea
        class="script-textarea"
        :value="localContent"
        :placeholder="pipelineHint"
        @input="onInput"
      />
    </div>

    <!-- Pipeline hint -->
    <div class="script-hint">
      {{ pipelineHint }}
    </div>
  </div>
</template>

<style scoped>
.script-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.script-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-primary);
  gap: 8px;
  flex-wrap: wrap;
}

.script-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.script-toolbar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.word-badge {
  font-size: 10px !important;
  padding: 1px 7px !important;
  height: auto !important;
}

.resource-badge {
  font-size: 10px !important;
  padding: 1px 7px !important;
  height: auto !important;
  border-radius: 9999px !important;
  border: none !important;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.resource-badge--char {
  background: rgba(232, 162, 67, 0.15) !important;
  color: rgba(232, 162, 67, 0.9) !important;
}

.resource-badge--scene {
  background: rgba(96, 165, 250, 0.15) !important;
  color: rgba(96, 165, 250, 0.9) !important;
}

.script-toolbar-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tb-btn {
  font-size: 11px !important;
  height: 28px !important;
  padding: 0 8px !important;
  color: var(--text-secondary) !important;
}

.tb-btn:hover {
  color: var(--text-primary) !important;
}

.tb-btn--save {
  color: var(--text-inverse) !important;
  background: var(--accent) !important;
}

.script-editor {
  flex: 1;
  min-height: 0;
  padding: 12px;
}

.script-textarea {
  width: 100%;
  height: 100%;
  padding: 16px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  resize: none;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}

.script-textarea:focus {
  border-color: var(--accent);
}

.script-textarea::placeholder {
  color: var(--text-muted);
}

.script-hint {
  flex-shrink: 0;
  padding: 6px 12px;
  border-top: 1px solid var(--border-primary);
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-card);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/views/drama/episode/workbench/ScriptTab.vue
git commit -m "feat: add ScriptTab component for script editing and pipeline operations"
```

---

### Task 6: Refactor ResourcePanel to collapsible icon rail

**Files:**
- Modify: `web/src/views/drama/episode/workbench/ResourcePanel.vue`

Replace the full-width sidebar with a narrow icon rail that expands on click. Default state: collapsed (only icons visible). Click icon → panel slides open to show content. Click again → collapse.

- [ ] **Step 1: Rewrite ResourcePanel.vue**

The component keeps the existing ScriptBlock, CharacterBlock, SceneBlock children but wraps them in a collapsible layout. In collapsed state, only 3 vertical icons are shown. Clicking one expands the panel to ~280px width showing that block's content.

Key changes from current:
- Remove the `resource` prop pattern — take individual props instead
- Add collapse/expand toggle
- Icon-only when collapsed
- Show block content when expanded

```vue
<!-- Rewrite web/src/views/drama/episode/workbench/ResourcePanel.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { FileText, User, MapPin } from 'lucide-vue-next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import CharacterBlock from './CharacterBlock.vue'
import SceneBlock from './SceneBlock.vue'
import type { Character, Scene } from '@/types/drama'

const props = defineProps<{
  characters: Character[]
  scenes: Scene[]
  hasCharacters: boolean
  hasScenes: boolean
}>()

defineEmits<{
  generateCharacterImage: [id: number]
  batchGenerateCharacters: []
  generateSceneImage: [id: number]
  batchGenerateScenes: []
}>()

type PanelBlock = 'characters' | 'scenes' | null
const activeBlock = ref<PanelBlock>(null)

function toggleBlock(block: PanelBlock) {
  activeBlock.value = activeBlock.value === block ? null : block
}

const isExpanded = ref(false)
</script>

<template>
  <aside class="resource-rail" :class="{ 'resource-rail--expanded': activeBlock }">
    <!-- Icon rail -->
    <div class="rail-icons">
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            class="rail-icon-btn"
            :class="{ active: activeBlock === 'characters' }"
            @click="toggleBlock('characters')"
          >
            <User :size="18" />
            <span v-if="hasCharacters" class="rail-dot" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">角色</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            class="rail-icon-btn"
            :class="{ active: activeBlock === 'scenes' }"
            @click="toggleBlock('scenes')"
          >
            <MapPin :size="18" />
            <span v-if="hasScenes" class="rail-dot" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">场景</TooltipContent>
      </Tooltip>
    </div>

    <!-- Expanded panel -->
    <div v-if="activeBlock" class="rail-panel">
      <CharacterBlock
        v-if="activeBlock === 'characters'"
        :characters="characters"
        :expanded="true"
        :has-content="hasCharacters"
        @toggle="toggleBlock(null)"
        @generate-image="$emit('generateCharacterImage', $event)"
        @batch-generate="$emit('batchGenerateCharacters')"
      />
      <SceneBlock
        v-if="activeBlock === 'scenes'"
        :scenes="scenes"
        :expanded="true"
        :has-content="hasScenes"
        @toggle="toggleBlock(null)"
        @generate-image="$emit('generateSceneImage', $event)"
        @batch-generate="$emit('batchGenerateScenes')"
      />
    </div>
  </aside>
</template>

<style scoped>
.resource-rail {
  display: flex;
  flex-shrink: 0;
  height: 100%;
  border-right: 1px solid var(--border-primary);
  background: var(--bg-card);
  transition: width 0.2s ease;
}

.rail-icons {
  width: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 4px;
  border-right: 1px solid var(--border-primary);
}

.rail-icon-btn {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.rail-icon-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.rail-icon-btn.active {
  background: var(--accent-light, rgba(232, 162, 67, 0.1));
  color: var(--accent, #e8a243);
}

.rail-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent, #e8a243);
}

.rail-panel {
  width: 260px;
  overflow-y: auto;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/views/drama/episode/workbench/ResourcePanel.vue
git commit -m "refactor: ResourcePanel to collapsible icon rail"
```

---

### Task 7: Rewrite EpisodeWorkbench with tab layout

**Files:**
- Modify: `web/src/views/drama/episode/EpisodeWorkbench.vue`
- Modify: `web/src/composables/useEpisodeWorkbench.ts`

Replace the grid/edit pipeline-stage layout with a two-tab (Script/Storyboard) workbench.

- [ ] **Step 1: Update useEpisodeWorkbench.ts**

Replace `useStoryboardGrid` with `useStoryboardTable`:

```typescript
// web/src/composables/useEpisodeWorkbench.ts
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useResourcePanel } from './useResourcePanel'
import { useStoryboardTable } from './useStoryboardTable'
import { useFrameImageGeneration } from './useFrameImageGeneration'
import { useVideoGenerationPro } from './useVideoGenerationPro'

export function useEpisodeWorkbench() {
  const route = useRoute()
  const dramaId = Number(route.params.id)
  const episodeNumber = Number(route.params.episodeNumber)

  const resource = useResourcePanel(dramaId, episodeNumber)
  const table = useStoryboardTable(resource.storyboards)

  // imageGen needs a current storyboard ref — use first selected or null
  const currentStoryboard = computed(() => {
    const selected = table.selectedStoryboards.value
    return selected.length === 1 ? selected[0] : null
  })

  const imageGen = useFrameImageGeneration(currentStoryboard, dramaId)

  const episodeIdRef = computed(() => resource.episode.value?.id || 0)
  const timelineEditorRef = ref(null)

  const videoGen = useVideoGenerationPro(
    currentStoryboard,
    dramaId,
    episodeIdRef,
    resource.storyboards,
    imageGen.videoReferenceImages,
    timelineEditorRef,
  )

  onMounted(async () => {
    await resource.loadData()
    await videoGen.loadVideoModels()
  })

  onBeforeUnmount(() => {
    imageGen.stopPolling()
    videoGen.stopVideoPolling()
  })

  return {
    dramaId,
    episodeNumber,
    resource,
    table,
    imageGen,
    videoGen,
  }
}
```

- [ ] **Step 2: Rewrite EpisodeWorkbench.vue**

Replace the entire template and script with the new tab-based layout:

```vue
<!-- web/src/views/drama/episode/EpisodeWorkbench.vue -->
<template>
  <div class="episode-workbench">
    <!-- Top bar -->
    <header class="wb-topbar">
      <div class="wb-topbar-left">
        <Button variant="ghost" size="sm" @click="goBack">
          <ArrowLeft :size="16" />
          返回
        </Button>
        <span class="wb-title">{{ resource.drama?.title }} - 第{{ episodeNumber }}集</span>
      </div>
      <div class="wb-topbar-center">
        <button
          class="tab-btn"
          :class="{ 'tab-btn--active': table.activeTab === 'script' }"
          @click="table.activeTab = 'script'"
        >
          <FileText :size="14" />
          剧本
        </button>
        <button
          class="tab-btn"
          :class="{ 'tab-btn--active': table.activeTab === 'storyboard' }"
          @click="table.activeTab = 'storyboard'"
        >
          <Clapperboard :size="14" />
          分镜
        </button>
      </div>
      <div class="wb-topbar-right">
        <div v-if="table.progress.total > 0" class="wb-progress">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
          </div>
          <span class="progress-label">{{ table.progress.withImage }}/{{ table.progress.total }}</span>
        </div>
        <Button variant="outline" size="sm" @click="agentOpen = true">
          <Wand2 :size="14" />
          Agent
        </Button>
        <Button size="sm" @click="goToCompose" class="compose-btn">
          合成
          <ArrowRight :size="14" />
        </Button>
      </div>
    </header>

    <!-- Main content -->
    <div class="wb-body">
      <ResourcePanel
        :characters="resource.characters"
        :scenes="resource.scenes"
        :has-characters="resource.hasCharacters"
        :has-scenes="resource.hasScenes"
        @generate-character-image="handleGenerateCharacterImage"
        @batch-generate-characters="handleBatchGenerateCharacters"
        @generate-scene-image="handleGenerateSceneImage"
        @batch-generate-scenes="handleBatchGenerateScenes"
      />

      <div class="wb-main">
        <!-- Script Tab -->
        <ScriptTab
          v-if="table.activeTab === 'script'"
          :script-content="resource.scriptContent"
          :has-script="resource.hasScript"
          :has-characters="resource.hasCharacters"
          :has-scenes="resource.hasScenes"
          :character-count="resource.characters.length"
          :scene-count="resource.scenes.length"
          @save="resource.saveScript"
          @upload="handleUploadScript"
          @rewrite="handleRewriteScript"
          @extract="handleExtract"
        />

        <!-- Storyboard Tab -->
        <StoryboardTable
          v-else
          :storyboards="resource.storyboards"
          :characters="resource.characters"
          :scenes="resource.scenes"
          :selected-ids="table.selectedIds"
          :all-selected="table.allSelected"
          :has-selection="table.hasSelection"
          :progress="table.progress"
          @toggle-select="table.toggleSelect"
          @toggle-select-all="table.toggleSelectAll"
          @clear-selection="table.clearSelection"
          @save-field="handleSaveField"
          @generate-image="handleGenerateImage"
          @generate-video="handleGenerateVideo"
          @add="handleAddStoryboard"
          @batch-images="handleBatchImages"
          @batch-videos="handleBatchVideos"
          @generate-grid="handleGenerateGrid"
          @breakdown="handleBreakdown"
        />
      </div>
    </div>

    <!-- Agent drawer -->
    <AgentDrawer
      v-model:open="agentOpen"
      :drama-id="dramaId"
      :episode-id="episodeNumber"
      @apply="handleAgentApply"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, Wand2, Clapperboard, FileText } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ResourcePanel from './workbench/ResourcePanel.vue'
import ScriptTab from './workbench/ScriptTab.vue'
import StoryboardTable from './workbench/StoryboardTable.vue'
import { useEpisodeWorkbench } from '@/composables/useEpisodeWorkbench'
import AgentDrawer from '@/components/agent/AgentDrawer.vue'
import type { AgentType } from '@/types/agent'

const router = useRouter()
const wb = useEpisodeWorkbench()
const { dramaId, episodeNumber } = wb
const resource = reactive(wb.resource)
const table = reactive(wb.table)
const imageGen = reactive(wb.imageGen)
const videoGen = reactive(wb.videoGen)

const agentOpen = ref(false)

const progressPct = computed(() => {
  const p = table.progress
  return p.total > 0 ? Math.round((p.withImage / p.total) * 100) : 0
})

const goBack = () => router.push(`/drama/${dramaId}`)
const goToCompose = () => router.push(`/drama/${dramaId}/episode/${episodeNumber}/compose`)

// Action handlers
const handleExtract = () => { /* TODO: call extract agent */ }
const handleBreakdown = () => { /* TODO: call storyboard_breaker agent */ }
const handleAddStoryboard = () => { /* TODO: call dramaAPI to add storyboard */ }
const handleBatchImages = () => { /* TODO: batch image generation */ }
const handleBatchVideos = () => { /* TODO: batch video generation */ }
const handleGenerateGrid = () => { /* TODO: generate grid image from selected storyboards */ }
const handleSaveField = (id: string, field: string, value: any) => {
  /* TODO: save via dramaAPI.updateStoryboard */
}
const handleGenerateImage = (id: string) => { imageGen.generateFrameImage([]) }
const handleGenerateVideo = (id: string) => { videoGen.generateVideo() }
const handleUploadScript = () => { /* TODO: upload script */ }
const handleRewriteScript = () => { /* TODO: rewrite script */ }
const handleGenerateCharacterImage = (_id: number) => { /* TODO */ }
const handleBatchGenerateCharacters = () => { /* TODO */ }
const handleGenerateSceneImage = (_id: number) => { /* TODO */ }
const handleBatchGenerateScenes = () => { /* TODO */ }
const handleAgentApply = (_data: { type: AgentType; content: string }) => { /* TODO */ }
</script>

<style scoped>
.episode-workbench {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
}

.wb-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-card);
  gap: 12px;
}

.wb-topbar-left,
.wb-topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wb-topbar-center {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 2px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn--active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.wb-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.wb-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.wb-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wb-progress {
  display: flex;
  align-items: center;
  gap: 6px;
}

.progress-track {
  width: 80px;
  height: 4px;
  background: var(--border-primary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent, #e8a243), var(--glass-accent-to, #f0c060));
  border-radius: 2px;
  transition: width 400ms ease;
}

.progress-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

.compose-btn {
  background: linear-gradient(135deg, var(--accent, #e8a243), var(--glass-accent-to, #f0c060));
  color: var(--glass-text-on-accent, #1a1614);
  font-weight: 600;
  border: none;
}
</style>
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/connor/AiProject/huobao-drama/web && pnpm build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add web/src/views/drama/episode/EpisodeWorkbench.vue web/src/composables/useEpisodeWorkbench.ts
git commit -m "refactor: EpisodeWorkbench to tab layout with Script/Storyboard tabs"
```

---

### Task 8: Delete old components

**Files:**
- Delete: `web/src/views/drama/episode/workbench/StoryboardGrid.vue`
- Delete: `web/src/views/drama/episode/workbench/StoryboardCard.vue`
- Delete: `web/src/views/drama/episode/workbench/StoryboardEditor.vue`
- Delete: `web/src/views/drama/episode/workbench/StoryboardStrip.vue`
- Delete: `web/src/views/drama/episode/workbench/PreviewPane.vue`
- Delete: `web/src/views/drama/episode/workbench/PropertiesPanel.vue`
- Delete: `web/src/composables/useStoryboardGrid.ts`

- [ ] **Step 1: Verify no remaining imports of old components**

Run: `cd /Users/connor/AiProject/huobao-drama/web && grep -r "StoryboardGrid\|StoryboardCard\|StoryboardEditor\|StoryboardStrip\|PreviewPane\|PropertiesPanel\|useStoryboardGrid" src/ --include="*.vue" --include="*.ts" -l`

If any files still import these, update them first.

- [ ] **Step 2: Delete old files**

```bash
cd /Users/connor/AiProject/huobao-drama
rm web/src/views/drama/episode/workbench/StoryboardGrid.vue
rm web/src/views/drama/episode/workbench/StoryboardCard.vue
rm web/src/views/drama/episode/workbench/StoryboardEditor.vue
rm web/src/views/drama/episode/workbench/StoryboardStrip.vue
rm web/src/views/drama/episode/workbench/PreviewPane.vue
rm web/src/views/drama/episode/workbench/PropertiesPanel.vue
rm web/src/composables/useStoryboardGrid.ts
```

- [ ] **Step 3: Verify build still passes**

Run: `cd /Users/connor/AiProject/huobao-drama/web && pnpm build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old Grid/Edit storyboard components replaced by table view"
```

---

### Task 9: Final build verification and fix any issues

- [ ] **Step 1: Full build check**

Run: `cd /Users/connor/AiProject/huobao-drama/web && pnpm build:check 2>&1 | tail -20`

- [ ] **Step 2: Fix any TypeScript or build errors**

Address any issues found in the build output.

- [ ] **Step 3: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve build errors in filmstrip workbench migration"
```
