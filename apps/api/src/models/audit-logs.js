import db from "../config/database.js"

const TABLE = "audit_logs"
const COLUMNS = [
  "id",
  "workspace_id",
  "user_id",
  "entity_type",
  "entity_id",
  "action",
  "changes",
  "context",
  "created_at",
]

/**
 * Retrieve a page of audit log entries matching the given filters.
 *
 * Called by `executePaginatedQuery` — the second `options` argument carries pagination
 * and ordering fields (`limit`, `offset`, `orders`) and is applied when present.
 *
 * @param {Object} opts - Filter conditions
 * @param {string} opts.workspace_id - UUID of the workspace (required)
 * @param {string} [opts.entity_type] - ENUM type to filter by (e.g. 'member', 'dataset')
 * @param {string} [opts.action] - Action name to filter by (e.g. 'create', 'update')
 * @param {string} [opts.user_id] - UUID of the user who performed the action
 * @param {Object} [options={}] - Pagination/ordering options injected by executePaginatedQuery
 * @param {number} [options.limit] - Maximum rows to return
 * @param {number} [options.offset] - Row offset for the current page
 * @param {Array<{column: string, order: string}>} [options.orders] - Sort order array
 * @returns {Promise<Object[]>} Array of audit log rows
 */
export const findMany = ({ workspace_id, entity_type, action, user_id }, options = {}) => {
  let query = db.select(COLUMNS).from(TABLE).where({ workspace_id })
  if (entity_type) query = query.where({ entity_type })
  if (action) query = query.where({ action })
  if (user_id) query = query.where({ user_id })
  if (options.orders?.length) {
    options.orders.forEach(({ column, order }) => {
      query = query.orderBy(column, order)
    })
  }
  if (options.limit != null) query = query.limit(options.limit)
  if (options.offset != null) query = query.offset(options.offset)
  return query
}

/**
 * Count audit log entries matching the given filters.
 *
 * Called by `executePaginatedQuery` alongside `findMany` to produce pagination metadata.
 * The second `options` argument is accepted for interface consistency but is not applied
 * (counting does not need ordering or pagination).
 *
 * @param {Object} opts - Filter conditions
 * @param {string} opts.workspace_id - UUID of the workspace (required)
 * @param {string} [opts.entity_type] - ENUM type to filter by (e.g. 'member', 'dataset')
 * @param {string} [opts.action] - Action name to filter by (e.g. 'create', 'update')
 * @param {string} [opts.user_id] - UUID of the user who performed the action
 * @returns {Promise<{ count: string }>} Object with a `count` field (string from PostgreSQL)
 */
export const count = ({ workspace_id, entity_type, action, user_id }) => {
  let query = db.count("* as count").from(TABLE).where({ workspace_id })
  if (entity_type) query = query.where({ entity_type })
  if (action) query = query.where({ action })
  if (user_id) query = query.where({ user_id })
  return query.first()
}
