<template>
  <div class="stub-page">
    <AppHeader :title="$t('common.back')" show-back />
    <div class="stub-page__content">
      <el-empty :description="'This page is under development'">
        <el-button type="primary" @click="$router.back()">
          {{ $t('common.back') }}
        </el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
</script>

<style scoped>
.stub-page__content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 60px);
}
</style>
