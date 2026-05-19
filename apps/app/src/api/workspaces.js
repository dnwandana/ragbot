import { request } from "@/utils/http"

/**
 * Fetch all workspaces the authenticated user belongs to.
 * @returns {Promise<Object>} API response with list of workspaces
 */
export function getWorkspaces() {
  return request.get("/workspaces")
}

/**
 * Fetch a single workspace by ID.
 * @param {string} workspaceId - Workspace UUID
 * @returns {Promise<Object>} API response with workspace data
 */
export function getWorkspace(workspaceId) {
  return request.get(`/workspaces/${workspaceId}`)
}

/**
 * Create a new workspace.
 * @param {Object} data - Workspace data
 * @param {string} data.name - Workspace name (required)
 * @param {Object} [data.settings] - Optional workspace settings
 * @returns {Promise<Object>} API response with created workspace data
 */
export function createWorkspace(data) {
  return request.post("/workspaces", data)
}

/**
 * Update an existing workspace.
 * @param {string} workspaceId - Workspace UUID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} API response with updated workspace data
 */
export function updateWorkspace(workspaceId, data) {
  return request.put(`/workspaces/${workspaceId}`, data)
}

/**
 * Soft-delete a workspace.
 * @param {string} workspaceId - Workspace UUID
 * @returns {Promise<Object>} API response
 */
export function deleteWorkspace(workspaceId) {
  return request.del(`/workspaces/${workspaceId}`)
}
