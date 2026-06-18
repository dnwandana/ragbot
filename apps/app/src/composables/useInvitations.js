/**
 * Invitations composable - helpers for invitation operations and invite modal management
 * Manages invite modal state and delegates CRUD actions to the invitations store
 */

import { ref, computed } from "vue"
import { useInvitationsStore } from "@/stores/invitations"

export function useInvitations() {
  const invitationsStore = useInvitationsStore()

  // Local state for the invite modal
  const isInviteModalVisible = ref(false)

  /**
   * Open the invite modal
   * @returns {void}
   */
  function openInviteModal() {
    isInviteModalVisible.value = true
  }

  /**
   * Close the invite modal
   * @returns {void}
   */
  function closeInviteModal() {
    isInviteModalVisible.value = false
  }

  /**
   * Handle sending an invitation to a workspace
   * Delegates to the invitations store, then closes the modal
   * @param {string} workspaceId - Workspace UUID
   * @param {Object} data - Invitation data (e.g., { role_id, email })
   * @returns {Promise<void>}
   */
  async function handleInvite(workspaceId, data) {
    try {
      await invitationsStore.inviteToWorkspace(workspaceId, data)
      closeInviteModal()
    } catch {
      // HTTP client handles error display; modal stays open for retry
    }
  }

  /**
   * Handle accepting a pending invitation
   * @param {string} invitationId - Invitation UUID to accept
   * @returns {Promise<void>}
   */
  async function handleAccept(invitationId) {
    await invitationsStore.acceptInvitation(invitationId)
  }

  /**
   * Handle declining a pending invitation
   * @param {string} invitationId - Invitation UUID to decline
   * @returns {Promise<void>}
   */
  async function handleDecline(invitationId) {
    await invitationsStore.declineInvitation(invitationId)
  }

  return {
    // Store state as computed
    myInvitations: computed(() => invitationsStore.myInvitations),
    loading: computed(() => invitationsStore.loading),
    // Local modal state
    isInviteModalVisible,
    // Delegated store actions
    fetchMyInvitations: invitationsStore.fetchMyInvitations,
    clearMyInvitations: invitationsStore.clearMyInvitations,
    // Composable actions
    openInviteModal,
    closeInviteModal,
    handleInvite,
    handleAccept,
    handleDecline,
  }
}
