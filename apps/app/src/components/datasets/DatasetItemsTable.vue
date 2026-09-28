<script setup>
import { computed, ref } from "vue"
import { Folder, LoaderCircle } from "lucide-vue-next"
import { useFormattedTime } from "@/composables/useFormattedTime"
import { humanSize, fileType, statusLabel, statusChipClass } from "@/utils/files"
import { ACTIVE_STATUSES } from "@/stores/datasetItems"
import { itemKey, readDragKeys, writeDragKeys } from "./itemKeys"

const props = defineProps({
  items: { type: Array, required: true },
  selected: { type: Set, required: true },
  selectable: { type: Boolean, default: false },
  hasMore: { type: Boolean, default: false },
  loadingMore: { type: Boolean, default: false },
  draggable: { type: Boolean, default: false },
})
const emit = defineEmits([
  "update:selected",
  "open-folder",
  "open-file",
  "menu",
  "load-more",
  "move",
])
const { shortDate } = useFormattedTime()

const keys = computed(() => props.items.map(itemKey))
const allSelected = computed(
  () => keys.value.length > 0 && keys.value.every((k) => props.selected.has(k)),
)
const someSelected = computed(
  () => !allSelected.value && keys.value.some((k) => props.selected.has(k)),
)
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`
const countLabel = (c) => `${plural(c.folders, "folder")} · ${plural(c.files, "file")}`
const pathLabel = (item) => item.path.map((p) => p.name).join(" / ")

/** Returns the second line of a folder row: the counts, then the path of a search result. */
function folderMeta(item) {
  const parts = []
  if (item.item_count) parts.push(countLabel(item.item_count))
  if (item.path?.length) parts.push(`in ${pathLabel(item)}`)
  return parts.join(" · ")
}

// The parent owns the Set, so the table emits a copy and never changes the prop.
function toggleOne(key) {
  const next = new Set(props.selected)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  emit("update:selected", next)
}

const toggleAll = (checked) => emit("update:selected", checked ? new Set(keys.value) : new Set())

// Browsers hide drag data until the drop. The table keeps the keys of its own drag here.
const dragSet = ref(null)
const overKey = ref(null)

// overKey is set only while dragSet is set, so dragSet is never null when over is true.
function rowClass(item, key) {
  const over = overKey.value === key
  return {
    "file-row--selected": props.selected.has(key),
    "row--drop": over && !dragSet.value.has(key),
    "row--invalid": over && dragSet.value.has(key),
  }
}

/** Starts a drag. A selected row carries the whole selection, other rows carry only themselves. */
function onDragStart(event, key) {
  const dragged = props.selected.has(key) ? [...props.selected] : [key]
  dragSet.value = new Set(dragged)
  writeDragKeys(event.dataTransfer, dragged)
}

function onDragEnd() {
  dragSet.value = null
  overKey.value = null
}

// Only a folder row accepts a drop, and only for a drag that started in this table. A drag of
// files from the computer continues up to the view.
function onDragOver(event, item, key) {
  if (item.kind !== "folder" || !dragSet.value) return
  event.preventDefault()
  overKey.value = key
}

function onDrop(event, item, key) {
  overKey.value = null
  if (item.kind !== "folder" || !dragSet.value) return
  event.preventDefault()
  event.stopPropagation()
  const dragged = readDragKeys(event.dataTransfer)
  if (dragged && !dragSet.value.has(key)) emit("move", { targetId: item.id, keys: dragged })
}

function onRowClick(item) {
  if (item.kind === "folder") emit("open-folder", item.id)
  else emit("open-file", item)
}
</script>

<template>
  <div class="file-table">
    <!-- Header row -->
    <div class="file-cols file-thead">
      <div>
        <input
          v-if="selectable"
          type="checkbox"
          class="cb"
          aria-label="Select all items"
          :checked="allSelected"
          :indeterminate.prop="someSelected"
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

    <!-- Item rows: the items prop already puts the folders first -->
    <div
      v-for="(item, i) in items"
      :key="keys[i]"
      class="file-cols file-row"
      :class="rowClass(item, keys[i])"
      :draggable="draggable"
      @click="onRowClick(item)"
      @dragstart="onDragStart($event, keys[i])"
      @dragend="onDragEnd"
      @dragover="onDragOver($event, item, keys[i])"
      @dragleave="overKey = null"
      @drop="onDrop($event, item, keys[i])"
    >
      <div @click.stop>
        <input
          v-if="selectable"
          type="checkbox"
          class="cb"
          :aria-label="'Select ' + (item.kind === 'folder' ? item.name : item.filename)"
          :checked="selected.has(keys[i])"
          @change="toggleOne(keys[i])"
        />
      </div>

      <template v-if="item.kind === 'folder'">
        <div><Folder :size="15" :stroke-width="1.7" class="folder-icon" /></div>
        <div class="col-name">
          <span class="file-name">{{ item.name }}</span>
          <span v-if="item.item_count || item.path?.length" class="item-meta">{{
            folderMeta(item)
          }}</span>
        </div>
        <div class="col-right mono">—</div>
        <div class="mono">—</div>
        <div></div>
      </template>

      <template v-else>
        <div>
          <span
            class="type-badge"
            :class="`type-${fileType(item.filename, item.metadata?.source_type)}`"
            >{{ fileType(item.filename, item.metadata?.source_type) }}</span
          >
        </div>
        <div class="col-name">
          <span class="file-name">{{ item.filename }}</span>
          <span v-if="item.path?.length" class="item-meta">in {{ pathLabel(item) }}</span>
          <span v-if="item.status === 'failed' && item.error_message" class="file-error">{{
            item.error_message
          }}</span>
        </div>
        <div class="col-right mono">{{ humanSize(item.file_size_bytes) }}</div>
        <div class="mono" :style="{ color: item.chunk_count ? 'var(--ink-2)' : 'var(--ink-4)' }">
          {{ item.chunk_count || "—" }}
        </div>
        <div>
          <span class="chip" :class="statusChipClass(item.status)">
            <span class="status-dot" :class="{ pulse: ACTIVE_STATUSES.includes(item.status) }" />
            {{ statusLabel(item.status) }}
          </span>
        </div>
      </template>

      <div class="muted">{{ shortDate(item.created_at) || "—" }}</div>
      <div @click.stop>
        <button
          class="row-menu-btn"
          :aria-label="item.kind === 'folder' ? 'Folder options' : 'File options'"
          @click="emit('menu', { event: $event, item })"
        >
          ⋯
        </button>
      </div>
    </div>

    <div v-if="hasMore" class="load-more">
      <button class="load-more-btn" :disabled="loadingMore" @click="emit('load-more')">
        <LoaderCircle v-if="loadingMore" :size="13" :stroke-width="2" class="spin" />
        Load more
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Copied from the file table of DatasetDetailView.vue */
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

.type-youtube {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.2);
}

.type-docx {
  background: #f0f4ff;
  color: #1d4ed8;
  border-color: rgba(29, 78, 216, 0.2);
}

.type-tabular {
  background: rgba(16, 124, 65, 0.1);
  color: #107c41;
  border-color: rgba(16, 124, 65, 0.2);
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

.row--drop {
  outline: 1px dashed var(--brand);
  outline-offset: -1px;
  background: var(--brand-tint);
}

.row--invalid {
  outline: 1px dashed var(--err);
  outline-offset: -1px;
}

.folder-icon {
  color: var(--brand);
}

.item-meta {
  font-size: 11.5px;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 12px;
  border-top: 1px solid var(--line);
}

.load-more-btn {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 6px 14px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  cursor: pointer;
}

.load-more-btn:disabled {
  cursor: default;
  opacity: 0.6;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
