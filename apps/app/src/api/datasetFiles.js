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
