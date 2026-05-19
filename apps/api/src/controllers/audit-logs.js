import apiResponse from "../utils/response.js"
import { validatePaginationQuery, executePaginatedQuery } from "../utils/pagination.js"
import * as auditModel from "../models/audit-logs.js"

/**
 * GET /api/workspaces/:workspace_id/audit-logs — List paginated audit log entries for a workspace.
 *
 * Supports optional query-string filters (`entity_type`, `action`, `user_id`) to narrow
 * results. Pagination is controlled via `page`, `limit`, `sort_by`, and `sort_order`.
 * Results are sorted by `created_at` (descending by default) — no full-text search is applied.
 *
 * @param {Object} req - Express request object (req.workspace.id set by resolveWorkspace middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const listAuditLogs = async (req, res, next) => {
  try {
    const params = validatePaginationQuery(req.query, ["created_at"])
    const filters = {
      workspace_id: req.workspace.id,
      entity_type: req.query.entity_type,
      action: req.query.action,
      user_id: req.query.user_id,
    }

    const { data, pagination } = await executePaginatedQuery(
      auditModel.count,
      auditModel.findMany,
      filters,
      params,
    )

    return res.json(apiResponse({ message: "OK", data, pagination }))
  } catch (error) {
    return next(error)
  }
}
