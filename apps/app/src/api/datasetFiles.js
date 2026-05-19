import { request } from "@/utils/http"

const base = (workspaceId, datasetId) => `/workspaces/${workspaceId}/datasets/${datasetId}/files`

export function listFiles(workspaceId, datasetId, params) {
  return request.get(base(workspaceId, datasetId), { params })
}

export function getFile(workspaceId, datasetId, id) {
  return request.get(`${base(workspaceId, datasetId)}/${id}`)
}

export function uploadFile(workspaceId, datasetId, formData) {
  return request.post(`${base(workspaceId, datasetId)}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
}

export function scrapeUrl(workspaceId, datasetId, url) {
  return request.post(`${base(workspaceId, datasetId)}/scrape-url`, { url })
}

export function updateFile(workspaceId, datasetId, id, data) {
  return request.put(`${base(workspaceId, datasetId)}/${id}`, data)
}

export function deleteFile(workspaceId, datasetId, id) {
  return request.del(`${base(workspaceId, datasetId)}/${id}`)
}

export function reprocessFile(workspaceId, datasetId, id) {
  return request.post(`${base(workspaceId, datasetId)}/${id}/reprocess`)
}
