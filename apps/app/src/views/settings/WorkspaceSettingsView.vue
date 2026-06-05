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
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 36px 60px;
}
</style>
