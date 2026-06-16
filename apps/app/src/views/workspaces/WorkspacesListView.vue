<template>
  <div class="page" @click="closeMenus">
    <!-- Page head -->
    <div class="page-head">
      <div>
        <div class="page-title">Workspaces</div>
        <div class="page-sub">Select a workspace to manage its datasets, agents, and members.</div>
      </div>
      <button class="btn-primary" @click="openCreateModal">
        <Plus :size="11" :stroke-width="2.2" />
        New workspace
      </button>
    </div>

    <!-- Toolbar: search + count + sort -->
    <div class="toolbar" @click.stop>
      <div class="search-wrap" :class="{ 'search-wrap--active': query }">
        <Search :size="13" :stroke-width="1.8" style="flex-shrink: 0; color: var(--ink-4)" />
        <input
          v-model="query"
          class="search-input"
          aria-label="Search workspaces"
          placeholder="Search workspaces…"
          type="search"
          autocomplete="off"
        />
      </div>
      <span class="toolbar-count"
        >{{ displayedWorkspaces.length }} workspace{{
          displayedWorkspaces.length === 1 ? "" : "s"
        }}</span
      >
      <div style="flex: 1" />
      <div class="sort-wrap" @click.stop>
        <button class="sort-btn" @click="sortMenuOpen = !sortMenuOpen">
          <SlidersHorizontal :size="12" :stroke-width="1.8" />
          {{ currentSortLabel }}
          <ChevronDown :size="10" :stroke-width="2" />
        </button>
        <div v-if="sortMenuOpen" class="sort-menu">
          <button
            v-for="opt in SORT_OPTIONS"
            :key="opt.key"
            class="sort-item"
            :class="{ 'sort-item--active': opt.key === sortKey }"
            @click="selectSort(opt)"
          >
            <Check v-if="opt.key === sortKey" :size="12" :stroke-width="2.2" />
            <span v-else style="width: 12px; display: inline-block" />
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <a-skeleton v-if="loading && !displayedWorkspaces.length" active :paragraph="{ rows: 4 }" />

    <!-- Empty: no workspaces and no active search -->
    <div v-else-if="!displayedWorkspaces.length && !query" class="empty-wrap">
      <div class="empty">
        <div class="empty-icon"><span aria-hidden="true">🏢</span></div>
        <h2 class="empty-title">No workspaces yet</h2>
        <p class="empty-body">
          Create your first workspace to start organising your knowledge bases and agents.
        </p>
        <button class="btn-primary btn-lg" @click="openCreateModal">
          <Plus :size="13" :stroke-width="2.2" />
          Create your first workspace
        </button>
      </div>
    </div>

    <!-- Empty search -->
    <div v-else-if="!displayedWorkspaces.length && query" class="search-empty">
      <Search :size="22" :stroke-width="1.6" style="margin-bottom: 10px; color: var(--ink-4)" />
      <div class="search-empty-title">No workspaces match "{{ query }}"</div>
      <button class="search-empty-clear" @click="query = ''">Clear search</button>
    </div>

    <!-- Table -->
    <div v-else class="ws-table" :class="{ 'is-fetching': loading }" role="table">
      <div class="tbl-head tbl-cols">
        <div>Name</div>
        <div>Your role</div>
        <div>Updated</div>
        <div></div>
      </div>
      <div
        v-for="ws in displayedWorkspaces"
        :key="ws.id"
        class="tbl-row tbl-cols"
        role="row"
        tabindex="0"
        @click="openRow(ws)"
        @keydown.enter.prevent="openRow(ws)"
        @keydown.space.prevent="openRow(ws)"
      >
        <div>
          <div class="tbl-name">{{ ws.name }}</div>
          <div class="tbl-desc" :class="{ 'tbl-desc--empty': !ws.description }">
            {{ ws.description || "No description" }}
          </div>
        </div>
        <div>
          <span class="badge" :class="isOwner(ws) ? 'badge--accent' : 'badge--gray'">
            {{ roleLabel(ws) }}
          </span>
        </div>
        <div class="tbl-muted">{{ relativeTime(ws.updated_at) }}</div>
        <div @click.stop @keydown.stop>
          <div class="menu-wrap">
            <button
              class="menu-btn"
              @click="menuOpenId = menuOpenId === ws.id ? null : ws.id"
              aria-label="More options"
            >
              ···
            </button>
            <div v-if="menuOpenId === ws.id" class="menu-popup">
              <button class="menu-item" @click="goSettings(ws)">
                <Settings :size="13" :stroke-width="1.6" />
                Settings
              </button>
              <button
                v-if="isOwner(ws)"
                class="menu-item menu-item--danger"
                @click="openDelete(ws)"
              >
                <Trash2 :size="13" :stroke-width="1.6" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit modal -->
    <WorkspaceFormModal
      :visible="isModalVisible"
      :workspace="editingWorkspace"
      @close="closeModal"
      @submit="handleSubmit"
    />

    <!-- Delete confirm modal -->
    <a-modal
      :open="!!deleteTarget"
      title="Delete workspace?"
      ok-text="Delete"
      ok-type="danger"
      cancel-text="Cancel"
      @ok="confirmDelete"
      @cancel="deleteTarget = null"
    >
      <p style="margin: 8px 0">
        Everything in <strong>{{ deleteTarget?.name }}</strong> — datasets, agents, and
        conversations — will be removed.
      </p>
    </a-modal>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from "vue"
import { useRouter } from "vue-router"
import {
  Check,
  ChevronDown,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
} from "lucide-vue-next"
import WorkspaceFormModal from "@/components/WorkspaceFormModal.vue"
import { useWorkspaces } from "@/composables/useWorkspaces.js"
import { useFormattedTime } from "@/composables/useFormattedTime"

const router = useRouter()
const {
  displayedWorkspaces,
  loading,
  query,
  sortKey,
  SORT_OPTIONS,
  isModalVisible,
  editingWorkspace,
  openCreateModal,
  closeModal,
  handleSubmit,
  handleDelete,
  fetchWorkspaces,
} = useWorkspaces()

const { relativeTime } = useFormattedTime()

const menuOpenId = ref(null)
const sortMenuOpen = ref(false)
const deleteTarget = ref(null)

const currentSortLabel = computed(
  () => SORT_OPTIONS.find((o) => o.key === sortKey.value)?.label ?? "Sort",
)

/** @returns {void} */
function closeMenus() {
  menuOpenId.value = null
  sortMenuOpen.value = false
}

/** @param {{ key: string, label: string }} option */
function selectSort(option) {
  sortKey.value = option.key
  sortMenuOpen.value = false
}

/**
 * @param {object} ws
 * @returns {boolean}
 */
function isOwner(ws) {
  return (ws.role_name ?? "").toLowerCase() === "owner"
}

/**
 * @param {object} ws
 * @returns {string}
 */
function roleLabel(ws) {
  const r = ws.role_name ?? ""
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : "—"
}

/** @param {object} ws */
function openRow(ws) {
  router.push(`/workspaces/${ws.id}/datasets`)
}

/** @param {object} ws */
function goSettings(ws) {
  menuOpenId.value = null
  router.push(`/workspaces/${ws.id}/settings`)
}

/** @param {object} ws */
function openDelete(ws) {
  menuOpenId.value = null
  deleteTarget.value = ws
}

/** @returns {Promise<void>} */
async function confirmDelete() {
  await handleDelete(deleteTarget.value.id)
  deleteTarget.value = null
}

onMounted(fetchWorkspaces)
</script>

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

/* Table */
.ws-table {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
}
.tbl-cols {
  display: grid;
  grid-template-columns: 1fr 130px 140px 44px;
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
.tbl-row:focus-visible {
  outline: none;
  background: var(--bg-2);
  box-shadow: inset 0 0 0 2px var(--brand-tint);
}
.tbl-row:last-child {
  border-radius: 0 0 var(--r-lg) var(--r-lg);
}
.tbl-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
}
.tbl-desc {
  font-size: 12px;
  color: var(--ink-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tbl-desc--empty {
  font-style: italic;
  opacity: 0.7;
}
.tbl-muted {
  font-size: 12.5px;
  color: var(--ink-4);
}

/* Badge */
.badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 20px;
}
.badge--accent {
  background: var(--color-accent-light);
  color: var(--brand);
  border: 1px solid var(--color-accent-border);
}
.badge--gray {
  background: #f3f4f6;
  color: var(--color-text-secondary);
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

/* States */
.is-fetching {
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 150ms var(--ease);
}
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
.empty-icon {
  font-size: 40px;
  margin-bottom: 14px;
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
</style>
