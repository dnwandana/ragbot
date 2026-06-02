<script setup>
import { ref } from "vue"
import { useRoute } from "vue-router"
import AgentFormDrawer from "@/components/agents/AgentFormDrawer.vue"
import { useAgents } from "@/composables/useAgents"
import { usePaginationUI } from "@/composables/usePaginationUI"
import { relativeTime } from "@/utils/time"

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

const menuOpenId = ref(null)
const deleteTarget = ref(null)
const sortMenuOpen = ref(false)

/** @returns {void} */
function closeMenus() {
  menuOpenId.value = null
  sortMenuOpen.value = false
}

/** @param {{ label: string, sortBy: string, sortOrder: string }} option */
function selectSort(option) {
  sortBy.value = option.sortBy
  sortOrder.value = option.sortOrder
  sortMenuOpen.value = false
}

/** @param {object} agent @returns {string} */
function modelLabel(agent) {
  return agent.model_config?.model?.split("/").pop() || "default"
}

/** @param {string} dateStr @returns {string} */
function shortDate(dateStr) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** @param {object} agent */
function openDelete(agent) {
  menuOpenId.value = null
  deleteTarget.value = agent
}

/** @param {object} agent */
function handleEditClick(agent) {
  openEdit(agent)
  menuOpenId.value = null
}

/** @param {object} agent */
async function handleSetDefaultClick(agent) {
  menuOpenId.value = null
  await handleSetDefault(agent.id)
}

/** @returns {Promise<void>} */
async function confirmDelete() {
  await handleDelete(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>

<template>
  <div class="page" @click="closeMenus">
    <!-- Page head -->
    <div class="page-head">
      <div>
        <div class="page-title">Agents</div>
        <div class="page-sub">AI assistants powered by your datasets.</div>
      </div>
      <button class="btn-primary" @click="openCreate">
        <svg
          width="11"
          height="11"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
        >
          <path d="M8 3v10M3 8h10" />
        </svg>
        New agent
      </button>
    </div>

    <!-- Toolbar: search + count + sort + view toggle -->
    <div class="toolbar" @click.stop>
      <div class="search-wrap" :class="{ 'search-wrap--active': query }">
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          style="flex-shrink: 0; color: var(--ink-4)"
        >
          <circle cx="6.5" cy="6.5" r="4.5" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" />
        </svg>
        <input
          v-model="query"
          class="search-input"
          placeholder="Search agents…"
          type="search"
          autocomplete="off"
        />
        <span v-if="loading && agents.length" class="search-spin" />
      </div>
      <span class="toolbar-count">{{ totalCount }} agent{{ totalCount === 1 ? "" : "s" }}</span>
      <div style="flex: 1" />
      <!-- Sort dropdown -->
      <div class="sort-wrap" @click.stop>
        <button class="sort-btn" @click="sortMenuOpen = !sortMenuOpen">
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          >
            <line x1="2" y1="5" x2="14" y2="5" />
            <line x1="4" y1="9" x2="12" y2="9" />
            <line x1="6" y1="13" x2="10" y2="13" />
          </svg>
          {{ currentSortLabel }}
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <polyline points="4 6 8 10 12 6" />
          </svg>
        </button>
        <div v-if="sortMenuOpen" class="sort-menu">
          <button
            v-for="opt in SORT_OPTIONS"
            :key="opt.label"
            class="sort-item"
            :class="{ 'sort-item--active': opt.sortBy === sortBy && opt.sortOrder === sortOrder }"
            @click="selectSort(opt)"
          >
            <svg
              v-if="opt.sortBy === sortBy && opt.sortOrder === sortOrder"
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
            >
              <polyline points="2 8 6 12 14 4" />
            </svg>
            <span v-else style="width: 12px; display: inline-block" />
            {{ opt.label }}
          </button>
        </div>
      </div>
      <!-- View toggle -->
      <div class="view-toggle">
        <button
          class="view-btn"
          :class="{ active: viewMode === 'cards' }"
          @click="viewMode = 'cards'"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <rect x="2" y="2" width="5" height="5" rx="1" />
            <rect x="9" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="9" width="5" height="5" rx="1" />
            <rect x="9" y="9" width="5" height="5" rx="1" />
          </svg>
          Cards
        </button>
        <button
          class="view-btn"
          :class="{ active: viewMode === 'table' }"
          @click="viewMode = 'table'"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <line x1="2" y1="4" x2="14" y2="4" />
            <line x1="2" y1="8" x2="14" y2="8" />
            <line x1="2" y1="12" x2="14" y2="12" />
          </svg>
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
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Create your first agent
        </button>
      </div>
    </div>

    <!-- Empty search: no results for current query -->
    <div v-else-if="!loading && !agents.length && query" class="search-empty">
      <svg
        width="22"
        height="22"
        viewBox="0 0 16 16"
        fill="none"
        stroke="var(--ink-4)"
        stroke-width="1.6"
        stroke-linecap="round"
        style="margin-bottom: 10px"
      >
        <circle cx="6.5" cy="6.5" r="4.5" />
        <line x1="10.5" y1="10.5" x2="14" y2="14" />
      </svg>
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
          <div class="menu-wrap" @click.stop>
            <button
              class="menu-btn"
              @click="menuOpenId = menuOpenId === agent.id ? null : agent.id"
              aria-label="More options"
            >
              ···
            </button>
            <div v-if="menuOpenId === agent.id" class="menu-popup">
              <button
                v-if="!agent.is_default"
                class="menu-item menu-item--star"
                @click="handleSetDefaultClick(agent)"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polygon points="8 2 10 6 14 6.5 11 9.5 11.8 14 8 12 4.2 14 5 9.5 2 6.5 6 6" />
                </svg>
                Set as default
              </button>
              <button class="menu-item" @click="handleEditClick(agent)">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                >
                  <path d="M11 2l3 3-8 8H3v-3z" />
                </svg>
                Edit
              </button>
              <button
                class="menu-item menu-item--danger"
                :disabled="agent.is_system"
                @click="openDelete(agent)"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                >
                  <path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9" />
                </svg>
                Delete
              </button>
            </div>
          </div>
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
    <div v-else class="agent-table" :class="{ 'is-fetching': loading }">
      <div class="tbl-head tbl-cols">
        <div>Name</div>
        <div>Model</div>
        <div>Created</div>
        <div>Updated</div>
        <div></div>
      </div>
      <div
        v-for="agent in agents"
        :key="agent.id"
        class="tbl-row tbl-cols"
        :class="{ 'tbl-row--active': drawerAgent?.id === agent.id && isDrawerOpen }"
        @click="openEdit(agent)"
      >
        <div>
          <div class="tbl-name">
            {{ agent.name }}
            <span v-if="agent.is_default" class="chip chip--default" style="margin-left: 6px"
              >Default</span
            >
            <span v-else-if="agent.is_system" class="chip chip--sys" style="margin-left: 6px"
              >System</span
            >
          </div>
          <div v-if="agent.description" class="tbl-desc">{{ agent.description }}</div>
        </div>
        <div class="tbl-mono">{{ agent.is_system ? "—" : modelLabel(agent) }}</div>
        <div class="tbl-muted">{{ shortDate(agent.created_at) }}</div>
        <div class="tbl-muted">{{ relativeTime(agent.updated_at) }}</div>
        <div @click.stop>
          <div class="menu-wrap">
            <button
              class="menu-btn"
              @click="menuOpenId = menuOpenId === agent.id ? null : agent.id"
              aria-label="More options"
            >
              ···
            </button>
            <div v-if="menuOpenId === agent.id" class="menu-popup">
              <button
                v-if="!agent.is_default"
                class="menu-item menu-item--star"
                @click="handleSetDefaultClick(agent)"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polygon points="8 2 10 6 14 6.5 11 9.5 11.8 14 8 12 4.2 14 5 9.5 2 6.5 6 6" />
                </svg>
                Set as default
              </button>
              <button class="menu-item" @click="handleEditClick(agent)">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                >
                  <path d="M11 2l3 3-8 8H3v-3z" />
                </svg>
                Edit
              </button>
              <button
                class="menu-item menu-item--danger"
                :disabled="agent.is_system"
                @click="openDelete(agent)"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                >
                  <path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
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

/* Table */
.agent-table {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
}

.tbl-cols {
  display: grid;
  grid-template-columns: 1fr 160px 110px 120px 40px;
  gap: 12px;
  align-items: center;
}

.tbl-head {
  padding: 10px 18px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  border-radius: var(--r-lg) var(--r-lg) 0 0;
}

.tbl-row {
  padding: 11px 18px;
  border-top: 1px solid var(--line);
  cursor: pointer;
}

.tbl-row:hover {
  background: var(--bg);
}

.tbl-row:last-child {
  border-radius: 0 0 var(--r-lg) var(--r-lg);
}

.tbl-row--active {
  background: var(--brand-tint);
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

/* Menu */
.menu-wrap {
  position: relative;
}

.menu-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--r-sm);
  color: var(--ink-4);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
}

.menu-btn:hover {
  background: var(--bg-2);
  color: var(--ink);
}

.menu-popup {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r);
  box-shadow: var(--shadow-2);
  min-width: 130px;
  padding: 4px;
  z-index: 20;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: var(--r-sm);
  font-size: 13px;
  color: var(--ink-2);
  cursor: pointer;
  text-align: left;
}

.menu-item:hover {
  background: var(--bg-2);
}

.menu-item--danger {
  color: var(--err);
}

.menu-item--danger:hover {
  background: var(--err-bg);
}

.menu-item:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.menu-item:disabled:hover {
  background: transparent;
}

.menu-item--star {
  color: var(--brand);
}

.menu-item--star:hover {
  background: var(--brand-tint);
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

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  color: var(--ink);
  min-width: 0;
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

.sort-wrap {
  position: relative;
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
.sort-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r);
  box-shadow: var(--shadow-2);
  min-width: 180px;
  padding: 4px;
  z-index: 30;
}
.sort-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: var(--r-sm);
  font-size: 13px;
  color: var(--ink-2);
  cursor: pointer;
  text-align: left;
}
.sort-item:hover {
  background: var(--bg-2);
}
.sort-item--active {
  font-weight: 500;
  color: var(--ink);
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
