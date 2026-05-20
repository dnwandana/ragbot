<template>
  <div style="padding: 24px">
    <div style="display: flex; justify-content: space-between; margin-bottom: 16px">
      <h1>Conversations</h1>
      <a-button type="primary" @click="openCreateModal">+ New Conversation</a-button>
    </div>

    <a-spin :spinning="loading">
      <a-empty
        v-if="!conversations.length"
        description="No conversations yet. Start one to chat with your datasets!"
      />
      <a-list v-else :dataSource="conversations" rowKey="id">
        <template #renderItem="{ item }">
          <a-list-item
            style="cursor: pointer"
            @click="$router.push(`/workspaces/${workspaceId}/conversations/${item.id}`)"
          >
            <a-list-item-meta>
              <template #title>{{ item.title || "Untitled conversation" }}</template>
              <template #description>
                {{ item.dataset_ids?.length || 0 }} dataset(s) ·
                {{
                  item.last_message_at
                    ? new Date(item.last_message_at).toLocaleString()
                    : "No messages yet"
                }}
              </template>
            </a-list-item-meta>
            <template #actions>
              <a-button type="text" danger size="small" @click.stop="handleDelete(item.id)"
                >Delete</a-button
              >
            </template>
          </a-list-item>
        </template>
      </a-list>
    </a-spin>

    <!-- Create conversation modal -->
    <a-modal :open="isModalVisible" title="New Conversation" @cancel="closeModal" :footer="null">
      <a-form :model="form" layout="vertical" @finish="handleCreate(form)">
        <a-form-item label="Agent" name="agent_id" :rules="[{ required: true }]">
          <a-select v-model:value="form.agent_id" placeholder="Select an agent">
            <a-select-option v-for="a in agents" :key="a.id" :value="a.id">
              {{ a.name }}{{ a.is_system ? " (Default)" : "" }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Datasets (optional)">
          <a-select
            v-model:value="form.dataset_ids"
            mode="multiple"
            placeholder="Select datasets to search"
          >
            <a-select-option v-for="d in datasets" :key="d.id" :value="d.id">{{
              d.name
            }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Title (optional)">
          <a-input v-model:value="form.title" placeholder="Will be auto-set after first message" />
        </a-form-item>
        <a-button type="primary" html-type="submit" block>Start Conversation</a-button>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useConversations } from "../../composables/useConversations.js"
import { useAgentsStore } from "../../stores/agents.js"
import { useDatasetsStore } from "../../stores/datasets.js"

const route = useRoute()
const workspaceId = route.params.workspaceId

const {
  conversations,
  loading,
  isModalVisible,
  openCreateModal,
  closeModal,
  handleCreate,
  handleDelete,
  fetchConversations,
} = useConversations(workspaceId)

const agentsStore = useAgentsStore()
const datasetsStore = useDatasetsStore()
const agents = ref([])
const datasets = ref([])

const form = reactive({ agent_id: null, dataset_ids: [], title: "" })

onMounted(async () => {
  await Promise.all([
    fetchConversations(),
    agentsStore.fetchAgents(workspaceId).then(() => {
      agents.value = agentsStore.agents
    }),
    datasetsStore.fetchDatasets(workspaceId).then(() => {
      datasets.value = datasetsStore.datasets
    }),
  ])
  // Default to system agent
  const systemAgent = agents.value.find((a) => a.is_system)
  if (systemAgent) form.agent_id = systemAgent.id
})
</script>
