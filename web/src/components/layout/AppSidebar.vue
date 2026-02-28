<template>
  <aside class="app-sidebar" :class="{ collapsed }">
    <!-- Brand -->
    <router-link to="/" class="sidebar-brand">
      <el-icon :size="24"><Film /></el-icon>
      <span v-if="!collapsed" class="brand-text">HuoBao Drama</span>
    </router-link>

    <!-- Main nav -->
    <nav class="sidebar-nav">
      <SidebarItem :icon="FolderOpened" :label="$t('sidebar.projects')" to="/" :collapsed="collapsed" />
      <SidebarItem :icon="User" :label="$t('sidebar.characterLibrary')" to="/character-library" :collapsed="collapsed" />
      <SidebarItem :icon="Picture" :label="$t('sidebar.assets')" to="/assets" :collapsed="collapsed" />
      <SidebarItem :icon="Setting" :label="$t('sidebar.settings')" to="/settings/ai-config" :collapsed="collapsed" />
    </nav>

    <!-- Bottom area -->
    <div class="sidebar-bottom">
      <ThemeToggle />
      <LanguageSwitcher />
      <button class="collapse-btn" @click="toggleCollapse" :title="collapsed ? $t('sidebar.expand') : $t('sidebar.collapse')">
        <el-icon :size="18">
          <DArrowRight v-if="collapsed" />
          <DArrowLeft v-else />
        </el-icon>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Film, FolderOpened, User, Picture, Setting, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import SidebarItem from './SidebarItem.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const STORAGE_KEY = 'sidebar-collapsed'

const collapsed = ref(false)

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) {
    collapsed.value = stored === 'true'
  } else if (window.innerWidth < 768) {
    collapsed.value = true
  }
})

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
  localStorage.setItem(STORAGE_KEY, String(collapsed.value))
}
</script>

<style scoped>
.app-sidebar {
  width: 220px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-right: 1px solid var(--border-primary);
  transition: width 200ms ease;
  flex-shrink: 0;
  overflow: hidden;
}

.app-sidebar.collapsed {
  width: 64px;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 700;
  font-size: 1rem;
  white-space: nowrap;
}

.brand-text {
  background: linear-gradient(135deg, var(--accent) 0%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  overflow-y: auto;
}

.sidebar-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-top: 1px solid var(--border-primary);
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 36px;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 150ms;
}

.collapse-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}
</style>
