<template>
  <div style="padding: 24px">
    <div
      style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      "
    >
      <h1>My Workspaces</h1>
      <a-button type="primary" @click="openCreateModal">+ New Workspace</a-button>
    </div>

    <a-spin :spinning="loading">
      <a-empty v-if="!workspaces.length" description="No workspaces yet. Create your first one!" />
      <a-row :gutter="[16, 16]" v-else>
        <a-col v-for="ws in workspaces" :key="ws.id" :xs="24" :sm="12" :md="8" :lg="6">
          <a-card hoverable @click="$router.push(`/workspaces/${ws.id}`)">
            <template #title>{{ ws.name }}</template>
            <a-tag>{{ ws.role_name }}</a-tag>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>

    <WorkspaceFormModal
      :visible="isModalVisible"
      :workspace="editingWorkspace"
      @close="closeModal"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup>
import { onMounted } from "vue"
import WorkspaceFormModal from "../../components/WorkspaceFormModal.vue"
import { useWorkspaces } from "../../composables/useWorkspaces.js"

const {
  workspaces,
  loading,
  isModalVisible,
  editingWorkspace,
  openCreateModal,
  closeModal,
  handleSubmit,
  fetchWorkspaces,
} = useWorkspaces()

onMounted(fetchWorkspaces)
</script>
