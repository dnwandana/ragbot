<script setup>
import { ref } from "vue"
import { useRoute } from "vue-router"
import {
  Check,
  ChevronDown,
  Ellipsis,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
} from "lucide-vue-next"
import AgentFormDrawer from "@/components/agents/AgentFormDrawer.vue"
import { useAgents } from "@/composables/useAgents"
import { usePaginationUI } from "@/composables/usePaginationUI"
import { relativeTime } from "@/utils/time"
import { useFormattedTime } from "@/composables/useFormattedTime"

const route = useRoute()
const workspaceId = route.params.workspaceId

const {
  agents,
  loading,
  pagination,
  viewMode,
  query,
  sortBy,
  sortOrder,
  page,
  setPage,
  isDrawerOpen,
  drawerAgent,
  openCreate,
  openEdit,
  closeDrawer,
  handleSubmit,
  handleDelete,
  handleSetDefault,
} = useAgents(workspaceId)

const { SORT_OPTIONS, currentSortLabel, totalCount, paginationInfo, pageNumbers, showPagination } =
  usePaginationUI({ pagination, page, sortBy, sortOrder })

const { shortDate } = useFormattedTime()

const deleteTarget = ref(null)

/**
 * Column definitions for the a-table (table mode only).
 * The actions column has no title — it holds the kebab menu trigger.
 */
const columns = [
  { title: "Name", key: "name" },
  { title: "Model", key: "model" },
  { title: "Created", key: "created" },
  { title: "Updated", key: "updated" },
  { title: "", key: "actions" },
]

/**
 * Build Ant Design customRow attributes for an agent row, attaching click and
 * keyboard handlers so rows open the edit drawer and are focusable.
 * @param {object} record - Agent row object
 * @returns {object} Attribute/event object spread onto the <tr>
 */
function customRow(record) {
  return {
    tabindex: 0,
    onClick: () => openEdit(record),
    onKeydown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        openEdit(record)
      }
    },
  }
}

/** @param {{ label: string, sortBy: string, sortOrder: string }} option */
function selectSort(option) {
  sortBy.value = option.sortBy
  sortOrder.value = option.sortOrder
}

/** @param {object} agent @returns {string} */
function modelLabel(agent) {
  return agent.model_config?.model?.split("/").pop() || "default"
}

/** @param {object} agent */
function openDelete(agent) {
  deleteTarget.value = agent
}

/** @param {object} agent */
function handleEditClick(agent) {
  openEdit(agent)
}

/** @param {object} agent */
async function handleSetDefaultClick(agent) {
  await handleSetDefault(agent.id)
}

/** @returns {Promise<void>} */
async function confirmDelete() {
  await handleDelete(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>

<template>
  <div class="page">
    <!-- Page head -->
    <div class="page-head">
      <div>
        <div class="page-title">Agents</div>
        <div class="page-sub">AI assistants powered by your datasets.</div>
      </div>
      <button class="btn-primary" @click="openCreate">
        <Plus :size="11" :stroke-width="2.2" />
        New agent
      </button>
    </div>

    <!-- Toolbar: search + count + sort + view toggle -->
    <div class="toolbar" @click.stop>
      <div class="search-wrap" :class="{ 'search-wrap--active': query }">
        <Search :size="13" :stroke-width="1.8" style="flex-shrink: 0; color: var(--ink-4)" />
        <a-input
          v-model:value="query"
          class="search-input"
          aria-label="Search agents"
          placeholder="Search agents…"
          :bordered="false"
          autocomplete="off"
        />
        <span v-if="loading && agents.length" class="search-spin" />
      </div>
      <span class="toolbar-count">{{ totalCount }} agent{{ totalCount === 1 ? "" : "s" }}</span>
      <div style="flex: 1" />
      <!-- Sort dropdown -->
      <a-dropdown
        :trigger="['click']"
        :overlay-class-name="'sort-menu-overlay'"
        placement="bottomRight"
      >
        <button class="sort-btn">
          <SlidersHorizontal :size="12" :stroke-width="1.8" />
          {{ currentSortLabel }}
          <ChevronDown :size="10" :stroke-width="2" />
        </button>
        <template #overlay>
          <a-menu>
            <a-menu-item
              v-for="opt in SORT_OPTIONS"
              :key="opt.label"
              :class="{ 'sort-item--active': opt.sortBy === sortBy && opt.sortOrder === sortOrder }"
              @click="selectSort(opt)"
            >
              <Check
                v-if="opt.sortBy === sortBy && opt.sortOrder === sortOrder"
                :size="12"
                :stroke-width="2.2"
              />
              <span v-else style="width: 12px; display: inline-block" />
              {{ opt.label }}
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <!-- View toggle -->
      <div class="view-toggle">
        <button
          class="view-btn"
          :class="{ active: viewMode === 'cards' }"
          @click="viewMode = 'cards'"
        >
          <LayoutGrid :size="12" :stroke-width="1.8" />
          Cards
        </button>
        <button
          class="view-btn"
          :class="{ active: viewMode === 'table' }"
          @click="viewMode = 'table'"
        >
          <List :size="12" :stroke-width="1.8" />
          Table
        </button>
      </div>
    </div>

    <!-- Skeleton: initial load only -->
    <div v-if="loading && !agents.length" class="agent-grid">
      <div v-for="n in 6" :key="n" class="agent-card agent-card--skel">
        <div class="skel" style="height: 12px; width: 55%; margin-bottom: 8px" />
        <div class="skel" style="height: 8px; width: 25%; margin-bottom: 14px" />
        <div class="skel" style="height: 9px; width: 90%; margin-bottom: 5px" />
        <div class="skel" style="height: 9px; width: 70%; margin-bottom: 14px" />
        <div
          style="
            display: flex;
            justify-content: space-between;
            padding-top: 8px;
            border-top: 1px solid var(--line);
          "
        >
          <div class="skel" style="height: 8px; width: 60px" />
          <div class="skel" style="height: 8px; width: 50px" />
        </div>
      </div>
    </div>

    <!-- Empty: no agents exist yet and no active search -->
    <div v-else-if="!loading && !agents.length && !query" class="empty-wrap">
      <div class="empty">
        <svg
          viewBox="0 0 240 160"
          width="200"
          height="133"
          fill="none"
          stroke="var(--ink-3)"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="margin-bottom: 20px"
        >
          <rect x="40" y="50" width="50" height="58" rx="16" />
          <circle cx="55" cy="71" r="4.5" fill="var(--ink-3)" stroke="none" />
          <circle cx="75" cy="71" r="4.5" fill="var(--ink-3)" stroke="none" />
          <path d="M52 86c0-5.5 3.5-8.5 13-8.5s13 3 13 8.5" />
          <path d="M65 50v-8M57 52l-4-7M73 52l4-7" />
          <rect
            x="145"
            y="50"
            width="50"
            height="58"
            rx="16"
            stroke="var(--brand)"
            stroke-width="2"
          />
          <rect
            x="145"
            y="50"
            width="50"
            height="58"
            rx="16"
            fill="var(--brand-tint)"
            fill-opacity="0.4"
            stroke="none"
          />
          <circle cx="160" cy="71" r="4.5" fill="var(--brand)" stroke="none" />
          <circle cx="180" cy="71" r="4.5" fill="var(--brand)" stroke="none" />
          <path
            d="M157 86c0-5.5 3.5-8.5 13-8.5s13 3 13 8.5"
            stroke="var(--brand)"
            stroke-width="2"
          />
          <path d="M170 50v-8M162 52l-4-7M178 52l4-7" stroke="var(--brand)" stroke-width="2" />
          <line x1="20" y1="128" x2="220" y2="128" stroke="var(--line)" />
        </svg>
        <h2 class="empty-title">No agents yet</h2>
        <p class="empty-body">
          Create an agent with a custom system prompt and model to power your conversations.
        </p>
        <button class="btn-primary btn-lg" @click="openCreate">
          <Plus :size="13" :stroke-width="2.2" />
          Create your first agent
        </button>
      </div>
    </div>

    <!-- Empty search: no results for current query -->
    <div v-else-if="!loading && !agents.length && query" class="search-empty">
      <Search :size="22" :stroke-width="1.6" style="margin-bottom: 10px; color: var(--ink-4)" />
      <div class="search-empty-title">No agents match "{{ query }}"</div>
      <div class="search-empty-sub">Try a different name or description.</div>
      <button class="search-empty-clear" @click="query = ''">Clear search</button>
    </div>

    <!-- Cards view -->
    <div v-else-if="viewMode === 'cards'" class="agent-grid" :class="{ 'is-fetching': loading }">
      <div
        v-for="agent in agents"
        :key="agent.id"
        class="agent-card"
        :class="{
          'agent-card--active': drawerAgent?.id === agent.id && isDrawerOpen,
          'agent-card--default': agent.is_default,
        }"
        @click="openEdit(agent)"
      >
        <div class="card-top">
          <div class="card-name-row">
            <span class="card-name">{{ agent.name }}</span>
            <span v-if="agent.is_default" class="chip chip--default">Default</span>
            <span v-if="agent.is_system" class="chip chip--sys">System</span>
            <span v-else-if="!agent.is_default" class="chip chip--ghost">{{
              modelLabel(agent)
            }}</span>
          </div>
          <a-dropdown
            :trigger="['click']"
            :overlay-class-name="'row-actions-overlay'"
            placement="bottomRight"
            @click.stop
          >
            <button class="kebab-btn" aria-label="More options" aria-haspopup="menu">
              <Ellipsis :size="16" :stroke-width="1.7" />
            </button>
            <template #overlay>
              <a-menu>
                <a-menu-item
                  v-if="!agent.is_default"
                  key="set-default"
                  class="row-menu__item--star"
                  @click="handleSetDefaultClick(agent)"
                >
                  <Star :size="14" :stroke-width="1.6" class="row-menu-icon" />
                  Set as default
                </a-menu-item>
                <a-menu-item key="edit" @click="handleEditClick(agent)">
                  <Pencil :size="14" :stroke-width="1.6" class="row-menu-icon" />
                  Edit
                </a-menu-item>
                <a-menu-item
                  key="delete"
                  class="row-menu__item--danger"
                  :disabled="agent.is_system"
                  @click="openDelete(agent)"
                >
                  <Trash2 :size="14" :stroke-width="1.6" class="row-menu-icon" />
                  Delete
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
        <p class="card-desc" :class="{ 'card-desc--prompt': !agent.description }">
          {{
            agent.description ||
            (agent.system_prompt || "").slice(0, 120) +
              ((agent.system_prompt || "").length > 120 ? "…" : "")
          }}
        </p>
        <div class="card-foot">
          <span class="foot-text">Created {{ shortDate(agent.created_at) }}</span>
          <span class="foot-text">Updated {{ relativeTime(agent.updated_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Table view -->
    <div v-else :class="{ 'is-fetching': loading }">
      <a-table
        :columns="columns"
        :data-source="agents"
        :row-key="(record) => record.id"
        :pagination="false"
        :custom-row="customRow"
        :row-class-name="
          (record) => (drawerAgent?.id === record.id && isDrawerOpen ? 'tbl-row--active' : '')
        "
      >
        <template #bodyCell="{ column, record }">
          <!-- Name + chips + description -->
          <template v-if="column.key === 'name'">
            <div class="tbl-name">
              {{ record.name }}
              <span v-if="record.is_default" class="chip chip--default" style="margin-left: 6px"
                >Default</span
              >
              <span v-else-if="record.is_system" class="chip chip--sys" style="margin-left: 6px"
                >System</span
              >
            </div>
            <div v-if="record.description" class="tbl-desc">{{ record.description }}</div>
          </template>

          <!-- Model label -->
          <template v-else-if="column.key === 'model'">
            <span class="tbl-mono">{{ record.is_system ? "—" : modelLabel(record) }}</span>
          </template>

          <!-- Created date -->
          <template v-else-if="column.key === 'created'">
            <span class="tbl-muted">{{ shortDate(record.created_at) }}</span>
          </template>

          <!-- Updated time -->
          <template v-else-if="column.key === 'updated'">
            <span class="tbl-muted">{{ relativeTime(record.updated_at) }}</span>
          </template>

          <!-- Actions: kebab menu -->
          <template v-else-if="column.key === 'actions'">
            <a-dropdown
              :trigger="['click']"
              :overlay-class-name="'row-actions-overlay'"
              placement="bottomRight"
              @click.stop
            >
              <button class="kebab-btn" aria-label="More options" aria-haspopup="menu">
                <Ellipsis :size="16" :stroke-width="1.7" />
              </button>
              <template #overlay>
                <a-menu>
                  <a-menu-item
                    v-if="!record.is_default"
                    key="set-default"
                    class="row-menu__item--star"
                    @click="handleSetDefaultClick(record)"
                  >
                    <Star :size="14" :stroke-width="1.6" class="row-menu-icon" />
                    Set as default
                  </a-menu-item>
                  <a-menu-item key="edit" @click="handleEditClick(record)">
                    <Pencil :size="14" :stroke-width="1.6" class="row-menu-icon" />
                    Edit
                  </a-menu-item>
                  <a-menu-item
                    key="delete"
                    class="row-menu__item--danger"
                    :disabled="record.is_system"
                    @click="openDelete(record)"
                  >
                    <Trash2 :size="14" :stroke-width="1.6" class="row-menu-icon" />
                    Delete
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Pagination -->
    <div v-if="showPagination" class="pagination-row">
      <span class="pg-info">{{ paginationInfo }}</span>
      <div class="pg-controls">
        <button class="pg-btn" :disabled="page === 1" @click="setPage(page - 1)">← Prev</button>
        <template v-for="(p, i) in pageNumbers" :key="i">
          <span v-if="p === '…'" class="pg-sep">…</span>
          <button
            v-else
            class="pg-btn"
            :class="{ 'pg-btn--active': p === page }"
            @click="setPage(p)"
          >
            {{ p }}
          </button>
        </template>
        <button
          class="pg-btn"
          :disabled="page === pagination?.total_pages"
          @click="setPage(page + 1)"
        >
          Next →
        </button>
      </div>
    </div>

    <!-- Agent form drawer -->
    <AgentFormDrawer
      :open="isDrawerOpen"
      :agent="drawerAgent"
      :workspace-id="workspaceId"
      @close="closeDrawer"
      @submit="handleSubmit"
    />

    <!-- Delete confirm modal -->
    <a-modal
      :open="!!deleteTarget"
      title="Delete agent?"
      ok-text="Delete"
      ok-type="danger"
      cancel-text="Cancel"
      @ok="confirmDelete"
      @cancel="deleteTarget = null"
    >
      <p style="margin: 8px 0">
        <strong>{{ deleteTarget?.name }}</strong> and all its configuration will be permanently
        removed.
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
  margin-bottom: 14px;
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

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--brand-2);
}

.btn-lg {
  padding: 9px 16px;
  font-size: 13.5px;
}

.view-toggle {
  display: flex;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  overflow: hidden;
}

.view-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: none;
  background: transparent;
  color: var(--ink-3);
  font-size: 12px;
  cursor: pointer;
}

.view-btn.active {
  background: var(--bg-2);
  color: var(--ink);
}

/* Cards */
.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
  gap: 14px;
}

.agent-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  transition:
    box-shadow var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}

.agent-card:hover {
  box-shadow: var(--shadow-2);
  border-color: var(--line-2);
}

.agent-card--active {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-tint);
}

.agent-card--default {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-tint);
}

.agent-card--skel {
  cursor: default;
  pointer-events: none;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.card-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.card-desc {
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.card-desc--prompt {
  color: var(--ink-4);
  font-style: italic;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.foot-text {
  font-size: 11.5px;
  color: var(--ink-4);
}

/* Chips */
.chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.chip--default {
  background: var(--brand-tint);
  color: var(--brand);
  border: 1px solid var(--brand);
  font-size: 10.5px;
  font-weight: 600;
}

.chip--ghost {
  background: var(--bg-2);
  color: var(--ink-4);
  border: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 10.5px;
}

.chip--sys {
  background: var(--bg-2);
  color: var(--ink-4);
  border: 1px solid var(--line);
  font-size: 10.5px;
}

/* Table — a-table overrides */
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
  padding: 10px 18px;
}

:deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid var(--line);
  padding: 11px 18px;
  cursor: pointer;
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: var(--bg) !important;
}

:deep(.ant-table-tbody > tr.tbl-row--active > td) {
  background: var(--brand-tint) !important;
}

:deep(.ant-table-tbody > tr:last-child > td:first-child) {
  border-bottom-left-radius: var(--r-lg);
}

:deep(.ant-table-tbody > tr:last-child > td:last-child) {
  border-bottom-right-radius: var(--r-lg);
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
  margin-top: 1px;
}

.tbl-mono {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-2);
}

.tbl-muted {
  font-size: 12.5px;
  color: var(--ink-4);
}

/* Kebab trigger button */
.kebab-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--r-sm);
  color: var(--ink-4);
  cursor: pointer;
  padding: 0;
}

.kebab-btn:hover {
  background: var(--bg-2);
  color: var(--ink);
}

/* Skeleton */
@keyframes shimmer {
  0% {
    background-position: -400px 0;
  }
  100% {
    background-position: 400px 0;
  }
}

.skel {
  border-radius: 4px;
  background: linear-gradient(90deg, var(--bg-2) 25%, var(--surface) 50%, var(--bg-2) 75%);
  background-size: 400px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

/* Empty */
.empty-wrap {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
  margin: 0 0 8px;
}

.empty-body {
  font-size: 13.5px;
  color: var(--ink-3);
  max-width: 360px;
  margin: 0 0 20px;
  line-height: 1.55;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 180px;
  max-width: 300px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 5px 10px;
  background: var(--surface);
  transition: border-color var(--dur) var(--ease);
}
.search-wrap--active {
  border-color: var(--line-2);
}
.search-wrap:focus-within {
  border-color: var(--brand);
  outline: none;
}

/* a-input :bordered=false renders <input class="ant-input search-input">; combine
   classes to outrank Ant defaults so the .search-wrap owns the border/background. */
.search-input.ant-input,
.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0;
  box-shadow: none;
  background: transparent;
  font-size: 12.5px;
  color: var(--ink);
  min-width: 0;
}
.search-input.ant-input:focus,
.search-input.ant-input-focused {
  box-shadow: none;
}
.search-input::placeholder {
  color: var(--ink-4);
}
.search-input::-webkit-search-cancel-button {
  display: none;
}

@keyframes ds-spin {
  to {
    transform: rotate(360deg);
  }
}
.search-spin {
  width: 12px;
  height: 12px;
  border: 1.5px solid var(--line-2);
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: ds-spin 0.6s linear infinite;
  flex-shrink: 0;
}

.toolbar-count {
  font-size: 12px;
  color: var(--ink-4);
  white-space: nowrap;
}

.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  font-size: 12px;
  color: var(--ink-2);
  cursor: pointer;
  white-space: nowrap;
}
.sort-btn:hover {
  background: var(--bg-2);
}

/* Fetching state — dim grid/table during re-fetch */
.is-fetching {
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 150ms var(--ease);
}

/* Empty search state */
.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
}
.search-empty-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 4px;
}
.search-empty-sub {
  font-size: 12.5px;
  color: var(--ink-3);
}
.search-empty-clear {
  margin-top: 12px;
  border: none;
  background: transparent;
  color: var(--brand);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

/* Pagination */
.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0 4px;
  flex-wrap: wrap;
  gap: 8px;
}
.pg-info {
  font-size: 12px;
  color: var(--ink-4);
}
.pg-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
.pg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  font-size: 12px;
  color: var(--ink-2);
  cursor: pointer;
}
.pg-btn:hover:not(:disabled) {
  background: var(--bg-2);
}
.pg-btn--active {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
  font-weight: 600;
}
.pg-btn--active:hover {
  background: var(--brand-2);
  border-color: var(--brand-2);
}
.pg-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.pg-sep {
  font-size: 12px;
  color: var(--ink-4);
  padding: 0 2px;
  user-select: none;
}
</style>

<!-- Non-scoped: styles for the portaled overlay (under .row-actions-overlay class) -->
<style>
.row-actions-overlay .ant-dropdown-menu {
  min-width: 148px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r);
  box-shadow: var(--shadow-2);
  padding: 4px;
}
.row-actions-overlay .ant-dropdown-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-2);
  border-radius: var(--r-sm);
  padding: 7px 10px;
}
.row-actions-overlay .ant-dropdown-menu-item:hover {
  background: var(--bg-2);
}
.row-actions-overlay .ant-dropdown-menu-item.row-menu__item--danger {
  color: var(--err);
}
.row-actions-overlay .ant-dropdown-menu-item.row-menu__item--danger:hover {
  background: var(--err-bg);
}
.row-actions-overlay .ant-dropdown-menu-item.row-menu__item--star {
  color: var(--brand);
}
.row-actions-overlay .ant-dropdown-menu-item.row-menu__item--star:hover {
  background: var(--brand-tint);
}
.row-actions-overlay .ant-dropdown-menu-item-disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.row-actions-overlay .row-menu-icon {
  flex-shrink: 0;
  color: inherit;
}
.row-actions-overlay .ant-dropdown-menu-title-content {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

<!-- Non-scoped: styles for the portaled sort dropdown (under .sort-menu-overlay) -->
<style>
.sort-menu-overlay .ant-dropdown-menu {
  min-width: 180px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r);
  box-shadow: var(--shadow-2);
  padding: 4px;
}
.sort-menu-overlay .ant-dropdown-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-2);
  border-radius: var(--r-sm);
  padding: 7px 10px;
}
.sort-menu-overlay .ant-dropdown-menu-item:hover {
  background: var(--bg-2);
}
.sort-menu-overlay .ant-dropdown-menu-item.sort-item--active {
  font-weight: 500;
  color: var(--ink);
}
</style>
