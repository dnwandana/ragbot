import db from "../config/database.js"

const TABLE = "conversations"
const COLUMNS = [
  "id",
  "workspace_id",
  "user_id",
  "agent_id",
  "title",
  "last_message_at",
  "created_at",
  "updated_at",
]

/**
 * Insert a new conversation row.
 * @param {Object} conv - Column values to insert.
 * @returns {Promise<Object[]>} Array containing the inserted row.
 */
export const create = (conv) => db.insert(conv).into(TABLE).returning(COLUMNS)

/**
 * Find a single non-deleted conversation matching conditions.
 * @param {Object} conditions - Knex where conditions (e.g. { id, workspace_id }).
 * @returns {Promise<Object|undefined>}
 */
export const findOne = (conditions) =>
  db.select(COLUMNS).from(TABLE).where(conditions).whereNull("deleted_at").first()

/**
 * Count non-deleted conversations in a workspace for a user, optionally filtered by search.
 * @param {{ workspace_id: string, user_id: string }} conditions
 * @param {{ search?: string, searchColumns?: string[] }} options
 * @returns {Promise<{ count: number }>}
 */
export const count = ({ workspace_id, user_id }, { search, searchColumns } = {}) => {
  let q = db(TABLE).count("* as count").where({ workspace_id, user_id }).whereNull("deleted_at")
  if (search && searchColumns?.length) {
    q = q.where((b) =>
      searchColumns.forEach((col) => b.orWhereILike(`${TABLE}.${col}`, `%${search}%`)),
    )
  }
  return q.first()
}

/**
 * Fetch a paginated page of conversations with aggregated dataset_ids.
 * @param {{ workspace_id: string, user_id: string }} conditions
 * @param {{ limit: number, offset: number, orders?: Object[], search?: string, searchColumns?: string[] }} options
 * @returns {Promise<Object[]>}
 */
export const findManyPaginated = (
  { workspace_id, user_id },
  { limit, offset, orders, search, searchColumns } = {},
) => {
  let q = db
    .select([
      ...COLUMNS.map((col) => `${TABLE}.${col}`),
      db.raw(
        "array_agg(conversation_datasets.dataset_id) filter (where conversation_datasets.dataset_id is not null) as dataset_ids",
      ),
    ])
    .from(TABLE)
    .leftJoin("conversation_datasets", "conversation_datasets.conversation_id", `${TABLE}.id`)
    .where({ [`${TABLE}.workspace_id`]: workspace_id, [`${TABLE}.user_id`]: user_id })
    .whereNull(`${TABLE}.deleted_at`)
    .groupBy(COLUMNS.map((col) => `${TABLE}.${col}`))
  if (search && searchColumns?.length) {
    q = q.where((b) =>
      searchColumns.forEach((col) => b.orWhereILike(`${TABLE}.${col}`, `%${search}%`)),
    )
  }
  if (orders?.length) orders.forEach(({ column, order }) => q.orderBy(column, order))
  return q.limit(limit).offset(offset)
}

/**
 * Update a conversation by id.
 * @param {string} id - Conversation UUID.
 * @param {Object} data - Column values to set.
 * @returns {Promise<Object[]>} Array of updated rows.
 */
export const update = (id, data) => db(TABLE).where({ id }).update(data).returning(COLUMNS)

/**
 * Soft-delete a conversation by setting deleted_at.
 * @param {string} id - Conversation UUID.
 * @returns {Promise<number>} Number of affected rows.
 */
export const softDelete = (id) =>
  db(TABLE).where({ id }).whereNull("deleted_at").update({ deleted_at: new Date() })
