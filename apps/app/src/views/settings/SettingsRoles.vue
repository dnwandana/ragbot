<!-- apps/app/src/views/settings/SettingsRoles.vue -->
<script setup>
import { onMounted, computed } from "vue"
import { Button, Tooltip } from "ant-design-vue"
import {
  LockOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons-vue"
import RoleEditor from "@/components/roles/RoleEditor.vue"
import DeleteRoleModal from "@/components/roles/DeleteRoleModal.vue"
import { useRoles } from "@/composables/useRoles"
import { usePermissions } from "@/composables/usePermissions"

const props = defineProps({
  workspaceId: { type: String, required: true },
})

const {
  roles,
  currentRole,
  allPermissions,
  loading,
  view,
  deletingRole,
  fetchRoles,
  fetchAllPermissions,
  openCreate,
  openEdit,
  openView,
  backToList,
  handleSubmit,
  openDelete,
  closeDelete,
  confirmDelete,
} = useRoles()

const { can } = usePermissions()

const canCreate = computed(() => can("role:create"))
const canUpdate = computed(() => can("role:update"))
const canDelete = computed(() => can("role:delete"))
const canManageMembers = computed(() => can("member:manage_role"))
const canManage = computed(() => canCreate.value || canUpdate.value || canDelete.value)

const builtinRoles = computed(() => roles.value.filter((r) => r.is_system))
const customRoles = computed(() => roles.value.filter((r) => !r.is_system))

const editorRole = computed(() => (view.value.mode === "create" ? null : currentRole.value))

onMounted(async () => {
  await Promise.all([fetchRoles(props.workspaceId), fetchAllPermissions()])
})

function memberLabel(count) {
  return `${count ?? 0} ${(count ?? 0) === 1 ? "member" : "members"}`
}

/** Why the delete button is disabled for a role, or "" when it's allowed. */
function deleteDisabledReason(role) {
  if ((role.member_count ?? 0) > 0 && !canManageMembers.value) {
    return "Requires the “Change member roles” permission to reassign members before deleting"
  }
  return ""
}
</script>

<template>
  <!-- Editor view -->
  <RoleEditor
    v-if="view.mode !== 'list' && allPermissions.length"
    :mode="view.mode"
    :role="editorRole"
    :all-permissions="allPermissions"
    :loading="loading"
    @save="handleSubmit(workspaceId, $event)"
    @cancel="backToList"
  />

  <!-- List view -->
  <div v-else class="section-wrap">
    <div class="section-hd">
      <div class="section-title">Roles</div>
      <div class="section-sub">Define what members with each role can do in this workspace.</div>
    </div>

    <div v-if="!canManage" class="readonly-banner">
      <LockOutlined />
      <span>You have read-only access to roles. Ask a workspace admin to make changes.</span>
    </div>

    <!-- Built-in roles -->
    <div class="block-hd">Built-in roles</div>
    <div class="roles-grid">
      <div v-for="role in builtinRoles" :key="role.id" class="role-card">
        <div class="role-card__hd">
          <SafetyCertificateOutlined class="role-icon" />
          <div class="role-name">{{ role.name }}</div>
          <LockOutlined class="role-lock" />
        </div>
        <p class="role-desc">{{ role.description || "System role." }}</p>
        <div class="role-card__foot">
          <span class="chip">{{ memberLabel(role.member_count) }}</span>
          <button class="link-btn" type="button" @click="openView(workspaceId, role)">
            <EyeOutlined /> View
          </button>
        </div>
      </div>
    </div>

    <!-- Custom roles -->
    <div class="block-hd block-hd--spaced">
      <span>Custom roles</span>
      <Button v-if="canCreate" type="primary" size="small" @click="openCreate">
        <template #icon><PlusOutlined /></template>
        Create role
      </Button>
    </div>

    <div v-if="customRoles.length === 0" class="empty">
      <SafetyCertificateOutlined class="empty-icon" />
      <div class="empty-title">No custom roles yet</div>
      <div class="empty-sub">Create a role to grant a precise set of permissions.</div>
      <Button v-if="canCreate" @click="openCreate">
        <template #icon><PlusOutlined /></template>
        Create role
      </Button>
    </div>

    <div v-else class="custom-list">
      <div v-for="role in customRoles" :key="role.id" class="custom-row">
        <SafetyCertificateOutlined class="custom-icon" />
        <div class="custom-text">
          <div class="role-name">{{ role.name }}</div>
          <div class="custom-desc">{{ role.description || "Custom role." }}</div>
        </div>
        <div class="custom-count">
          <div class="count-num">{{ role.member_count ?? 0 }}</div>
          <div class="count-label">members</div>
        </div>
        <div class="custom-actions">
          <Button
            size="small"
            @click="canUpdate ? openEdit(workspaceId, role) : openView(workspaceId, role)"
          >
            <template #icon><EditOutlined v-if="canUpdate" /><EyeOutlined v-else /></template>
            {{ canUpdate ? "Edit" : "View" }}
          </Button>
          <Tooltip v-if="canDelete" :title="deleteDisabledReason(role)">
            <Button
              size="small"
              danger
              :disabled="!!deleteDisabledReason(role)"
              @click="openDelete(role)"
            >
              <template #icon><DeleteOutlined /></template>
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>

    <DeleteRoleModal
      :open="!!deletingRole"
      :role="deletingRole"
      :roles="roles"
      :loading="loading"
      @confirm="confirmDelete(workspaceId, $event)"
      @cancel="closeDelete"
    />
  </div>
</template>

<style scoped>
.section-wrap {
  padding: 28px 36px 60px;
  max-width: 900px;
}
.section-hd {
  margin-bottom: 18px;
}
.section-title {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 3px;
}
.section-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.readonly-banner {
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
.block-hd {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 12px;
}
.block-hd--spaced {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 28px;
}
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.role-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  padding: 16px;
  box-shadow: var(--shadow-1);
}
.role-card__hd {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.role-icon {
  color: var(--ink-3);
  font-size: 17px;
}
.role-name {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
  text-transform: capitalize;
}
.role-lock {
  margin-left: auto;
  color: var(--ink-4);
  font-size: 13px;
}
.role-desc {
  font-size: var(--t-sm);
  color: var(--ink-3);
  line-height: 1.5;
  margin: 0 0 12px;
  min-height: 40px;
}
.role-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: var(--t-xs);
  font-weight: 500;
  background: var(--bg-2);
  color: var(--ink-4);
  border: 1px solid var(--line);
}
.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--brand-3, var(--brand));
  cursor: pointer;
  font-size: var(--t-sm);
  font-weight: 600;
  padding: 0;
}
.empty {
  text-align: center;
  padding: 44px 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
}
.empty-icon {
  font-size: 26px;
  color: var(--ink-4);
  margin-bottom: 10px;
}
.empty-title {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
}
.empty-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin: 4px 0 16px;
}
.custom-list {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
}
.custom-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}
.custom-row:last-child {
  border-bottom: none;
}
.custom-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--r);
  background: var(--brand-tint);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 17px;
}
.custom-text {
  flex: 1;
  min-width: 0;
}
.custom-desc {
  font-size: var(--t-sm);
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 420px;
}
.custom-count {
  text-align: right;
}
.count-num {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
}
.count-label {
  font-size: var(--t-xs);
  color: var(--ink-4);
}
.custom-actions {
  display: flex;
  gap: 4px;
}
</style>
