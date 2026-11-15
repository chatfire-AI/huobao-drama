<template>
  <div class="page" v-if="drama">
    <!-- Header：单行紧凑 -->
    <div class="page-head card">
      <button class="back-btn" :title="t('common.back')" @click="navigateTo('/')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
      </button>
      <div class="head-info">
        <h1 class="page-title">{{ drama.title }}</h1>
        <span v-if="drama.style" class="tag tag-accent">{{ drama.style }}</span>
        <div class="page-meta">
          <span class="meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {{ t('detail.head.charCount', { n: drama.characters?.length || 0 }) }}
          </span>
          <span class="meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
            {{ t('detail.head.sceneCount', { n: drama.scenes?.length || 0 }) }}
          </span>
          <span class="meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.5"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="10" y1="8" x2="10" y2="16"/><line x1="13" y1="8" x2="13" y2="16"/><line x1="16" y1="8" x2="16" y2="16"/></svg>
            {{ t('detail.head.epCount', { n: drama.episodes?.length || 0 }) }}
          </span>
        </div>
      </div>
      <button class="btn btn-primary head-action" @click="openAddEpisode">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        {{ t('detail.head.addEpisode') }}
      </button>
    </div>

    <!-- 主 Tab：剧集列表 / 素材库 -->
    <nav class="page-tabs">
      <button type="button" :class="['tab-btn', { on: activeTab === 'episodes' }]" @click="activeTab = 'episodes'">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.5"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="10" y1="8" x2="10" y2="16"/><line x1="13" y1="8" x2="13" y2="16"/><line x1="16" y1="8" x2="16" y2="16"/></svg>
        {{ t('detail.tabs.episodes') }}
        <span class="tab-count">{{ drama.episodes?.length || 0 }}</span>
      </button>
      <button type="button" :class="['tab-btn', { on: activeTab === 'assets' }]" @click="switchToAssets">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        {{ t('detail.tabs.assets') }}
        <span v-if="assetTotal > 0" class="tab-count">{{ assetTotal }}</span>
      </button>
    </nav>

    <div v-if="activeTab === 'episodes'" class="ep-grid">
      <div
        v-for="(ep, i) in drama.episodes"
        :key="ep.id"
        :class="['card', 'ep-card', `ep-card-${epStatus(ep)}`]"
        :style="{ animationDelay: `${i * 0.05}s` }"
        @click="navigateTo(`/drama/${drama.id}/episode/${ep.episode_number || ep.episodeNumber}`)"
      >
        <!-- 上区：编号 + 标题元数据 + 状态 -->
        <div class="ep-card-top">
          <div :class="['ep-number', `ep-num-${epStatus(ep)}`]">
            <span class="ep-num-label">EP</span>
            <b>{{ String(ep.episode_number || ep.episodeNumber).padStart(2, '0') }}</b>
          </div>
          <div class="ep-main">
            <h3 class="ep-title">{{ ep.title }}</h3>
            <div class="ep-meta-row">
              <span v-if="ep.duration" class="ep-meta">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ ep.duration }}s
              </span>
              <span v-if="ep.scriptContent || ep.script_content" class="ep-meta ep-meta-ok">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                {{ t('detail.ep.scriptReady') }}
              </span>
              <span v-if="ep.videoUrl || ep.video_url" class="ep-meta ep-meta-ok">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                {{ t('detail.ep.merged') }}
              </span>
              <span v-if="ep.updatedAt || ep.updated_at" class="ep-meta ep-time">{{ formatEpTime(ep.updatedAt || ep.updated_at) }}</span>
            </div>
          </div>
          <div class="ep-badges" @click.stop>
            <AppMenu
              :open="epStatusMenuId === ep.id"
              placement="bottom-end"
              :min-width="110"
              @update:open="(v) => { epStatusMenuId = v ? ep.id : null }"
            >
              <template #trigger>
                <button type="button" :class="['tag', 'ep-status-btn', `ep-status-${epStatus(ep)}`]" :title="t('detail.ep.statusTitle')">
                  <span :class="['status-dot', epStatusDotClass(ep)]"></span>
                  {{ epStatusLabel(ep) }}
                </button>
              </template>
              <AppMenuItem
                v-for="s in epStatusOptions"
                :key="s.value"
                :selected="epStatus(ep) === s.value"
                @click="setEpisodeStatus(ep, s.value)"
              >{{ s.label }}</AppMenuItem>
            </AppMenu>
          </div>
        </div>

        <!-- 下区：常驻操作条 — 分辨率 / 删除 / 进入制作 -->
        <div class="ep-card-foot" @click.stop>
          <AppMenu
            :open="epResMenuId === ep.id"
            placement="top-start"
            :min-width="110"
            @update:open="(v) => { epResMenuId = v ? ep.id : null }"
          >
            <template #trigger>
              <button type="button" :class="['tag', 'ep-res-btn']" :title="t('detail.ep.resTitle')">
                {{ epResolution(ep) }}
              </button>
            </template>
            <AppMenuItem
              v-for="r in resolutionOptions"
              :key="r.value"
              :selected="epResolution(ep) === r.value"
              @click="setEpisodeResolution(ep, r.value)"
            >{{ r.label }}</AppMenuItem>
          </AppMenu>
          <span class="ep-foot-spacer"></span>
          <button
            class="btn btn-icon btn-sm ep-delete"
            type="button"
            :title="t('detail.ep.deleteTitle')"
            @click="episodeToDelete = ep"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
          <button
            type="button"
            class="ep-enter"
            @click="navigateTo(`/drama/${drama.id}/episode/${ep.episode_number || ep.episodeNumber}`)"
          >
            {{ t('detail.ep.enter') }}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Empty episode state（点击也可直接添加第一集） -->
      <div v-if="!drama.episodes?.length" class="card ep-empty" role="button" tabindex="0" :title="t('detail.ep.emptyCreateTitle')" @click="openAddEpisode" @keydown.enter="openAddEpisode">
        <div class="ep-empty-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </div>
        <p>{{ t('detail.ep.emptyCreateText') }}</p>
      </div>

      <!-- 已有剧集时，列表末尾常驻「添加下一集」卡片 -->
      <div v-else class="card ep-empty ep-add" role="button" tabindex="0" :title="t('detail.ep.addNextTitle', { n: (drama.episodes?.length || 0) + 1 })" @click="openAddEpisode" @keydown.enter="openAddEpisode">
        <div class="ep-empty-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </div>
        <p>{{ t('detail.ep.addNextText', { n: (drama.episodes?.length || 0) + 1 }) }}</p>
      </div>
    </div>

    <!-- 素材库 -->
    <div v-else-if="activeTab === 'assets'" class="assets-wrap">
      <div class="seg asset-filter">
        <button
          v-for="t in assetTabs"
          :key="t.value"
          type="button"
          class="seg-item"
          :class="{ on: assetTab === t.value }"
          @click="assetTab = t.value"
        >{{ t.label }}</button>
      </div>

      <!-- 全部素材为空 -->
      <div v-if="!materials.length" class="empty-state">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <p class="empty-title">{{ t('detail.assets.emptyTitle') }}</p>
        <p class="empty-desc">{{ t('detail.assets.emptyDesc') }}</p>
      </div>

      <div v-else-if="materials.length" class="asset-groups">
        <template v-for="g in assetGroups" :key="g.kindKey">
          <template v-if="g.items.length">
            <div v-if="assetTab === 'all'" class="asset-group-head" :class="tagClass(g.kindKey)">
              <span class="group-icon">
                <svg v-if="g.kindKey === 'character'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <svg v-else-if="g.kindKey === 'scene'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.27 6.96 12 12l8.73-5.04M12 22.08V12"/></svg>
              </span>
              <span class="group-label">{{ g.label }}</span>
              <span class="group-count">{{ g.items.length }}</span>
            </div>

            <!-- 角色：横向布局卡片（头像 + 样貌/妆造 + 三视图提示词） -->
            <div v-if="g.kindKey === 'character'" class="character-asset-grid">
              <article
                v-for="m in g.items"
                :key="'character-' + m.id"
                class="card character-asset-card"
                tabindex="0"
                role="button"
                @click="openEdit(m)"
                @keydown.enter.self.prevent="openEdit(m)"
                @keydown.space.self.prevent="openEdit(m)"
              >
                <div class="character-asset-main">
                  <div class="character-asset-overview">
                    <div class="character-portrait">
                      <img v-if="matHasImage(m)" :src="thumbOf(assetSrc(m))" class="previewable-image" loading="lazy" @error="thumbFallback($event, assetSrc(m))" @click.stop="openAssetViewer(m)" />
                      <div v-else class="character-portrait-empty">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <span class="asset-cover-badge" :class="matHasImage(m) ? 'is-ready' : (isPending(m) ? 'is-pending' : '')">
                        {{ matHasImage(m) ? t('episode.asset.portraitReady') : (isPending(m) ? t('episode.asset.portraitPending') : t('episode.asset.portraitTodo')) }}
                      </span>
                    </div>
                    <div class="character-asset-head">
                      <div class="character-title-block">
                        <div class="character-name-row">
                          <strong class="character-name">{{ m.name }}</strong>
                          <span class="tag">{{ m.role || t('common.role') }}</span>
                        </div>
                        <div class="character-visual-summary" :title="matDesc(m)">
                          <span>{{ t('episode.asset.appearance') }}{{ m.appearance || t('detail.assets.todoShort') }}</span>
                          <span>{{ t('episode.asset.styling') }}{{ m.styling || t('detail.assets.todoShort') }}</span>
                        </div>
                      </div>
                      <button class="btn btn-sm character-gen-btn" type="button" :disabled="isPending(m)" @click.stop="generateMaterial(m)">
                        <span v-if="isPending(m)" class="ring-spinner sm"></span>
                        {{ matHasImage(m) ? t('episode.asset.regen') : (isPending(m) ? t('episode.asset.generating') : t('episode.asset.generate')) }}
                      </button>
                      <button class="btn btn-sm" type="button" :title="t('episode.asset.uploadCharImage')" :disabled="isUploading(m)" @click.stop="uploadMaterial(m)">
                        <span v-if="isUploading(m)" class="ring-spinner sm"></span>
                        <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        {{ t('episode.asset.upload') }}
                      </button>
                    </div>
                  </div>
                  <div class="asset-final-prompt" :title="m.finalPrompt || ''">
                    <span class="afp-label">{{ t('episode.asset.finalPromptTurnaround') }}</span>
                    <span :class="['afp-text', !m.finalPrompt && 'dim']">{{ m.finalPrompt || t('episode.asset.finalPromptAutoTurnaround') }}</span>
                  </div>
                  <CharacterVoice :character="m" @updated="updateCharacterVoice" />
                </div>
              </article>
            </div>

            <!-- 场景 / 道具：竖向布局卡片（封面 + 描述/光影/类型 + 最终提示词 + 底部状态） -->
            <div v-else class="asset-grid">
              <div
                v-for="m in g.items"
                :key="g.kindKey + '-' + m.id"
                :class="['card', 'asset-card', 'asset-click-card', g.kindKey === 'prop' ? 'prop-card' : '']"
                tabindex="0"
                role="button"
                @click="openEdit(m)"
                @keydown.enter.prevent="openEdit(m)"
                @keydown.space.prevent="openEdit(m)"
              >
                <div class="asset-cover wide">
                  <img v-if="matHasImage(m)" :src="thumbOf(assetSrc(m))" class="previewable-image" loading="lazy" @error="thumbFallback($event, assetSrc(m))" @click.stop="openAssetViewer(m)" />
                  <div v-else class="asset-cover-empty">
                    <svg v-if="g.kindKey === 'scene'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                  </div>
                  <span class="asset-cover-badge" :class="matHasImage(m) ? 'is-ready' : (isPending(m) ? 'is-pending' : '')">
                    {{ matHasImage(m) ? t('episode.asset.ready') : (isPending(m) ? t('episode.asset.generating') : t('episode.asset.todo')) }}
                  </span>
                </div>
                <div class="asset-body">
                  <template v-if="g.kindKey === 'scene'">
                    <div class="asset-name" :title="m.location">{{ m.location }}</div>
                    <div class="asset-meta asset-desc dim" :title="matDesc(m)">{{ matDesc(m) || t('episode.asset.sceneDescTodo') }}</div>
                    <div v-if="m.lighting" class="asset-meta asset-light dim" :title="m.lighting">{{ t('episode.asset.lighting') }}{{ m.lighting }}</div>
                  </template>
                  <template v-else>
                    <div class="prop-name-row">
                      <span class="asset-name" :title="m.name">{{ m.name }}</span>
                      <span class="tag">{{ m.type || t('common.prop') }}</span>
                    </div>
                    <div class="asset-meta asset-desc dim" :title="m.description || ''">{{ m.description || t('episode.asset.noDescription') }}</div>
                  </template>
                  <div class="asset-meta asset-final" :class="{ dim: !m.finalPrompt }" :title="m.finalPrompt || ''">
                    <span class="afp-label">{{ g.kindKey === 'scene' ? t('episode.asset.finalPromptFixed') : t('episode.asset.finalPromptWhiteBg') }}</span>
                    {{ m.finalPrompt || (g.kindKey === 'scene' ? t('episode.asset.finalPromptAutoFixed') : t('episode.asset.finalPromptAutoWhiteBg')) }}
                  </div>
                </div>
                <div class="asset-foot">
                  <span :class="['dot', matHasImage(m) && 'ok', isPending(m) && 'pending']" />
                  <button class="btn btn-sm ml-auto" type="button" :title="t('episode.asset.uploadImage')" :disabled="isUploading(m)" @click.stop="uploadMaterial(m)">
                    <span v-if="isUploading(m)" class="ring-spinner sm"></span>
                    <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {{ t('episode.asset.upload') }}
                  </button>
                  <button class="btn btn-sm" type="button" :disabled="isPending(m)" @click.stop="generateMaterial(m)">
                    <span v-if="isPending(m)" class="ring-spinner sm"></span>
                    {{ matHasImage(m) ? t('episode.asset.regen') : (isPending(m) ? t('episode.asset.generating') : t('episode.asset.generate')) }}
                  </button>
                </div>
              </div>
            </div>
          </template>
        </template>

        <!-- 筛选某一类但该类暂无素材 -->
        <div v-if="assetTab !== 'all' && !visibleAssets.length" class="empty-state">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <p class="empty-title">{{ t('detail.assets.emptyKindTitle', { kind: tabLabel(assetTab) }) }}</p>
          <p class="empty-desc">{{ t('detail.assets.emptyKindDesc', { kind: tabLabel(assetTab) }) }}</p>
        </div>
      </div>

      <!-- 素材详情 / 编辑对话框（与工作台资产卡片同款布局） -->
      <div v-if="editDialog && editTarget" class="overlay mat-detail-overlay" @click.self="closeEdit">
        <section class="dialog mat-detail-dialog" :aria-label="t('detail.mat.dialogAria')">
          <header class="dialog-head mat-detail-head">
            <div class="mat-detail-title-block">
              <span class="mat-detail-kicker">{{ editTarget.kindKey === 'character' ? t('episode.asset.typeChar') : editTarget.kindKey === 'scene' ? t('episode.asset.typeScene') : t('episode.asset.typeProp') }}</span>
              <h2 class="mat-detail-title">{{ editTarget.name || t('detail.mat.unnamed') }}</h2>
            </div>
            <div class="mat-detail-head-actions">
              <span v-if="editTarget.kindKey === 'character'" class="tag">{{ editTarget.role || t('common.role') }}</span>
              <span v-else-if="editTarget.kindKey === 'prop'" class="tag">{{ editTarget.type || t('common.prop') }}</span>
              <span v-else class="tag">{{ editTarget.time || t('episode.asset.noTime') }}</span>
              <button class="btn btn-ghost btn-icon" @click="closeEdit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </header>

          <div class="dialog-body mat-detail-body">
            <div class="mat-detail-shell">
              <!-- 左侧：视觉预览 -->
              <aside class="mat-detail-preview-panel">
                <div class="mat-detail-section-title">
                  <span>{{ t('episode.asset.visualPreview') }}</span>
                  <span :class="['mat-detail-state', matHasImage(editTarget) ? 'is-ready' : '']">
                    {{ matHasImage(editTarget) ? t('episode.asset.ready') : t('episode.asset.todo') }}
                  </span>
                </div>

                <button
                  type="button"
                  class="mat-detail-media-frame"
                  :disabled="!matHasImage(editTarget)"
                  @click.stop="openAssetViewer(editTarget)"
                >
                  <img v-if="matHasImage(editTarget)" :src="thumbOf(assetSrc(editTarget))" @error="thumbFallback($event, assetSrc(editTarget))" />
                  <span v-else class="mat-detail-media-empty">
                    <svg v-if="editTarget.kindKey === 'character'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <svg v-else-if="editTarget.kindKey === 'prop'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                    <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </span>
                </button>

                <div class="mat-detail-meta-row">
                  <div class="mat-detail-meta-item">
                    <span>{{ t('episode.asset.kindLabel') }}</span>
                    <strong>{{ editTarget.kindKey === 'character' ? t('episode.asset.charPortrait') : editTarget.kindKey === 'prop' ? t('common.prop') : t('episode.asset.sceneImage') }}</strong>
                  </div>
                  <div class="mat-detail-meta-item">
                    <span>{{ editTarget.kindKey === 'character' ? t('episode.asset.roleLabel') : editTarget.kindKey === 'prop' ? t('episode.asset.propTypeLabel') : t('episode.asset.timeLabel') }}</span>
                    <strong>{{ editTarget.kindKey === 'character' ? (editTarget.role || t('common.role')) : editTarget.kindKey === 'prop' ? (editTarget.type || t('common.prop')) : (editTarget.time || t('episode.asset.noTime')) }}</strong>
                  </div>
                </div>
                <CharacterVoice v-if="editTarget.kindKey === 'character'" :key="editTarget.id" :character="editTarget" @updated="updateCharacterVoice" />
              </aside>

              <!-- 右侧：编辑信息 -->
              <section class="mat-detail-editor-panel">
                <div class="mat-detail-section-title">
                  <span>{{ t('episode.asset.editInfo') }}</span>
                  <span class="dim">{{ editTarget.kindKey === 'character' ? t('episode.asset.editHintChar') : editTarget.kindKey === 'prop' ? t('episode.asset.editHintProp') : t('episode.asset.editHintScene') }}</span>
                </div>

                <!-- 道具：单列物品外貌 -->
                <div v-if="editTarget.kindKey === 'prop'" class="mat-detail-edit-grid mat-detail-edit-grid--prop">
                  <label class="mat-detail-edit-field">
                    <span>{{ t('episode.create.name') }}</span>
                    <input v-model="editDraft.name" class="input" :placeholder="t('episode.create.namePlaceholderProp')" />
                  </label>
                  <label class="mat-detail-edit-field">
                    <span>{{ t('episode.create.typeField') }}</span>
                    <input v-model="editDraft.type" class="input" :placeholder="t('detail.mat.propTypePlaceholder')" />
                  </label>
                  <label class="mat-detail-edit-field">
                    <span>{{ t('episode.asset.appearanceOfObject') }}</span>
                    <textarea v-model="editDraft.description" class="textarea mat-detail-textarea" rows="6" :placeholder="t('episode.asset.appearancePlaceholder')" />
                  </label>
                </div>

                <!-- 角色：样貌 + 妆造 -->
                <div v-else-if="editTarget.kindKey === 'character'" class="mat-detail-edit-grid mat-detail-edit-grid--character">
                  <label class="mat-detail-edit-field">
                    <span>{{ t('episode.create.name') }}</span>
                    <input v-model="editDraft.name" class="input" :placeholder="t('episode.create.namePlaceholderChar')" />
                  </label>
                  <label class="mat-detail-edit-field">
                    <span>{{ t('episode.create.roleField') }}</span>
                    <input v-model="editDraft.role" class="input" :placeholder="t('episode.create.rolePlaceholder')" />
                  </label>
                  <label class="mat-detail-edit-field">
                    <span>{{ t('episode.asset.appearanceField') }}</span>
                    <textarea v-model="editDraft.appearance" class="textarea mat-detail-textarea" rows="5" :placeholder="t('episode.asset.appearanceFieldPlaceholder')" />
                  </label>
                  <label class="mat-detail-edit-field">
                    <span>{{ t('episode.asset.stylingField') }}</span>
                    <textarea v-model="editDraft.styling" class="textarea mat-detail-textarea" rows="5" :placeholder="t('episode.asset.stylingFieldPlaceholder')" />
                  </label>
                  <label class="mat-detail-edit-field">
                    <span>{{ t('detail.mat.personaField') }}</span>
                    <textarea v-model="editDraft.description" class="textarea mat-detail-textarea" rows="4" :placeholder="t('detail.mat.personaPlaceholder')" />
                  </label>
                </div>

                <!-- 场景：描述 + 光影 -->
                <div v-else class="mat-detail-edit-grid mat-detail-edit-grid--scene">
                  <label class="mat-detail-edit-field">
                    <span>{{ t('episode.create.location') }}</span>
                    <input v-model="editDraft.location" class="input" :placeholder="t('detail.mat.locationPlaceholder')" />
                  </label>
                  <label class="mat-detail-edit-field">
                    <span>{{ t('episode.create.time') }}</span>
                    <input v-model="editDraft.time" class="input" :placeholder="t('detail.mat.timePlaceholder')" />
                  </label>
                  <label class="mat-detail-edit-field">
                    <span>{{ t('episode.asset.sceneDescField') }}</span>
                    <textarea v-model="editDraft.prompt" class="textarea mat-detail-textarea" rows="5" :placeholder="t('episode.asset.sceneDescPlaceholder')" />
                  </label>
                  <label class="mat-detail-edit-field">
                    <span>{{ t('episode.asset.sceneLightField') }}</span>
                    <textarea v-model="editDraft.lighting" class="textarea mat-detail-textarea" rows="5" :placeholder="t('episode.asset.sceneLightPlaceholder')" />
                  </label>
                </div>
              </section>
            </div>

            <!-- 最终提示词：可生成 / 重新生成 / 手动编辑 -->
            <section class="mat-detail-prompt-panel">
              <div class="mat-detail-section-title">
                <span>{{ t('detail.mat.finalPromptLabel') }}</span>
                <span class="dim">{{ t('detail.mat.finalPromptSub') }}</span>
                <button
                  class="btn btn-sm mat-detail-prompt-gen"
                  :disabled="finalPromptGen || !firstEpisodeId"
                  :title="firstEpisodeId ? t('detail.mat.genPromptTitle') : t('detail.mat.needEpisodeFirst')"
                  @click="generateFinalPrompt(editTarget)"
                >
                  <svg v-if="!finalPromptGen" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.5-6.5L14 8m-4 8-2.5 2.5m11 0L16 16M8 8 5.5 5.5"/><circle cx="12" cy="12" r="3"/></svg>
                  {{ finalPromptGen ? t('episode.asset.generating') + '…' : (editDraft.finalPrompt ? t('episode.sb.regenPrompt') : t('episode.asset.genPrompt')) }}
                </button>
              </div>
              <textarea
                v-model="editDraft.finalPrompt"
                class="textarea mat-detail-prompt-text"
                rows="5"
                :placeholder="t('detail.mat.promptPlaceholder')"
              ></textarea>
            </section>
          </div>

          <footer class="dialog-foot mat-detail-foot">
            <div class="mat-detail-secondary-actions">
              <button class="btn" @click="closeEdit">{{ t('common.close') }}</button>
            </div>
            <div class="mat-detail-primary-actions">
              <button
                class="btn"
                :disabled="isUploading(editTarget)"
                @click="uploadMaterial(editTarget)"
              >
                <span v-if="isUploading(editTarget)" class="ring-spinner sm"></span>
                <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {{ t('episode.asset.uploadImage') }}
              </button>
              <button
                class="btn"
                :disabled="isPending(editTarget)"
                @click="generateMaterial(editTarget)"
              >
                {{ matHasImage(editTarget) ? t('episode.sb.regenPrompt') : (isPending(editTarget) ? t('episode.asset.generating') + '…' : t('detail.mat.genImage')) }}
              </button>
              <button class="btn btn-primary" :disabled="editSaving" @click="saveEdit">
                {{ editSaving ? t('detail.mat.saving') : t('episode.asset.saveChanges') }}
              </button>
            </div>
          </footer>
        </section>
      </div>

      <!-- 图片查看器 -->
      <div v-if="assetViewer.open" class="overlay viewer-overlay" @click.self="closeAssetViewer">
        <div class="dialog viewer-dialog">
          <div class="viewer-head">
            <span class="viewer-title">{{ assetViewer.title }}</span>
            <button class="btn btn-icon btn-sm btn-ghost" @click="closeAssetViewer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <img :src="assetViewer.src" :alt="assetViewer.title" class="viewer-img" />
        </div>
      </div>
    </div>

    <div v-if="addDialog" class="overlay" @click.self="addDialog = false">
      <div class="dialog ep-dialog">
        <div class="dialog-head">
          <div class="dialog-title">{{ t('detail.epCreate.title') }}</div>
          <button class="btn btn-icon btn-sm btn-ghost ml-auto dialog-close" @click="addDialog = false">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="dialog-body">
          <label class="field">
            <span class="field-label">{{ t('detail.epCreate.titleField') }}</span>
            <input v-model="newEpisodeTitle" class="input" :placeholder="t('detail.epCreate.titlePlaceholder')" />
            <span class="field-hint">{{ t('detail.epCreate.titleHint', { example: t('detail.epCreate.example', { n: 3 }) }) }}</span>
          </label>
          <label class="field">
            <span class="field-label">{{ t('detail.epCreate.resolution') }}</span>
            <BaseSelect v-model="newEpisodeResolution" :options="resolutionOptions" :placeholder="t('detail.epCreate.resolutionPlaceholder')" />
            <span class="field-hint">{{ t('detail.epCreate.resolutionHint') }}</span>
          </label>
        </div>
        <div class="dialog-foot">
          <span class="dialog-foot-copy">{{ t('detail.epCreate.lockCopy') }}</span>
          <button class="btn" @click="addDialog = false">{{ t('common.cancel') }}</button>
          <button class="btn btn-primary" :disabled="creatingEpisode" @click="addEpisode">
            {{ creatingEpisode ? t('detail.epCreate.creating') : t('detail.epCreate.create') }}
          </button>
        </div>
      </div>
    </div>
    <ConfirmDialog
      :open="!!episodeToDelete"
      :title="t('detail.ep.deleteTitle')"
      :message="t('detail.epDelete.message', { title: episodeToDelete?.title || t('detail.ep.episodeN', { n: episodeToDelete?.episode_number || episodeToDelete?.episodeNumber }) })"
      :loading="deletingEpisode"
      @confirm="confirmDelEpisode"
      @cancel="episodeToDelete = null"
    />
  </div>
</template>

<script setup>
import { toast } from 'vue-sonner'
import { toastError } from '~/composables/useToast'
import { useI18n } from 'vue-i18n'
import { dramaAPI, episodeAPI, characterAPI, sceneAPI, propAPI, uploadAPI } from '~/composables/useApi'
import BaseSelect from '~/components/BaseSelect.vue'

const { t, locale } = useI18n()

const route = useRoute()
const drama = ref(null)
const dramaId = Number(route.params.id)
const addDialog = ref(false)
const creatingEpisode = ref(false)
const newEpisodeTitle = ref('')
const episodeToDelete = ref(null)
const deletingEpisode = ref(false)

// 视频分辨率：创建集时固定（持久化到 episodes.resolution），集卡片上可修改
const resolutionOptions = computed(() => ([
  { label: t('detail.ep.res720'), value: '720p' },
  { label: t('detail.ep.res480'), value: '480p' },
]))
const newEpisodeResolution = ref('720p')
const epResMenuId = ref(null)

function epResolution(ep) { return ep.resolution === '480p' ? '480p' : '720p' }

async function setEpisodeResolution(ep, resolution) {
  epResMenuId.value = null
  if (epResolution(ep) === resolution) return
  const prev = ep.resolution
  ep.resolution = resolution
  try {
    await episodeAPI.update(ep.id, { resolution })
    toast.success(t('detail.ep.resSwitched', { res: resolution }))
  } catch (e) {
    ep.resolution = prev
    toastError(e)
  }
}

// 集状态由用户手动标记（持久化到 episodes.status），不再按剧本内容自动推算
const epStatusOptions = computed(() => ([
  { label: t('index.status.draft'), value: 'draft' },
  { label: t('index.status.active'), value: 'active' },
  { label: t('index.status.completed'), value: 'completed' },
]))
const epStatusMenuId = ref(null)

function epStatus(ep) { return ep.status || 'draft' }
function epStatusLabel(ep) { return epStatusOptions.value.find(s => s.value === epStatus(ep))?.label || t('index.status.draft') }
function epStatusDotClass(ep) { return epStatus(ep) === 'active' ? 'dot-active' : epStatus(ep) === 'completed' ? 'dot-done' : 'dot-pending' }

function formatEpTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60_000) return t('index.time.justNow')
  if (diff < 3600_000) return t('index.time.minutesAgo', { n: Math.floor(diff / 60000) })
  if (diff < 86400_000) return t('index.time.hoursAgo', { n: Math.floor(diff / 3600000) })
  return `${d.getMonth() + 1}/${d.getDate()}`
}

async function setEpisodeStatus(ep, status) {
  epStatusMenuId.value = null
  if (epStatus(ep) === status) return
  const prev = ep.status
  ep.status = status
  try {
    await episodeAPI.update(ep.id, { status })
  } catch (e) {
    ep.status = prev
    toastError(e)
  }
}

async function load() {
  try {
    drama.value = await dramaAPI.get(dramaId)
  } catch (e) {
    toastError(e)
  }
}

function openAddEpisode() {
  newEpisodeTitle.value = ''
  newEpisodeResolution.value = '720p'
  addDialog.value = true
}

async function addEpisode() {
  try {
    creatingEpisode.value = true
    // 图片/视频生成配置由后端自动锁定为当前启用的最高优先级配置；分辨率随集固定
    await episodeAPI.create({
      drama_id: dramaId,
      title: newEpisodeTitle.value || undefined,
      resolution: newEpisodeResolution.value,
    })
    toast.success(t('detail.epCreate.added'))
    addDialog.value = false
    load()
  } catch (e) {
    toastError(e)
  } finally {
    creatingEpisode.value = false
  }
}

async function confirmDelEpisode() {
  const ep = episodeToDelete.value
  if (!ep) return
  try {
    deletingEpisode.value = true
    await episodeAPI.del(ep.id)
    toast.success(t('index.deleted'))
    episodeToDelete.value = null
    load()
  } catch (e) {
    toastError(e)
  } finally {
    deletingEpisode.value = false
  }
}

/* ===== 素材库 Tab ===== */
const activeTab = ref('episodes')
const assetTab = ref('all')
const assetViewer = ref({ open: false, src: '', title: '' })
const pendingMaterials = ref(new Set())
const assetTabs = computed(() => ([
  { label: t('index.status.all'), value: 'all' },
  { label: t('common.role'), value: 'character' },
  { label: t('common.scene'), value: 'scene' },
  { label: t('common.prop'), value: 'prop' },
]))
const KIND_ORDER = { character: 0, scene: 1, prop: 2 }

// 素材库以 characters / scenes / props 三张资产表为源（后端生图会写回其 imageUrl）
function matImage(m) { return m.image_url || m.imageUrl || m.localPath || m.local_path || '' }
function matHasImage(m) { return !!matImage(m) }
function assetSrc(m) {
  const raw = matImage(m)
  if (!raw) return ''
  return /^https?:\/\//i.test(raw) || raw.startsWith('/') ? raw : `/${raw}`
}
function matCreatedAt(m) { return m.created_at || m.updated_at || m.createdAt || m.updatedAt }
function matDesc(m) {
  if (m.kindKey === 'character') return m.appearance || m.description || ''
  if (m.kindKey === 'scene') return m.prompt || m.description || ''
  return m.description || ''
}
function tagClass(kindKey) {
  return kindKey === 'character' ? 'is-character' : kindKey === 'scene' ? 'is-scene' : 'is-prop'
}
function tabLabel(v) { return assetTabs.value.find(x => x.value === v)?.label || '' }

// kind 为显示名（渲染时求值），kindKey 为逻辑值
const materials = computed(() => {
  const d = drama.value
  if (!d) return []
  const list = []
  for (const c of d.characters || []) list.push({ ...c, kind: t('common.role'), kindKey: 'character' })
  for (const s of d.scenes || []) list.push({ ...s, kind: t('common.scene'), kindKey: 'scene' })
  for (const p of d.props || []) list.push({ ...p, kind: t('common.prop'), kindKey: 'prop' })
  return list.sort((a, b) => (KIND_ORDER[a.kindKey] - KIND_ORDER[b.kindKey]) || (a.id - b.id))
})
const visibleAssets = computed(() =>
  assetTab.value === 'all' ? materials.value : materials.value.filter(m => m.kindKey === assetTab.value),
)
const assetTotal = computed(() => materials.value.length)
// 按类型分组：全部模式下分成 角色 / 场景 / 道具 三个分区；筛选单类时只保留该类
const assetGroups = computed(() => {
  const groups = [
    { kindKey: 'character', label: t('common.role'), items: materials.value.filter(m => m.kindKey === 'character') },
    { kindKey: 'scene', label: t('common.scene'), items: materials.value.filter(m => m.kindKey === 'scene') },
    { kindKey: 'prop', label: t('common.prop'), items: materials.value.filter(m => m.kindKey === 'prop') },
  ]
  return assetTab.value === 'all'
    ? groups
    : groups.filter(g => g.kindKey === assetTab.value)
})

function pendingKey(m) { return `${m.kindKey}:${m.id}` }
function isPending(m) { return pendingMaterials.value.has(pendingKey(m)) }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function generateMaterial(m) {
  const epId = drama.value?.episodes?.[0]?.id
  if (!epId) { toast.error(t('detail.mat.needEpisodeForImage')); return }
  const key = pendingKey(m)
  if (pendingMaterials.value.has(key)) return
  pendingMaterials.value = new Set(pendingMaterials.value).add(key)
  try {
    if (m.kindKey === 'character') await characterAPI.generateImage(m.id, epId)
    else if (m.kindKey === 'scene') await sceneAPI.generateImage(m.id, epId)
    else await propAPI.generateImage(m.id, epId)
    toast.success(t('detail.mat.generating', { kind: m.kind, name: m.name }))
    pollMaterial(m)
  } catch (e) {
    pendingMaterials.value = new Set([...pendingMaterials.value].filter(k => k !== key))
    toastError(e)
  }
}

// 生图为异步任务：轮询重新加载 drama，直到该素材 imageUrl 出现
async function pollMaterial(m) {
  const key = pendingKey(m)
  for (let i = 0; i < 40; i++) {
    await sleep(2500)
    await load()
    const d = drama.value
    const list = m.kindKey === 'character' ? d?.characters : m.kindKey === 'scene' ? d?.scenes : d?.props
    const rec = list?.find(x => x.id === m.id)
    if (rec && matImage(rec)) {
      pendingMaterials.value = new Set([...pendingMaterials.value].filter(k => k !== key))
      return
    }
  }
  pendingMaterials.value = new Set([...pendingMaterials.value].filter(k => k !== key))
  toast.info(t('detail.mat.genTimeout', { kind: m.kind, name: m.name }))
}

function switchToAssets() {
  activeTab.value = 'assets'
}

/* ===== 素材图片手动上传（角色形象 / 场景图 / 道具图） ===== */
const uploadingMaterials = ref(new Set())
function isUploading(m) { return uploadingMaterials.value.has(pendingKey(m)) }

function uploadMaterial(m) {
  const key = pendingKey(m)
  if (uploadingMaterials.value.has(key)) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    uploadingMaterials.value = new Set(uploadingMaterials.value).add(key)
    try {
      const res = await uploadAPI.image(file)
      // 与生图回写保持一致：存相对路径（static/...），展示时补前导斜杠
      const payload = { image_url: res.path, local_path: res.path }
      if (m.kindKey === 'character') await characterAPI.update(m.id, payload)
      else if (m.kindKey === 'scene') await sceneAPI.update(m.id, payload)
      else await propAPI.update(m.id, payload)
      toast.success(t('detail.mat.uploaded', { kind: m.kind, name: m.name }))
      await load()
      // 详情弹窗打开时同步刷新预览
      if (editTarget.value && editTarget.value.kindKey === m.kindKey && editTarget.value.id === m.id) {
        editTarget.value = { ...editTarget.value, image_url: res.path, local_path: res.path }
      }
    } catch (e) {
      toastError(e)
    } finally {
      uploadingMaterials.value = new Set([...uploadingMaterials.value].filter(k => k !== key))
    }
  }
  input.click()
}

function openAssetViewer(m) {
  assetViewer.value = { open: true, src: assetSrc(m), title: `${m.kind} · ${m.name}` }
}
function closeAssetViewer() {
  assetViewer.value = { open: false, src: '', title: '' }
}

function fmtDate(s) {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : locale.value, { month: 'short', day: 'numeric' })
}

/* ===== 素材信息编辑 ===== */
const editDialog = ref(false)
const editSaving = ref(false)
const editTarget = ref(null)
function updateCharacterVoice(id, voice) {
  const patch = { ...voice, voiceAudioUrl: voice.voice_audio_url, voiceAudioName: voice.voice_audio_name }
  const character = drama.value?.characters?.find(item => item.id === id)
  if (character) Object.assign(character, patch)
  if (editTarget.value?.kindKey === 'character' && editTarget.value.id === id) Object.assign(editTarget.value, patch)
}
const editDraft = reactive({})

function openEdit(m) {
  editTarget.value = m
  // 按类型初始化 draft
  Object.keys(editDraft).forEach(k => delete editDraft[k])
  if (m.kindKey === 'character') {
    Object.assign(editDraft, { name: m.name || '', role: m.role || '', appearance: m.appearance || '', description: m.description || '', styling: m.styling || '' })
  } else if (m.kindKey === 'scene') {
    Object.assign(editDraft, { location: m.location || '', time: m.time || '', prompt: m.prompt || '', lighting: m.lighting || '' })
  } else {
    Object.assign(editDraft, { name: m.name || '', type: m.type || '', description: m.description || '' })
  }
  editDraft.finalPrompt = m.finalPrompt || m.final_prompt || ''
  editDialog.value = true
}

// 生成/重新生成最终提示词（不生图）：调用各类型 generate-prompt 接口，结果写回 draft
const finalPromptGen = ref(false)
const firstEpisodeId = computed(() => drama.value?.episodes?.[0]?.id || null)
async function generateFinalPrompt(m) {
  const epId = firstEpisodeId.value
  if (!epId) { toast.error(t('detail.mat.needEpisodeForPrompt')); return }
  finalPromptGen.value = true
  try {
    let res
    if (m.kindKey === 'character') res = await characterAPI.generatePrompt(m.id, epId, true)
    else if (m.kindKey === 'scene') res = await sceneAPI.generatePrompt(m.id, epId, true)
    else res = await propAPI.generatePrompt(m.id, epId, true)
    const fp = res?.final_prompt || res?.finalPrompt
    if (!fp) throw new Error(t('episode.asset.promptGenFailedRetry'))
    editTarget.value = { ...m, finalPrompt: fp }
    editDraft.finalPrompt = fp
    toast.success(t('episode.asset.promptGenerated'))
  } catch (e) {
    toastError(e)
  } finally {
    finalPromptGen.value = false
  }
}

function closeEdit() {
  editDialog.value = false
  editTarget.value = null
}

async function saveEdit() {
  const target = editTarget.value
  if (!target) return
  // 必填校验
  if (target.kindKey === 'character' && !String(editDraft.name ?? '').trim()) { toast.error(t('episode.create.nameRequired')); return }
  if (target.kindKey === 'scene' && !String(editDraft.location ?? '').trim()) { toast.error(t('detail.mat.locationRequired')); return }
  if (target.kindKey === 'prop' && !String(editDraft.name ?? '').trim()) { toast.error(t('episode.create.nameRequired')); return }
  editSaving.value = true
  try {
    const fp = editDraft.finalPrompt || null
    if (target.kindKey === 'character') await characterAPI.update(target.id, { name: editDraft.name, role: editDraft.role, appearance: editDraft.appearance, description: editDraft.description, styling: editDraft.styling, finalPrompt: fp })
    else if (target.kindKey === 'scene') await sceneAPI.update(target.id, { location: editDraft.location, time: editDraft.time, prompt: editDraft.prompt, lighting: editDraft.lighting, finalPrompt: fp })
    else await propAPI.update(target.id, { name: editDraft.name, type: editDraft.type, description: editDraft.description, finalPrompt: fp })
    toast.success(t('common.saved'))
    closeEdit()
    load()
  } catch (e) {
    toastError(e)
  } finally {
    editSaving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  padding: 20px 28px 40px;
  overflow-y: auto;
  height: 100%;
  animation: fadeUp 0.35s var(--ease-out) both;
}

/* Header card：单行紧凑 */
.page-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: var(--radius-lg);
  margin-bottom: 14px;
}
.head-info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.head-action { flex-shrink: 0; }

.back-btn {
  width: 30px; height: 30px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 50%;
  background: var(--overlay-track); color: var(--text-1);
  cursor: pointer;
  transition: background 0.16s var(--ease-out), color 0.16s var(--ease-out), box-shadow 0.16s var(--ease-out);
}
.back-btn:hover { background: var(--bg-active); color: var(--text-0); }
.back-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3.5px var(--button-focus);
}

.page-title {
  font-size: 17px; font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-meta { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.meta-item {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--text-2);
}

/* 主 Tab 导航 */
.page-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 14px;
}
.tab-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: none;
  background: transparent;
  padding: 8px 4px 10px;
  margin-right: 20px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-2);
  cursor: pointer;
  transition: color 0.16s var(--ease-out);
}
.tab-btn svg { opacity: 0.75; }
.tab-btn::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: transparent;
  transition: background 0.16s var(--ease-out);
}
.tab-btn:hover { color: var(--text-0); }
.tab-btn.on { color: var(--text-0); font-weight: 650; }
.tab-btn.on::after { background: var(--accent); }
.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-mono);
  background: var(--bg-2);
  color: var(--text-2);
}
.tab-btn.on .tab-count { background: var(--accent-bg); color: var(--accent-text); }

/* Episode Grid — 横向紧凑卡片，多列 */
.ep-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 10px;
}

/* 卡片主体 — 上信息区 + 下常驻操作条 */
.ep-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 10px;
  cursor: pointer;
  animation: fadeUp 0.35s var(--ease-out) both;
  transition: border-color 0.18s var(--ease-out), background 0.18s var(--ease-out);
}
.ep-card:hover {
  border-color: var(--border-strong);
}

/* 上区：编号 + 标题元数据 + 状态 */
.ep-card-top { display: flex; align-items: center; gap: 12px; min-width: 0; }

/* 编号徽标：统一中性，状态由圆点表达 */
.ep-number {
  width: 40px; height: 40px; flex-shrink: 0;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-family: var(--font-mono);
  background: var(--bg-2); color: var(--text-1);
}
.ep-num-label {
  font-size: 7.5px; letter-spacing: 0.18em; font-weight: 600;
  opacity: 0.55; line-height: 1; margin-bottom: 1px;
}
.ep-number b {
  font-size: 15px; font-weight: 600; line-height: 1;
}

/* 中部：标题 + 元数据（单行不换行，防止卡片被撑高错位） */
.ep-main { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
.ep-title {
  font-size: 13.5px; font-weight: 600; color: var(--text-0);
  line-height: 1.35; margin: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ep-meta-row {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: nowrap; overflow: hidden;
  white-space: nowrap;
}
.ep-meta {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--text-3);
  white-space: nowrap; flex-shrink: 0;
}
.ep-meta svg { opacity: 0.7; flex-shrink: 0; }
.ep-meta-ok { color: var(--text-2); }
.ep-time { flex-shrink: 1; overflow: hidden; text-overflow: ellipsis; }

/* 状态胶囊：中性底 + 彩色圆点，颜色只出现在点上 */
.ep-badges { display: flex; align-items: center; flex-shrink: 0; }

/* 下区：常驻操作条 */
.ep-card-foot {
  display: flex; align-items: center; gap: 6px;
  padding-top: 9px;
  border-top: 1px solid var(--border);
}
.ep-foot-spacer { flex: 1; }

/* 进入制作 — 卡片主操作 */
.ep-enter {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 12px;
  border: none; border-radius: var(--radius);
  background: var(--accent-bg); color: var(--accent-text);
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.ep-enter:hover {
  background: var(--accent-gradient); color: var(--on-accent, #fff);
  box-shadow: 0 2px 8px var(--accent-glow);
}
.ep-enter svg { transition: transform 0.18s var(--ease-out); }
.ep-enter:hover svg { transform: translateX(2px); }
.ep-status-btn {
  cursor: pointer; border: none; font: inherit;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 20px;
  background: var(--bg-2); color: var(--text-2);
  font-size: 11px; font-weight: 500;
  transition: background 0.14s, color 0.14s;
  white-space: nowrap;
}
.ep-status-btn:hover { color: var(--text-0); background: var(--bg-3); }

/* 分辨率标签 */
.ep-res-btn {
  cursor: pointer; border: none; font: inherit;
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 6px;
  font-size: 11px; font-weight: 600;
  background: var(--bg-2); color: var(--text-2);
  transition: background 0.14s, color 0.14s;
}
.ep-res-btn:hover { background: var(--bg-hover); color: var(--text-1); }

/* 状态圆点 */
.status-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.dot-active { background: var(--success); }
.dot-done { background: var(--accent); }
.dot-pending { background: var(--text-3); }

/* 删除按钮 */
.ep-delete {
  color: var(--text-3);
  transition: color 0.15s;
}
.ep-delete:hover { color: var(--action-danger); }

/* Empty / 添加卡片：与剧集卡片等高的虚线条 */
.ep-empty {
  display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px;
  min-height: 104px;
  padding: 8px; text-align: center; color: var(--text-3); font-size: 12.5px;
  border-style: dashed;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.ep-empty:hover { border-color: var(--accent-text); color: var(--accent-text); background: var(--accent-bg); }
.ep-empty-icon {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--bg-2); color: var(--text-3);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: transform 0.2s, background 0.2s, color 0.2s;
}
.ep-empty:hover .ep-empty-icon { background: var(--accent-bg); color: var(--accent-text); }

/* Create Episode Dialog (on top of global .dialog skeleton) */
.ep-dialog { width: min(480px, 100%); }
.dialog-close { flex-shrink: 0; color: var(--text-2); }
.dialog-body { display: flex; flex-direction: column; gap: 20px; }

.field { display: flex; flex-direction: column; gap: 8px; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--text-1); }
.field-hint { font-size: 12px; color: var(--text-3); }

.dialog-foot-copy {
  margin-right: auto;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-3);
}

/* ===== 素材库 ===== */
.asset-filter { margin-bottom: 16px; }

.asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; align-items: stretch; }
.character-asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 260px));
  justify-content: start;
  gap: 10px;
}
/* 分组标题：角色 / 场景 / 道具，彩色左条 + 图标 + 数量 */
.asset-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  margin: 4px 0 14px;
  border-radius: var(--radius);
  border-left: 3px solid var(--text-3);
  background: var(--bg-1);
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-1);
}
.asset-group-head .group-icon { display: inline-flex; color: var(--text-2); }
.asset-group-head .group-label { letter-spacing: 0.02em; }
.asset-group-head .group-count {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-3);
  background: var(--bg-2);
  border-radius: 99px;
  padding: 1px 9px;
}
.asset-group-head.is-character { border-left-color: var(--accent); background: var(--accent-bg); color: var(--accent-text); }
.asset-group-head.is-character .group-icon { color: var(--accent-text); }
.asset-group-head.is-scene { border-left-color: var(--success); background: var(--success-bg); color: var(--tag-success-text); }
.asset-group-head.is-scene .group-icon { color: var(--tag-success-text); }
.asset-group-head.is-prop { border-left-color: var(--warning); background: var(--warning-bg); color: var(--warn-text); }
.asset-group-head.is-prop .group-icon { color: var(--warn-text); }
.asset-card {
  display: flex; flex-direction: column; overflow: hidden;
  transition: transform 0.18s var(--ease-out), box-shadow 0.18s var(--ease-out), border-color 0.18s var(--ease-out);
}
.asset-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lift); }
.asset-click-card,
.character-asset-card {
  cursor: pointer;
}
.asset-click-card:focus-visible,
.character-asset-card:focus-visible {
  outline: none;
  border-color: var(--accent-glow);
  box-shadow: 0 0 0 3px var(--button-focus), var(--shadow-panel);
}
.character-asset-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  transition: transform 0.18s var(--ease-out), box-shadow 0.18s var(--ease-out), border-color 0.18s var(--ease-out);
}
.character-asset-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lift);
  border-color: var(--border-strong);
}
.character-portrait {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  align-self: start;
  margin: 0;
  border: 1px solid var(--surface-outline);
  border-radius: var(--radius);
  background: var(--bg-2);
  overflow: hidden;
}
.character-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.character-portrait-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-3);
}
.character-asset-main {
  min-width: 0;
  width: 100%;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.character-asset-overview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.character-asset-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.character-title-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.character-name-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  flex-wrap: wrap;
}
.character-name {
  font-size: 13px;
  line-height: 1.25;
  color: var(--text-0);
}
.character-gen-btn { flex-shrink: 0; align-self: center; }
.asset-final-prompt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 7px;
  border-top: 1px solid var(--border);
  font-size: 10.5px;
  line-height: 1.5;
}
.afp-label {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-3);
}
.afp-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
  color: var(--text-2);
}
.afp-text.dim { color: var(--text-3); }
.asset-final {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
  color: var(--text-2);
}
.asset-final .afp-label { margin-right: 4px; }
.character-visual-summary {
  max-width: 100%;
  display: flex;
  gap: 8px;
  overflow: hidden;
  color: var(--text-3);
  font-size: 10.5px;
  line-height: 1.45;
  white-space: nowrap;
}
.character-visual-summary span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.asset-cover { position: relative; aspect-ratio: 1; background: var(--bg-2); overflow: hidden; }
.asset-cover.wide { aspect-ratio: 16/9; }
.asset-cover img { width: 100%; height: 100%; object-fit: cover; }
.previewable-image { cursor: zoom-in; transition: transform 0.18s var(--ease-out), filter 0.18s var(--ease-out); }
.previewable-image:hover { transform: scale(1.015); filter: saturate(1.04); }
.asset-cover-badge {
  position: absolute;
  top: 7px;
  left: 7px;
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--header-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: var(--shadow-xs);
  color: var(--text-2);
  font-size: 9.5px;
  font-weight: 700;
}
.asset-cover-badge.is-ready {
  background: var(--success-bg);
  color: var(--tag-success-text);
}
.asset-cover-badge.is-pending {
  background: var(--accent-bg);
  color: var(--accent-text);
}
.asset-cover-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-3); }
.asset-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 11px 8px;
  min-width: 0;
}
.asset-name {
  font-size: 13px;
  font-weight: 650;
  color: var(--text-0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.asset-meta { font-size: 11px; line-height: 1.5; }
.asset-desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
}
.asset-light {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.asset-foot { display: flex; align-items: center; gap: 4px; padding: 7px 11px; border-top: 1px solid var(--border); }
.prop-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.prop-name-row .asset-name { min-width: 0; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--bg-3); flex-shrink: 0; }
.dot.ok { background: var(--success); }
.dot.pending { background: var(--accent); }
.ring-spinner {
  width: 22px; height: 22px;
  border: 2.5px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.ring-spinner.sm { width: 13px; height: 13px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
  text-align: center;
}
.empty-icon {
  width: 56px; height: 56px; border-radius: var(--radius-lg);
  background: var(--bg-2); color: var(--text-3);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.empty-title { font-size: 14px; font-weight: 600; color: var(--text-1); }
.empty-desc { font-size: 12px; color: var(--text-3); max-width: 260px; line-height: 1.6; }

.viewer-overlay { align-items: center; }
.viewer-dialog { width: min(960px, calc(100vw - 48px)); padding: 14px; }
.viewer-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.viewer-title { font-size: 13px; font-weight: 600; color: var(--text-1); }
.viewer-img { width: 100%; max-height: 76vh; object-fit: contain; border-radius: var(--radius); background: var(--bg-2); display: block; }

/* ===== 素材详情 / 编辑对话框（与工作台资产卡片同款布局） ===== */
.mat-detail-overlay { z-index: 118; padding: 28px; }
.mat-detail-dialog {
  width: min(1040px, calc(100vw - 56px));
  max-height: calc(100vh - 56px);
}
.mat-detail-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 14px 16px;
  border-bottom: 1px solid var(--surface-outline);
}
.mat-detail-title-block { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.mat-detail-kicker {
  color: var(--text-3); font-size: 10px; font-weight: 800;
  letter-spacing: 0.12em; text-transform: uppercase;
}
.mat-detail-title {
  margin: 0; color: var(--text-0); font-size: 18px;
  line-height: 1.2; font-family: var(--font-display);
}
.mat-detail-head-actions {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
}
.mat-detail-body { min-height: 0; overflow: auto; padding: 16px; }
.mat-detail-shell {
  display: grid;
  grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
  gap: 14px; align-items: start;
}
.mat-detail-preview-panel,
.mat-detail-editor-panel {
  min-width: 0; display: flex; flex-direction: column; gap: 12px;
}
.mat-detail-preview-panel { position: sticky; top: 0; }

.mat-detail-section-title {
  min-height: 24px; display: flex; align-items: center;
  justify-content: space-between; gap: 10px;
  color: var(--text-1); font-size: 12px; font-weight: 820; letter-spacing: 0.02em;
}
.mat-detail-section-title .dim {
  font-size: 11px; font-weight: 560; letter-spacing: 0; text-align: right;
}

/* 最终提示词面板 */
.mat-detail-prompt-panel {
  margin-top: 18px;
  border-top: 1px solid var(--border);
  padding-top: 16px;
}
.mat-detail-prompt-gen {
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.mat-detail-prompt-text {
  width: 100%;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-0);
  font-size: 12.5px;
  line-height: 1.6;
  resize: vertical;
  min-height: 112px;
  font-family: inherit;
}
.mat-detail-prompt-text:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
.mat-detail-prompt-text::placeholder { color: var(--text-3); }

/* 状态标签 */
.mat-detail-state {
  min-height: 20px; display: inline-flex; align-items: center;
  padding: 0 7px; border-radius: 999px;
  background: var(--overlay-track); color: var(--text-3);
  font-size: 10px; font-weight: 760; white-space: nowrap;
}
.mat-detail-state.is-ready { color: var(--success); background: var(--success-bg); }

/* 图片预览框 */
.mat-detail-media-frame {
  position: relative; width: 100%; aspect-ratio: 16/9;
  display: block; padding: 0;
  border: 1px solid var(--surface-outline);
  border-radius: var(--radius); background: var(--bg-2);
  color: var(--text-3); overflow: hidden; cursor: zoom-in;
}
.mat-detail-media-frame:disabled { cursor: default; opacity: 1; }
.mat-detail-media-frame:focus-visible {
  outline: none; border-color: var(--action-primary);
  box-shadow: 0 0 0 3px var(--button-focus);
}
.mat-detail-media-frame img { width: 100%; height: 100%; display: block; object-fit: cover; }
.mat-detail-media-empty {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-3);
}

/* 元数据行（类型 + 定位） */
.mat-detail-meta-row {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;
}
.mat-detail-meta-item {
  min-width: 0; padding: 9px 10px;
  border: 1px solid var(--surface-outline);
  border-radius: var(--radius); background: var(--surface-muted);
}
.mat-detail-meta-item span {
  display: block; color: var(--text-3);
  font-size: 10px; font-weight: 780; letter-spacing: 0.04em;
}
.mat-detail-meta-item strong {
  display: block; margin-top: 4px; min-width: 0;
  color: var(--text-0); font-size: 12px;
  line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* 编辑区域 */
.mat-detail-edit-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;
}
.mat-detail-edit-grid--character,
.mat-detail-edit-grid--scene { grid-template-columns: 1fr; }
.mat-detail-edit-field {
  min-width: 0; display: flex; flex-direction: column; gap: 7px;
}
.mat-detail-edit-field > span,
.mat-detail-edit-field > input::placeholder,
.mat-detail-textarea::placeholder {
  color: var(--text-3); font-size: 10px; font-weight: 780; letter-spacing: 0.04em;
}
.mat-detail-textarea { min-height: 138px; resize: vertical; }
.mat-detail-edit-grid--character .mat-detail-textarea,
.mat-detail-edit-grid--scene .mat-detail-textarea { min-height: 164px; }

/* 底部操作栏 */
.mat-detail-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 12px 16px;
  border-top: 1px solid var(--surface-outline);
}
.mat-detail-secondary-actions,
.mat-detail-primary-actions { display: flex; align-items: center; gap: 8px; }

@media (max-width: 860px) {
  .page { padding: 16px 16px 32px; }
  .page-head { flex-wrap: wrap; }
  .ep-grid { grid-template-columns: 1fr; }
  .ep-actions { opacity: 1; } /* 移动端始终显示操作按钮 */
  .dialog-foot { flex-wrap: wrap; gap: 10px; }
  .dialog-foot-copy { display: none; }
}
</style>
