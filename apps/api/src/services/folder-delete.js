import db from "../config/database.js"
import HttpError from "../utils/http-error.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { uuidArray } from "../utils/pg-array.js"
import { logAuditEvents } from "../utils/audit.js"
import logger from "../utils/logger.js"
import { deleteObjects } from "./storage.js"
import * as folderModel from "../models/dataset-folders.js"

const NIL = `'${folderModel.NIL_UUID}'::uuid`

/**
 * Loads the selected folders, and checks that every selected folder and file is active here.
 *
 * @param {{ datasetId: string, folderIds: string[], fileIds: string[] }} params - Dataset and selection
 * @param {import('knex').Knex} trx - Transaction or db
 * @returns {Promise<Object[]>} The selected folder rows
 * @throws {HttpError} 404 when a selected item is missing or in a different dataset
 */
const loadSelection = async ({ datasetId, folderIds, fileIds }, trx) => {
  const folders = await folderModel.findActiveMany({ ids: folderIds, datasetId }, trx)
  if (folders.length !== folderIds.length) {
    throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Folder not found")
  }
  const files = fileIds.length
    ? await trx("dataset_files")
        .pluck("id")
        .whereIn("id", fileIds)
        .where({ dataset_id: datasetId })
        .whereNull("deleted_at")
    : []
  if (files.length !== fileIds.length) {
    throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "File not found")
  }
  return folders
}

/**
 * Counts the folders and files that a delete of the selection would remove. One statement
 * counts the whole selection, and an item inside another selected item counts once.
 *
 * @param {{ datasetId: string, folderIds: string[], fileIds: string[] }} params - Dataset and selection
 * @returns {Promise<{ folders: number, files: number }>} The selected folders and all items below them
 * @throws {HttpError} 404 when a selected item is missing or in a different dataset
 */
export const summarizeItems = async ({ datasetId, folderIds, fileIds }) => {
  await loadSelection({ datasetId, folderIds, fileIds }, db)
  const { rows } = await db.raw(
    `WITH RECURSIVE ${folderModel.SUBTREE_CTE}, ids AS (SELECT DISTINCT id FROM sub)
     SELECT (SELECT count(*) FROM ids)::int AS folders,
       (SELECT count(*) FROM dataset_files d WHERE d.dataset_id = ? AND d.deleted_at IS NULL
          AND (COALESCE(d.folder_id, ${NIL}) IN (SELECT id FROM ids)
            OR d.id = ANY(?::uuid[])))::int AS files`,
    [uuidArray(folderIds), datasetId, datasetId, uuidArray(fileIds)],
  )
  return rows[0]
}

/**
 * Soft-deletes the selected folders with all items below them, and the selected files.
 * Every statement is set-based. The R2 objects go after the commit. A failed R2 delete goes
 * to the log only, because the database rows are already gone.
 *
 * @param {{ datasetId: string, workspaceId: string, userId: string, requestId: string, folderIds: string[], fileIds: string[] }} params - Dataset, actor, and selection
 * @returns {Promise<{ folders: number, files: number }>} Numbers of deleted items
 * @throws {HttpError} 404 when a selected item is missing or in a different dataset
 */
export const deleteItems = async ({
  datasetId,
  workspaceId,
  userId,
  requestId,
  folderIds,
  fileIds,
}) => {
  const { counts, keys } = await db.transaction(async (trx) => {
    await folderModel.lockDatasetTree(trx, datasetId)
    const selected = await loadSelection({ datasetId, folderIds, fileIds }, trx)
    const tree = await folderModel.subtree({ rootIds: folderIds, datasetId }, trx)
    const allIds = [...new Set(tree.map((r) => r.id))]
    // The folder UPDATE goes first. It waits for an upload that holds FOR SHARE on a folder row,
    // so the file UPDATE after it sees the file row of that upload.
    if (allIds.length) {
      await trx.raw(`UPDATE dataset_folders SET deleted_at = now() WHERE id = ANY(?::uuid[])`, [
        uuidArray(allIds),
      ])
    }
    const { rows: files } = await trx.raw(
      `UPDATE dataset_files d SET deleted_at = now(), updated_at = now()
       WHERE d.dataset_id = ? AND d.deleted_at IS NULL
         AND (COALESCE(d.folder_id, ${NIL}) = ANY(?::uuid[]) OR d.id = ANY(?::uuid[]))
       RETURNING d.id, d.folder_id, d.storage_path`,
      [datasetId, uuidArray(allIds), uuidArray(fileIds)],
    )
    const fileIdList = uuidArray(files.map((f) => f.id))
    await trx.raw(`DELETE FROM dataset_file_questions WHERE dataset_file_id = ANY(?::uuid[])`, [
      fileIdList,
    ])
    await trx.raw(`DELETE FROM dataset_file_chunks WHERE dataset_file_id = ANY(?::uuid[])`, [
      fileIdList,
    ])

    const filesByFolder = new Map()
    for (const f of files) filesByFolder.set(f.folder_id, (filesByFolder.get(f.folder_id) ?? 0) + 1)
    const perRoot = new Map(folderIds.map((id) => [id, { folders: 0, files: 0 }]))
    for (const r of tree) {
      const entry = perRoot.get(r.root_id)
      if (r.depth > 0) entry.folders += 1
      entry.files += filesByFolder.get(r.id) ?? 0
    }
    const base = {
      workspace_id: workspaceId,
      user_id: userId,
      action: "deleted",
      context: { request_id: requestId },
    }
    await logAuditEvents(
      [
        ...selected.map((f) => ({
          ...base,
          entity_type: "dataset_folder",
          entity_id: f.id,
          changes: { name: f.name, ...perRoot.get(f.id) },
        })),
        ...fileIds.map((id) => ({ ...base, entity_type: "dataset_file", entity_id: id })),
      ],
      trx,
    )
    return {
      counts: { folders: allIds.length, files: files.length },
      keys: files.map((f) => f.storage_path),
    }
  })
  const { failed } = await deleteObjects(keys)
  if (failed.length) {
    logger.warn("R2 objects not deleted after a folder delete", {
      datasetId,
      failed: failed.length,
      sample: failed.slice(0, 10),
    })
  }
  return counts
}
