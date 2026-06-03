<script setup>
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useConversations } from "@/composables/useConversations"
import { useAgentsStore } from "@/stores/agents"
import { relativeTime } from "@/utils/time"
import { PlusOutlined, MessageOutlined, DeleteOutlined } from "@ant-design/icons-vue"

const route = useRoute()
const router = useRouter()
const workspaceId = route.params.workspaceId

const { conversations, loading, handleDelete, fetchConversations } = useConversations(workspaceId)

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

function startNewConversation() {
  router.push({ name: "NewChat", params: { workspaceId } })
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
      <button class="btn-brand" @click="startNewConversation">
        <PlusOutlined style="font-size: 13px" />
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
      <button class="btn-brand" @click="startNewConversation">Start conversation</button>
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
            <MessageOutlined style="font-size: 17px" />
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
            <DeleteOutlined style="font-size: 14px" />
          </button>
        </div>
      </template>

      <!-- New conversation prompt row -->
      <button class="conv-new" @click="startNewConversation">
        <PlusOutlined style="font-size: 13px" />
        Start a new conversation…
      </button>
    </div>
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
