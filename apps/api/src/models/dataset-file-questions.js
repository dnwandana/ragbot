import db from "../config/database.js"

const TABLE = "dataset_file_questions"
const COLUMNS = ["id", "dataset_file_id", "question", "created_at"]

/**
 * Bulk-insert exploration questions for a dataset file. No-ops if questions is empty.
 *
 * @param {Array<{ id: string, dataset_file_id: string, question: string }>} questions
 * @returns {Promise<void>}
 */
export const bulkInsert = async (questions) => {
  if (!questions.length) return
  await db(TABLE).insert(questions)
}

/**
 * Return all exploration questions for a dataset file, in stable creation order.
 *
 * @param {string} datasetFileId - UUID of the parent dataset_files record
 * @returns {Promise<Object[]>} Question rows
 */
export const findByFileId = (datasetFileId) =>
  db(TABLE)
    .select(COLUMNS)
    .where({ dataset_file_id: datasetFileId })
    .orderBy("created_at", "asc")
    .orderBy("id", "asc")

/**
 * Return a random sample of exploration questions across a dataset's completed,
 * non-deleted files. Used to seed the chat welcome screen's suggested prompts.
 *
 * @param {string} datasetId - UUID of the parent dataset
 * @param {number} [limit=8] - Maximum number of questions to return
 * @returns {Promise<Array<{ id: string, question: string, dataset_file_id: string }>>}
 */
export const findByDatasetId = (datasetId, limit = 8) =>
  db(`${TABLE} as q`)
    .join("dataset_files as f", "f.id", "q.dataset_file_id")
    .where("f.dataset_id", datasetId)
    .where("f.status", "completed")
    .whereNull("f.deleted_at")
    .select("q.id", "q.question", "q.dataset_file_id")
    // ORDER BY random() is a full scan + sort over the dataset's questions. This is a
    // deliberate small-N choice: the only caller (chat suggested-prompts) fetches once
    // per first-dataset selection. Revisit (e.g. TABLESAMPLE or a random-offset scheme)
    // if this is reused on a hot path or datasets grow to many thousands of questions.
    .orderByRaw("random()")
    .limit(limit)

/**
 * Delete all exploration questions belonging to a dataset file.
 *
 * @param {string} datasetFileId - UUID of the parent dataset_files record
 * @param {import('knex').Knex.Transaction} [trx] - Optional Knex transaction
 * @returns {Promise<number>} Number of rows deleted
 */
export const deleteByFileId = (datasetFileId, trx) =>
  (trx ?? db)(TABLE).where({ dataset_file_id: datasetFileId }).delete()

/**
 * Delete all exploration questions for every file in a dataset.
 * Uses a subquery to avoid loading file IDs into memory.
 *
 * @param {string} datasetId - UUID of the parent dataset
 * @param {import('knex').Knex.Transaction} [trx] - Optional Knex transaction
 * @returns {Promise<number>} Number of rows deleted
 */
export const deleteByDatasetId = (datasetId, trx) => {
  const qb = trx ?? db
  return qb(TABLE)
    .whereIn(
      "dataset_file_id",
      (trx ?? db)("dataset_files").select("id").where({ dataset_id: datasetId }),
    )
    .delete()
}
