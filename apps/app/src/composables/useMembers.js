import { ref, computed } from "vue"
import { useMembersStore } from "@/stores/members"

/**
 * Composable for workspace member operations and role-change modal state.
 * @returns {Object} Members state and action handlers
 */
export function useMembers() {
  const membersStore = useMembersStore()
  const isRoleModalVisible = ref(false)
  const editingMember = ref(null)

  /**
   * Open the role-change modal for a given member.
   * @param {Object} member - Member object whose role is being changed
   */
  function openRoleModal(member) {
    editingMember.value = { ...member }
    isRoleModalVisible.value = true
  }

  /** Close the role-change modal and reset editing state. */
  function closeRoleModal() {
    editingMember.value = null
    isRoleModalVisible.value = false
  }

  /**
   * Handle changing a member's role, then close the modal.
   * @param {string} workspaceId - Workspace UUID
   * @param {string} memberId - Member UUID
   * @param {string} roleId - New role UUID
   * @returns {Promise<void>}
   */
  async function handleRoleChange(workspaceId, memberId, roleId) {
    await membersStore.changeMemberRole(workspaceId, memberId, roleId)
    closeRoleModal()
  }

  /**
   * Handle removing a member from the workspace.
   * @param {string} workspaceId - Workspace UUID
   * @param {string} memberId - Member UUID
   * @returns {Promise<void>}
   */
  async function handleRemove(workspaceId, memberId) {
    await membersStore.removeMember(workspaceId, memberId)
  }

  return {
    members: computed(() => membersStore.members),
    loading: computed(() => membersStore.loading),
    isRoleModalVisible,
    editingMember,
    fetchMembers: membersStore.fetchMembers,
    inviteMember: membersStore.inviteMember,
    clearMembers: membersStore.clearMembers,
    openRoleModal,
    closeRoleModal,
    handleRoleChange,
    handleRemove,
  }
}
