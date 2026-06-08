import db from "../config/database.js"

const CHUNK_COLUMNS = ["id", "dataset_file_id", "content", "chunk_index"]

/**
 * Bulk-insert document chunks with pgvector embeddings using a raw parameterised query.
 *
 * Uses `?::vector` casts because Knex's query builder does not support the pgvector
 * type natively. Embeddings are serialised as `[n1,n2,...]` strings before casting.
 * No-ops if chunks is empty.
 *
 * @param {Array<{ id: string, dataset_file_id: string, content: string, chunk_index: number, embedding: number[] }>} chunks
 * @returns {Promise<void>}
 */
export const bulkInsert = async (chunks) => {
  if (!chunks.length) return
  await db.raw(
    `INSERT INTO document_chunks (id, dataset_file_id, content, chunk_index, embedding) VALUES ${chunks.map(() => "(?, ?, ?, ?, ?::vector)").join(", ")}`,
    chunks.flatMap((c) => [
      c.id,
      c.dataset_file_id,
      c.content,
      c.chunk_index,
      `[${c.embedding.join(",")}]`,
    ]),
  )
}

/**
 * Delete all document chunks belonging to a specific dataset file.
 *
 * @param {string} datasetFileId - UUID of the parent dataset_files record
 * @param {import('knex').Knex.Transaction} [trx] - Optional Knex transaction
 * @returns {Promise<number>} Number of rows deleted
 */
export const deleteByFileId = (datasetFileId, trx) =>
  (trx ?? db)("document_chunks").where({ dataset_file_id: datasetFileId }).delete()

/**
 * Count document chunks for a specific dataset file.
 *
 * @param {string} datasetFileId - UUID of the parent dataset_files record
 * @returns {Promise<{ count: string }>} Row count object
 */
export const countByDatasetFileId = (datasetFileId) =>
  db("document_chunks").where({ dataset_file_id: datasetFileId }).count("* as count").first()

/**
 * Hard-delete all document chunks belonging to files in a given dataset.
 * Uses a subquery to avoid loading file IDs into memory.
 *
 * @param {string} datasetId - UUID of the parent dataset
 * @param {import('knex').Knex.Transaction} [trx] - Optional Knex transaction
 * @returns {Promise<number>} Number of rows deleted
 */
export const deleteByDatasetId = (datasetId, trx) => {
  const qb = trx ?? db
  return qb("document_chunks")
    .whereIn(
      "dataset_file_id",
      (trx ?? db)("dataset_files").select("id").where({ dataset_id: datasetId }),
    )
    .delete()
}

/**
 * Count document chunks for a file using the (conditions, options) signature
 * expected by executePaginatedQuery.
 *
 * @param {Object} filter
 * @param {string} filter.dataset_file_id - UUID of the parent dataset_files record
 * @returns {Promise<{ count: string }>} Row count object
 */
export const count = ({ dataset_file_id }) =>
  db("document_chunks").count("* as count").where({ dataset_file_id }).first()

/**
 * Return a paginated list of document chunks for a file, excluding the embedding vector.
 *
 * @param {Object} filter
 * @param {string} filter.dataset_file_id - UUID of the parent dataset_files record
 * @param {Object} [options]
 * @param {number} [options.limit] - Maximum rows to return
 * @param {number} [options.offset] - Number of rows to skip
 * @param {Array<{ column: string, order: string }>} [options.orders] - Sort directives
 * @returns {Promise<Object[]>} Chunk rows (id, dataset_file_id, content, chunk_index)
 */
export const findManyPaginated = ({ dataset_file_id }, { limit, offset, orders } = {}) => {
  const q = db.select(CHUNK_COLUMNS).from("document_chunks").where({ dataset_file_id })
  if (orders?.length) orders.forEach(({ column, order }) => q.orderBy(column, order))
  return q.limit(limit).offset(offset)
}
