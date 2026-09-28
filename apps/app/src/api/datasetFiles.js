import { request } from "@/utils/http"

const base = (workspaceId, datasetId) => `/workspaces/${workspaceId}/datasets/${datasetId}/files`

export function listFiles(workspaceId, datasetId, params) {
  return request.get(base(workspaceId, datasetId), { params })
}

export function uploadFile(workspaceId, datasetId, formData) {
  return request.post(`${base(workspaceId, datasetId)}/upload`, formData, { silent: true })
}

// A root source sends no `folder_id` key, so the API stores NULL.
const withFolder = (body, folderId) => (folderId ? { ...body, folder_id: folderId } : body)

/**
 * Scrapes a web page into the dataset.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {string} url - Page URL to scrape
 * @param {string|null} [folderId] - Target folder UUID, or `null` for the dataset root
 * @returns {Promise<{data: object, status: number}>} Response whose `data.data` is the new file
 */
export function scrapeUrl(workspaceId, datasetId, url, folderId = null) {
  return request.post(`${base(workspaceId, datasetId)}/scrape-url`, withFolder({ url }, folderId), {
    silent: true,
  })
}

/**
 * Adds a YouTube video transcript to the dataset.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {string} url - YouTube video URL
 * @param {string|null} [folderId] - Target folder UUID, or `null` for the dataset root
 * @returns {Promise<{data: object, status: number}>} Response whose `data.data` is the new file
 */
export function addYouTube(workspaceId, datasetId, url, folderId = null) {
  return request.post(`${base(workspaceId, datasetId)}/youtube`, withFolder({ url }, folderId), {
    silent: true,
  })
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

/**
 * Gets one file with `signed_url` and `path` (the folders from the root to the file).
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {string} id - Dataset file UUID
 * @returns {Promise<{data: object, status: number}>} Response whose `data.data` is the file
 */
export function getFile(workspaceId, datasetId, id) {
  return request.get(`${base(workspaceId, datasetId)}/${id}`)
}

/**
 * Gets the status of up to 100 files. A deleted file is not in the result.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {string[]} ids - Dataset file UUIDs (100 maximum)
 * @returns {Promise<{data: object, status: number}>} Response whose `data.data` is the status rows
 */
export function fileStatuses(workspaceId, datasetId, ids) {
  return request.post(`${base(workspaceId, datasetId)}/status`, { ids }, { silent: true })
}
