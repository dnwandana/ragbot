<script setup>
/**
 * RoleDrawer — slide-in create/edit/view drawer for a workspace role.
 *
 * Overlays the still-visible roles list (a-drawer with mask), replacing the
 * former full-page RoleEditor. The host controls visibility via the `open` prop.
 *
 * Props:
 *   - open: when true the drawer is shown
 *   - mode: "create" | "edit" | "view"
 *   - role: the role object (with `permissions`) for edit/view; null for create
 *   - allPermissions: flat array of all permissions from the API
 *   - loading: disables the save button while a request is in flight
 *
 * Emits:
 *   - save({ name, description, permission_ids }) — validated payload matching the API contract
 *     (the server's create/update schemas require `permission_ids`, an array of permission UUIDs)
 *   - cancel — close the drawer without saving (close button, Cancel, or mask click)
 */
import { ref, computed, watch, onUnmounted, nextTick } from "vue"
import { Input, Button, message } from "ant-design-vue"
import { Lock } from "lucide-vue-next"
import RolePermissionMatrix from "@/components/roles/RolePermissionMatrix.vue"

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: {
    type: String,
    required: true,
    validator: (v) => ["create", "edit", "view"].includes(v),
  },
  role: { type: Object, default: null },
  allPermissions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(["save", "cancel"])

const closeBtnEl = ref(null)
const drawerInnerEl = ref(null)
let lastFocused = null

/** Close the drawer unless a save is in flight. Shared by the close button, Cancel, and a-drawer @close. */
function requestCancel() {
  if (!props.loading) emit("cancel")
}

/** Close the drawer on Escape (document-level so it works without focus inside). */
function onKeydown(e) {
  if (e.key === "Escape") requestCancel()
}

/** Trap Tab focus inside the drawer so keyboard users can't reach the page behind the mask. */
function onTabKeydown(e) {
  if (!props.open || e.key !== "Tab" || !drawerInnerEl.value) return
  const focusables = drawerInnerEl.value.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      document.addEventListener("keydown", onKeydown)
      lastFocused = document.activeElement
      nextTick(() => closeBtnEl.value?.focus())
    } else {
      document.removeEventListener("keydown", onKeydown)
      lastFocused?.focus?.()
      lastFocused = null
    }
  },
  { immediate: true },
)

onUnmounted(() => document.removeEventListener("keydown", onKeydown))

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
  <a-drawer
    :open="open"
    placement="right"
    :width="560"
    :closable="false"
    :mask="true"
    root-class-name="role-drawer-root"
    :body-style="{ padding: 0 }"
    :header-style="{ display: 'none' }"
    @close="requestCancel"
  >
    <div
      ref="drawerInnerEl"
      class="drawer-inner"
      role="dialog"
      aria-modal="true"
      aria-label="Role form"
      @keydown="onTabKeydown"
    >
      <!-- Header -->
      <div class="drawer-head">
        <div class="head-info">
          <div class="drawer-title">{{ title }}</div>
          <div class="drawer-sub">{{ subtitle }}</div>
        </div>
        <button
          ref="closeBtnEl"
          class="close-btn"
          :disabled="loading"
          aria-label="Close"
          @click="requestCancel"
        >
          ✕
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="drawer-body" :class="{ 'drawer-body--readonly': readOnly }">
        <div v-if="readOnly" class="locked-banner">
          <Lock :size="16" />
          <span>Built-in roles are locked. Create a custom role if you need a variation.</span>
        </div>

        <div v-if="!readOnly" class="fields">
          <label class="field">
            <span class="field-label">Role name</span>
            <Input
              v-model:value="name"
              class="name-input"
              placeholder="e.g. Compliance reviewer"
              :maxlength="50"
            />
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

        <!-- Sticky footer -->
        <div v-if="!readOnly" class="drawer-foot">
          <Button class="btn-cancel" :disabled="loading" @click="requestCancel">Cancel</Button>
          <Button class="btn-save" type="primary" :loading="loading" @click="handleSave">
            {{ mode === "edit" ? "Save role" : "Create role" }}
          </Button>
        </div>
      </div>
    </div>
  </a-drawer>
</template>

<style>
.role-drawer-root .drawer-inner {
  height: 100%;
  background: var(--surface);
  display: flex;
  flex-direction: column;
}

.role-drawer-root .drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.role-drawer-root .head-info {
  flex: 1;
  min-width: 0;
}

.role-drawer-root .drawer-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.015em;
}

.role-drawer-root .drawer-sub {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}

.role-drawer-root .close-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line-2);
  background: var(--surface);
  border-radius: var(--r-sm);
  font-size: 13px;
  color: var(--ink-3);
  cursor: pointer;
}

.role-drawer-root .close-btn:hover {
  background: var(--bg-2);
  color: var(--ink);
}

.role-drawer-root .close-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.role-drawer-root .drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 0;
}

/* In read-only (view) mode the footer is hidden, so restore the end padding
   it would otherwise provide below the permission matrix. */
.role-drawer-root .drawer-body--readonly {
  padding-bottom: 24px;
}

.role-drawer-root .locked-banner {
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

.role-drawer-root .fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
}

.role-drawer-root .field {
  display: block;
}

.role-drawer-root .field-label {
  display: block;
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--ink-2);
  margin-bottom: 6px;
}

.role-drawer-root .perms-hd {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}

.role-drawer-root .perms-title {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
}

.role-drawer-root .perms-count {
  font-size: var(--t-sm);
  color: var(--ink-3);
}

.role-drawer-root .drawer-foot {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 0 20px;
  background: var(--surface);
  border-top: 1px solid var(--line);
  margin-top: 24px;
}
</style>
