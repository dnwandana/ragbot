<!-- apps/app/src/views/settings/SettingsMembers.vue -->
<script setup>
import { onMounted } from "vue"
import MembersTable from "@/components/MembersTable.vue"
import InvitationsTable from "@/components/InvitationsTable.vue"
import InviteFormModal from "@/components/InviteFormModal.vue"
import { useRoles } from "@/composables/useRoles"
import { useInvitations } from "@/composables/useInvitations"
import { useMembers } from "@/composables/useMembers"
import { usePermissions } from "@/composables/usePermissions"

const props = defineProps({
  workspaceId: { type: String, required: true },
})

const { roles, fetchRoles } = useRoles()
const {
  isInviteModalVisible,
  openInviteModal,
  closeInviteModal,
  handleInvite,
  loading: isInviteLoading,
} = useInvitations()
const {
  members,
  loading: membersLoading,
  fetchMembers,
  handleRoleChange,
  handleRemove,
} = useMembers()
const { can } = usePermissions()

onMounted(() => {
  fetchRoles(props.workspaceId)
  fetchMembers(props.workspaceId)
})
</script>

<template>
  <div class="section-wrap">
    <div class="section-hd">
      <div class="hd-left">
        <div class="section-title">Members</div>
        <div class="section-sub">Manage who has access to this workspace.</div>
      </div>
      <button v-if="can('member:invite')" class="btn-primary" @click="openInviteModal">
        + Invite people
      </button>
    </div>

    <MembersTable
      :members="members"
      :roles="roles"
      :loading="membersLoading"
      :can-update-role="can('member:manage_role')"
      :can-remove="can('member:remove')"
      @role-change="({ memberId, roleId }) => handleRoleChange(workspaceId, memberId, roleId)"
      @remove="(memberId) => handleRemove(workspaceId, memberId)"
    />

    <div class="sub-section-hd">Pending invitations</div>
    <InvitationsTable :workspace-id="workspaceId" />

    <InviteFormModal
      :visible="isInviteModalVisible"
      :roles="roles"
      :loading="isInviteLoading"
      @close="closeInviteModal"
      @submit="(payload) => handleInvite(workspaceId, payload)"
    />
  </div>
</template>

<style scoped>
.section-wrap {
  padding: 28px 36px 60px;
  max-width: 900px;
}
.section-hd {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.hd-left {
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
.sub-section-hd {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
  margin: 24px 0 10px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-primary:hover {
  background: var(--brand-2);
}
</style>
