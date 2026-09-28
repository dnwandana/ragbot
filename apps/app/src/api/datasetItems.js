import { request } from "@/utils/http"

const base = (workspaceId, datasetId) => `/workspaces/${workspaceId}/datasets/${datasetId}/items`

/**
 * Lists one page of folders then files. `q` or `status` switches to a subtree search.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {object} params - Query `{ folder_id?, cursor?, limit?, q?, status? }`
 * @returns {Promise<{data: object, status: number}>} Response whose `data.data` is
 *   `{ items, next_cursor, breadcrumbs }`
 */
export const listItems = (workspaceId, datasetId, params) =>
  request.get(base(workspaceId, datasetId), { params })

/**
 * Moves folders and files into `target_folder_id` (`null` is the root). All or nothing.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {object} body - `{ folder_ids, file_ids, target_folder_id }`
 * @returns {Promise<{data: object, status: number}>} Response of the move
 */
export const moveItems = (workspaceId, datasetId, body) =>
  request.post(`${base(workspaceId, datasetId)}/move`, body, { silent: true })

/**
 * Counts the folders and files that a delete of this selection removes.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {object} body - `{ folder_ids, file_ids }`
 * @returns {Promise<{data: object, status: number}>} Response whose `data.data` has the counts
 */
export const summarizeItems = (workspaceId, datasetId, body) =>
  request.post(`${base(workspaceId, datasetId)}/summary`, body)

/**
 * Deletes files, and folders with everything below them.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {object} body - `{ folder_ids, file_ids }`
 * @returns {Promise<{data: object, status: number}>} Response of the delete
 */
export const deleteItems = (workspaceId, datasetId, body) =>
  request.post(`${base(workspaceId, datasetId)}/delete`, body, { silent: true })
