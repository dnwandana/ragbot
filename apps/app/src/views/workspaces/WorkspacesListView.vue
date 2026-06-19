<template>
  <div class="page">
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
        <a-input
          v-model:value="query"
          class="search-input"
          aria-label="Search workspaces"
          placeholder="Search workspaces…"
          :bordered="false"
          autocomplete="off"
        />
      </div>
      <span class="toolbar-count"
        >{{ displayedWorkspaces.length }} workspace{{
          displayedWorkspaces.length === 1 ? "" : "s"
        }}</span
      >
      <div style="flex: 1" />
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
              :key="opt.key"
              :class="{ 'sort-item--active': opt.key === sortKey }"
              @click="selectSort(opt)"
            >
              <Check v-if="opt.key === sortKey" :size="12" :stroke-width="2.2" />
              <span v-else style="width: 12px; display: inline-block" />
              {{ opt.label }}
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
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
    <div v-else :class="{ 'is-fetching': loading }">
      <a-table
        :columns="columns"
        :data-source="displayedWorkspaces"
        :row-key="(record) => record.id"
        :pagination="false"
        :custom-row="customRow"
      >
        <template #bodyCell="{ column, record }">
          <!-- Name + description -->
          <template v-if="column.key === 'name'">
            <div class="tbl-name">{{ record.name }}</div>
            <div class="tbl-desc" :class="{ 'tbl-desc--empty': !record.description }">
              {{ record.description || "No description" }}
            </div>
          </template>

          <!-- Role badge -->
          <template v-else-if="column.key === 'role'">
            <span class="badge" :class="isOwner(record) ? 'badge--accent' : 'badge--gray'">
              {{ roleLabel(record) }}
            </span>
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
                  <a-menu-item key="settings" @click="goSettings(record)">
                    <Settings :size="14" :stroke-width="1.6" class="row-menu-icon" />
                    Settings
                  </a-menu-item>
                  <a-menu-item
                    v-if="isOwner(record)"
                    key="delete"
                    class="row-menu__item--danger"
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
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import {
  Check,
  ChevronDown,
  Ellipsis,
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
} = useWorkspaces()

const { relativeTime } = useFormattedTime()

const deleteTarget = ref(null)

/**
 * Column definitions for the a-table.
 * The actions column has no title — it holds the kebab menu trigger.
 */
const columns = [
  { title: "Name", key: "name" },
  { title: "Your role", key: "role" },
  { title: "Updated", key: "updated" },
  { title: "", key: "actions" },
]

const currentSortLabel = computed(
  () => SORT_OPTIONS.find((o) => o.key === sortKey.value)?.label ?? "Sort",
)

/**
 * Build Ant Design customRow attributes for a row, attaching click and
 * keyboard handlers so rows are navigable (Enter / Space) and focusable.
 * @param {object} record - Workspace row object
 * @returns {object} Attribute/event object spread onto the <tr>
 */
function customRow(record) {
  return {
    tabindex: 0,
    onClick: () => openRow(record),
    onKeydown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        openRow(record)
      }
    },
  }
}

/** @param {{ key: string, label: string }} option */
function selectSort(option) {
  sortKey.value = option.key
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
  router.push(`/workspaces/${ws.id}/settings`)
}

/** @param {object} ws */
function openDelete(ws) {
  deleteTarget.value = ws
}

/** @returns {Promise<void>} */
async function confirmDelete() {
  await handleDelete(deleteTarget.value.id)
  deleteTarget.value = null
}
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

/* Table: design-system overrides for a-table */
:deep(.ant-table) {
  background: var(--surface);
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
:deep(.ant-table-tbody > tr:focus-visible > td) {
  outline: none;
  background: var(--bg-2);
  box-shadow: inset 0 0 0 2px var(--brand-tint);
}
:deep(.ant-table-tbody > tr) {
  outline: none;
  transition: background var(--dur) var(--ease);
}
:deep(.ant-table-tbody > tr:last-child > td:first-child) {
  border-radius: 0 0 0 var(--r-lg);
}
:deep(.ant-table-tbody > tr:last-child > td:last-child) {
  border-radius: 0 0 var(--r-lg) 0;
}
/* Last column (actions) — narrow fixed width, no padding on right */
:deep(.ant-table-thead > tr > th:last-child),
:deep(.ant-table-tbody > tr > td:last-child) {
  width: 44px;
  padding-right: 12px;
}

/* Workspace name / description cell */
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
