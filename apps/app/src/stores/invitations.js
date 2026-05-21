import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { message } from "ant-design-vue"
import { acceptInvitation as apiAcceptInvitation } from "@/api/invitations"

export const useInvitationsStore = defineStore("invitations", () => {
  // State
  const orgInvitations = ref([])
  const myInvitations = ref([])
  const loading = ref(false)

  /**
   * Count of the current user's pending invitations.
   * Used for badge/notification display in the UI.
   * @returns {number} Number of invitations with "pending" status
   */
  const pendingCount = computed(() => {
    return myInvitations.value.filter((i) => i.status === "pending").length
  })

  /**
   * Fetch all invitations for a workspace (admin view).
   * Not yet supported by the backend — clears the list.
   * @param {string} workspaceId - Workspace UUID
   * @returns {Promise<void>}
   */
  async function fetchOrgInvitations(workspaceId) {
    void workspaceId
    orgInvitations.value = []
  }

  /**
   * Fetch all pending invitations for the currently authenticated user.
   * Not yet supported by the backend — clears the list.
   * @returns {Promise<void>}
   */
  async function fetchMyInvitations() {
    myInvitations.value = []
  }

  /**
   * Invite a user to a workspace.
   * Workspace-level invites are sent via the members API (useMembersStore.inviteMember).
   * This stub exists for composable compatibility only.
   * @param {string} workspaceId - Workspace UUID
   * @param {Object} data - Invitation data
   * @param {string} data.email - Email address of the invitee
   * @param {string} data.role_id - Role UUID to assign to the invited user
   * @returns {Promise<void>}
   */
  async function inviteToOrg(workspaceId, data) {
    void workspaceId
    void data
  }

  /**
   * Invite a user to a project within a workspace.
   * Project-level invites are not supported in the current workspace model.
   * This stub exists for composable compatibility only.
   * @param {string} workspaceId - Workspace UUID
   * @param {string} projectId - Project UUID
   * @param {Object} data - Invitation data
   * @param {string} data.email - Email address of the invitee
   * @param {string} data.role_id - Role UUID to assign to the invited user
   * @returns {Promise<void>}
   */
  async function inviteToProject(workspaceId, projectId, data) {
    void workspaceId
    void projectId
    void data
  }

  /**
   * Accept a pending workspace invitation using a compound token from the invitation email.
   * Refreshes the user's invitations list after acceptance.
   * @param {string} token - Compound invitation token (memberId:rawToken)
   * @returns {Promise<Object>} API response data
   */
  async function acceptInvitation(token) {
    loading.value = true
    try {
      const response = await apiAcceptInvitation(token)
      message.success("Invitation accepted!")
      await fetchMyInvitations()
      return response.data
    } catch {
      // HTTP client handles error display
    } finally {
      loading.value = false
    }
  }

  /**
   * Decline a pending invitation.
   * Not yet supported by the backend — no-op stub.
   * @param {string} invitationId - Invitation UUID to decline
   * @returns {Promise<void>}
   */
  async function declineInvitation(invitationId) {
    void invitationId
  }

  /**
   * Revoke an invitation from a workspace (admin action).
   * Not yet supported by the backend — no-op stub.
   * @param {string} workspaceId - Workspace UUID
   * @param {string} invitationId - Invitation UUID to revoke
   * @returns {Promise<void>}
   */
  async function revokeInvitation(workspaceId, invitationId) {
    void workspaceId
    void invitationId
  }

  /**
   * Clear organization invitations state.
   * Used when navigating away from a workspace context to avoid stale data.
   */
  function clearOrgInvitations() {
    orgInvitations.value = []
  }

  /**
   * Clear the current user's invitations state.
   * Used when logging out to avoid stale data.
   */
  function clearMyInvitations() {
    myInvitations.value = []
  }

  return {
    // State
    orgInvitations,
    myInvitations,
    loading,
    // Getters
    pendingCount,
    // Actions
    fetchOrgInvitations,
    fetchMyInvitations,
    inviteToOrg,
    inviteToProject,
    acceptInvitation,
    declineInvitation,
    revokeInvitation,
    clearOrgInvitations,
    clearMyInvitations,
  }
})
