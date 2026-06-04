import { request } from "@/utils/http"

/**
 * List all roles in a workspace (system + custom).
 * @param {string} workspaceId - Workspace UUID
 * @returns {Promise<Object>} API response with list of roles
 */
export function getRoles(workspaceId) {
  return request.get(`/workspaces/${workspaceId}/roles`)
}

/**
 * Get a single role with its assigned permissions.
 * @param {string} workspaceId - Workspace UUID
 * @param {string} roleId - Role UUID
 * @returns {Promise<Object>} API response with role data including permissions
 */
export function getRole(workspaceId, roleId) {
  return request.get(`/workspaces/${workspaceId}/roles/${roleId}`)
}

/**
 * Create a new custom role in a workspace.
 * @param {string} workspaceId - Workspace UUID
 * @param {Object} data - Role data
 * @param {string} data.name - Role name (required)
 * @param {string} [data.description] - Optional role description
 * @param {string[]} data.permission_ids - Array of permission UUIDs to assign
 * @returns {Promise<Object>} API response with created role data
 */
export function createRole(workspaceId, data) {
  return request.post(`/workspaces/${workspaceId}/roles`, data)
}

/**
 * Update an existing role in a workspace.
 * @param {string} workspaceId - Workspace UUID
 * @param {string} roleId - Role UUID to update
 * @param {Object} data - Updated role data
 * @param {string} data.name - Role name (required)
 * @param {string} [data.description] - Optional role description
 * @param {string[]} data.permission_ids - Array of permission UUIDs to assign
 * @returns {Promise<Object>} API response with updated role data
 */
export function updateRole(workspaceId, roleId, data) {
  return request.put(`/workspaces/${workspaceId}/roles/${roleId}`, data)
}

/**
 * Delete a custom role from a workspace, optionally reassigning its members first.
 * @param {string} workspaceId - Workspace UUID
 * @param {string} roleId - Role UUID to delete
 * @param {string} [reassignToRoleId] - Role UUID to move current members to before deletion
 * @returns {Promise<Object>} API response
 */
export function deleteRole(workspaceId, roleId, reassignToRoleId) {
  const options = reassignToRoleId ? { body: { reassign_to_role_id: reassignToRoleId } } : {}
  return request.del(`/workspaces/${workspaceId}/roles/${roleId}`, options)
}
