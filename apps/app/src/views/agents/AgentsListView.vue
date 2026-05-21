<script setup>
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import AgentFormModal from "@/components/AgentFormModal.vue"
import { useAgents } from "@/composables/useAgents"
import VariationsToggle from "@/components/VariationsToggle.vue"

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

const viewMode = ref("cards")
const VIEW_OPTIONS = [
  { label: "Cards", value: "cards" },
  { label: "Table", value: "table" },
]

onMounted(fetchAgents)

/** @param {object} agent */
function modelLabel(agent) {
  return agent.model_config?.model?.split("/").pop() || "default"
}

const tableColumns = [
  { title: "Agent", key: "name", dataIndex: "name" },
  { title: "Status", key: "status", dataIndex: "is_active", width: 110 },
  { title: "Model", key: "model", width: 160 },
  { title: "Created", key: "created", dataIndex: "created_at", width: 120 },
  { title: "", key: "actions", width: 120 },
]
</script>

<template>
  <div class="page">
    <!-- Page head -->
    <div class="page-head">
      <div>
        <div class="page-title">Agents</div>
        <div class="page-sub">AI assistants powered by your datasets.</div>
      </div>
      <div class="page-actions">
        <VariationsToggle v-model="viewMode" :options="VIEW_OPTIONS" />
        <button class="btn-brand" @click="openCreateModal">
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
          >
            <path d="M8 3v10M3 8h10" stroke-linecap="round" />
          </svg>
          New agent
        </button>
      </div>
    </div>

    <!-- Loading -->
    <a-skeleton v-if="loading && !agents.length" active :paragraph="{ rows: 3 }" />

    <!-- Empty state -->
    <div v-else-if="!agents.length" class="empty-state">
      <div class="empty-icon">🤖</div>
      <div class="empty-title">No agents yet</div>
      <p class="empty-text">Create an agent with a custom system prompt and model configuration.</p>
      <button class="btn-brand" @click="openCreateModal">Create agent</button>
    </div>

    <!-- CARDS view -->
    <div v-else-if="viewMode === 'cards'" class="agent-grid">
      <div v-for="agent in agents" :key="agent.id" class="agent-card">
        <div class="agent-card__hd">
          <div class="agent-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
            >
              <rect x="3" y="1.5" width="10" height="8" rx="3" />
              <circle cx="5.5" cy="6" r="1" fill="currentColor" stroke="none" />
              <circle cx="10.5" cy="6" r="1" fill="currentColor" stroke="none" />
              <path d="M5 11.5c0-1.657 1.343-2.5 3-2.5s3 .843 3 2.5" stroke-linecap="round" />
              <path d="M8 9.5v2" stroke-linecap="round" />
            </svg>
          </div>
          <div>
            <div class="agent-name">
              {{ agent.name }}
              <span v-if="agent.is_system" class="chip chip--ghost">System</span>
            </div>
            <div class="agent-badges">
              <span class="chip" :class="agent.is_active ? 'chip--ok' : 'chip--ghost'">
                <span class="status-dot" />
                {{ agent.is_active ? "Active" : "Inactive" }}
              </span>
              <span class="chip chip--ghost model-chip">{{ modelLabel(agent) }}</span>
            </div>
          </div>
        </div>
        <p class="agent-desc">
          {{ (agent.description || agent.system_prompt || "").slice(0, 140)
          }}{{ (agent.description || agent.system_prompt || "").length > 140 ? "…" : "" }}
        </p>
        <div class="agent-card__foot">
          <button class="btn-outline btn-sm" @click="openEditModal(agent)">Edit</button>
          <button class="btn-danger-sm" :disabled="agent.is_system" @click="handleDelete(agent.id)">
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- TABLE view -->
    <div v-else class="agent-table-wrap">
      <a-table
        :dataSource="agents"
        :loading="loading"
        :columns="tableColumns"
        :pagination="false"
        rowKey="id"
        size="middle"
        :bordered="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div>
              <div class="tbl-name">
                {{ record.name }}
                <span v-if="record.is_system" class="chip chip--ghost" style="margin-left: 6px"
                  >System</span
                >
              </div>
              <div class="tbl-desc">{{ (record.description || "").slice(0, 80) }}</div>
            </div>
          </template>
          <template v-if="column.key === 'status'">
            <span class="chip" :class="record.is_active ? 'chip--ok' : 'chip--ghost'">
              <span class="status-dot" /> {{ record.is_active ? "Active" : "Inactive" }}
            </span>
          </template>
          <template v-if="column.key === 'model'">
            <span class="tbl-muted">{{ modelLabel(record) }}</span>
          </template>
          <template v-if="column.key === 'created'">
            <span class="tbl-muted">{{ new Date(record.created_at).toLocaleDateString() }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <div class="row-actions">
              <button class="btn-outline btn-xs" @click="openEditModal(record)">Edit</button>
              <button
                class="btn-danger-sm"
                :disabled="record.is_system"
                @click="handleDelete(record.id)"
              >
                Delete
              </button>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <AgentFormModal
      :visible="isModalVisible"
      :agent="editingAgent"
      @close="closeModal"
      @submit="handleSubmit"
    />
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
  flex-wrap: wrap;
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
.page-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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
.btn-outline {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  font-size: 13px;
  cursor: pointer;
}
.btn-outline:hover {
  border-color: var(--brand);
  color: var(--brand);
}
.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}
.btn-xs {
  padding: 4px 10px;
  font-size: 12px;
}
.btn-danger-sm {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  font-size: 12px;
  background: transparent;
  color: var(--err);
  border: 1px solid var(--err-border);
  border-radius: var(--r-sm);
  cursor: pointer;
}
.btn-danger-sm:hover {
  background: var(--err-bg);
}
.btn-danger-sm:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.agent-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-1);
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 10px;
}
.agent-card__hd {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.agent-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--brand-tint);
  color: var(--brand-3);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.agent-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.agent-badges {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.agent-desc {
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
.agent-card__foot {
  display: flex;
  gap: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--line);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 500;
}
.chip--ok {
  background: var(--ok-bg);
  color: var(--ok);
  border: 1px solid var(--ok-border);
}
.chip--ghost {
  background: var(--bg-2);
  color: var(--ink-4);
  border: 1px solid var(--line);
}
.model-chip {
  font-family: "Geist Mono", monospace;
  font-size: 10.5px;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.agent-table-wrap {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
  box-shadow: var(--shadow-1);
}
.tbl-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
  display: flex;
  align-items: center;
}
.tbl-desc {
  font-size: 12px;
  color: var(--ink-4);
  margin-top: 2px;
}
.tbl-muted {
  font-size: 12.5px;
  color: var(--ink-4);
  font-family: "Geist Mono", monospace;
}
.row-actions {
  display: flex;
  gap: 6px;
}
:deep(.ant-table-thead > tr > th) {
  background: var(--bg-2);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--line);
}
:deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid var(--line);
  padding: 11px 16px;
}
:deep(.ant-table-tbody > tr:hover > td) {
  background: var(--bg) !important;
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
