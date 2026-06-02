<script setup>
import { ref, reactive, computed, watch, watchEffect, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { message } from "ant-design-vue"
import { useDatasetsStore } from "@/stores/datasets"
import { useDatasetFiles } from "@/composables/useDatasetFiles"
import { relativeTime } from "@/utils/time"
import { humanSize, fileType, statusLabel, statusChipClass } from "@/utils/files"
import AddSourceDrawer from "@/components/datasets/AddSourceDrawer.vue"
import FileDetailPanel from "@/components/datasets/FileDetailPanel.vue"
import { EllipsisOutlined, PlusOutlined } from "@ant-design/icons-vue"

const route = useRoute()
const router = useRouter()
const workspaceId = route.params.workspaceId
const datasetId = route.params.datasetId

const datasetsStore = useDatasetsStore()
const dataset = ref(null)

const {
  files,
  filteredFiles,
  loading,
  searchQuery,
  filterStatus,
  fetchFiles,
  handleDelete: deleteFile,
  handleReprocess,
  bulkDelete,
} = useDatasetFiles(workspaceId, datasetId)

const drawerOpen = ref(false)
const detailFile = ref(null)
const selected = reactive(new Set())
const selectAllRef = ref(null)
const page = ref(1)
const dsMenuOpen = ref(false)
const editOpen = ref(false)
const deleteOpen = ref(false)
const editForm = reactive({ name: "", description: "" })

const PAGE_SIZE = 25
const totalPages = computed(() => Math.max(1, Math.ceil(filteredFiles.value.length / PAGE_SIZE)))
const pagedFiles = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredFiles.value.slice(start, start + PAGE_SIZE)
})

// Reset page when filter/search changes
watch([searchQuery, filterStatus], () => {
  page.value = 1
})

const allSelected = computed(
  () => pagedFiles.value.length > 0 && pagedFiles.value.every((f) => selected.has(f.id)),
)
const someSelected = computed(
  () => !allSelected.value && pagedFiles.value.some((f) => selected.has(f.id)),
)

watchEffect(() => {
  if (selectAllRef.value) selectAllRef.value.indeterminate = someSelected.value
})

function toggleAll(checked) {
  if (checked) pagedFiles.value.forEach((f) => selected.add(f.id))
  else pagedFiles.value.forEach((f) => selected.delete(f.id))
}

function toggleOne(id) {
  if (selected.has(id)) selected.delete(id)
  else selected.add(id)
}

async function handleBulkDelete() {
  const ids = [...selected]
  const failedIds = await bulkDelete(ids)
  for (const id of ids) {
    if (!failedIds.includes(id)) selected.delete(id)
  }
}

const ACTIVE_STATUSES = ["processing", "queued"]
let pollTimer = null
let consecutiveErrors = 0

function stopPolling() {
  clearInterval(pollTimer)
  pollTimer = null
}

function startPolling() {
  if (pollTimer) return
  consecutiveErrors = 0
  pollTimer = setInterval(async () => {
    try {
      await fetchFiles()
      consecutiveErrors = 0
    } catch {
      if (++consecutiveErrors >= 3) {
        stopPolling()
        message.error("Could not reach server — refresh to check file status")
      }
    }
  }, 5000)
}

watch(
  files,
  (newFiles) => {
    const hasActive = newFiles.some((f) => ACTIVE_STATUSES.includes(f.status))
    if (hasActive) startPolling()
    else stopPolling()
  },
  { immediate: true },
)

onMounted(async () => {
  dataset.value = await datasetsStore.fetchDataset(workspaceId, datasetId)
  await fetchFiles()
})

onUnmounted(stopPolling)

function openEdit() {
  editForm.name = dataset.value.name
  editForm.description = dataset.value.description ?? ""
  editOpen.value = true
  dsMenuOpen.value = false
}

async function submitEdit() {
  await datasetsStore.updateDataset(workspaceId, dataset.value.id, {
    name: editForm.name,
    description: editForm.description,
  })
  dataset.value = { ...dataset.value, name: editForm.name, description: editForm.description }
  editOpen.value = false
  message.success("Dataset updated")
}

async function confirmDeleteDataset() {
  await datasetsStore.deleteDataset(workspaceId, dataset.value.id)
  router.push(`/workspaces/${workspaceId}/datasets`)
}

/** @returns {void} */
function openDeleteMenu() {
  deleteOpen.value = true
  dsMenuOpen.value = false
}

/** @returns {void} */
function openDrawer() {
  detailFile.value = null
  drawerOpen.value = true
}

/** Navigate to blank chat with this dataset pre-selected. */
function startChatFromDataset() {
  router.push({
    name: "NewChat",
    params: { workspaceId },
    query: { dataset: datasetId },
  })
}

function openDetail(file) {
  drawerOpen.value = false
  detailFile.value = file
}

async function handleReindexFile(id) {
  await handleReprocess(id)
  detailFile.value = null
}

async function handleDeleteFile(id) {
  await deleteFile(id)
  if (detailFile.value?.id === id) detailFile.value = null
  selected.delete(id)
}

/** @param {string} dateStr @returns {string} */
function shortDate(dateStr) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "indexed", label: "Indexed" },
  { value: "parsing", label: "Parsing" },
  { value: "failed", label: "Failed" },
]

const PAGE_WINDOW = 5
const visiblePages = computed(() => {
  const total = totalPages.value
  if (total <= PAGE_WINDOW) return Array.from({ length: total }, (_, i) => i + 1)
  const half = Math.floor(PAGE_WINDOW / 2)
  let start = Math.max(1, page.value - half)
  const end = Math.min(total, start + PAGE_WINDOW - 1)
  if (end - start < PAGE_WINDOW - 1) start = Math.max(1, end - PAGE_WINDOW + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
</script>

<template>
  <div class="page" @click="dsMenuOpen = false">
    <!-- Page header -->
    <div class="page-head">
      <div class="head-left">
        <button
          class="back-btn"
          @click="$router.push(`/workspaces/${workspaceId}/datasets`)"
          aria-label="Back to datasets"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          >
            <path d="M10 4L6 8l4 4" />
          </svg>
        </button>
        <div>
          <div class="page-title">{{ dataset?.name ?? "Dataset" }}</div>
          <div v-if="dataset?.description" class="page-sub">{{ dataset.description }}</div>
          <div class="page-stats">
            <span
              ><strong>{{ dataset?.file_count ?? 0 }}</strong> files</span
            >
            <span class="sep">·</span>
            <span v-if="dataset?.total_size_mb" class="mono"
              ><strong>{{ Number(dataset.total_size_mb).toFixed(1) }}</strong> MB</span
            >
            <span v-if="dataset?.updated_at" class="sep">·</span>
            <span v-if="dataset?.updated_at">Updated {{ relativeTime(dataset.updated_at) }}</span>
          </div>
        </div>
      </div>
      <div class="head-right">
        <!-- ⋯ menu -->
        <div class="menu-wrap" @click.stop>
          <button
            class="btn-secondary btn-icon"
            @click="dsMenuOpen = !dsMenuOpen"
            aria-label="Dataset options"
          >
            <ellipsis-outlined />
          </button>
          <div v-if="dsMenuOpen" class="menu-popup">
            <button class="menu-item" @click="openEdit">
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
              Edit dataset
            </button>
            <hr class="menu-divider" />
            <button class="menu-item menu-item--danger" @click="openDeleteMenu">
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
              Delete dataset
            </button>
          </div>
        </div>
        <button class="btn-brand" @click="startChatFromDataset">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M2 2h12a1 1 0 011 1v8a1 1 0 01-1 1H5l-3 2V3a1 1 0 011-1z" />
          </svg>
          Start chat
        </button>
        <button class="btn-primary" @click="openDrawer">
          <plus-outlined />
          Add source
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="var(--ink-3)"
          stroke-width="1.7"
        >
          <circle cx="7" cy="7" r="4.5" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" />
        </svg>
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="Search files in this dataset…"
        />
      </div>
      <div class="filter-chips">
        <button
          v-for="f in FILTERS"
          :key="f.value"
          class="chip-filter"
          :class="{ active: filterStatus === f.value }"
          @click="filterStatus = f.value"
        >
          {{ f.label }}
        </button>
      </div>
      <span class="count-label">
        {{ selected.size > 0 ? `${selected.size} selected` : `${filteredFiles.length} files` }}
      </span>
    </div>

    <!-- Bulk action bar -->
    <div v-if="selected.size > 0" class="bulk-bar">
      <span class="bulk-label"
        >{{ selected.size }} file{{ selected.size === 1 ? "" : "s" }} selected</span
      >
      <span class="bulk-sep">·</span>
      <button class="bulk-clear" @click="selected.clear()">Clear selection</button>
      <div style="flex: 1" />
      <button class="btn-danger" @click="handleBulkDelete">
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
        >
          <path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9" />
        </svg>
        Delete selected
      </button>
    </div>

    <!-- File table -->
    <div v-if="!loading || files.length" class="file-table">
      <!-- Empty dataset -->
      <div v-if="!loading && !files.length" class="files-empty">
        <svg
          viewBox="0 0 100 80"
          width="120"
          height="96"
          fill="none"
          stroke="var(--ink-3)"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M10 24L10 64a4 4 0 004 4H86a4 4 0 004-4V32a4 4 0 00-4-4H46l-6-6H14a4 4 0 00-4 4z"
          />
          <path
            d="M48 8L48 22L62 22L62 36L36 36L36 8z"
            stroke="var(--brand)"
            fill="var(--brand-tint)"
            fill-opacity="0.55"
          />
          <line x1="40" y1="14" x2="58" y2="14" stroke="var(--brand)" />
          <line x1="40" y1="20" x2="56" y2="20" stroke="var(--brand)" />
          <line x1="40" y1="26" x2="52" y2="26" stroke="var(--brand)" />
        </svg>
        <p class="files-empty-title">This dataset is empty</p>
        <p class="files-empty-body">
          Add a PDF, document, or URL to start. Once indexed, the agent will search and cite this
          corpus.
        </p>
        <div class="files-empty-actions">
          <button class="btn-primary" @click="drawerOpen = true">
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M8 12V4M4 8l4-4 4 4" />
            </svg>
            Upload files
          </button>
          <button class="btn-secondary" @click="drawerOpen = true">
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            >
              <circle cx="8" cy="8" r="5.5" />
              <line x1="8" y1="5" x2="8" y2="8" />
              <circle cx="8" cy="11" r="0.5" fill="currentColor" />
            </svg>
            Add a URL
          </button>
        </div>
      </div>

      <template v-else>
        <!-- Header row -->
        <div class="file-cols file-thead">
          <div>
            <input
              ref="selectAllRef"
              type="checkbox"
              class="cb"
              :checked="allSelected"
              @change="toggleAll($event.target.checked)"
            />
          </div>
          <div>Type</div>
          <div>Name</div>
          <div class="col-right">Size</div>
          <div>Chunks</div>
          <div>Status</div>
          <div>Added</div>
          <div></div>
        </div>

        <!-- File rows -->
        <div
          v-for="file in pagedFiles"
          :key="file.id"
          class="file-cols file-row"
          :class="{ 'file-row--selected': selected.has(file.id) }"
          @click="openDetail(file)"
        >
          <div @click.stop>
            <input
              type="checkbox"
              class="cb"
              :checked="selected.has(file.id)"
              @change="toggleOne(file.id)"
            />
          </div>
          <div>
            <span class="type-badge" :class="`type-${fileType(file.filename)}`">{{
              fileType(file.filename)
            }}</span>
          </div>
          <div class="col-name">
            <span class="file-name">{{ file.filename }}</span>
            <span v-if="file.status === 'failed' && file.error_message" class="file-error">{{
              file.error_message
            }}</span>
          </div>
          <div class="col-right mono">{{ humanSize(file.file_size_bytes) }}</div>
          <div class="mono" :style="{ color: file.chunk_count ? 'var(--ink-2)' : 'var(--ink-4)' }">
            {{ file.chunk_count || "—" }}
          </div>
          <div>
            <span class="chip" :class="statusChipClass(file.status)">
              <span class="status-dot" :class="{ pulse: ACTIVE_STATUSES.includes(file.status) }" />
              {{ statusLabel(file.status) }}
            </span>
          </div>
          <div class="muted">{{ shortDate(file.created_at) }}</div>
          <div @click.stop>
            <button class="row-menu-btn" aria-label="File options" @click="openDetail(file)">
              ⋯
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <span class="pg-info">
            Showing
            <strong class="mono"
              >{{ (page - 1) * PAGE_SIZE + 1 }}–{{
                Math.min(page * PAGE_SIZE, filteredFiles.length)
              }}</strong
            >
            of
            <strong class="mono">{{ filteredFiles.length }}</strong>
          </span>
          <div class="pg-buttons">
            <button class="pg-nav" :disabled="page === 1" @click="page--">
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              >
                <path d="M10 4L6 8l4 4" />
              </svg>
              Prev
            </button>
            <span v-if="visiblePages[0] > 1" class="pg-ellipsis">…</span>
            <button
              v-for="p in visiblePages"
              :key="p"
              class="pg-btn"
              :class="{ active: p === page }"
              @click="page = p"
            >
              {{ p }}
            </button>
            <span v-if="visiblePages[visiblePages.length - 1] < totalPages" class="pg-ellipsis"
              >…</span
            >
            <button class="pg-nav" :disabled="page === totalPages" @click="page++">
              Next
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              >
                <path d="M6 4l4 4-4 4" />
              </svg>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Add source drawer -->
    <AddSourceDrawer
      :open="drawerOpen"
      :workspace-id="workspaceId"
      :dataset-id="datasetId"
      @close="drawerOpen = false"
      @uploaded="fetchFiles()"
      @scraped="fetchFiles()"
    />

    <!-- File detail panel -->
    <FileDetailPanel
      :file="detailFile"
      :open="!!detailFile"
      @close="detailFile = null"
      @reindex="handleReindexFile"
      @delete="handleDeleteFile"
    />

    <!-- Edit dataset modal -->
    <a-modal
      :open="editOpen"
      title="Edit dataset"
      :footer="null"
      :width="480"
      @cancel="editOpen = false"
    >
      <a-form layout="vertical" @finish="submitEdit" style="margin-top: 8px">
        <a-form-item
          label="Name"
          name="name"
          :rules="[{ required: true, message: 'Name is required' }, { max: 255 }]"
        >
          <a-input v-model:value="editForm.name" placeholder="Dataset name" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea
            v-model:value="editForm.description"
            :rows="3"
            placeholder="Optional description"
          />
        </a-form-item>
        <button type="submit" class="btn-primary btn-block">Save changes</button>
      </a-form>
    </a-modal>

    <!-- Delete dataset confirm -->
    <a-modal
      :open="deleteOpen"
      title="Delete dataset?"
      ok-text="Delete"
      ok-type="danger"
      cancel-text="Cancel"
      @ok="confirmDeleteDataset"
      @cancel="deleteOpen = false"
    >
      <p style="margin: 8px 0">
        All files and indexed data in <strong>{{ dataset?.name }}</strong> will be permanently
        removed.
      </p>
    </a-modal>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 24px;
}

/* Header */
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
  flex-wrap: wrap;
}

.head-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.back-btn {
  width: 28px;
  height: 28px;
  margin-top: 2px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--ink-3);
  border-radius: var(--r-sm);
  cursor: pointer;
}

.back-btn:hover {
  background: var(--bg-2);
  color: var(--ink);
}

.page-title {
  font-size: var(--t-lg);
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
  line-height: 1.25;
}

.page-sub {
  font-size: 12.5px;
  color: var(--ink-3);
  margin-top: 3px;
}

.page-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--ink-3);
  flex-wrap: wrap;
}

.page-stats strong {
  color: var(--ink-2);
  font-weight: 600;
}

.page-stats .sep {
  color: var(--ink-4);
}

.head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Buttons */
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

.btn-brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: var(--brand-tint);
  color: var(--brand-3);
  border: 1px solid rgba(255, 107, 53, 0.25);
  border-radius: var(--r-sm);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.btn-brand:hover {
  background: rgba(255, 107, 53, 0.15);
  border-color: var(--brand);
  color: var(--brand-2);
}

.btn-block {
  width: 100%;
  justify-content: center;
  margin-top: 16px;
  padding: 10px;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--bg-2);
}

.btn-icon {
  padding: 6px 8px;
}

.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(192, 41, 31, 0.92);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:hover {
  background: var(--err);
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  flex: 1;
  min-width: 200px;
  max-width: 320px;
}

.search-input {
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--ink);
  outline: none;
  flex: 1;
}

.filter-chips {
  display: inline-flex;
  gap: 4px;
}

.chip-filter {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--line-2);
  background: var(--surface);
  color: var(--ink-2);
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}

.chip-filter.active {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.count-label {
  font-size: 12.5px;
  color: var(--ink-3);
  margin-left: auto;
  white-space: nowrap;
}

/* Bulk bar */
.bulk-bar {
  position: sticky;
  top: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--ink);
  color: var(--bg);
  border-radius: var(--r);
  padding: 8px 10px 8px 14px;
  box-shadow: var(--shadow-2);
  margin-bottom: 12px;
}

.bulk-label {
  font-size: 12.5px;
  font-weight: 500;
}

.bulk-sep {
  color: rgba(250, 250, 247, 0.3);
}

.bulk-clear {
  background: none;
  border: none;
  color: rgba(250, 250, 247, 0.65);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}

.bulk-clear:hover {
  color: var(--bg);
}

/* File table */
.file-table {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.file-cols {
  display: grid;
  grid-template-columns: 32px 54px minmax(0, 1fr) 72px 72px 110px 100px 36px;
  gap: 10px;
  align-items: center;
}

.file-thead {
  padding: 10px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.file-row {
  padding: 10px 16px;
  border-top: 1px solid var(--line);
  cursor: pointer;
  transition: background var(--dur) var(--ease);
}

.file-row:hover {
  background: var(--bg);
}

.file-row--selected {
  background: var(--brand-tint);
}

.file-row--selected:hover {
  background: var(--brand-tint);
}

/* Checkbox */
.cb {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--ink);
}

/* Type badge */
.type-badge {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid;
}

.type-pdf {
  background: var(--err-bg);
  color: var(--err);
  border-color: var(--err-border);
}

.type-md {
  background: var(--ok-bg);
  color: var(--ok);
  border-color: var(--ok-border);
}

.type-url {
  background: var(--brand-tint);
  color: var(--brand-3);
  border-color: rgba(255, 107, 53, 0.2);
}

.type-docx {
  background: #f0f4ff;
  color: #1d4ed8;
  border-color: rgba(29, 78, 216, 0.2);
}

.type-file {
  background: var(--bg-2);
  color: var(--ink-3);
  border-color: var(--line-2);
}

.col-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-error {
  font-size: 11px;
  color: var(--err);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-right {
  text-align: right;
}

.mono {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-2);
}

.muted {
  font-size: 12px;
  color: var(--ink-3);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 500;
  border: 1px solid;
}

.chip--ok {
  background: var(--ok-bg);
  color: var(--ok);
  border-color: var(--ok-border);
}

.chip--brand {
  background: var(--brand-tint);
  color: var(--brand-2);
  border-color: rgba(255, 107, 53, 0.2);
}

.chip--err {
  background: var(--err-bg);
  color: var(--err);
  border-color: var(--err-border);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.status-dot.pulse {
  animation: pulse 1.4s ease-in-out infinite;
}

.row-menu-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--ink-4);
  border-radius: var(--r-sm);
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  opacity: 0;
  transition: opacity var(--dur) var(--ease);
}

.file-row:hover .row-menu-btn,
.file-row--selected .row-menu-btn {
  opacity: 1;
}

.row-menu-btn:hover {
  background: var(--bg-2);
  color: var(--ink);
}

/* Empty dataset state */
.files-empty {
  padding: 48px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border: 1.5px dashed var(--line-2);
  border-radius: var(--r-lg);
  margin: 16px;
}

.files-empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.files-empty-body {
  font-size: 13px;
  color: var(--ink-3);
  max-width: 360px;
  line-height: 1.55;
  margin: 0;
}

.files-empty-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink-3);
}

.pg-info strong {
  color: var(--ink-2);
}

.pg-buttons {
  display: flex;
  align-items: center;
  gap: 3px;
}

.pg-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink-3);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.pg-btn.active {
  border-color: var(--ink);
  background: var(--surface);
  color: var(--ink);
}

.pg-nav {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.pg-nav:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pg-ellipsis {
  color: var(--ink-4);
  padding: 0 4px;
}

/* ⋯ menu */
.menu-wrap {
  position: relative;
}

.menu-popup {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r);
  box-shadow: var(--shadow-2);
  min-width: 150px;
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

.menu-divider {
  border: none;
  border-top: 1px solid var(--line);
  margin: 3px 0;
}
</style>
