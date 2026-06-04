<script setup>
/**
 * DeleteRoleModal — confirm deletion of a custom role, reassigning members when needed.
 *
 * Props:
 *   - open: controls visibility
 *   - role: the role being deleted (expects `id`, `name`, `member_count`); null when closed
 *   - roles: all workspace roles (used to build reassign options)
 *   - loading: disables actions while the request is in flight
 *
 * Emits:
 *   - confirm(reassignToRoleId | undefined) — proceed with deletion
 *   - cancel — dismiss the dialog
 */
import { ref, computed, watch } from "vue"
import { Modal, Select, Button } from "ant-design-vue"

const props = defineProps({
  open: { type: Boolean, default: false },
  role: { type: Object, default: null },
  roles: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(["confirm", "cancel"])

const reassignTo = ref(undefined)

const hasMembers = computed(() => (props.role?.member_count ?? 0) > 0)

/** Custom (non-system) roles always get a reassign control — a tombstoned member may block deletion. */
const isCustom = computed(() => !!props.role && !props.role.is_system)

/** Reassignment targets: every other role except the one being deleted and the owner role. */
const reassignOptions = computed(() =>
  props.roles
    .filter((r) => r.id !== props.role?.id && r.name !== "owner")
    .map((r) => ({ value: r.id, label: r.name })),
)

// On open: preselect a target only when there are active members; otherwise leave it empty so an
// empty role deletes in one click (the control stays available for the rare tombstoned-member case).
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) reassignTo.value = hasMembers.value ? reassignOptions.value[0]?.value : undefined
  },
)

const confirmLabel = computed(() => (hasMembers.value ? "Reassign & delete" : "Delete role"))
const confirmDisabled = computed(() => hasMembers.value && !reassignTo.value)
const reassignLabel = computed(() =>
  hasMembers.value ? "Reassign these members to" : "Reassign any remaining members to (optional)",
)

function handleConfirm() {
  emit("confirm", reassignTo.value || undefined)
}
</script>

<template>
  <Modal
    :open="open"
    :title="role ? `Delete “${role.name}”?` : 'Delete role'"
    :footer="null"
    :mask-closable="!loading"
    @cancel="emit('cancel')"
  >
    <p v-if="hasMembers" class="body-text">
      {{ role.member_count }} {{ role.member_count === 1 ? "member holds" : "members hold" }} this
      role. Reassign them to another role before deleting — they keep workspace access with the new
      role's permissions.
    </p>
    <p v-else class="body-text">This role will be permanently removed. This can't be undone.</p>

    <div v-if="isCustom" class="reassign">
      <span class="field-label">{{ reassignLabel }}</span>
      <Select
        v-model:value="reassignTo"
        :options="reassignOptions"
        :allow-clear="!hasMembers"
        placeholder="Select a role"
        style="width: 100%"
      />
    </div>

    <div class="footer">
      <Button :disabled="loading" @click="emit('cancel')">Cancel</Button>
      <Button
        danger
        type="primary"
        :loading="loading"
        :disabled="confirmDisabled"
        @click="handleConfirm"
      >
        {{ confirmLabel }}
      </Button>
    </div>
  </Modal>
</template>

<style scoped>
.body-text {
  font-size: var(--t-base);
  color: var(--ink-2);
  line-height: 1.55;
  margin: 0 0 14px;
}
.reassign {
  margin-bottom: 8px;
}
.field-label {
  display: block;
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--ink-2);
  margin-bottom: 6px;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
</style>
