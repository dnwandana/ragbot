<!-- apps/app/src/views/settings/WorkspaceSettingsView.vue -->
<script setup>
import { useRoute } from "vue-router"

const route = useRoute()
const workspaceId = route.params.workspaceId
</script>

<template>
  <div class="settings-canvas">
    <RouterView :workspaceId="workspaceId" />
  </div>
</template>

<style scoped>
.settings-canvas {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 28px 48px;
}
</style>
