import { defineStore } from "pinia"
import { ref } from "vue"
import { message } from "ant-design-vue"
import { acceptInvitation as apiAcceptInvitation } from "@/api/invitations"
import { inviteMember as apiInviteMember } from "@/api/members"

export const useInvitationsStore = defineStore("invitations", () => {
  // State
  const myInvitations = ref([])
  const loading = ref(false)

  /**
   * Fetch all pending invitations for the currently authenticated user.
   * Not yet supported by the backend — clears the list.
   * @returns {Promise<void>}
   */
  async function fetchMyInvitations() {
    myInvitations.value = []
  }

  /**
   * Invite a user to a workspace by email.
   * @param {string} workspaceId - Workspace UUID
   * @param {Object} data - Invitation data
   * @param {string} data.email - Email address of the invitee
   * @param {string} data.role_id - Role UUID to assign to the invited user
   * @returns {Promise<void>}
   */
  async function inviteToWorkspace(workspaceId, data) {
    loading.value = true
    try {
      await apiInviteMember(workspaceId, data)
      message.success("Invitation sent!")
    } finally {
      loading.value = false
    }
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
   * Clear the current user's invitations state.
   * Used when logging out to avoid stale data.
   */
  function clearMyInvitations() {
    myInvitations.value = []
  }

  /** Restore this store to its initial empty state (used on logout). */
  function reset() {
    myInvitations.value = []
    loading.value = false
  }

  return {
    // State
    myInvitations,
    loading,
    reset,
    // Actions
    fetchMyInvitations,
    inviteToWorkspace,
    acceptInvitation,
    clearMyInvitations,
  }
})
