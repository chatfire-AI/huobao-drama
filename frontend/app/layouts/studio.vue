<template>
  <div class="studio-fullscreen">
    <slot />
  </div>
</template>

<style scoped>
.studio-fullscreen { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-base); }
</style>
