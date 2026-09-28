import db from "../config/database.js"
import HttpError from "../utils/http-error.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { folderNameSchema } from "../utils/folder-name.js"
import { logAuditEvents } from "../utils/audit.js"
import * as folderModel from "../models/dataset-folders.js"

/** Maximum number of paths in one ensure-paths request. */
export const MAX_PATHS = 1000

const node = (name) => ({
  name,
  key: name.toLowerCase(),
  children: new Map(),
  paths: [],
  id: null,
})

/**
 * Builds a trie of relative folder paths: O(total segments) time and space.
 * The key of a node is the lowercase name, so names that differ only in case share one node.
 * The first spelling wins.
 *
 * @param {string[]} paths - Paths such as "Photos/2024"
 * @returns {Object[]} Root nodes; each node lists the input paths that end at it
 * @throws {HttpError} 400 when a segment breaks the folder name rules
 */
export const buildTrie = (paths) => {
  const roots = new Map()
  for (const path of paths) {
    let level = roots
    let current = null
    for (const raw of String(path).split("/")) {
      const { error, value } = folderNameSchema.required().validate(raw)
      if (error) {
        throw new HttpError(
          HTTP_STATUS_CODE.BAD_REQUEST,
          `Invalid folder path "${path}": ${error.details[0].message}`,
        )
      }
      const key = value.toLowerCase()
      if (!level.has(key)) level.set(key, node(value))
      current = level.get(key)
      level = current.children
    }
    current.paths.push(path)
  }
  return [...roots.values()]
}

const NIL = `'${folderModel.NIL_UUID}'::uuid`

/** Returns the number of levels in a trie: O(nodes). */
const height = (nodes) =>
  nodes.length ? 1 + Math.max(...nodes.map((n) => height([...n.children.values()]))) : 0

/**
 * Creates the missing folders of many relative paths below one parent. Each trie level runs one
 * INSERT and one SELECT, so the cost is O(d) statements for any number of folders. An existing
 * folder with the same name, case ignored, is reused.
 *
 * @param {{ datasetId: string, workspaceId: string, userId: string, requestId: string, parentId: string|null, paths: string[] }} params - Dataset, actor, parent folder (null is the root), and paths
 * @returns {Promise<Record<string, string>>} Folder id for each input path, keyed exactly as sent
 * @throws {HttpError} 400 for a bad segment, 404 for a missing parent, 409 when the tree changes during the call, 422 for a depth over 20
 */
export const ensurePaths = async ({
  datasetId,
  workspaceId,
  userId,
  requestId,
  parentId,
  paths,
}) => {
  const roots = buildTrie(paths)
  return db.transaction(async (trx) => {
    await folderModel.lockDatasetTree(trx, datasetId)
    const chain = await folderModel.ancestors({ folderId: parentId, datasetId }, trx)
    if (parentId && !chain.length) {
      throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Folder not found")
    }
    if (chain.length + height(roots) > folderModel.MAX_DEPTH) {
      throw new HttpError(
        HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY,
        `Cannot create the folders. The folder tree would be deeper than ${folderModel.MAX_DEPTH} levels.`,
      )
    }
    const result = {}
    const audit = []
    let level = roots.map((n) => ({ n, parentId }))
    while (level.length) {
      // jsonb_to_recordset carries the batch, because a raw binding must not be a JavaScript array.
      const batch = JSON.stringify(
        level.map(({ n, parentId: p }, idx) => ({ idx, parent_id: p, name: n.name })),
      )
      const { rows: created } = await trx.raw(
        `INSERT INTO dataset_folders (dataset_id, workspace_id, parent_id, name)
         SELECT ?, ?, t.parent_id, t.name
         FROM jsonb_to_recordset(?::jsonb) AS t(idx int, parent_id uuid, name text)
         ON CONFLICT (dataset_id, (COALESCE(parent_id, ${NIL})), (lower(name)))
           WHERE deleted_at IS NULL DO NOTHING
         RETURNING id, parent_id, name`,
        [datasetId, workspaceId, batch],
      )
      for (const f of created) {
        audit.push({
          workspace_id: workspaceId,
          user_id: userId,
          entity_type: "dataset_folder",
          entity_id: f.id,
          action: "created",
          changes: { name: f.name, parent_id: f.parent_id },
          context: { request_id: requestId },
        })
      }
      // The SELECT maps rows back by idx, so PostgreSQL alone decides which names match.
      const { rows: found } = await trx.raw(
        `SELECT t.idx, f.id
         FROM jsonb_to_recordset(?::jsonb) AS t(idx int, parent_id uuid, name text)
         JOIN dataset_folders f ON f.dataset_id = ? AND f.deleted_at IS NULL
           AND COALESCE(f.parent_id, ${NIL}) = COALESCE(t.parent_id, ${NIL})
           AND lower(f.name) = lower(t.name)`,
        [batch, datasetId],
      )
      for (const { idx, id } of found) level[idx].n.id = id
      // A rename does not take the tree lock. If it changes a reused folder between the two
      // statements, stop, so that no child goes to the wrong parent.
      if (level.some(({ n }) => !n.id)) {
        throw new HttpError(
          HTTP_STATUS_CODE.CONFLICT,
          "A folder changed during the upload. Try the upload again.",
        )
      }
      const next = []
      for (const { n } of level) {
        for (const p of n.paths) result[p] = n.id
        for (const child of n.children.values()) next.push({ n: child, parentId: n.id })
      }
      level = next
    }
    await logAuditEvents(audit, trx)
    return result
  })
}
