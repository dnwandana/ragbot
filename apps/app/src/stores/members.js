import { defineStore } from "pinia"
import { ref } from "vue"
import { message } from "ant-design-vue"
import {
  getMembers as apiGetMembers,
  inviteMember as apiInviteMember,
  changeMemberRole as apiChangeMemberRole,
  removeMember as apiRemoveMember,
} from "@/api/members"

export const useMembersStore = defineStore("members", () => {
  const members = ref([])
  const loading = ref(false)

  /**
   * Fetch all members of a workspace.
   * @param {string} workspaceId - Workspace UUID
   * @returns {Promise<void>}
   */
  async function fetchMembers(workspaceId) {
    loading.value = true
    try {
      const response = await apiGetMembers(workspaceId)
      members.value = response.data.data
    } catch {
      members.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Invite a user to a workspace by email.
   * @param {string} workspaceId - Workspace UUID
   * @param {Object} data - Invitation data ({ email, role_id })
   * @returns {Promise<void>}
   */
  async function inviteMember(workspaceId, data) {
    await apiInviteMember(workspaceId, data)
    message.success("Invitation sent!")
  }

  /**
   * Change the role of a workspace member and refresh the list.
   * @param {string} workspaceId - Workspace UUID
   * @param {string} memberId - Member UUID
   * @param {string} roleId - New role UUID
   * @returns {Promise<void>}
   */
  async function changeMemberRole(workspaceId, memberId, roleId) {
    await apiChangeMemberRole(workspaceId, memberId, roleId)
    message.success("Member role updated!")
    await fetchMembers(workspaceId)
  }

  /**
   * Remove a member from a workspace and refresh the list.
   * @param {string} workspaceId - Workspace UUID
   * @param {string} memberId - Member UUID
   * @returns {Promise<void>}
   */
  async function removeMember(workspaceId, memberId) {
    await apiRemoveMember(workspaceId, memberId)
    message.success("Member removed!")
    await fetchMembers(workspaceId)
  }

  /** Clear members state when navigating away from workspace. */
  function clearMembers() {
    members.value = []
  }

  /** Restore this store to its initial empty state (used on logout). */
  function reset() {
    members.value = []
    loading.value = false
  }

  return {
    members,
    loading,
    reset,
    fetchMembers,
    inviteMember,
    changeMemberRole,
    removeMember,
    clearMembers,
  }
})
