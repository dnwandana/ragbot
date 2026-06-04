import { request } from "@/utils/http"

const base = (workspaceId) => `/workspaces/${workspaceId}/audit-logs`

/**
 * List audit log entries for a workspace.
 * @param {string} workspaceId
 * @param {Object} [params] - Query params: entity_type, action, user_id, page, limit, sort_by, sort_order.
 * @returns {Promise<Object>}
 */
export function listAuditLogs(workspaceId, params) {
  return request.get(base(workspaceId), { params })
}
