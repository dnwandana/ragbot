<script setup>
import { computed, reactive, ref, watch } from "vue"
import { message } from "ant-design-vue"
import { createFolder, renameFolder } from "@/api/datasetFolders"

const props = defineProps({
  open: { type: Boolean, default: false },
  workspaceId: { type: String, required: true },
  datasetId: { type: String, required: true },
  parentId: { type: String, default: null },
  folder: { type: Object, default: null },
})
const emit = defineEmits(["close", "saved"])
const form = reactive({ name: "" })
const fieldError = ref("")
const saving = ref(false)
const isRename = computed(() => !!props.folder)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.name = props.folder?.name ?? ""
    fieldError.value = ""
  },
  { immediate: true },
)
watch(
  () => form.name,
  () => (fieldError.value = ""),
)

/**
 * Returns the first broken API name rule, so most errors show without a request.
 *
 * @param {string} name - The trimmed folder name
 * @returns {string} The error message, or an empty string when the name is valid
 */
function nameError(name) {
  if (!name) return "Name is required"
  if (name.length > 255) return "Name must be 255 characters or fewer"
  if (name.includes("/")) return 'Name cannot contain "/"'
  if (name === "." || name === "..") return 'Name cannot be "." or ".."'
  return ""
}

/**
 * Saves the folder. A 400 or a 409 shows under the field, and the dialog stays open.
 *
 * @returns {Promise<void>}
 */
async function onSubmit() {
  const name = form.name.trim()
  fieldError.value = nameError(name)
  if (fieldError.value) return
  if (isRename.value && name === props.folder.name) return emit("close")
  saving.value = true
  try {
    const res = isRename.value
      ? await renameFolder(props.workspaceId, props.datasetId, props.folder.id, { name })
      : await createFolder(props.workspaceId, props.datasetId, { parent_id: props.parentId, name })
    emit("saved", res.data.data)
  } catch (err) {
    if (err.status === 400 || err.status === 409) fieldError.value = err.message
    else message.error(err.message || "Could not save the folder")
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <a-modal
    :open="open"
    :title="isRename ? 'Rename folder' : 'New folder'"
    :footer="null"
    :width="480"
    @cancel="emit('close')"
  >
    <a-form :model="form" layout="vertical" style="margin-top: 8px" @finish="onSubmit">
      <a-form-item
        label="Folder name"
        name="name"
        :validate-status="fieldError ? 'error' : ''"
        :help="fieldError || undefined"
      >
        <a-input v-model:value="form.name" placeholder="Folder name" :maxlength="255" />
      </a-form-item>
      <button type="submit" class="btn-primary btn-block" :disabled="saving">
        {{ isRename ? "Save" : "Create folder" }}
      </button>
    </a-form>
  </a-modal>
</template>

<style scoped>
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

.btn-block {
  width: 100%;
  justify-content: center;
  margin-top: 16px;
  padding: 10px;
}
</style>
