import { request } from "@/utils/http"

/**
 * Accept a pending workspace invitation.
 * @param {string} token - Compound invitation token (memberId:rawToken)
 * @returns {Promise<Object>} API response with workspace_id
 */
export function acceptInvitation(token) {
  return request.post("/invitations/accept", { token })
}
