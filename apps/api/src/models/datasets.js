import db from "../config/database.js"

const TABLE = "datasets"
const COLUMNS = [
  "id",
  "workspace_id",
  "name",
  "description",
  "embedding_model",
  "chunk_size",
  "chunk_overlap",
  "created_at",
  "updated_at",
]

const AGGREGATE_ALIASES = new Set(["file_count", "total_size_mb"])

/**
 * Insert a new dataset record and return all selected columns.
 *
 * @param {Object} dataset - Dataset data object including all required fields
 * @returns {Promise<Object[]>} Array containing the created dataset record
 */
export const create = (dataset) => db.insert(dataset).into(TABLE).returning(COLUMNS)

/**
 * Find a single active dataset matching the given conditions.
 *
 * @param {Object} conditions - Knex where conditions (e.g. { id, workspace_id })
 * @returns {Promise<Object|undefined>} The dataset record, or undefined if not found
 */
export const findOne = (conditions) => {
  const prefixed = Object.fromEntries(
    Object.entries(conditions).map(([k, v]) => [`${TABLE}.${k}`, v]),
  )
  return db
    .select([
      ...COLUMNS.map((c) => `${TABLE}.${c}`),
      db.raw("COUNT(df.id)::int AS file_count"),
      db.raw("COALESCE(SUM(df.file_size_bytes), 0)::float8 / (1024.0 * 1024.0) AS total_size_mb"),
    ])
    .from(TABLE)
    .leftJoin("dataset_files as df", function () {
      this.on("df.dataset_id", "=", `${TABLE}.id`).andOnNull("df.deleted_at")
    })
    .where(prefixed)
    .whereNull(`${TABLE}.deleted_at`)
    .groupBy(COLUMNS.map((c) => `${TABLE}.${c}`))
    .first()
}

/**
 * Count active datasets for a workspace with optional ILIKE search.
 *
 * @param {Object} filter - Must include workspace_id
 * @param {string} filter.workspace_id - UUID of the workspace
 * @param {Object} [options]
 * @param {string} [options.search] - Search string applied via ILIKE
 * @param {string[]} [options.searchColumns] - Columns to search (e.g. ['name', 'description'])
 * @returns {Promise<{ count: string }>} Row count object
 */
export const count = ({ workspace_id }, { search, searchColumns } = {}) => {
  let q = db(TABLE).count("* as count").where({ workspace_id }).whereNull("deleted_at")
  if (search && searchColumns?.length) {
    q = q.where((b) => searchColumns.forEach((col) => b.orWhereILike(col, `%${search}%`)))
  }
  return q.first()
}

/**
 * Return a paginated list of active datasets for a workspace with optional search and ordering.
 *
 * @param {Object} filter - Must include workspace_id
 * @param {string} filter.workspace_id - UUID of the workspace
 * @param {Object} [options]
 * @param {number} [options.limit] - Maximum rows to return
 * @param {number} [options.offset] - Number of rows to skip
 * @param {Array<{ column: string, order: string }>} [options.orders] - Sort directives
 * @param {string} [options.search] - Search string applied via ILIKE
 * @param {string[]} [options.searchColumns] - Columns to search
 * @returns {Promise<Object[]>} Array of dataset records
 */
export const findManyPaginated = (
  { workspace_id },
  { limit, offset, orders, search, searchColumns } = {},
) => {
  let q = db
    .select([
      ...COLUMNS.map((c) => `${TABLE}.${c}`),
      db.raw("COUNT(df.id)::int AS file_count"),
      db.raw("COALESCE(SUM(df.file_size_bytes), 0)::float8 / (1024.0 * 1024.0) AS total_size_mb"),
    ])
    .from(TABLE)
    .leftJoin("dataset_files as df", function () {
      this.on("df.dataset_id", "=", `${TABLE}.id`).andOnNull("df.deleted_at")
    })
    .where({ [`${TABLE}.workspace_id`]: workspace_id })
    .whereNull(`${TABLE}.deleted_at`)
    .groupBy(COLUMNS.map((c) => `${TABLE}.${c}`))
  if (search && searchColumns?.length) {
    q = q.where((b) =>
      searchColumns.forEach((col) => b.orWhereILike(`${TABLE}.${col}`, `%${search}%`)),
    )
  }
  if (orders?.length)
    orders.forEach(({ column, order }) =>
      q.orderBy(AGGREGATE_ALIASES.has(column) ? column : `${TABLE}.${column}`, order),
    )
  return q.limit(limit).offset(offset)
}

/**
 * Update active dataset records matching the given conditions.
 *
 * @param {Object} conditions - Knex where conditions (e.g. { id })
 * @param {Object} data - Fields to update
 * @returns {Promise<Object[]>} Array containing the updated dataset record
 */
export const update = (conditions, data) =>
  db.update(data).table(TABLE).where(conditions).whereNull("deleted_at").returning(COLUMNS)

/**
 * Soft-delete a dataset by setting deleted_at.
 *
 * @param {string} id - Dataset UUID
 * @param {import('knex').Knex.Transaction} [trx] - Optional Knex transaction
 * @returns {Promise<number>} Number of rows affected
 */
export const softDelete = (id, trx) => {
  const qb = trx ?? db
  return qb(TABLE).where({ id }).whereNull("deleted_at").update({ deleted_at: new Date() })
}
