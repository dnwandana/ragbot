<template>
  <a-modal
    :open="open"
    :title="`Move ${count} item${count === 1 ? '' : 's'}`"
    :width="480"
    ok-text="Move here"
    :ok-button-props="{ disabled: target === undefined }"
    :confirm-loading="moving"
    @ok="confirm"
    @cancel="emit('close')"
  >
    <div class="tree" role="tree">
      <template v-for="row in rows" :key="row.key">
        <button
          v-if="row.more"
          class="tree-more"
          :style="{ paddingLeft: `${row.depth * 18 + 26}px` }"
          :disabled="row.more.loading"
          @click="loadChildren(row.more.id, row.more.nextCursor)"
        >
          Show more
        </button>
        <div
          v-else
          class="tree-row"
          role="treeitem"
          :aria-selected="target === row.node.id"
          :aria-disabled="row.disabled"
          :style="{ paddingLeft: `${row.depth * 18}px` }"
          :class="{
            'tree-row--selected': target === row.node.id,
            'tree-row--disabled': row.disabled,
          }"
          @click="!row.disabled && (target = row.node.id)"
        >
          <span class="tree-toggle">
            <button
              v-if="row.node.hasChildren && !movedIds.has(row.node.id)"
              :aria-label="row.node.expanded ? 'Collapse' : 'Expand'"
              @click.stop="toggle(row.node.id)"
            >
              <LoaderCircle v-if="row.node.loading" :size="12" class="spin" />
              <ChevronRight v-else :size="12" :class="{ open: row.node.expanded }" />
            </button>
          </span>
          <House v-if="row.node.id === null" :size="14" :stroke-width="1.7" />
          <Folder v-else :size="14" :stroke-width="1.7" />
          <span class="tree-name">{{ row.node.name }}</span>
        </div>
      </template>
    </div>
    <p v-if="error" class="move-error" role="alert">{{ error }}</p>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue"
import { ChevronRight, Folder, House, LoaderCircle } from "lucide-vue-next"
import { listFolders } from "@/api/datasetFolders"
import { moveItems } from "@/api/datasetItems"

const props = defineProps({
  open: Boolean,
  workspaceId: { type: String, required: true },
  datasetId: { type: String, required: true },
  datasetName: { type: String, default: "" },
  currentFolderId: { type: String, default: null },
  folderIds: { type: Array, default: () => [] },
  fileIds: { type: Array, default: () => [] },
})
const emit = defineEmits(["close", "moved"])

const ROOT = "root"
// One entry for each loaded folder, by id. The root has the key ROOT.
const nodes = reactive(new Map())
// `undefined` means no selection. `null` is the dataset root.
const target = ref(undefined)
const error = ref("")
const moving = ref(false)
const movedIds = computed(() => new Set(props.folderIds))
const count = computed(() => props.folderIds.length + props.fileIds.length)
const keyOf = (id) => id ?? ROOT
const newNode = (id, name, hasChildren) => ({
  id,
  name,
  hasChildren,
  children: null,
  nextCursor: null,
  expanded: false,
  loading: false,
})
// A moved folder is disabled and cannot expand, so its subfolders never show.
const isDisabled = (id) => movedIds.value.has(id) || id === props.currentFolderId

/**
 * Loads one page of the child folders of a node and appends them to the node.
 *
 * @param {string|null} id - Folder UUID, or `null` for the dataset root
 * @param {string|null} [cursor] - Cursor of the next page, or `null` for the first page
 * @returns {Promise<void>} Resolves when the page is in the tree
 */
async function loadChildren(id, cursor = null) {
  const node = nodes.get(keyOf(id))
  node.loading = true
  try {
    const params = { ...(id && { parent_id: id }), ...(cursor && { cursor }) }
    const res = await listFolders(props.workspaceId, props.datasetId, params)
    const { items, next_cursor } = res.data.data
    for (const f of items) {
      if (!nodes.has(f.id)) nodes.set(f.id, newNode(f.id, f.name, f.has_children))
    }
    node.children ??= []
    node.children.push(...items.map((f) => f.id))
    node.nextCursor = next_cursor
  } finally {
    node.loading = false
  }
}

/**
 * Expands or collapses a node. The first expand loads the children. Later expands use the cache.
 *
 * @param {string|null} id - Folder UUID, or `null` for the dataset root
 * @returns {Promise<void>} Resolves when the children are loaded, if a load is necessary
 */
async function toggle(id) {
  const node = nodes.get(keyOf(id))
  node.expanded = !node.expanded
  if (node.expanded && node.children === null) await loadChildren(id)
}

// Each open starts from a fresh tree, so a moved or renamed folder never shows stale.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    nodes.clear()
    nodes.set(ROOT, { ...newNode(null, props.datasetName, true), expanded: true })
    target.value = undefined
    error.value = ""
    loadChildren(null)
  },
  { immediate: true },
)

/**
 * Moves the selected items into the target folder and emits `moved`.
 * A failure keeps the dialog open and shows the server message.
 *
 * @returns {Promise<void>} Resolves when the move request is complete
 */
async function confirm() {
  if (target.value === undefined) return
  moving.value = true
  error.value = ""
  try {
    const body = {
      folder_ids: props.folderIds,
      file_ids: props.fileIds,
      target_folder_id: target.value,
    }
    await moveItems(props.workspaceId, props.datasetId, body)
    emit("moved", { targetId: target.value })
  } catch (err) {
    error.value = err.message || "Could not move the items"
  } finally {
    moving.value = false
  }
}

// A depth-first walk over the expanded nodes only. The cost is O(visible rows).
const rows = computed(() => {
  const out = []
  const walk = (key, depth) => {
    const node = nodes.get(key)
    out.push({ key, node, depth, disabled: isDisabled(node.id) })
    if (!node.expanded || movedIds.value.has(node.id)) return
    for (const child of node.children ?? []) walk(child, depth + 1)
    if (node.nextCursor) out.push({ key: `more:${key}`, more: node, depth: depth + 1 })
  }
  if (nodes.has(ROOT)) walk(ROOT, 0)
  return out
})
</script>

<style scoped>
.tree {
  max-height: 360px;
  overflow: auto;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  border-radius: 6px;
  color: var(--ink);
  cursor: pointer;
}

.tree-row:hover {
  background: var(--bg-2);
}

.tree-row--selected,
.tree-row--selected:hover {
  background: var(--brand-tint);
}

.tree-row--disabled,
.tree-row--disabled:hover {
  background: none;
  opacity: 0.45;
  cursor: not-allowed;
}

.tree-toggle {
  display: inline-flex;
  justify-content: center;
  width: 18px;
  flex-shrink: 0;
}

.tree-toggle button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink-3);
  cursor: pointer;
}

.tree-toggle .open {
  transform: rotate(90deg);
}

.tree-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tree-more {
  display: block;
  height: 26px;
  padding-right: 0;
  border: 0;
  background: none;
  color: var(--brand);
  font-size: var(--text-sm);
  cursor: pointer;
}

.tree-more:disabled {
  opacity: 0.6;
  cursor: default;
}

.move-error {
  margin: 12px 0 0;
  color: var(--err);
  font-size: var(--text-sm);
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
