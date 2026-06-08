import { request } from "@/utils/http"

const base = (workspaceId, datasetId) => `/workspaces/${workspaceId}/datasets/${datasetId}/files`

export function listFiles(workspaceId, datasetId, params) {
  return request.get(base(workspaceId, datasetId), { params })
}

export function uploadFile(workspaceId, datasetId, formData) {
  return request.post(`${base(workspaceId, datasetId)}/upload`, formData, { silent: true })
}

export function scrapeUrl(workspaceId, datasetId, url) {
  return request.post(`${base(workspaceId, datasetId)}/scrape-url`, { url }, { silent: true })
}

export function deleteFile(workspaceId, datasetId, id) {
  return request.del(`${base(workspaceId, datasetId)}/${id}`, { silent: true })
}

export function reprocessFile(workspaceId, datasetId, id) {
  return request.post(`${base(workspaceId, datasetId)}/${id}/reprocess`)
}

/**
 * List exploration questions for a dataset file.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {string} fileId - Dataset file UUID
 * @returns {Promise<{data: object, status: number}>} Response whose `data.data` is the questions array
 */
export function listFileQuestions(workspaceId, datasetId, fileId) {
  return request.get(`${base(workspaceId, datasetId)}/${fileId}/questions`)
}

/**
 * List indexed chunks for a dataset file (paginated).
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {string} fileId - Dataset file UUID
 * @param {object} params - Pagination/sort query (page, limit, sort_by, sort_order)
 * @returns {Promise<{data: object, status: number}>} Response with `data.data` chunks + `data.pagination`
 */
export function listFileChunks(workspaceId, datasetId, fileId, params) {
  return request.get(`${base(workspaceId, datasetId)}/${fileId}/chunks`, { params })
}

/**
 * Update a dataset file's mutable fields (currently just `filename`).
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {string} id - Dataset file UUID
 * @param {object} payload - Fields to update, e.g. `{ filename }`
 * @returns {Promise<{data: object, status: number}>} Response whose `data.data` is the updated file
 */
export function updateFile(workspaceId, datasetId, id, payload) {
  return request.put(`${base(workspaceId, datasetId)}/${id}`, payload, { silent: true })
}
