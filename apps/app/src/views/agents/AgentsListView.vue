<template>
  <div style="padding: 24px">
    <div style="display: flex; justify-content: space-between; margin-bottom: 16px">
      <h1>Agents</h1>
      <a-button type="primary" @click="openCreateModal">+ New Agent</a-button>
    </div>

    <a-spin :spinning="loading">
      <a-empty v-if="!agents.length" description="No agents yet. Create a custom agent!" />
      <a-list v-else :data-source="agents" :row-key="(a) => a.id">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta
              :title="item.name + (item.is_system ? ' (System)' : '')"
              :description="item.description || item.system_prompt?.slice(0, 120)"
            />
            <template #actions>
              <a-button type="link" @click="openEditModal(item)">Edit</a-button>
              <a-button type="link" danger :disabled="item.is_system" @click="handleDelete(item.id)"
                >Delete</a-button
              >
            </template>
          </a-list-item>
        </template>
      </a-list>
    </a-spin>

    <AgentFormModal
      :visible="isModalVisible"
      :agent="editingAgent"
      @close="closeModal"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup>
import { onMounted } from "vue"
import { useRoute } from "vue-router"
import AgentFormModal from "../../components/AgentFormModal.vue"
import { useAgents } from "../../composables/useAgents.js"

const route = useRoute()
const workspaceId = route.params.workspaceId
const {
  agents,
  loading,
  isModalVisible,
  editingAgent,
  openCreateModal,
  openEditModal,
  closeModal,
  handleSubmit,
  handleDelete,
  fetchAgents,
} = useAgents(workspaceId)

onMounted(fetchAgents)
</script>
