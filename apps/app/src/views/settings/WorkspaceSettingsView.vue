<script setup>
import { ref, onMounted } from "vue"
import { message, Modal } from "ant-design-vue"
import { useRoute, useRouter } from "vue-router"
import MembersTable from "@/components/MembersTable.vue"
import InvitationsTable from "@/components/InvitationsTable.vue"
import RoleFormModal from "@/components/RoleFormModal.vue"
import InviteFormModal from "@/components/InviteFormModal.vue"
import { useRoles } from "@/composables/useRoles"
import { useInvitations } from "@/composables/useInvitations"
import { useMembers } from "@/composables/useMembers"
import { usePermissions } from "@/composables/usePermissions"
import { useWorkspacesStore } from "@/stores/workspaces"

const route = useRoute()
const router = useRouter()
const workspaceId = route.params.workspaceId
const activeTab = ref("general")

const workspacesStore = useWorkspacesStore()
const workspaceName = ref("")
const isSavingName = ref(false)

const { roles, fetchRoles } = useRoles(workspaceId)
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

onMounted(async () => {
  await workspacesStore.fetchWorkspaceById(workspaceId)
  workspaceName.value = workspacesStore.currentWorkspace?.name ?? ""
  fetchRoles(workspaceId)
  fetchMembers(workspaceId)
})

async function handleSaveName() {
  const trimmedName = workspaceName.value.trim()
  if (!trimmedName) return
  isSavingName.value = true
  try {
    await workspacesStore.updateWorkspace(workspaceId, { name: trimmedName })
    message.success("Workspace name updated")
  } finally {
    isSavingName.value = false
  }
}

function handleDeleteWorkspace() {
  Modal.confirm({
    title: "Delete workspace",
    content:
      "This will permanently delete the workspace and all its data — datasets, agents, conversations, and members. This action cannot be undone.",
    okText: "Delete workspace",
    okType: "danger",
    cancelText: "Cancel",
    onOk: async () => {
      try {
        await workspacesStore.deleteWorkspace(workspaceId)
        message.success("Workspace deleted")
        router.push("/workspaces")
      } catch {
        // HTTP client already showed message.error(); no rethrow needed
      }
    },
  })
}
</script>

<template>
  <div class="page">
    <!-- Page head -->
    <div class="page-head">
      <div>
        <div class="page-title">Workspace settings</div>
        <div class="page-sub">Manage your workspace configuration and access.</div>
      </div>
      <div class="page-actions">
        <button class="btn-brand" @click="openInviteModal">
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
          >
            <path d="M8 3v10M3 8h10" stroke-linecap="round" />
          </svg>
          Invite people
        </button>
      </div>
    </div>

    <!-- Page-level tabs -->
    <div class="tabs">
      <button
        class="tab"
        :class="{ active: activeTab === 'general' }"
        @click="activeTab = 'general'"
      >
        General
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'members' }"
        @click="activeTab = 'members'"
      >
        Members
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'invites' }"
        @click="activeTab = 'invites'"
      >
        Pending invites
      </button>
      <button class="tab" :class="{ active: activeTab === 'roles' }" @click="activeTab = 'roles'">
        Roles
      </button>
    </div>

    <!-- General tab -->
    <div v-if="activeTab === 'general'" class="tab-panel">
      <div class="settings-card">
        <div class="settings-card__hd">
          <div class="settings-card__title">Workspace name</div>
          <div class="settings-card__sub">This is the display name for your workspace.</div>
        </div>
        <div class="settings-card__body">
          <div class="name-row">
            <a-input
              v-model:value="workspaceName"
              placeholder="Workspace name"
              class="name-input"
            />
            <button class="btn-brand" :disabled="isSavingName" @click="handleSaveName">
              {{ isSavingName ? "Saving…" : "Save changes" }}
            </button>
          </div>
          <div class="settings-hint">Used across the platform to identify your workspace.</div>
        </div>
      </div>

      <div class="danger-zone">
        <div class="danger-zone__hd">
          <div class="danger-zone__title">Danger zone</div>
          <div class="danger-zone__sub">Actions here are permanent and cannot be undone.</div>
        </div>
        <div class="danger-zone__body">
          <div class="danger-zone__desc">
            Permanently delete this workspace and all its data — datasets, agents, conversations,
            and members.
          </div>
          <button class="btn-danger" @click="handleDeleteWorkspace">Delete workspace</button>
        </div>
      </div>
    </div>

    <!-- Members tab -->
    <div v-if="activeTab === 'members'" class="tab-panel">
      <MembersTable
        :members="members"
        :roles="roles"
        :loading="membersLoading"
        :can-update-role="can('member:manage_role')"
        :can-remove="can('member:remove')"
        @role-change="({ memberId, roleId }) => handleRoleChange(workspaceId, memberId, roleId)"
        @remove="(memberId) => handleRemove(workspaceId, memberId)"
      />
    </div>

    <!-- Pending invites tab -->
    <div v-if="activeTab === 'invites'" class="tab-panel">
      <InvitationsTable :workspace-id="workspaceId" />
    </div>

    <!-- Roles tab -->
    <div v-if="activeTab === 'roles'" class="tab-panel">
      <div class="roles-grid">
        <div v-for="role in roles" :key="role.id" class="role-card">
          <div class="role-card__hd">
            <div class="role-icon">
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              >
                <path d="M8 1l2 4.5L15 6.3l-3.5 3.4.8 4.8L8 12l-4.3 2.5.8-4.8L1 6.3l5-0.8L8 1z" />
              </svg>
            </div>
            <div>
              <div class="role-name">{{ role.name }}</div>
              <div class="role-sub">System role</div>
            </div>
          </div>
          <p class="role-desc">{{ role.description || "No description." }}</p>
          <div class="role-card__foot">
            <span class="chip chip--ghost">{{ role.member_count || 0 }} members</span>
          </div>
        </div>
      </div>

      <!-- Custom roles CTA -->
      <div class="custom-roles-cta">
        <div class="cta-icon">✦</div>
        <div>
          <div class="cta-title">Need more granular permissions?</div>
          <div class="cta-sub">
            Custom roles let you define exact permission sets for your team.
          </div>
        </div>
        <RoleFormModal trigger-label="Create custom role" :workspace-id="workspaceId" />
      </div>
    </div>

    <!-- Invite modal -->
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
.page {
  padding: 20px 24px;
}
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0;
  gap: 12px;
  flex-wrap: wrap;
}
.page-title {
  font-size: var(--t-lg);
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
}
.page-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 2px;
}
.page-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-brand:hover {
  background: var(--brand-2);
}
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  font-size: 13px;
  cursor: pointer;
}
.btn-outline:hover {
  border-color: var(--brand);
  color: var(--brand);
}

.tabs {
  display: flex;
  margin-top: 18px;
  border-bottom: 1px solid var(--line);
}
.tab {
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-3);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  margin-bottom: -1px;
}
.tab.active {
  color: var(--ink);
  border-bottom-color: var(--ink);
}
.tab-panel {
  padding-top: 18px;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
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
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg-2);
  color: var(--ink-3);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.role-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.role-sub {
  font-size: 11.5px;
  color: var(--ink-4);
}
.role-desc {
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.5;
  margin: 0 0 12px;
}
.role-card__foot {
  display: flex;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 500;
}
.chip--ghost {
  background: var(--bg-2);
  color: var(--ink-4);
  border: 1px solid var(--line);
}

.settings-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-1);
  max-width: 560px;
}
.settings-card__hd {
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--line);
}
.settings-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.settings-card__sub {
  font-size: 12.5px;
  color: var(--ink-3);
  margin-top: 2px;
}
.settings-card__body {
  padding: 16px 20px;
}
.name-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.name-input {
  flex: 1;
}
.settings-hint {
  font-size: 12px;
  color: var(--ink-4);
  margin-top: 8px;
}

.custom-roles-cta {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--brand-tint);
  border: 1px solid rgba(255, 107, 53, 0.2);
  border-radius: var(--r);
  padding: 14px 18px;
}
.cta-icon {
  font-size: 20px;
  flex-shrink: 0;
}
.cta-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
}
.cta-sub {
  font-size: 12.5px;
  color: var(--ink-3);
  margin-top: 2px;
}
.danger-zone {
  margin-top: 16px;
  background: var(--surface);
  border: 1px solid var(--err-border);
  border-radius: var(--r);
  box-shadow: var(--shadow-1);
  max-width: 560px;
}
.danger-zone__hd {
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--err-border);
}
.danger-zone__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--err);
}
.danger-zone__sub {
  font-size: 12.5px;
  color: var(--ink-3);
  margin-top: 2px;
}
.danger-zone__body {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.danger-zone__desc {
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.5;
}
.btn-danger {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  background: var(--err);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-danger:hover {
  background: var(--err-2);
}
</style>
