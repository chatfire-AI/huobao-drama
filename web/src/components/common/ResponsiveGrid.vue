<template>
  <div class="responsive-grid">
    <slot />
  </div>
</template>

<style scoped>
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: var(--space-4);
}

@media (min-width: 640px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .responsive-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
