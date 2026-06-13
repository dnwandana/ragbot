import { request } from "@/utils/http"

const base = (workspaceId) => `/workspaces/${workspaceId}/datasets`

export function listDatasets(workspaceId, params) {
  return request.get(base(workspaceId), { params })
}

export function getDataset(workspaceId, id) {
  return request.get(`${base(workspaceId)}/${id}`)
}

export function createDataset(workspaceId, data) {
  return request.post(base(workspaceId), data)
}

export function updateDataset(workspaceId, id, data) {
  return request.put(`${base(workspaceId)}/${id}`, data)
}

export function deleteDataset(workspaceId, id) {
  return request.del(`${base(workspaceId)}/${id}`)
}

/**
 * Sample a dataset's exploration questions (for chat suggested prompts).
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @param {object} [params] - Query params, e.g. `{ limit }`
 * @returns {Promise<{data: object, status: number}>} Response with `data.data` array
 */
export function listDatasetQuestions(workspaceId, datasetId, params) {
  return request.get(`${base(workspaceId)}/${datasetId}/questions`, { params })
}
