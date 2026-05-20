import { request } from "@/utils/http"

const base = (workspaceId) => `/workspaces/${workspaceId}/conversations`

/**
 * List conversations for a workspace.
 * @param {string} workspaceId
 * @param {Object} [params] - Pagination/search query params.
 * @returns {Promise<Object>}
 */
export function listConversations(workspaceId, params) {
  return request.get(base(workspaceId), { params })
}

/**
 * Get a single conversation.
 * @param {string} workspaceId
 * @param {string} id - Conversation UUID.
 * @returns {Promise<Object>}
 */
export function getConversation(workspaceId, id) {
  return request.get(`${base(workspaceId)}/${id}`)
}

/**
 * Create a conversation.
 * @param {string} workspaceId
 * @param {Object} data - { title?, agent_id, dataset_ids? }.
 * @returns {Promise<Object>}
 */
export function createConversation(workspaceId, data) {
  return request.post(base(workspaceId), data)
}

/**
 * Update a conversation.
 * @param {string} workspaceId
 * @param {string} id - Conversation UUID.
 * @param {Object} data - Fields to update.
 * @returns {Promise<Object>}
 */
export function updateConversation(workspaceId, id, data) {
  return request.patch(`${base(workspaceId)}/${id}`, data)
}

/**
 * Delete a conversation.
 * @param {string} workspaceId
 * @param {string} id - Conversation UUID.
 * @returns {Promise<Object>}
 */
export function deleteConversation(workspaceId, id) {
  return request.del(`${base(workspaceId)}/${id}`)
}
