import db from "../config/database.js"

const TABLE = "agents"
const COLUMNS = [
  "id",
  "workspace_id",
  "name",
  "description",
  "system_prompt",
  "model_config",
  "is_system",
  "is_default",
  "created_by",
  "created_at",
  "updated_at",
]

/**
 * Insert a new agent row.
 * @param {Object} agent - Column values to insert.
 * @param {Object} [trx] - Optional Knex transaction.
 * @returns {Promise<Object[]>} Array containing the inserted row.
 */
export const create = (agent, trx) => (trx || db).insert(agent).into(TABLE).returning(COLUMNS)

/**
 * Find a single non-deleted agent matching conditions.
 * @param {Object} conditions - Knex where conditions (e.g. { id, workspace_id }).
 * @returns {Promise<Object|undefined>}
 */
export const findOne = (conditions) =>
  db.select(COLUMNS).from(TABLE).where(conditions).whereNull("deleted_at").first()

/**
 * Find the system agent for a workspace.
 * @param {string} workspaceId
 * @returns {Promise<Object|undefined>}
 */
export const findSystemAgent = (workspaceId) =>
  db
    .select(COLUMNS)
    .from(TABLE)
    .where({ workspace_id: workspaceId, is_system: true })
    .whereNull("deleted_at")
    .first()

/**
 * Find the default agent for a workspace.
 * @param {string} workspaceId
 * @returns {Promise<Object|undefined>}
 */
export const findDefaultAgent = (workspaceId) =>
  db
    .select(COLUMNS)
    .from(TABLE)
    .where({ workspace_id: workspaceId, is_default: true })
    .whereNull("deleted_at")
    .first()

/**
 * Clear is_default on all agents in a workspace.
 * @param {string} workspaceId
 * @param {Object} [trx] - Optional Knex transaction.
 * @returns {Promise<number>}
 */
export const clearDefault = (workspaceId, trx) =>
  (trx || db)(TABLE)
    .where({ workspace_id: workspaceId })
    .whereNull("deleted_at")
    .update({ is_default: false })

/**
 * Count non-deleted agents in a workspace, optionally filtered by search.
 * @param {{ workspace_id: string }} conditions
 * @param {{ search?: string, searchColumns?: string[] }} options
 * @returns {Promise<{ count: number }>}
 */
export const count = ({ workspace_id }, { search, searchColumns } = {}) => {
  let q = db(TABLE).count("* as count").where({ workspace_id }).whereNull("deleted_at")
  if (search && searchColumns?.length) {
    q = q.where((b) => searchColumns.forEach((col) => b.orWhereILike(col, `%${search}%`)))
  }
  return q.first()
}

/**
 * Fetch a paginated page of agents. System agent always sorted first.
 * @param {{ workspace_id: string }} conditions
 * @param {{ limit: number, offset: number, orders?: Object[], search?: string, searchColumns?: string[] }} options
 * @returns {Promise<Object[]>}
 */
export const findManyPaginated = (
  { workspace_id },
  { limit, offset, orders, search, searchColumns } = {},
) => {
  let q = db.select(COLUMNS).from(TABLE).where({ workspace_id }).whereNull("deleted_at")
  if (search && searchColumns?.length) {
    q = q.where((b) => searchColumns.forEach((col) => b.orWhereILike(col, `%${search}%`)))
  }
  // System agent always first
  q = q.orderBy("is_system", "desc")
  if (orders?.length) orders.forEach(({ column, order }) => q.orderBy(column, order))
  return q.limit(limit).offset(offset)
}

/**
 * Update non-deleted agent rows matching conditions.
 * @param {Object} conditions - Knex where conditions (e.g. { id }).
 * @param {Object} data - Column values to set.
 * @param {Object} [trx] - Optional Knex transaction.
 * @returns {Promise<Object[]>} Array of updated rows.
 */
export const update = (conditions, data, trx) =>
  (trx || db).update(data).table(TABLE).where(conditions).whereNull("deleted_at").returning(COLUMNS)

/**
 * Soft-delete an agent by setting deleted_at.
 * @param {string} id - Agent UUID.
 * @param {Object} [trx] - Optional Knex transaction.
 * @returns {Promise<number>} Number of affected rows.
 */
export const softDelete = (id, trx) =>
  (trx || db)(TABLE).where({ id }).whereNull("deleted_at").update({ deleted_at: new Date() })
