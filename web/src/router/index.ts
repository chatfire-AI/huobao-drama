import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'DramaList',
    component: () => import('../views/drama/DramaList.vue')
  },
  {
    path: '/dramas/create',
    name: 'DramaCreate',
    component: () => import('../views/drama/DramaCreate.vue')
  },
  {
    path: '/dramas/:id',
    name: 'DramaManagement',
    component: () => import('../views/drama/DramaManagement.vue')
  },
  {
    path: '/dramas/:id/episode/:episodeNumber',
    name: 'EpisodeWorkflowNew',
    component: () => import('../views/drama/EpisodeWorkflow.vue'),
    meta: { fullscreen: true }
  },
  {
    path: '/dramas/:id/characters',
    name: 'CharacterExtraction',
    component: () => import('../views/workflow/CharacterExtraction.vue')
  },
  {
    path: '/dramas/:id/images/characters',
    name: 'CharacterImages',
    component: () => import('../views/workflow/CharacterImages.vue')
  },
  {
    path: '/dramas/:id/settings',
    name: 'DramaSettings',
    component: () => import('../views/workflow/DramaSettings.vue')
  },
  {
    path: '/episodes/:id/edit',
    name: 'ScriptEdit',
    component: () => import('../views/script/ScriptEdit.vue')
  },
  {
    path: '/episodes/:id/storyboard',
    name: 'StoryboardEdit',
    component: () => import('../views/storyboard/StoryboardEdit.vue')
  },
  {
    path: '/episodes/:id/generate',
    name: 'Generation',
    component: () => import('../views/generation/ImageGeneration.vue')
  },
  {
    path: '/timeline/:id',
    name: 'TimelineEditor',
    component: () => import('../views/editor/TimelineEditor.vue')
  },
  {
    path: '/dramas/:dramaId/episode/:episodeNumber/professional',
    name: 'ProfessionalEditor',
    component: () => import('../views/drama/ProfessionalEditor.vue'),
    meta: { fullscreen: true }
  },
  {
    path: '/settings/ai-config',
    name: 'AIConfig',
    component: () => import('../views/settings/AIConfig.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: { fullscreen: true }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 开源版本 - 无需认证

router.beforeEach((to) => {
  document.title = to.name ? `${String(to.name)} - Huobao Drama` : 'Huobao Drama'
})

export default router
