<template>
  <div class="page fade-in">
    <header class="page-header">
      <h1 class="page-title">AI 服务配置</h1>
    </header>

    <div class="sections">
      <section v-for="svc in serviceTypes" :key="svc.type" class="svc-section">
        <div class="section-head">
          <component :is="svc.icon" :size="15" style="color:var(--text-muted)" />
          <h3>{{ svc.label }}</h3>
          <span v-if="getCount(svc.type)" class="badge badge-accent">{{ getCount(svc.type) }}</span>
        </div>

        <div class="config-list">
          <div v-for="cfg in getConfigs(svc.type)" :key="cfg.id" class="config-row">
            <div class="config-left">
              <span class="config-name">{{ cfg.provider }}</span>
              <span class="config-model mono">{{ formatModel(cfg.model) }}</span>
            </div>
            <div class="config-right">
              <span class="config-url mono">{{ cfg.base_url || '' }}</span>
              <span class="badge" :class="cfg.api_key ? 'badge-success' : ''">
                {{ cfg.api_key ? '已配置' : '无密钥' }}
              </span>
              <label class="switch">
                <input type="checkbox" :checked="cfg.is_active" @change="toggleActive(cfg)">
                <span class="slider" />
              </label>
              <button class="btn btn-ghost btn-sm" @click="startEdit(cfg)">
                <Pencil :size="12" />
              </button>
              <button class="btn btn-ghost btn-sm" @click="delConfig(cfg.id)">
                <Trash2 :size="12" />
              </button>
            </div>
          </div>

          <button class="add-btn" @click="startAdd(svc.type)">
            <Plus :size="12" /> 添加{{ svc.label }}服务
          </button>
        </div>
      </section>
    </div>

    <!-- Add/Edit dialog -->
    <div v-if="dialogOpen" class="overlay" @click.self="dialogOpen = false">
      <form class="dialog" @submit.prevent="doSave">
        <h3>{{ editingId ? '编辑服务' : '添加服务' }}</h3>
        <div class="form-field">
          <label>服务商</label>
          <select v-model="form.provider" class="input">
            <option value="">选择服务商</option>
            <option v-for="p in providers" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="form-field">
          <label>API Key</label>
          <input v-model="form.api_key" class="input" type="password" placeholder="sk-..." />
        </div>
        <div class="form-field">
          <label>Base URL</label>
          <input v-model="form.base_url" class="input" :placeholder="defaultUrl(form.provider)" />
        </div>
        <div class="form-field">
          <label>模型（逗号分隔多个）</label>
          <input v-model="form.modelStr" class="input" placeholder="gpt-4o, gemini-3-pro-preview" />
        </div>
        <div class="dialog-actions">
          <button type="button" class="btn" @click="dialogOpen = false">取消</button>
          <button type="submit" class="btn btn-primary">保存</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Type, ImageIcon, Video, AudioLines, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { aiConfigAPI } from '@/api'

const configs = ref<any[]>([])
const dialogOpen = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ provider: '', api_key: '', base_url: '', modelStr: '', service_type: 'text' })

const providers = ['chatfire', 'openai', 'gemini', 'volcengine', 'minimax', 'vidu', 'openrouter', 'qwen']

const serviceTypes = [
  { type: 'text', label: '文本', icon: Type },
  { type: 'image', label: '图片', icon: ImageIcon },
  { type: 'video', label: '视频', icon: Video },
  { type: 'audio', label: '音频', icon: AudioLines },
]

const defaultUrls: Record<string, string> = {
  chatfire: 'https://api.chatfire.site/v1',
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com',
  volcengine: 'https://ark.cn-beijing.volces.com/api/v3',
  minimax: 'https://api.minimaxi.com/v1',
  vidu: 'https://api.vidu.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
}
function defaultUrl(p: string) { return defaultUrls[p] || 'https://' }

function getConfigs(type: string) {
  return configs.value.filter(c => c.service_type === type)
}

function getCount(type: string) {
  return getConfigs(type).filter(c => c.is_active).length
}

function formatModel(m: any) {
  if (Array.isArray(m)) return m.join(', ')
  return m || '-'
}

async function load() {
  try { configs.value = await aiConfigAPI.list() } catch (e: any) { toast.error(e.message) }
}

function startAdd(type: string) {
  editingId.value = null
  form.value = { provider: '', api_key: '', base_url: '', modelStr: '', service_type: type }
  dialogOpen.value = true
}

function startEdit(cfg: any) {
  editingId.value = cfg.id
  const models = Array.isArray(cfg.model) ? cfg.model : [cfg.model]
  form.value = {
    provider: cfg.provider || '',
    api_key: cfg.api_key || '',
    base_url: cfg.base_url || '',
    modelStr: models.filter(Boolean).join(', '),
    service_type: cfg.service_type,
  }
  dialogOpen.value = true
}

async function doSave() {
  const f = form.value
  if (!f.provider) { toast.warning('请选择服务商'); return }
  const models = f.modelStr.split(',').map(s => s.trim()).filter(Boolean)
  try {
    if (editingId.value) {
      await aiConfigAPI.update(editingId.value, {
        provider: f.provider,
        api_key: f.api_key,
        base_url: f.base_url || defaultUrl(f.provider),
        model: models,
      })
    } else {
      await aiConfigAPI.create({
        service_type: f.service_type,
        provider: f.provider,
        name: `${f.provider}-${f.service_type}`,
        api_key: f.api_key,
        base_url: f.base_url || defaultUrl(f.provider),
        model: models,
      })
    }
    dialogOpen.value = false
    toast.success('保存成功')
    load()
  } catch (e: any) { toast.error(e.message) }
}

async function toggleActive(cfg: any) {
  await aiConfigAPI.update(cfg.id, { is_active: !cfg.is_active })
  load()
}

async function delConfig(id: number) {
  await aiConfigAPI.del(id)
  toast.success('已删除')
  load()
}

onMounted(load)
</script>

<style scoped>
.page { padding: 24px 32px; max-width: 700px; }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 18px; font-weight: 700; }

.sections { display: flex; flex-direction: column; gap: 24px; }
.section-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.section-head h3 { font-size: 14px; font-weight: 600; }

.config-list { display: flex; flex-direction: column; gap: 4px; }
.config-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); }
.config-left { display: flex; align-items: center; gap: 10px; }
.config-name { font-size: 13px; font-weight: 600; }
.config-model { font-size: 11px; color: var(--text-muted); }
.config-right { display: flex; align-items: center; gap: 8px; }
.config-url { font-size: 10px; color: var(--text-muted); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mono { font-family: monospace; }

.switch { position: relative; width: 32px; height: 18px; cursor: pointer; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; inset: 0; background: var(--border); border-radius: 9px; transition: 0.2s; }
.slider::before { content: ''; position: absolute; height: 14px; width: 14px; left: 2px; bottom: 2px; background: var(--text-muted); border-radius: 50%; transition: 0.2s; }
.switch input:checked + .slider { background: var(--accent); }
.switch input:checked + .slider::before { transform: translateX(14px); background: #fff; }

.add-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border: 1px dashed var(--border); border-radius: var(--radius); background: transparent; color: var(--text-muted); font-size: 12px; cursor: pointer; transition: all 0.15s; }
.add-btn:hover { border-color: var(--accent); color: var(--text); }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; }
.dialog { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; width: 420px; display: flex; flex-direction: column; gap: 12px; }
.dialog h3 { font-size: 16px; font-weight: 600; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }

.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
.form-field select { appearance: none; }
</style>
