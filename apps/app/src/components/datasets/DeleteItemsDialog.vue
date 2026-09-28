<script setup>
import { computed, ref, watch } from "vue"
import { summarizeItems, deleteItems } from "@/api/datasetItems"

const props = defineProps({
  open: { type: Boolean, default: false },
  workspaceId: { type: String, required: true },
  datasetId: { type: String, required: true },
  items: { type: Array, default: () => [] },
})
const emit = defineEmits(["close", "deleted"])
const summary = ref(null)
const deleting = ref(false)
const error = ref("")
// A newer open replaces the summary request of an older open.
let seq = 0

const ids = computed(() => ({
  folder_ids: props.items.filter((i) => i.kind === "folder").map((i) => i.id),
  file_ids: props.items.filter((i) => i.kind === "file").map((i) => i.id),
}))

/**
 * Returns a count with a singular or a plural noun.
 *
 * @param {number} n - The count
 * @param {string} word - The singular noun
 * @returns {string} For example "1 file" or "3 files"
 */
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`

const single = computed(() => (props.items.length === 1 ? props.items[0] : null))
const title = computed(() =>
  single.value ? `Delete ${single.value.kind}?` : `Delete ${props.items.length} items?`,
)
const subject = computed(() =>
  single.value ? (single.value.name ?? single.value.filename) : plural(props.items.length, "item"),
)
// The subfolder count excludes the selected folders. The file count includes the selected files.
const detail = computed(() => {
  if (!ids.value.folder_ids.length || !summary.value || summary.value.unknown) return ""
  const subfolders = summary.value.folders - ids.value.folder_ids.length
  return `This includes ${plural(subfolders, "subfolder")} and ${plural(summary.value.files, "file")}.`
})
const counting = computed(() => ids.value.folder_ids.length > 0 && !summary.value)

/**
 * Loads the counts of the selection when the dialog opens. A file-only selection needs no request.
 *
 * @param {boolean} open - The new value of the `open` prop
 * @returns {Promise<void>}
 */
async function loadSummary(open) {
  if (!open) return
  const mine = ++seq
  summary.value = null
  error.value = ""
  if (!ids.value.folder_ids.length) return
  try {
    const res = await summarizeItems(props.workspaceId, props.datasetId, ids.value)
    if (mine === seq) summary.value = res.data.data
  } catch {
    // The global toast shows the error. The delete stays possible without the counts.
    if (mine === seq) summary.value = { unknown: true }
  }
}

watch(() => props.open, loadSummary, { immediate: true })

/**
 * Deletes the selection and emits the deleted counts. An error shows in the dialog.
 *
 * @returns {Promise<void>}
 */
async function onConfirm() {
  deleting.value = true
  error.value = ""
  try {
    const res = await deleteItems(props.workspaceId, props.datasetId, ids.value)
    emit("deleted", res.data.data.deleted)
  } catch (err) {
    error.value = err.message || "Could not delete the items"
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <a-modal
    :open="open"
    :title="title"
    ok-text="Delete"
    ok-type="danger"
    cancel-text="Cancel"
    :ok-button-props="{ disabled: counting }"
    :confirm-loading="deleting"
    @ok="onConfirm"
    @cancel="emit('close')"
  >
    <p style="margin: 8px 0">
      <strong>{{ subject }}</strong> will be permanently removed.
    </p>
    <p v-if="counting" class="muted">Counting the items…</p>
    <p v-else-if="detail">{{ detail }}</p>
    <p style="margin: 8px 0">
      The indexed data of every file is removed too. You cannot undo this.
    </p>
    <p v-if="error" class="delete-error" role="alert">{{ error }}</p>
  </a-modal>
</template>

<style scoped>
.muted {
  color: var(--ink-3);
}

.delete-error {
  color: var(--err);
  margin: 8px 0 0;
}
</style>
