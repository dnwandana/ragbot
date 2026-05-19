import { request } from "@/utils/http"

/**
 * List all members of a workspace.
 * @param {string} workspaceId - Workspace UUID
 * @returns {Promise<Object>} API response with list of members
 */
export function getMembers(workspaceId) {
  return request.get(`/workspaces/${workspaceId}/members`)
}

/**
 * Invite a user to a workspace by email.
 * @param {string} workspaceId - Workspace UUID
 * @param {Object} data - Invitation data
 * @param {string} data.email - Email address of the invitee
 * @param {string} data.role_id - Role UUID to assign
 * @returns {Promise<Object>} API response with invitation data
 */
export function inviteMember(workspaceId, data) {
  return request.post(`/workspaces/${workspaceId}/members/invite`, data)
}

/**
 * Change the role of a workspace member.
 * @param {string} workspaceId - Workspace UUID
 * @param {string} memberId - Member UUID
 * @param {string} roleId - New role UUID
 * @returns {Promise<Object>} API response with updated member data
 */
export function changeMemberRole(workspaceId, memberId, roleId) {
  return request.put(`/workspaces/${workspaceId}/members/${memberId}/role`, { role_id: roleId })
}

/**
 * Remove a member from a workspace.
 * @param {string} workspaceId - Workspace UUID
 * @param {string} memberId - Member UUID
 * @returns {Promise<Object>} API response
 */
export function removeMember(workspaceId, memberId) {
  return request.del(`/workspaces/${workspaceId}/members/${memberId}`)
}
