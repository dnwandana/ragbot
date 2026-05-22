import joi from "joi"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { validatePaginationQuery, executePaginatedQuery } from "../utils/pagination.js"
import * as auditModel from "../models/audit-logs.js"

const ENTITY_TYPES = [
  "workspace",
  "workspace_member",
  "role",
  "role_permission",
  "dataset",
  "dataset_file",
  "agent",
  "conversation",
  "conversation_dataset",
]

const ACTIONS = [
  "created",
  "updated",
  "deleted",
  "invited",
  "joined",
  "suspended",
  "role_changed",
  "permission_granted",
  "permission_revoked",
  "uploaded",
  "reprocessed",
  "attached",
  "detached",
]

/** @type {import('joi').ObjectSchema} Validation schema for audit log query filters. */
const filtersSchema = joi
  .object({
    entity_type: joi
      .string()
      .valid(...ENTITY_TYPES)
      .optional(),
    action: joi
      .string()
      .valid(...ACTIONS)
      .optional(),
    user_id: joi.string().uuid().optional(),
  })
  .options({ allowUnknown: true, stripUnknown: false })

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
    const { error: validationError, value: queryFilters } = filtersSchema.validate(req.query)
    if (validationError) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, validationError.details[0].message)
    }

    const params = validatePaginationQuery(req.query, ["created_at"])
    const filters = {
      workspace_id: req.workspace.id,
      entity_type: queryFilters.entity_type,
      action: queryFilters.action,
      user_id: queryFilters.user_id,
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
