import joi from "joi"
import db from "../config/database.js"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { decodeCursor, encodeCursor, parseLimit } from "../utils/keyset-cursor.js"
import * as folderModel from "../models/dataset-folders.js"
import { logAuditEvent } from "../utils/audit.js"
import { isUniqueViolation } from "../utils/pg-errors.js"
import { folderNameSchema, SIBLING_INDEX, conflictMessage } from "../utils/folder-name.js"
import { readUuidParam } from "./dataset-items.js"
import { ensurePaths as ensurePathsService, MAX_PATHS } from "../services/folder-paths.js"

const createSchema = joi.object({
  parent_id: joi.string().uuid().allow(null).default(null),
  name: folderNameSchema.required(),
})

const renameSchema = joi.object({ name: folderNameSchema.required() })

const ensureSchema = joi.object({
  parent_id: joi.string().uuid().allow(null).default(null),
  paths: joi.array().items(joi.string().max(4096)).min(1).max(MAX_PATHS).unique().required(),
})

/**
 * Validates a request body against a Joi schema.
 *
 * @param {import('joi').ObjectSchema} schema - Joi schema
 * @param {unknown} body - Request body
 * @returns {Object} The validated value
 * @throws {HttpError} 400 with the first Joi message
 */
const validate = (schema, body) => {
  const { error, value } = schema.validate(body)
  if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)
  return value
}

/**
 * GET /api/workspaces/:workspace_id/datasets/:dataset_id/folders — List the child folders of one parent.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const listFolders = async (req, res, next) => {
  try {
    const parentId = readUuidParam(req.query.parent_id, "parent_id")
    const cursor = decodeCursor(req.query.cursor)
    const limit = parseLimit(req.query.limit)
    const datasetId = req.dataset.id
    if (parentId && !(await folderModel.findActive({ id: parentId, datasetId }))) {
      throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Folder not found")
    }
    const rows = await folderModel.listChildren({
      datasetId,
      parentId,
      afterKey: cursor?.name ?? null,
      limit: limit + 1,
      withHasChildren: true,
    })
    const page = rows.slice(0, limit)
    const last = page.at(-1)
    const nextCursor =
      rows.length > limit
        ? encodeCursor({ kind: "folder", name: last.sort_key, id: last.id })
        : null
    const items = page.map(({ id, name, has_children }) => ({
      kind: "folder",
      id,
      name,
      has_children,
    }))
    return res.json(apiResponse({ message: "OK", data: { items, next_cursor: nextCursor } }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/workspaces/:workspace_id/datasets/:dataset_id/folders — Create a folder.
 *
 * The transaction takes the dataset tree lock before it reads the parent, so a concurrent
 * delete cannot remove the parent between the check and the insert.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 * @throws {HttpError} 400 for a bad name, 404 for an unknown parent, 409 for a duplicate name, 422 for a depth over 20
 */
export const createFolder = async (req, res, next) => {
  try {
    const { parent_id: parentId, name } = validate(createSchema, req.body)
    const { dataset } = req
    let containerName = dataset.name
    const folder = await db
      .transaction(async (trx) => {
        await folderModel.lockDatasetTree(trx, dataset.id)
        const chain = await folderModel.ancestors(
          { folderId: parentId, datasetId: dataset.id },
          trx,
        )
        if (parentId && !chain.length) {
          throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Folder not found")
        }
        if (chain.length + 1 > folderModel.MAX_DEPTH) {
          throw new HttpError(
            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY,
            `Cannot create the folder. The folder tree would be deeper than ${folderModel.MAX_DEPTH} levels.`,
          )
        }
        if (chain.length) containerName = chain.at(-1).name
        const row = await folderModel.create(
          { datasetId: dataset.id, workspaceId: req.workspace.id, parentId, name },
          trx,
        )
        await logAuditEvent({
          trx,
          workspace_id: req.workspace.id,
          user_id: req.user.id,
          entity_type: "dataset_folder",
          entity_id: row.id,
          action: "created",
          changes: { name, parent_id: parentId },
          context: { request_id: req.id },
        })
        return row
      })
      .catch((err) => {
        if (isUniqueViolation(err, SIBLING_INDEX)) {
          throw new HttpError(HTTP_STATUS_CODE.CONFLICT, conflictMessage(name, containerName))
        }
        throw err
      })
    return res
      .status(HTTP_STATUS_CODE.CREATED)
      .json(apiResponse({ message: "Folder created", data: folder }))
  } catch (error) {
    return next(error)
  }
}

/**
 * PUT /api/workspaces/:workspace_id/datasets/:dataset_id/folders/:folder_id — Rename a folder.
 *
 * The rename changes one row and does not take the tree lock. The unique index on sibling
 * names stops a duplicate name.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 * @throws {HttpError} 400 for a bad id or name, 404 for an unknown folder, 409 for a duplicate name
 */
export const renameFolder = async (req, res, next) => {
  try {
    const folderId = readUuidParam(req.params.folder_id, "folder_id")
    const { name } = validate(renameSchema, req.body)
    const datasetId = req.dataset.id
    const chain = await folderModel.ancestors({ folderId, datasetId })
    if (!chain.length) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Folder not found")
    const before = chain.at(-1)
    const containerName = chain.at(-2)?.name ?? req.dataset.name
    const folder = await db
      .transaction(async (trx) => {
        const row = await folderModel.rename({ id: folderId, datasetId, name }, trx)
        if (!row) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Folder not found")
        await logAuditEvent({
          trx,
          workspace_id: req.workspace.id,
          user_id: req.user.id,
          entity_type: "dataset_folder",
          entity_id: row.id,
          action: "updated",
          changes: { name: { from: before.name, to: name } },
          context: { request_id: req.id },
        })
        return row
      })
      .catch((err) => {
        if (isUniqueViolation(err, SIBLING_INDEX)) {
          throw new HttpError(HTTP_STATUS_CODE.CONFLICT, conflictMessage(name, containerName))
        }
        throw err
      })
    return res.json(apiResponse({ message: "OK", data: folder }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/workspaces/:workspace_id/datasets/:dataset_id/folders/ensure-paths — Create the missing folders of many paths.
 *
 * A folder upload calls it once before the file uploads. An existing folder with the same
 * name, case ignored, is reused.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 * @throws {HttpError} 400 for more than 1000 paths or a bad segment, 404 for an unknown parent, 422 for a depth over 20
 */
export const ensurePaths = async (req, res, next) => {
  try {
    const { parent_id: parentId, paths } = validate(ensureSchema, req.body)
    const map = await ensurePathsService({
      datasetId: req.dataset.id,
      workspaceId: req.workspace.id,
      userId: req.user.id,
      requestId: req.id,
      parentId,
      paths,
    })
    return res.json(apiResponse({ message: "OK", data: { paths: map } }))
  } catch (error) {
    return next(error)
  }
}
