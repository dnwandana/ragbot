<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { message } from "ant-design-vue"
import { useDatasetsStore } from "@/stores/datasets"
import { useDatasetItemsStore } from "@/stores/datasetItems"
import { useDatasetFiles } from "@/composables/useDatasetFiles"
import { usePermissions } from "@/composables/usePermissions"
import { fileStatuses } from "@/api/datasetFiles"
import { moveItems } from "@/api/datasetItems"
import { useFolderUpload } from "@/composables/useFolderUpload"
import { hasDroppedFiles, readDroppedItems } from "@/utils/droppedEntries"
import { relativeTime } from "@/utils/time"
import AddSourceDrawer from "@/components/datasets/AddSourceDrawer.vue"
import FileDetailPanel from "@/components/datasets/FileDetailPanel.vue"
import FolderBreadcrumbs from "@/components/datasets/FolderBreadcrumbs.vue"
import DatasetItemsTable from "@/components/datasets/DatasetItemsTable.vue"
import FolderNameDialog from "@/components/datasets/FolderNameDialog.vue"
import MoveToDialog from "@/components/datasets/MoveToDialog.vue"
import DeleteItemsDialog from "@/components/datasets/DeleteItemsDialog.vue"
import { itemKey, splitKeys } from "@/components/datasets/itemKeys"
import {
  ChevronLeft,
  Ellipsis,
  Eye,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Globe,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-vue-next"

const route = useRoute()
const router = useRouter()
const workspaceId = route.params.workspaceId
const datasetId = route.params.datasetId

const datasetsStore = useDatasetsStore()
const dataset = ref(null)

const { handleReprocess, handleRename } = useDatasetFiles(workspaceId, datasetId)

const drawerOpen = ref(false)
const detailFile = ref(null)
const dsMenuOpen = ref(false)
const openRowMenuKey = ref(null)
const rowMenuPos = ref({ top: 0, left: 0 })
const editOpen = ref(false)
const deleteOpen = ref(false)
const editForm = reactive({ name: "", description: "" })
const renameOpen = ref(false)
const renameTarget = ref(null)
const renameForm = reactive({ filename: "" })
const deletingDataset = ref(false)

const itemsStore = useDatasetItemsStore()
const folderId = computed(() => route.query.folder || null)
const selected = ref(new Set())

// The input changes at once. The search query follows it after a 300 ms wait.
const searchInput = ref("")
const searchQuery = ref("")
/** @type {import("vue").Ref<"all" | "indexed" | "parsing" | "failed">} */
const filterStatus = ref("all")
/** Maps a filter chip to the `status` query parameter of `GET /items`. */
const STATUS_PARAMS = {
  all: "",
  indexed: "completed",
  parsing: "queued,processing",
  failed: "failed",
}
// The path of the current folder for the drawer, for example "Docs / Reports / Q1".
const folderLabel = computed(() =>
  [dataset.value?.name ?? "", ...itemsStore.breadcrumbs.map((c) => c.name)].join(" / "),
)
const currentName = computed(() => itemsStore.breadcrumbs.at(-1)?.name ?? dataset.value?.name ?? "")
let searchTimer = null

const { can } = usePermissions()
const canUpload = computed(() => can("file:upload"))
const canUpdate = computed(() => can("file:update"))
const canDelete = computed(() => can("file:delete"))
const selectedItems = computed(() => itemsStore.items.filter((i) => selected.value.has(itemKey(i))))
const folderDialog = ref({ open: false, folder: null })
const moveDialog = ref({ open: false, folderIds: [], fileIds: [] })
const deleteDialog = ref({ open: false, items: [] })

/**
 * Returns the count and the word, with an "s" when the count is not 1.
 * @param {number} n
 * @param {string} word
 * @returns {string} For example, `"1 file"` or `"3 files"`.
 */
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`

/**
 * Maps the output of `splitKeys` to the prop names of `MoveToDialog`.
 * @param {{ folder_ids: string[], file_ids: string[] }} ids
 * @returns {{ folderIds: string[], fileIds: string[] }}
 */
const mapIds = ({ folder_ids, file_ids }) => ({ folderIds: folder_ids, fileIds: file_ids })

/**
 * Opens the move dialog for these items.
 * @param {Array<{ kind: "folder" | "file", id: string }>} items
 * @returns {void}
 */
function openMove(items) {
  openRowMenuKey.value = null
  moveDialog.value = { open: true, ...mapIds(splitKeys(items.map(itemKey))) }
}

/**
 * Opens the delete dialog for these items.
 * @param {Array<{ kind: "folder" | "file", id: string }>} items
 * @returns {void}
 */
function openDeleteItems(items) {
  openRowMenuKey.value = null
  deleteDialog.value = { open: true, items }
}

/**
 * Closes the move dialog, clears the selection, and loads the folder again. The moved items leave
 * the folder, and the item count of the target changes. Also updates the open file panel.
 * @param {object} [payload]
 * @param {string|null} [payload.targetId=null] - The target folder, or `null` for the dataset root
 * @param {string[]} [payload.fileIds] - The moved file ids. `MoveToDialog` emits only `targetId`,
 *   so the ids come from `moveDialog`. A drag move sends its own ids.
 * @returns {Promise<void>}
 */
async function onMoved({ targetId = null, fileIds = moveDialog.value.fileIds } = {}) {
  moveDialog.value.open = false
  selected.value = new Set()
  message.success("Items moved")
  if (detailFile.value && fileIds.includes(detailFile.value.id)) {
    detailFile.value = { ...detailFile.value, folder_id: targetId }
  }
  await refresh()
}

/**
 * Closes the file panel and opens a folder from its Location row. The URL stays the only source
 * of the current folder.
 * @param {string|null} id - The folder, or `null` for the dataset root
 * @returns {void}
 */
function openFolderFromPanel(id) {
  detailFile.value = null
  goToFolder(id)
}

/**
 * Removes the deleted items from the loaded rows. The loaded Load more pages stay.
 * @param {{ folders: number, files: number }} deleted The counts that the API deleted.
 * @returns {void}
 */
function onDeleted({ folders, files }) {
  const ids = deleteDialog.value.items.map((i) => i.id)
  deleteDialog.value.open = false
  itemsStore.removeItems(ids)
  if (detailFile.value && ids.includes(detailFile.value.id)) detailFile.value = null
  selected.value = new Set()
  message.success(`Deleted ${plural(folders, "folder")} and ${plural(files, "file")}`)
}

/**
 * Closes the folder dialog and loads again, because a new name changes the sort order.
 * @returns {Promise<void>}
 */
async function onFolderSaved() {
  folderDialog.value.open = false
  await refresh()
}

const folderUpload = useFolderUpload({ workspaceId, datasetId })
// dragenter and dragleave also fire for each child element. A counter keeps the overlay stable.
const dragDepth = ref(0)

/**
 * Tells if the page accepts this drag as an upload. An internal drag has no `"Files"` type.
 * @param {DragEvent} event
 * @returns {boolean}
 */
const acceptsDrop = (event) => canUpload.value && hasDroppedFiles(event.dataTransfer)

/**
 * Moves the dragged items into a folder row or a crumb. The server does the full cycle check.
 * @param {{ targetId: string | null, keys: string[] }} payload - `null` is the dataset root
 * @returns {Promise<void>}
 */
async function onDragMove({ targetId, keys }) {
  try {
    const ids = splitKeys(keys)
    await moveItems(workspaceId, datasetId, { ...ids, target_folder_id: targetId })
    // onMoved reads targetId and fileIds to update the open file panel.
    await onMoved({ targetId, fileIds: ids.file_ids })
  } catch (err) {
    message.error(err.message || "Could not move the items")
  }
}

/** Shows the drop overlay for a drag of files from the computer. @param {DragEvent} event */
function onPageDragEnter(event) {
  if (acceptsDrop(event)) dragDepth.value++
}

/** Hides the drop overlay when the drag leaves the page. @param {DragEvent} event */
function onPageDragLeave(event) {
  if (acceptsDrop(event)) dragDepth.value = Math.max(0, dragDepth.value - 1)
}

/** Lets the browser drop files from the computer on the page. @param {DragEvent} event */
function onPageDragOver(event) {
  if (acceptsDrop(event)) event.preventDefault()
}

/**
 * Uploads the files and folders of a drop from the computer into the current folder.
 * @param {DragEvent} event
 * @returns {Promise<void>}
 */
async function onPageDrop(event) {
  if (!acceptsDrop(event)) return
  event.preventDefault()
  dragDepth.value = 0
  // readDroppedItems reads the entries before its first await. The drop data is gone later.
  const entries = await readDroppedItems(event.dataTransfer)
  if (!entries.length) return
  const { uploaded, failed, skipped } = await folderUpload.upload({
    entries,
    parentId: folderId.value,
  })
  if (folderUpload.error.value) message.error(folderUpload.error.value)
  if (uploaded) message.success(`Uploaded ${plural(uploaded, "file")}`)
  if (failed) message.error(`${plural(failed, "file")} failed to upload`)
  if (skipped.length) {
    message.warning(`Skipped ${plural(skipped.length, "file")} with a type that is not supported`)
  }
  await refresh()
}

/** Returns the loaded file item with this id, or `null`. */
const findFile = (id) => itemsStore.items.find((i) => i.kind === "file" && i.id === id) ?? null

const openRowMenuItem = computed(
  () => itemsStore.items.find((i) => itemKey(i) === openRowMenuKey.value) ?? null,
)

/** Pushes the folder into the URL. The route watch loads it. */
function goToFolder(id) {
  router.push({ query: id ? { folder: id } : {} })
}

/** Loads the current folder or search. A missing folder sends the user to the root. */
async function refresh() {
  try {
    await itemsStore.load({
      workspaceId,
      datasetId,
      folderId: folderId.value,
      q: searchQuery.value.trim(),
      status: STATUS_PARAMS[filterStatus.value],
    })
    // A new folder or a new search gives the poll a new start.
    pollFailures = 0
    schedulePoll()
  } catch (err) {
    // The global toast already shows the server message.
    if (err.status === 404 && folderId.value) goToFolder(null)
  }
}

const POLL_MS = 5000
const POLL_BATCH = 100
const POLL_MAX_FAILURES = 3
let pollTimer = null
let pollBusy = false
let pollFailures = 0
// Set on unmount. A load that finishes after the unmount must not start the poll again.
let pollStopped = false

/**
 * Starts the next poll in 5 s. It does this only when a loaded file is active and no poll waits
 * or runs.
 * @returns {void}
 */
function schedulePoll() {
  if (pollStopped || pollTimer || pollBusy || pollFailures >= POLL_MAX_FAILURES) return
  if (!itemsStore.activeFileIds.length) return
  pollTimer = setTimeout(pollStatuses, POLL_MS)
}

/**
 * Stops the waiting poll. A poll that runs now finishes, but it does not schedule a next one.
 * @returns {void}
 */
function stopPolling() {
  clearTimeout(pollTimer)
  pollTimer = null
  pollStopped = true
}

/**
 * Asks the API for the status of the active files, in batches of 100 ids, and applies the rows.
 * After three failures in a row, it stops and shows a message.
 * @returns {Promise<void>}
 */
async function pollStatuses() {
  pollTimer = null
  pollBusy = true
  const ids = itemsStore.activeFileIds
  try {
    for (let i = 0; i < ids.length; i += POLL_BATCH) {
      const batch = ids.slice(i, i + POLL_BATCH)
      const res = await fileStatuses(workspaceId, datasetId, batch)
      itemsStore.applyStatuses(batch, res.data.data)
    }
    pollFailures = 0
  } catch {
    if (++pollFailures === POLL_MAX_FAILURES) {
      message.error("Could not reach server — refresh to check file status")
    }
  } finally {
    pollBusy = false
  }
  schedulePoll()
}

watch(() => itemsStore.activeFileIds.length, schedulePoll)

watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (searchQuery.value = value), 300)
})
watch(folderId, () => {
  searchInput.value = ""
  searchQuery.value = ""
})
watch([folderId, searchQuery, filterStatus], () => {
  // A navigation to another page also clears the query before the view unmounts.
  if (route.params.datasetId !== datasetId) return
  selected.value = new Set()
  refresh()
})

onMounted(async () => {
  window.addEventListener("scroll", closeRowMenuOnViewportChange, true)
  window.addEventListener("resize", closeRowMenuOnViewportChange)
  dataset.value = await datasetsStore.fetchDataset(workspaceId, datasetId)
  await refresh()
})

onUnmounted(() => {
  clearTimeout(searchTimer)
  stopPolling()
  window.removeEventListener("scroll", closeRowMenuOnViewportChange, true)
  window.removeEventListener("resize", closeRowMenuOnViewportChange)
})

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

/**
 * Delete the dataset after confirmation, then navigate back to the datasets list.
 * Holds `deletingDataset` while the request is in flight; on rejection, toasts and
 * keeps the modal open for retry.
 * @returns {Promise<void>}
 */
async function confirmDeleteDataset() {
  deletingDataset.value = true
  try {
    await datasetsStore.deleteDataset(workspaceId, dataset.value.id)
    router.push(`/workspaces/${workspaceId}/datasets`) // success path unmounts the view
  } catch {
    message.error("Failed to delete dataset")
  } finally {
    deletingDataset.value = false
  }
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

/** Reprocesses a file and shows it as queued, so the status poll picks it up. */
async function handleReindexFile(id) {
  await handleReprocess(id)
  itemsStore.applyStatuses([id], [{ id, status: "queued", chunk_count: 0, error_message: null }])
  detailFile.value = null
}

/** Close any open dataset or row dropdown menu. @returns {void} */
function closeMenus() {
  dsMenuOpen.value = false
  openRowMenuKey.value = null
}

/**
 * Opens or closes the menu of a row, and anchors the teleported popup to the clicked button.
 * Closes the dataset menu too.
 * @param {MouseEvent} event - Click on the ⋯ button of the row
 * @param {{ kind: "folder" | "file", id: string }} item - The item of the row
 * @returns {void}
 */
function toggleRowMenu(event, item) {
  dsMenuOpen.value = false
  const key = itemKey(item)
  if (openRowMenuKey.value === key) {
    openRowMenuKey.value = null
    return
  }
  const rect = event.currentTarget.getBoundingClientRect()
  // Right-align the popup under the button (popup min-width 150px).
  rowMenuPos.value = { top: rect.bottom + 6, left: rect.right }
  openRowMenuKey.value = key
}

/**
 * Opens the menu of a table row. Vue emits in the same tick, so `event.currentTarget` is still set.
 * @param {{ event: MouseEvent, item: { kind: "folder" | "file", id: string } }} payload
 * @returns {void}
 */
function onRowMenu({ event, item }) {
  toggleRowMenu(event, item)
}

/** Close the row action menu on viewport scroll/resize so it stays anchored. @returns {void} */
function closeRowMenuOnViewportChange() {
  openRowMenuKey.value = null
}

/** Open the detail panel for a file from its row menu. @param {object} file @returns {void} */
function viewDetailFromMenu(file) {
  openRowMenuKey.value = null
  openDetail(file)
}

/** Open the rename modal for a file from its row menu. @param {object} file @returns {void} */
function openRenameFromMenu(file) {
  openRowMenuKey.value = null
  openRename(file)
}

/** Opens the delete dialog for a file from its row menu. @param {object} file @returns {void} */
function openDeleteFromMenu(file) {
  openDeleteItems([file])
}

/** Opens a folder from its row menu. @param {{ id: string }} folder @returns {void} */
function openFolderFromMenu(folder) {
  openRowMenuKey.value = null
  goToFolder(folder.id)
}

/** Opens the rename dialog for a folder from its row menu. @param {object} folder @returns {void} */
function renameFolderFromMenu(folder) {
  openRowMenuKey.value = null
  folderDialog.value = { open: true, folder }
}

/** @param {object} file @returns {void} */
function openRename(file) {
  renameTarget.value = file
  renameForm.filename = file.filename
  renameOpen.value = true
}

/** Rename the targeted file, patching the open detail panel if it matches. @returns {Promise<void>} */
async function submitRename() {
  const name = renameForm.filename.trim()
  if (!name) return
  try {
    await handleRename(renameTarget.value.id, name)
    const item = findFile(renameTarget.value.id)
    if (item) item.filename = name
    if (detailFile.value?.id === renameTarget.value.id) {
      detailFile.value = { ...detailFile.value, filename: name }
    }
    renameOpen.value = false
  } catch {
    message.error("Failed to rename file")
  }
}

/**
 * Opens the delete dialog for the file of the detail panel.
 * @param {string} id
 * @returns {void}
 */
function requestDeleteFile(id) {
  const file = findFile(id) ?? (detailFile.value && { kind: "file", ...detailFile.value })
  if (file) openDeleteItems([file])
}

/**
 * Open a new chat seeded with an exploration question, this dataset linked.
 * @param {string} question - The question text to pre-fill the composer with
 */
function onAskQuestion(question) {
  router.push({
    name: "NewChat",
    params: { workspaceId },
    query: { dataset: datasetId, q: question },
  })
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "indexed", label: "Indexed" },
  { value: "parsing", label: "Parsing" },
  { value: "failed", label: "Failed" },
]
</script>

<template>
  <div
    class="page"
    @click="closeMenus"
    @dragenter="onPageDragEnter"
    @dragleave="onPageDragLeave"
    @dragover="onPageDragOver"
    @drop="onPageDrop"
  >
    <div v-if="dragDepth > 0" class="drop-overlay">Drop to upload to {{ currentName }}</div>
    <p v-if="folderUpload.running.value" class="upload-progress" role="status">
      Uploading
      {{ folderUpload.uploads.value.filter((u) => u.status !== "uploading").length }} of
      {{ folderUpload.uploads.value.length }} files…
    </p>
    <!-- Page header -->
    <div class="page-head">
      <div class="head-left">
        <button
          class="back-btn"
          @click="$router.push(`/workspaces/${workspaceId}/datasets`)"
          aria-label="Back to datasets"
        >
          <ChevronLeft :size="14" :stroke-width="1.8" />
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
            <Ellipsis :size="16" />
          </button>
          <div v-if="dsMenuOpen" class="menu-popup">
            <button class="menu-item" @click="openEdit">
              <Pencil :size="13" :stroke-width="1.6" />
              Edit dataset
            </button>
            <hr class="menu-divider" />
            <button class="menu-item menu-item--danger" @click="openDeleteMenu">
              <Trash2 :size="13" :stroke-width="1.6" />
              Delete dataset
            </button>
          </div>
        </div>
        <button class="btn-brand" @click="startChatFromDataset">
          <MessageSquare :size="13" :stroke-width="2" />
          Start chat
        </button>
        <button
          v-if="canUpload"
          class="btn-secondary"
          @click="folderDialog = { open: true, folder: null }"
        >
          <FolderPlus :size="13" :stroke-width="1.8" />
          New folder
        </button>
        <button v-if="canUpload" class="btn-primary" @click="openDrawer">
          <Plus :size="16" />
          Add source
        </button>
      </div>
    </div>

    <FolderBreadcrumbs
      :dataset-name="dataset?.name ?? ''"
      :breadcrumbs="itemsStore.breadcrumbs"
      :droppable="canUpdate"
      @navigate="goToFolder"
      @drop="onDragMove"
    />

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <Search :size="13" :stroke-width="1.7" style="color: var(--ink-3)" />
        <input
          v-model="searchInput"
          class="search-input"
          :aria-label="`Search in ${currentName} and subfolders…`"
          :placeholder="`Search in ${currentName} and subfolders…`"
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
        {{ selected.size > 0 ? `${selected.size} selected` : `${itemsStore.items.length} items` }}
      </span>
    </div>

    <!-- Bulk action bar -->
    <div v-if="selected.size > 0" class="bulk-bar">
      <span class="bulk-label">{{ plural(selected.size, "item") }} selected</span>
      <span class="bulk-sep">·</span>
      <button class="bulk-clear" @click="selected = new Set()">Clear selection</button>
      <div class="bulk-actions">
        <button v-if="canUpdate" class="btn-secondary" @click="openMove(selectedItems)">
          <FolderInput :size="12" :stroke-width="1.8" />
          Move to…
        </button>
        <button v-if="canDelete" class="btn-danger" @click="openDeleteItems(selectedItems)">
          <Trash2 :size="12" :stroke-width="1.8" />
          Delete
        </button>
      </div>
    </div>

    <!-- Items -->
    <div v-if="!itemsStore.loading || itemsStore.items.length" class="items-wrap">
      <!-- Empty dataset -->
      <div
        v-if="
          !itemsStore.loading &&
          !itemsStore.items.length &&
          !folderId &&
          !searchQuery &&
          filterStatus === 'all'
        "
        class="files-empty"
      >
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
        <div v-if="canUpload" class="files-empty-actions">
          <button class="btn-primary" @click="drawerOpen = true">
            <Upload :size="12" :stroke-width="2" />
            Upload files
          </button>
          <button class="btn-secondary" @click="drawerOpen = true">
            <Globe :size="12" :stroke-width="1.8" />
            Add a URL
          </button>
        </div>
      </div>
      <p v-else-if="!itemsStore.loading && !itemsStore.items.length" class="items-none">
        {{
          searchQuery || filterStatus !== "all"
            ? "No items match the search."
            : "This folder is empty."
        }}
      </p>
      <DatasetItemsTable
        v-else
        v-model:selected="selected"
        :items="itemsStore.items"
        :selectable="canUpdate || canDelete"
        :draggable="canUpdate"
        :has-more="!!itemsStore.nextCursor"
        :loading-more="itemsStore.loadingMore"
        @open-folder="goToFolder"
        @open-file="openDetail"
        @menu="onRowMenu"
        @load-more="itemsStore.loadMore()"
        @move="onDragMove"
      />
    </div>

    <!-- Add source drawer -->
    <AddSourceDrawer
      :open="drawerOpen"
      :workspace-id="workspaceId"
      :dataset-id="datasetId"
      :folder-id="folderId"
      :folder-label="folderLabel"
      @close="drawerOpen = false"
      @uploaded="refresh()"
      @scraped="refresh()"
      @youtube="refresh()"
    />

    <!-- File detail panel -->
    <FileDetailPanel
      :file="detailFile"
      :open="!!detailFile"
      :workspace-id="workspaceId"
      :dataset-id="datasetId"
      :dataset-name="dataset?.name ?? ''"
      :can-move="canUpdate"
      @close="detailFile = null"
      @move="(file) => openMove([{ ...file, kind: 'file' }])"
      @navigate="openFolderFromPanel"
      @reindex="handleReindexFile"
      @delete="requestDeleteFile"
      @ask="onAskQuestion"
    />

    <!-- Floating row action menu (teleported so the table's overflow:hidden doesn't clip it) -->
    <Teleport to="body">
      <div
        v-if="openRowMenuItem"
        class="menu-popup menu-popup--floating"
        :style="{ top: rowMenuPos.top + 'px', left: rowMenuPos.left + 'px' }"
        @click.stop
      >
        <template v-if="openRowMenuItem.kind === 'folder'">
          <button class="menu-item" @click="openFolderFromMenu(openRowMenuItem)">
            <FolderOpen :size="13" :stroke-width="1.6" />
            Open
          </button>
          <button v-if="canUpdate" class="menu-item" @click="renameFolderFromMenu(openRowMenuItem)">
            <Pencil :size="13" :stroke-width="1.6" />
            Rename
          </button>
        </template>
        <template v-else>
          <button class="menu-item" @click="viewDetailFromMenu(openRowMenuItem)">
            <Eye :size="13" :stroke-width="1.6" />
            View details
          </button>
          <button v-if="canUpdate" class="menu-item" @click="openRenameFromMenu(openRowMenuItem)">
            <Pencil :size="13" :stroke-width="1.6" />
            Edit
          </button>
        </template>
        <button v-if="canUpdate" class="menu-item" @click="openMove([openRowMenuItem])">
          <FolderInput :size="13" :stroke-width="1.6" />
          Move to…
        </button>
        <template v-if="canDelete">
          <hr class="menu-divider" />
          <button class="menu-item menu-item--danger" @click="openDeleteFromMenu(openRowMenuItem)">
            <Trash2 :size="13" :stroke-width="1.6" />
            Delete
          </button>
        </template>
      </div>
    </Teleport>

    <!-- Edit dataset modal -->
    <a-modal
      :open="editOpen"
      title="Edit dataset"
      :footer="null"
      :width="480"
      @cancel="editOpen = false"
    >
      <a-form :model="editForm" layout="vertical" @finish="submitEdit" style="margin-top: 8px">
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
      :confirm-loading="deletingDataset"
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

    <!-- Rename file modal -->
    <a-modal
      :open="renameOpen"
      title="Rename file"
      :footer="null"
      :width="480"
      @cancel="renameOpen = false"
    >
      <a-form :model="renameForm" layout="vertical" @finish="submitRename" style="margin-top: 8px">
        <a-form-item
          label="File name"
          name="filename"
          :rules="[{ required: true, whitespace: true, message: 'Name is required' }, { max: 255 }]"
        >
          <a-input v-model:value="renameForm.filename" placeholder="File name" />
        </a-form-item>
        <button type="submit" class="btn-primary btn-block">Save</button>
      </a-form>
    </a-modal>

    <FolderNameDialog
      :open="folderDialog.open"
      :workspace-id="workspaceId"
      :dataset-id="datasetId"
      :parent-id="folderId"
      :folder="folderDialog.folder"
      @close="folderDialog.open = false"
      @saved="onFolderSaved"
    />
    <MoveToDialog
      :open="moveDialog.open"
      :workspace-id="workspaceId"
      :dataset-id="datasetId"
      :dataset-name="dataset?.name ?? ''"
      :current-folder-id="folderId"
      :folder-ids="moveDialog.folderIds"
      :file-ids="moveDialog.fileIds"
      @close="moveDialog.open = false"
      @moved="onMoved"
    />
    <DeleteItemsDialog
      :open="deleteDialog.open"
      :workspace-id="workspaceId"
      :dataset-id="datasetId"
      :items="deleteDialog.items"
      @close="deleteDialog.open = false"
      @deleted="onDeleted"
    />
  </div>
</template>

<style scoped>
.page {
  position: relative;
  padding: 20px 24px;
}

.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  border: 2px dashed var(--brand);
  border-radius: 12px;
  background: var(--brand-tint);
  color: var(--brand);
  font-weight: 600;
  pointer-events: none;
}

.upload-progress {
  margin: 0 0 12px;
  color: var(--ink-3);
  font-size: 13px;
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

.bulk-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

/* Header stats */
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-2);
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

/* Empty folder or search */
.items-none {
  padding: 32px;
  text-align: center;
  color: var(--ink-3);
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

.menu-popup--floating {
  position: fixed;
  right: auto;
  transform: translateX(-100%);
  z-index: 50;
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
