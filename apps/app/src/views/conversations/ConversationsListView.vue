<script setup>
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useConversations } from "@/composables/useConversations"
import { useAgentsStore } from "@/stores/agents"
import { useFormattedTime } from "@/composables/useFormattedTime"
import { Plus, MessageSquare, Trash2 } from "lucide-vue-next"

const route = useRoute()
const router = useRouter()
const workspaceId = route.params.workspaceId

const { conversations, loading, handleDelete, fetchConversations } = useConversations(workspaceId)
const { relativeTime, calendarDaysAgo } = useFormattedTime()

const agentsStore = useAgentsStore()
const agents = ref([])

onMounted(async () => {
  await Promise.all([
    fetchConversations(),
    agentsStore.fetchAgents(workspaceId).then(() => {
      agents.value = agentsStore.agents
    }),
  ])
})

/** @param {string} agentId */
function agentName(agentId) {
  return agents.value.find((a) => a.id === agentId)?.name || "Unknown agent"
}

/** @returns {void} */
function startNewConversation() {
  router.push({ name: "NewChat", params: { workspaceId } })
}

const deleteTarget = ref(null)

/** @param {object} conv */
function openDelete(conv) {
  deleteTarget.value = conv
}

/** @returns {Promise<void>} */
async function confirmDelete() {
  if (!deleteTarget.value) return
  await handleDelete(deleteTarget.value.id)
  deleteTarget.value = null
}

const grouped = computed(() => {
  const today = [],
    thisWeek = [],
    older = []
  for (const c of conversations.value) {
    const days = calendarDaysAgo(c.created_at)
    if (days === 0) today.push(c)
    else if (days !== null && days < 7) thisWeek.push(c)
    else older.push(c)
  }
  return [
    { label: "Today", items: today },
    { label: "Earlier this week", items: thisWeek },
    { label: "Older", items: older },
  ].filter((g) => g.items.length > 0)
})

/**
 * Column definitions for the conversations a-table.
 * The actions column is intentionally untitled — it holds the delete button.
 */
const columns = [
  { title: "Conversation", key: "conversation" },
  { title: "Agent", key: "agent" },
  { title: "Datasets", key: "datasets" },
  { title: "Last active", key: "last_active" },
  { title: "", key: "actions" },
]

/**
 * Build Ant Design customRow attributes for a conversation row, attaching click
 * and keyboard handlers so rows navigate to the chat view and are focusable.
 * @param {object} record - Conversation row object
 * @returns {object} Attribute/event object spread onto the <tr>
 */
function customRow(record) {
  return {
    tabindex: 0,
    style: "cursor: pointer",
    onClick: () => router.push(`/workspaces/${workspaceId}/conversations/${record.id}`),
    onKeydown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        router.push(`/workspaces/${workspaceId}/conversations/${record.id}`)
      }
    },
  }
}
</script>

<template>
  <div class="page">
    <!-- Page header -->
    <div class="page-head">
      <div>
        <div class="page-title">Conversations</div>
        <div class="page-sub">Chat with your knowledge bases using AI agents.</div>
      </div>
      <button class="btn-brand" @click="startNewConversation">
        <Plus :size="13" />
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
      <div class="empty-icon"><MessageSquare :size="36" /></div>
      <div class="empty-title">No conversations yet</div>
      <p class="empty-text">Start a conversation to chat with your knowledge base using AI.</p>
      <button class="btn-brand" @click="startNewConversation">Start conversation</button>
    </div>

    <!-- Grouped tables: one per date group, no column headers -->
    <template v-else>
      <div v-for="group in grouped" :key="group.label" class="group-section">
        <div class="group-label">{{ group.label }}</div>
        <a-table
          :columns="columns"
          :data-source="group.items"
          :row-key="(record) => record.id"
          :pagination="false"
          :show-header="false"
          :loading="loading && !!conversations.length"
          :custom-row="customRow"
        >
          <template #bodyCell="{ column, record }">
            <!-- Conversation title + icon -->
            <template v-if="column.key === 'conversation'">
              <div class="conv-cell">
                <div class="conv-icon"><MessageSquare :size="15" /></div>
                <div>
                  <div class="conv-title">{{ record.title || "Untitled conversation" }}</div>
                </div>
              </div>
            </template>

            <!-- Agent name -->
            <template v-else-if="column.key === 'agent'">
              <span class="tbl-muted">{{ agentName(record.agent_id) }}</span>
            </template>

            <!-- Dataset count chip -->
            <template v-else-if="column.key === 'datasets'">
              <span class="chip-sm">
                {{ (record.dataset_ids || []).length }}
                dataset{{ (record.dataset_ids || []).length !== 1 ? "s" : "" }}
              </span>
            </template>

            <!-- Last active timestamp -->
            <template v-else-if="column.key === 'last_active'">
              <span class="tbl-muted">
                {{ relativeTime(record.last_message_at || record.created_at) }}
              </span>
            </template>

            <!-- Actions: delete button -->
            <template v-else-if="column.key === 'actions'">
              <div @click.stop @keydown.stop>
                <button
                  class="conv-more"
                  title="Delete conversation"
                  aria-label="Delete conversation"
                  @click="openDelete(record)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </template>
          </template>
        </a-table>
      </div>
    </template>

    <!-- Delete confirm modal -->
    <a-modal
      :open="!!deleteTarget"
      title="Delete conversation?"
      ok-text="Delete"
      ok-type="danger"
      cancel-text="Cancel"
      @ok="confirmDelete"
      @cancel="deleteTarget = null"
    >
      <p style="margin: 8px 0">
        <strong>{{ deleteTarget?.title || "This conversation" }}</strong> and its messages will be
        permanently removed.
      </p>
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

/* Group section */
.group-section {
  margin-bottom: 20px;
}
.group-section:last-child {
  margin-bottom: 0;
}

.group-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 8px;
}
.group-label:first-child {
  padding-top: 0;
}

/* a-table overrides */
:deep(.ant-table) {
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
}

:deep(.ant-table-thead > tr > th) {
  background: var(--bg);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  border-bottom: 1px solid var(--line);
}

:deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid var(--line);
  padding: 11px 18px;
  cursor: pointer;
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: var(--bg) !important;
}

:deep(.ant-table-tbody > tr:last-child > td:first-child) {
  border-bottom-left-radius: var(--r-lg);
}

:deep(.ant-table-tbody > tr:last-child > td:last-child) {
  border-bottom-right-radius: var(--r-lg);
}

/* Conversation cell */
.conv-cell {
  display: flex;
  align-items: center;
  gap: 10px;
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

.conv-title {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tbl-muted {
  font-size: 12.5px;
  color: var(--ink-4);
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

/* Delete button */
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

/* Empty state */
.empty-state {
  text-align: center;
  padding: 60px 24px;
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 14px;
  color: var(--ink-3);
  display: flex;
  justify-content: center;
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
