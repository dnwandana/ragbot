import db from "../config/database.js"
import HttpError from "../utils/http-error.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { uuidArray } from "../utils/pg-array.js"
import { isUniqueViolation } from "../utils/pg-errors.js"
import { logAuditEvents } from "../utils/audit.js"
import { conflictMessage, SIBLING_INDEX } from "../utils/folder-name.js"
import * as folderModel from "../models/dataset-folders.js"

const NIL = `'${folderModel.NIL_UUID}'::uuid`
const fail = (status, message) => {
  throw new HttpError(status, message)
}

/**
 * Checks a move before any write: O(d log n + k log n), plus a depth walk that stops early.
 *
 * @param {{ datasetId: string, datasetName: string, folderIds: string[], fileIds: string[], targetId: string|null }} params - Move request
 * @param {import('knex').Knex.Transaction} trx - Transaction that holds the dataset lock
 * @returns {Promise<{ folders: Object[], files: Object[], containerName: string }>} Items that change container
 * @throws {HttpError} 404 for a missing item or target, 422 for a cycle or a depth over 20
 */
export const checkMove = async ({ datasetId, datasetName, folderIds, fileIds, targetId }, trx) => {
  const folders = await folderModel.findActiveMany({ ids: folderIds, datasetId }, trx)
  if (folders.length !== folderIds.length) fail(HTTP_STATUS_CODE.NOT_FOUND, "Folder not found")
  const files = fileIds.length
    ? await trx("dataset_files")
        .select("id", "folder_id", "filename")
        .whereIn("id", fileIds)
        .where({ dataset_id: datasetId })
        .whereNull("deleted_at")
    : []
  if (files.length !== fileIds.length) fail(HTTP_STATUS_CODE.NOT_FOUND, "File not found")

  const chain = await folderModel.ancestors({ folderId: targetId, datasetId }, trx)
  if (targetId && !chain.length) fail(HTTP_STATUS_CODE.NOT_FOUND, "Target folder not found")
  // One walk up from the target finds every cycle: a moved folder must not be above the target.
  const above = new Set(chain.map((f) => f.id))
  const looped = folders.find((f) => above.has(f.id))
  if (looped) {
    fail(
      HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY,
      `Cannot move "${looped.name}" into its own subfolder.`,
    )
  }

  const moving = folders.filter((f) => f.parent_id !== targetId)
  const movingFiles = files.filter((f) => f.folder_id !== targetId)
  const containerName = chain.at(-1)?.name ?? datasetName
  if (!moving.length) return { folders: [], files: movingFiles, containerName }

  // A moved folder lands at level |chain| + 1, so its subtree may have MAX_DEPTH - |chain| levels.
  const levels = folderModel.MAX_DEPTH - chain.length
  const { rows: deep } = await trx.raw(
    `WITH RECURSIVE sub(id, depth) AS (
       SELECT r, 0 FROM unnest(?::uuid[]) AS r
       UNION ALL
       SELECT f.id, sub.depth + 1 FROM dataset_folders f JOIN sub
         ON f.dataset_id = ? AND COALESCE(f.parent_id, ${NIL}) = sub.id
       WHERE f.deleted_at IS NULL AND sub.depth < ?
     )
     SELECT EXISTS (SELECT 1 FROM sub WHERE depth >= ?) AS too_deep`,
    [uuidArray(moving.map((f) => f.id)), datasetId, levels, levels],
  )
  if (deep[0].too_deep) {
    fail(
      HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY,
      `Cannot move the items. The folder tree would be deeper than ${folderModel.MAX_DEPTH} levels.`,
    )
  }

  const seen = new Set()
  for (const f of moving) {
    const key = f.name.toLowerCase()
    if (seen.has(key)) {
      fail(
        HTTP_STATUS_CODE.CONFLICT,
        `Cannot move two folders named "${f.name}" into "${containerName}".`,
      )
    }
    seen.add(key)
  }
  // One lookup on the sibling index checks all moved names. The query returns the moved name, so
  // the message does not depend on a JavaScript copy of the PostgreSQL lower() rules.
  const { rows: clash } = await trx.raw(
    `SELECT m.name FROM jsonb_array_elements_text(?::jsonb) AS m(name)
     JOIN dataset_folders f ON f.dataset_id = ?
       AND COALESCE(f.parent_id, ${NIL}) = COALESCE(?::uuid, ${NIL})
       AND lower(f.name) = lower(m.name) AND f.deleted_at IS NULL
     WHERE f.id <> ALL(?::uuid[])
     LIMIT 1`,
    [
      JSON.stringify(moving.map((f) => f.name)),
      datasetId,
      targetId,
      uuidArray(moving.map((f) => f.id)),
    ],
  )
  if (clash.length) fail(HTTP_STATUS_CODE.CONFLICT, conflictMessage(clash[0].name, containerName))

  return { folders: moving, files: movingFiles, containerName }
}

/**
 * Moves folders and files into one target folder, all or nothing. R2 keys do not change.
 * The work is two UPDATE statements and one audit INSERT for any number of items.
 *
 * @param {{ datasetId: string, datasetName: string, workspaceId: string, userId: string, requestId: string, folderIds: string[], fileIds: string[], targetId: string|null }} params - Dataset, actor, selection, and target folder (null is the root)
 * @returns {Promise<{ folders: number, files: number }>} Numbers of moved items
 * @throws {HttpError} 404, 409, or 422 from checkMove, or 409 when a concurrent rename makes a duplicate name
 */
export const moveItems = async ({
  datasetId,
  datasetName,
  workspaceId,
  userId,
  requestId,
  folderIds,
  fileIds,
  targetId,
}) =>
  db
    .transaction(async (trx) => {
      await folderModel.lockDatasetTree(trx, datasetId)
      const { folders, files } = await checkMove(
        { datasetId, datasetName, folderIds, fileIds, targetId },
        trx,
      )
      if (folders.length) {
        await trx.raw(
          `UPDATE dataset_folders SET parent_id = ?::uuid
           WHERE dataset_id = ? AND id = ANY(?::uuid[]) AND parent_id IS DISTINCT FROM ?::uuid`,
          [targetId, datasetId, uuidArray(folders.map((f) => f.id)), targetId],
        )
      }
      if (files.length) {
        await trx.raw(
          `UPDATE dataset_files SET folder_id = ?::uuid, updated_at = now()
           WHERE dataset_id = ? AND id = ANY(?::uuid[]) AND folder_id IS DISTINCT FROM ?::uuid`,
          [targetId, datasetId, uuidArray(files.map((f) => f.id)), targetId],
        )
      }
      const base = {
        workspace_id: workspaceId,
        user_id: userId,
        action: "updated",
        context: { request_id: requestId },
      }
      await logAuditEvents(
        [
          ...folders.map((f) => ({
            ...base,
            entity_type: "dataset_folder",
            entity_id: f.id,
            changes: { parent_id: { from: f.parent_id, to: targetId } },
          })),
          ...files.map((f) => ({
            ...base,
            entity_type: "dataset_file",
            entity_id: f.id,
            changes: { folder_id: { from: f.folder_id, to: targetId } },
          })),
        ],
        trx,
      )
      return { folders: folders.length, files: files.length }
    })
    .catch((err) => {
      // The lock stops all other structural writes. Only a concurrent rename can get here.
      if (!isUniqueViolation(err, SIBLING_INDEX)) throw err
      throw new HttpError(
        HTTP_STATUS_CODE.CONFLICT,
        "A folder with the same name already exists in the target folder.",
      )
    })
