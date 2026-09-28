import { request } from "@/utils/http"

const base = (workspaceId, datasetId) => `/workspaces/${workspaceId}/datasets/${datasetId}/folders`

/**
 * Lists the child folders of `parent_id` for the Move dialog tree.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {object} params - Query `{ parent_id?, cursor?, limit? }`
 * @returns {Promise<{data: object, status: number}>} Response whose `data.data` has the folders
 */
export const listFolders = (workspaceId, datasetId, params) =>
  request.get(base(workspaceId, datasetId), { params })

/**
 * Creates a folder. The caller shows a `409` as a field error.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {object} body - `{ parent_id, name }`. `parent_id` is `null` for the dataset root.
 * @returns {Promise<{data: object, status: number}>} Response whose `data.data` is the new folder
 */
export const createFolder = (workspaceId, datasetId, body) =>
  request.post(base(workspaceId, datasetId), body, { silent: true })

/**
 * Renames a folder. The caller shows a `409` as a field error.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {string} folderId - Folder UUID
 * @param {object} body - `{ name }`
 * @returns {Promise<{data: object, status: number}>} Response whose `data.data` is the folder
 */
export const renameFolder = (workspaceId, datasetId, folderId, body) =>
  request.put(`${base(workspaceId, datasetId)}/${folderId}`, body, { silent: true })

/**
 * Creates the missing folders of relative paths and returns a path → id map.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {object} body - `{ parent_id, paths }`. `parent_id` is `null` for the dataset root.
 * @returns {Promise<{data: object, status: number}>} Response whose `data.data` has the path map
 */
export const ensureFolderPaths = (workspaceId, datasetId, body) =>
  request.post(`${base(workspaceId, datasetId)}/ensure-paths`, body, { silent: true })
