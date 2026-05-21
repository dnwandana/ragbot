<script setup>
import { reactive, ref, computed, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useConversations } from "@/composables/useConversations"
import { useAgentsStore } from "@/stores/agents"
import { useDatasetsStore } from "@/stores/datasets"

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
  const systemAgent = agents.value.find((a) => a.is_system)
  if (systemAgent) form.agent_id = systemAgent.id
})

/** @param {string} agentId */
function agentName(agentId) {
  return agents.value.find((a) => a.id === agentId)?.name || "Unknown agent"
}

/** @param {string} dateStr */
function relativeTime(dateStr) {
  if (!dateStr) return ""
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const d = new Date(dateStr)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  if (diff < 604800) return days[d.getDay()]
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const grouped = computed(() => {
  const now = Date.now()
  const today = [],
    thisWeek = [],
    older = []
  for (const c of conversations.value) {
    const diff = (now - new Date(c.created_at)) / 86400000
    if (diff < 1) today.push(c)
    else if (diff < 7) thisWeek.push(c)
    else older.push(c)
  }
  return [
    { label: "Today", items: today },
    { label: "Earlier this week", items: thisWeek },
    { label: "Older", items: older },
  ].filter((g) => g.items.length > 0)
})
</script>

<template>
  <div class="page">
    <!-- Page header -->
    <div class="page-head">
      <div>
        <div class="page-title">Conversations</div>
        <div class="page-sub">Chat with your knowledge bases using AI agents.</div>
      </div>
      <button class="btn-brand" @click="openCreateModal">
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
        >
          <path d="M8 3v10M3 8h10" stroke-linecap="round" />
        </svg>
        New conversation
      </button>
    </div>

    <!-- Loading skeleton -->
    <a-skeleton
      v-if="loading && !conversations.length"
      active
      :paragraph="{ rows: 4 }"
      style="padding: 24px"
    />

    <!-- Empty state -->
    <div v-else-if="!conversations.length" class="empty-state">
      <div class="empty-icon">💬</div>
      <div class="empty-title">No conversations yet</div>
      <p class="empty-text">Start a conversation to chat with your knowledge base using AI.</p>
      <button class="btn-brand" @click="openCreateModal">Start conversation</button>
    </div>

    <!-- Grouped conversation list -->
    <div v-else class="conv-list">
      <template v-for="group in grouped" :key="group.label">
        <div class="group-label">{{ group.label }}</div>

        <div
          v-for="conv in group.items"
          :key="conv.id"
          class="conv-row"
          @click="$router.push(`/workspaces/${workspaceId}/conversations/${conv.id}`)"
        >
          <div class="conv-icon">
            <svg
              width="17"
              height="17"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
            >
              <path
                d="M2 2h12a1 1 0 011 1v8a1 1 0 01-1 1H5l-3 2V3a1 1 0 011-1z"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="conv-body">
            <div class="conv-title">{{ conv.title || "Untitled conversation" }}</div>
            <div class="conv-meta">
              <span class="conv-agent">{{ agentName(conv.agent_id) }}</span>
              <span class="chip-sm"
                >{{ (conv.dataset_ids || []).length }} dataset{{
                  (conv.dataset_ids || []).length !== 1 ? "s" : ""
                }}</span
              >
            </div>
          </div>
          <span class="conv-time">{{ relativeTime(conv.last_message_at || conv.created_at) }}</span>
          <button class="conv-more" @click.stop="handleDelete(conv.id)" title="Delete conversation">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
            >
              <path
                d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </template>

      <!-- New conversation prompt row -->
      <button class="conv-new" @click="openCreateModal">
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
        >
          <path d="M8 3v10M3 8h10" stroke-linecap="round" />
        </svg>
        Start a new conversation…
      </button>
    </div>

    <!-- New conversation modal -->
    <a-modal
      :open="isModalVisible"
      title="New Conversation"
      @cancel="closeModal"
      :footer="null"
      :width="480"
    >
      <a-form :model="form" layout="vertical" @finish="handleCreate(form)">
        <a-form-item
          label="Agent"
          name="agent_id"
          :rules="[{ required: true, message: 'Please select an agent' }]"
        >
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
          <a-input v-model:value="form.title" placeholder="Auto-set after first message" />
        </a-form-item>
        <button type="submit" class="btn-brand btn-block">Start Conversation</button>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 24px;
}
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}
.page-title {
  font-size: var(--t-lg);
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
}
.page-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 2px;
}

.btn-brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-brand:hover {
  background: var(--brand-2);
}
.btn-block {
  width: 100%;
  padding: 10px;
  justify-content: center;
  margin-top: 4px;
}

.group-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-4);
  padding: 12px 0 6px;
}
.group-label:first-child {
  padding-top: 0;
}

.conv-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conv-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-1);
  cursor: pointer;
  transition:
    box-shadow var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}
.conv-row:hover {
  box-shadow: var(--shadow-2);
  border-color: var(--line-2);
}

.conv-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--brand-tint);
  color: var(--brand);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.conv-body {
  flex: 1;
  min-width: 0;
}
.conv-title {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}
.conv-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.conv-agent {
  font-size: 12px;
  color: var(--ink-3);
}
.chip-sm {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 20px;
  font-size: 11px;
  color: var(--ink-4);
}
.conv-time {
  font-size: 11.5px;
  color: var(--ink-4);
  flex-shrink: 0;
}
.conv-more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--ink-4);
  border-radius: var(--r-sm);
  flex-shrink: 0;
}
.conv-more:hover {
  background: var(--err-bg);
  color: var(--err);
}

.conv-new {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  width: 100%;
  border: 1px dashed var(--line-2);
  border-radius: var(--r);
  background: transparent;
  color: var(--ink-4);
  font-size: 13px;
  cursor: pointer;
  margin-top: 4px;
}
.conv-new:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: var(--brand-tint);
}

.empty-state {
  text-align: center;
  padding: 60px 24px;
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 14px;
}
.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 6px;
}
.empty-text {
  font-size: 13px;
  color: var(--ink-3);
  margin-bottom: 20px;
  max-width: 340px;
  margin-left: auto;
  margin-right: auto;
}
</style>
