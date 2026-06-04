<!-- apps/app/src/views/settings/WorkspaceSettingsView.vue -->
<script setup>
import { useRoute } from "vue-router"

const route = useRoute()
const workspaceId = route.params.workspaceId
</script>

<template>
  <RouterView :workspaceId="workspaceId" />
</template>
