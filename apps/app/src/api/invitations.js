import { request } from "@/utils/http"

/**
 * Fetch invitation preview details for a compound token.
 * Called before authentication to show the user which workspace they're joining.
 * @param {string} token - Compound invitation token (memberId:rawToken)
 * @returns {Promise<Object>} API response with workspace_name, role, invited_by
 */
export function getInvitationPreview(token) {
  return request.get(`/invitations/${token}`)
}

/**
 * Accept a pending workspace invitation.
 * @param {string} token - Compound invitation token (memberId:rawToken)
 * @returns {Promise<Object>} API response with workspace_id
 */
export function acceptInvitation(token) {
  return request.post("/invitations/accept", { token })
}
