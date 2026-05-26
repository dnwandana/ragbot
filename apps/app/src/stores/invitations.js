import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { message } from "ant-design-vue"
import { acceptInvitation as apiAcceptInvitation } from "@/api/invitations"
import { inviteMember as apiInviteMember } from "@/api/members"

export const useInvitationsStore = defineStore("invitations", () => {
  // State
  const workspaceInvitations = ref([])
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
   * Clear organization invitations state.
   * Used when navigating away from a workspace context to avoid stale data.
   */
  function clearOrgInvitations() {
    workspaceInvitations.value = []
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
    workspaceInvitations,
    myInvitations,
    loading,
    // Getters
    pendingCount,
    // Actions
    fetchMyInvitations,
    inviteToWorkspace,
    acceptInvitation,
    clearOrgInvitations,
    clearMyInvitations,
  }
})
