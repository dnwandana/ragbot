import db from "../config/database.js"
import { uuidArray } from "../utils/pg-array.js"

export const NIL_UUID = "00000000-0000-0000-0000-000000000000"
export const MAX_DEPTH = 20

/** SQL text for the nil UUID. The folder filters use it in `COALESCE`, so they match an index. */
const NIL = `'${NIL_UUID}'::uuid`

const TABLE = "dataset_folders"
export const FOLDER_COLUMNS = [
  "id",
  "dataset_id",
  "workspace_id",
  "parent_id",
  "name",
  "created_at",
  "updated_at",
]

/**
 * Takes the transaction-scoped advisory lock for the folder tree of one dataset.
 * Create, ensure-paths, move, and delete call it first, so they cannot interleave.
 *
 * @param {import('knex').Knex.Transaction} trx - Open transaction
 * @param {string} datasetId - Dataset UUID
 * @returns {Promise<void>}
 */
export const lockDatasetTree = async (trx, datasetId) => {
  await trx.raw("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", [
    `dataset_folders:${datasetId}`,
  ])
}

/**
 * Returns the active folder with this id in this dataset.
 *
 * @param {{ id: string, datasetId: string }} params - Folder and dataset UUIDs
 * @param {import('knex').Knex} [trx] - Transaction or db
 * @returns {Promise<Object|undefined>} The folder row, or undefined
 */
export const findActive = ({ id, datasetId }, trx = db) =>
  trx(TABLE)
    .select(FOLDER_COLUMNS)
    .where({ id, dataset_id: datasetId })
    .whereNull("deleted_at")
    .first()

/**
 * Returns the active folders of this dataset among the given ids.
 *
 * @param {{ ids: string[], datasetId: string }} params - Folder UUIDs and dataset UUID
 * @param {import('knex').Knex} [trx] - Transaction or db
 * @returns {Promise<Object[]>} The folder rows that exist
 */
export const findActiveMany = ({ ids, datasetId }, trx = db) =>
  ids.length
    ? trx(TABLE)
        .select(FOLDER_COLUMNS)
        .whereIn("id", ids)
        .where({ dataset_id: datasetId })
        .whereNull("deleted_at")
    : Promise.resolve([])

/**
 * Walks up from a folder to the root. Uses the primary key for each step: O(d log n).
 *
 * @param {{ folderId: string|null, datasetId: string }} params - Start folder and dataset UUIDs
 * @param {import('knex').Knex} [trx] - Transaction or db
 * @returns {Promise<Array<{ id: string, name: string, parent_id: string|null }>>} Root first
 */
export const ancestors = async ({ folderId, datasetId }, trx = db) => {
  if (!folderId) return []
  const { rows } = await trx.raw(
    `WITH RECURSIVE up(id, parent_id, name, depth) AS (
       SELECT id, parent_id, name, 0 FROM dataset_folders
       WHERE id = ? AND dataset_id = ? AND deleted_at IS NULL
       UNION ALL
       SELECT f.id, f.parent_id, f.name, up.depth + 1
       FROM dataset_folders f JOIN up ON f.id = up.parent_id
       WHERE f.deleted_at IS NULL AND up.depth < ${MAX_DEPTH}
     )
     SELECT id, parent_id, name FROM up ORDER BY depth DESC`,
    [folderId, datasetId],
  )
  return rows
}

/**
 * Inserts a folder. A sibling with the same name (case ignored) raises SQLSTATE 23505.
 *
 * @param {{ datasetId: string, workspaceId: string, parentId: string|null, name: string }} params - Folder fields
 * @param {import('knex').Knex} [trx] - Transaction or db
 * @returns {Promise<Object>} The new folder row
 */
export const create = async ({ datasetId, workspaceId, parentId, name }, trx = db) => {
  const [row] = await trx(TABLE)
    .insert({ dataset_id: datasetId, workspace_id: workspaceId, parent_id: parentId, name })
    .returning(FOLDER_COLUMNS)
  return row
}

/**
 * Renames an active folder in one UPDATE: O(log n).
 *
 * @param {{ id: string, datasetId: string, name: string }} params - Folder UUID, dataset UUID, new name
 * @param {import('knex').Knex} [trx] - Transaction or db
 * @returns {Promise<Object|undefined>} The updated row, or undefined when no active folder matches
 */
export const rename = async ({ id, datasetId, name }, trx = db) => {
  const [row] = await trx(TABLE)
    .where({ id, dataset_id: datasetId })
    .whereNull("deleted_at")
    .update({ name })
    .returning(FOLDER_COLUMNS)
  return row
}

/**
 * Returns one page of the child folders of a parent, ordered by lower(name). The `COALESCE`
 * form matches the sibling index, so one index range scan gives the filter and the order.
 *
 * @param {{ datasetId: string, parentId: string|null, afterKey: string|null, limit: number, withHasChildren?: boolean }} params - Page request
 * @param {import('knex').Knex} [trx] - Transaction or db
 * @returns {Promise<Object[]>} Rows with sort_key, and has_children when asked
 */
export const listChildren = async (
  { datasetId, parentId, afterKey, limit, withHasChildren = false },
  trx = db,
) => {
  const hasChildren = withHasChildren
    ? `, EXISTS (SELECT 1 FROM dataset_folders c WHERE c.dataset_id = f.dataset_id
         AND COALESCE(c.parent_id, ${NIL}) = f.id AND c.deleted_at IS NULL) AS has_children`
    : ""
  const { rows } = await trx.raw(
    `SELECT f.id, f.name, f.created_at, f.updated_at, lower(f.name) AS sort_key ${hasChildren}
     FROM dataset_folders f
     WHERE f.dataset_id = ? AND COALESCE(f.parent_id, ${NIL}) = COALESCE(?::uuid, ${NIL})
       AND f.deleted_at IS NULL AND (?::text IS NULL OR lower(f.name) > ?)
     ORDER BY lower(f.name) LIMIT ?`,
    [datasetId, parentId, afterKey, afterKey, limit],
  )
  return rows
}

/**
 * Counts the direct child folders and files of each folder with two grouped index scans.
 *
 * @param {{ folderIds: string[], datasetId: string }} params - Folder UUIDs and dataset UUID
 * @param {import('knex').Knex} [trx] - Transaction or db
 * @returns {Promise<Map<string, { folders: number, files: number }>>} Counts for each folder
 */
export const countChildren = async ({ folderIds, datasetId }, trx = db) => {
  const counts = new Map(folderIds.map((id) => [id, { folders: 0, files: 0 }]))
  if (!folderIds.length) return counts
  const count = (table, column) =>
    trx.raw(
      `SELECT COALESCE(${column}, ${NIL}) AS id, count(*)::int AS n FROM ${table}
       WHERE dataset_id = ? AND COALESCE(${column}, ${NIL}) = ANY(?::uuid[]) AND deleted_at IS NULL
       GROUP BY 1`,
      [datasetId, uuidArray(folderIds)],
    )
  const [sub, files] = await Promise.all([
    count("dataset_folders", "parent_id"),
    count("dataset_files", "folder_id"),
  ])
  for (const r of sub.rows) counts.get(r.id).folders = r.n
  for (const r of files.rows) counts.get(r.id).files = r.n
  return counts
}

/** Recursive CTE body for the subtree of each root. Bindings: rootIds (uuid[]), datasetId. */
export const SUBTREE_CTE = `sub(root_id, id, depth) AS (
    SELECT r, r, 0 FROM unnest(?::uuid[]) AS r
    UNION ALL
    SELECT sub.root_id, f.id, sub.depth + 1
    FROM dataset_folders f JOIN sub
      ON f.dataset_id = ? AND COALESCE(f.parent_id, ${NIL}) = sub.id
    WHERE f.deleted_at IS NULL AND sub.depth < ${MAX_DEPTH}
  )`

/**
 * Returns every folder in the subtree of each root: O(s log n) time, O(s) space.
 *
 * @param {{ rootIds: string[], datasetId: string }} params - Root folder UUIDs and dataset UUID
 * @param {import('knex').Knex} [trx] - Transaction or db
 * @returns {Promise<Array<{ root_id: string, id: string, depth: number }>>} Subtree rows
 */
export const subtree = async ({ rootIds, datasetId }, trx = db) => {
  if (!rootIds.length) return []
  const { rows } = await trx.raw(
    `WITH RECURSIVE ${SUBTREE_CTE} SELECT root_id, id, depth FROM sub`,
    [uuidArray(rootIds), datasetId],
  )
  return rows
}

/**
 * Builds the path of each folder, relative to `stopAt`. Walks up from the given folders only,
 * so the cost depends on the page size: O(k·d log n).
 *
 * @param {{ folderIds: string[], stopAt: string|null, datasetId: string }} params - Page folders, stop folder, dataset
 * @param {import('knex').Knex} [trx] - Transaction or db
 * @returns {Promise<Map<string, Array<{ id: string, name: string }>>>} Folder id to path, top first
 */
export const pathsBelow = async ({ folderIds, stopAt, datasetId }, trx = db) => {
  const paths = new Map()
  if (!folderIds.length) return paths
  const { rows } = await trx.raw(
    `WITH RECURSIVE up(start_id, id, parent_id, name, depth) AS (
       SELECT f.id, f.id, f.parent_id, f.name, 0 FROM dataset_folders f
       WHERE f.dataset_id = ? AND f.id = ANY(?::uuid[]) AND f.id IS DISTINCT FROM ?::uuid
       UNION ALL
       SELECT up.start_id, f.id, f.parent_id, f.name, up.depth + 1
       FROM dataset_folders f JOIN up ON f.id = up.parent_id
       WHERE up.parent_id IS DISTINCT FROM ?::uuid AND up.depth < ${MAX_DEPTH}
     )
     SELECT start_id, id, name FROM up ORDER BY start_id, depth DESC`,
    [datasetId, uuidArray([...new Set(folderIds)]), stopAt, stopAt],
  )
  for (const row of rows) {
    if (!paths.has(row.start_id)) paths.set(row.start_id, [])
    paths.get(row.start_id).push({ id: row.id, name: row.name })
  }
  return paths
}

/**
 * Locks an active folder row with FOR SHARE until the transaction ends. A folder delete updates
 * this row, so a delete and a file insert into this folder run one after the other.
 *
 * @param {{ id: string, datasetId: string }} params - Folder and dataset UUIDs
 * @param {import('knex').Knex.Transaction} trx - Open transaction
 * @returns {Promise<{ id: string }|undefined>} The locked row, or undefined when no active folder matches
 */
export const lockForInsert = ({ id, datasetId }, trx) =>
  trx(TABLE)
    .select("id")
    .where({ id, dataset_id: datasetId })
    .whereNull("deleted_at")
    .forShare()
    .first()
