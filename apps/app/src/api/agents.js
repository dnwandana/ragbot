import { request } from "@/utils/http"

const base = (workspaceId) => `/workspaces/${workspaceId}/agents`

/**
 * List agents for a workspace.
 * @param {string} workspaceId
 * @param {Object} [params] - Pagination/search query params.
 * @returns {Promise<Object>}
 */
export function listAgents(workspaceId, params) {
  return request.get(base(workspaceId), { params })
}

/**
 * Get a single agent.
 * @param {string} workspaceId
 * @param {string} id - Agent UUID.
 * @returns {Promise<Object>}
 */
export function getAgent(workspaceId, id) {
  return request.get(`${base(workspaceId)}/${id}`)
}

/**
 * Create a custom agent.
 * @param {string} workspaceId
 * @param {Object} data - { name, description?, system_prompt, model_config, is_default? }.
 * @returns {Promise<Object>}
 */
export function createAgent(workspaceId, data) {
  return request.post(base(workspaceId), data)
}

/**
 * Update an agent.
 * @param {string} workspaceId
 * @param {string} id - Agent UUID.
 * @param {Object} data - Fields to update.
 * @returns {Promise<Object>}
 */
export function updateAgent(workspaceId, id, data) {
  return request.put(`${base(workspaceId)}/${id}`, data)
}

/**
 * Delete an agent.
 * @param {string} workspaceId
 * @param {string} id - Agent UUID.
 * @returns {Promise<Object>}
 */
export function deleteAgent(workspaceId, id) {
  return request.del(`${base(workspaceId)}/${id}`)
}
