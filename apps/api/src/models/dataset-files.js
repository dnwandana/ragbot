import db from "../config/database.js"

const TABLE = "dataset_files"
const COLUMNS = [
  "id",
  "dataset_id",
  "workspace_id",
  "filename",
  "mime_type",
  "file_size_bytes",
  "storage_provider",
  "storage_path",
  "status",
  "error_message",
  "chunk_count",
  "metadata",
  "created_at",
  "updated_at",
]

/**
 * Insert a new dataset file record and return all selected columns.
 *
 * @param {Object} file - File data object including all required fields
 * @returns {Promise<Object[]>} Array containing the created file record
 */
export const create = (file) => db.insert(file).into(TABLE).returning(COLUMNS)

/**
 * Find a single active dataset file matching the given conditions.
 *
 * @param {Object} conditions - Knex where conditions (e.g. { id, dataset_id, workspace_id })
 * @returns {Promise<Object|undefined>} The file record, or undefined if not found
 */
export const findOne = (conditions) =>
  db.select(COLUMNS).from(TABLE).where(conditions).whereNull("deleted_at").first()

/**
 * Count active dataset files for a dataset with optional ILIKE search.
 *
 * @param {Object} filter - Must include dataset_id
 * @param {string} filter.dataset_id - UUID of the parent dataset
 * @param {Object} [options]
 * @param {string} [options.search] - Search string applied via ILIKE
 * @param {string[]} [options.searchColumns] - Columns to search (e.g. ['filename'])
 * @returns {Promise<{ count: string }>} Row count object
 */
export const count = ({ dataset_id }, { search, searchColumns } = {}) => {
  let q = db(TABLE).count("* as count").where({ dataset_id }).whereNull("deleted_at")
  if (search && searchColumns?.length) {
    q = q.where((b) => searchColumns.forEach((col) => b.orWhereILike(col, `%${search}%`)))
  }
  return q.first()
}

/**
 * Return a paginated list of active dataset files with optional search and ordering.
 *
 * @param {Object} filter - Must include dataset_id
 * @param {string} filter.dataset_id - UUID of the parent dataset
 * @param {Object} [options]
 * @param {number} [options.limit] - Maximum rows to return
 * @param {number} [options.offset] - Number of rows to skip
 * @param {Array<{ column: string, order: string }>} [options.orders] - Sort directives
 * @param {string} [options.search] - Search string applied via ILIKE
 * @param {string[]} [options.searchColumns] - Columns to search
 * @returns {Promise<Object[]>} Array of file records
 */
export const findManyPaginated = (
  { dataset_id },
  { limit, offset, orders, search, searchColumns } = {},
) => {
  let q = db.select(COLUMNS).from(TABLE).where({ dataset_id }).whereNull("deleted_at")
  if (search && searchColumns?.length) {
    q = q.where((b) => searchColumns.forEach((col) => b.orWhereILike(col, `%${search}%`)))
  }
  if (orders?.length) orders.forEach(({ column, order }) => q.orderBy(column, order))
  return q.limit(limit).offset(offset)
}

/**
 * Update a dataset file record by ID and return the updated row.
 *
 * @param {string} id - UUID of the file to update
 * @param {Object} data - Fields to update (e.g. { status, chunk_count, error_message })
 * @returns {Promise<Object[]>} Array containing the updated file record
 */
export const update = (id, data) => db(TABLE).where({ id }).update(data).returning(COLUMNS)

/**
 * Soft-delete a dataset file by setting deleted_at to the current timestamp.
 *
 * @param {string} id - UUID of the file to delete
 * @returns {Promise<number>} Number of rows affected
 */
export const softDelete = (id) =>
  db(TABLE).where({ id }).whereNull("deleted_at").update({ deleted_at: new Date() })

/**
 * Soft-delete all active dataset files for a dataset by setting deleted_at.
 *
 * @param {string} datasetId - UUID of the parent dataset
 * @param {import('knex').Knex.Transaction} [trx] - Optional Knex transaction
 * @returns {Promise<number>} Number of rows affected
 */
export const softDeleteByDataset = (datasetId, trx) => {
  const qb = trx ?? db
  return qb(TABLE)
    .where({ dataset_id: datasetId })
    .whereNull("deleted_at")
    .update({ deleted_at: new Date() })
}
