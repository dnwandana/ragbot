<!-- apps/app/src/views/settings/WorkspaceSettingsView.vue -->
<script setup>
import { onMounted } from "vue"
import { useRoute } from "vue-router"
import { useWorkspacesStore } from "@/stores/workspaces"

const route = useRoute()
const workspaceId = route.params.workspaceId

const workspacesStore = useWorkspacesStore()

onMounted(async () => {
  await workspacesStore.fetchWorkspaceById(workspaceId)
})
</script>

<template>
  <RouterView :workspaceId="workspaceId" />
</template>
