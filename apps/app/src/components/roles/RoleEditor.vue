<script setup>
/**
 * RoleEditor — full-page create/edit/view editor for a workspace role.
 *
 * Props:
 *   - mode: "create" | "edit" | "view"
 *   - role: the role object (with `permissions`) for edit/view; null for create
 *   - allPermissions: flat array of all permissions from the API
 *   - loading: disables the save button while a request is in flight
 *
 * Emits:
 *   - save({ name, description, permission_ids }) — validated payload matching the API contract
 *     (the server's create/update schemas require `permission_ids`, an array of permission UUIDs)
 *   - cancel — leave the editor without saving
 */
import { ref, computed, watch } from "vue"
import { Input, Button, message } from "ant-design-vue"
import { ArrowLeft, Lock } from "lucide-vue-next"
import RolePermissionMatrix from "@/components/roles/RolePermissionMatrix.vue"

const props = defineProps({
  mode: { type: String, required: true },
  role: { type: Object, default: null },
  allPermissions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(["save", "cancel"])

const readOnly = computed(() => props.mode === "view")

const name = ref("")
const description = ref("")
const selectedPermissions = ref([])

/** Default selection for a brand-new role: the core read permissions. */
function createDefaults() {
  const defaults = ["workspace:read", "role:read", "member:read"]
  return props.allPermissions.filter((p) => defaults.includes(p.name)).map((p) => p.id)
}

/** Populate local form state from the current mode/role. */
function syncFromProps() {
  if (props.mode === "create") {
    name.value = ""
    description.value = ""
    selectedPermissions.value = createDefaults()
    return
  }
  name.value = props.role?.name ?? ""
  description.value = props.role?.description ?? ""
  selectedPermissions.value = Array.isArray(props.role?.permissions)
    ? props.role.permissions.map((p) => p.id)
    : []
}

watch(() => [props.mode, props.role], syncFromProps, { immediate: true })

const title = computed(() => {
  if (props.mode === "view") return props.role?.name ?? "Role"
  if (props.mode === "edit") return "Edit role"
  return "Create role"
})

const subtitle = computed(() =>
  readOnly.value
    ? "This is a built-in role. Its permissions can be viewed but not changed."
    : "Define what members with this role can do across the workspace.",
)

function handleSave() {
  if (!name.value.trim()) {
    message.error("Give the role a name.")
    return
  }
  if (selectedPermissions.value.length === 0) {
    message.error("Select at least one permission.")
    return
  }
  emit("save", {
    name: name.value.trim(),
    description: description.value.trim() || undefined,
    permission_ids: [...selectedPermissions.value],
  })
}
</script>

<template>
  <div class="editor">
    <button class="back" type="button" @click="emit('cancel')">
      <ArrowLeft :size="16" /> Back to roles
    </button>

    <div class="editor-hd">
      <div class="editor-title">{{ title }}</div>
      <div class="editor-sub">{{ subtitle }}</div>
    </div>

    <div v-if="readOnly" class="locked-banner">
      <Lock :size="16" />
      <span>Built-in roles are locked. Create a custom role if you need a variation.</span>
    </div>

    <div v-if="!readOnly" class="fields">
      <label class="field">
        <span class="field-label">Role name</span>
        <Input v-model:value="name" placeholder="e.g. Compliance reviewer" :maxlength="50" />
      </label>
      <label class="field">
        <span class="field-label">Description</span>
        <Input.TextArea
          v-model:value="description"
          :rows="2"
          :maxlength="140"
          placeholder="Who should hold this role and why"
        />
      </label>
    </div>

    <div class="perms-hd">
      <span class="perms-title">Permissions</span>
      <span class="perms-count"
        >{{ selectedPermissions.length }} of {{ allPermissions.length }} enabled</span
      >
    </div>

    <RolePermissionMatrix
      v-model="selectedPermissions"
      :permissions="allPermissions"
      :editable="!readOnly"
    />

    <div v-if="!readOnly" class="footer">
      <Button :disabled="loading" @click="emit('cancel')">Cancel</Button>
      <Button type="primary" :loading="loading" @click="handleSave">
        {{ mode === "edit" ? "Save role" : "Create role" }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.editor {
  padding: 28px 36px 60px;
  max-width: 900px;
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--ink-3);
  cursor: pointer;
  font-size: var(--t-sm);
  padding: 0;
  margin-bottom: 16px;
}
.editor-hd {
  margin-bottom: 18px;
}
.editor-title {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
}
.editor-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 3px;
}
.locked-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--r);
  font-size: var(--t-sm);
  color: var(--ink-2);
  margin-bottom: 20px;
}
.fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
}
.field {
  display: block;
  max-width: 420px;
}
.field-label {
  display: block;
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--ink-2);
  margin-bottom: 6px;
}
.perms-hd {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}
.perms-title {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
}
.perms-count {
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
</style>
