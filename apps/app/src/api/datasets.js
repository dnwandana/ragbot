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
