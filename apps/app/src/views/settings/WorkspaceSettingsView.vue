<template>
  <div style="padding: 24px">
    <h1>Workspace Settings</h1>
    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="members" tab="Members">
        <MembersTable :workspace-id="workspaceId" />
      </a-tab-pane>
      <a-tab-pane key="roles" tab="Roles">
        <p>Roles management (adapt existing RoleFormModal for workspace routes)</p>
      </a-tab-pane>
      <a-tab-pane key="audit" tab="Audit Logs">
        <p>Audit log viewer coming soon.</p>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRoute } from "vue-router"
import MembersTable from "../../components/MembersTable.vue"

const route = useRoute()
const workspaceId = route.params.workspaceId
const activeTab = ref("members")
</script>
