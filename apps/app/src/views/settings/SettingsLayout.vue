<template>
  <div class="settings-shell">
    <slot />
  </div>
</template>

<style scoped>
.settings-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
}
</style>
