import db from "../config/database.js"
import { NIL_UUID } from "./dataset-folders.js"

const TABLE = "dataset_files"
export const COLUMNS = [
  "id",
  "dataset_id",
  "workspace_id",
  "folder_id",
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
 * @param {import('knex').Knex} [trx] - Transaction or db
 * @returns {Promise<Object[]>} Array containing the created file record
 */
export const create = (file, trx = db) => trx.insert(file).into(TABLE).returning(COLUMNS)

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
 * Find completed tabular files that belong to the given datasets.
 *
 * The chat loop uses this list to gate the execute_code tool and to validate
 * the file ids the model sends, so the query is workspace-scoped.
 *
 * @param {string[]} datasetIds - Dataset UUIDs linked to the conversation
 * @param {string} workspaceId - Workspace UUID for tenant scoping
 * @returns {Promise<Object[]>} Array of matching file records
 */
export const findCompletedTabularByDatasetIds = (datasetIds, workspaceId) =>
  db
    .select(COLUMNS)
    .from(TABLE)
    .whereIn("dataset_id", datasetIds)
    .where({ workspace_id: workspaceId, status: "completed" })
    .whereRaw("metadata->>'source_type' = ?", ["tabular"])
    .whereNull("deleted_at")
    .orderBy("created_at", "asc")

/**
 * Update a dataset file record by ID and return the updated row.
 *
 * @param {string} id - UUID of the file to update
 * @param {Object} data - Fields to update (e.g. { status, chunk_count, error_message })
 * @param {import('knex').Knex.Transaction} [trx] - Optional Knex transaction
 * @returns {Promise<Object[]>} Array containing the updated file record
 */
export const update = (id, data, trx = db) =>
  trx(TABLE).where({ id }).update(data).returning(COLUMNS)

/**
 * Soft-delete a dataset file by setting deleted_at to the current timestamp.
 *
 * @param {string} id - UUID of the file to delete
 * @param {import('knex').Knex.Transaction} [trx] - Optional Knex transaction
 * @returns {Promise<number>} Number of rows affected
 */
export const softDelete = (id, trx) =>
  (trx ?? db)(TABLE).where({ id }).whereNull("deleted_at").update({ deleted_at: new Date() })

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

/**
 * Returns one page of the active files of a folder, ordered by (lower(filename), id).
 * The dataset_files_folder_name index gives the filter, the order, and the keyset: O(log n + k).
 *
 * @param {{ datasetId: string, folderId: string|null, after: { name: string, id: string }|null, limit: number }} params - Page request
 * @param {import('knex').Knex} [trx] - Transaction or db
 * @returns {Promise<Object[]>} File rows with sort_key
 */
export const listInFolder = async ({ datasetId, folderId, after, limit }, trx = db) => {
  const nil = `'${NIL_UUID}'::uuid`
  const { rows } = await trx.raw(
    `SELECT ${COLUMNS.join(", ")}, lower(filename) AS sort_key FROM dataset_files
     WHERE dataset_id = ? AND COALESCE(folder_id, ${nil}) = COALESCE(?::uuid, ${nil})
       AND deleted_at IS NULL
       AND (?::text IS NULL OR (lower(filename), id) > (?::text, ?::uuid))
     ORDER BY lower(filename), id LIMIT ?`,
    [datasetId, folderId, after?.name ?? null, after?.name ?? null, after?.id ?? null, limit],
  )
  return rows
}

/**
 * Returns the status fields of the active files among `ids`: O(a log n).
 *
 * @param {{ datasetId: string, ids: string[] }} params - Dataset UUID and file UUIDs
 * @returns {Promise<Array<{ id: string, status: string, chunk_count: number, error_message: string|null }>>} One row for each active file
 */
export const statusMany = ({ datasetId, ids }) =>
  db(TABLE)
    .select("id", "status", "chunk_count", "error_message")
    .where({ dataset_id: datasetId })
    .whereIn("id", ids)
    .whereNull("deleted_at")
