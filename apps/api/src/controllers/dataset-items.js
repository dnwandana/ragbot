import joi from "joi"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { isUuid } from "../utils/uuid.js"
import { decodeCursor, parseLimit } from "../utils/keyset-cursor.js"
import * as folderModel from "../models/dataset-folders.js"
import { browseItems, searchItems, parseStatuses } from "../services/dataset-items.js"
import { parseItemIds } from "../utils/item-ids.js"
import { moveItems as moveItemsService } from "../services/folder-move.js"
import {
  summarizeItems as summarizeItemsService,
  deleteItems as deleteItemsService,
} from "../services/folder-delete.js"

/**
 * Reads an optional UUID query value. An empty value means the root.
 *
 * @param {unknown} value - Raw query value
 * @param {string} name - Parameter name for the error message
 * @returns {string|null} The UUID, or null
 * @throws {HttpError} 400 when the value is not a UUID
 */
export const readUuidParam = (value, name) => {
  if (value === undefined || value === null || value === "") return null
  if (!isUuid(value)) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, `${name} must be a UUID`)
  return value
}

/**
 * GET /api/workspaces/:workspace_id/datasets/:dataset_id/items — List one folder, or search it.
 *
 * With `q` or `status`, the search covers the folder and all its subfolders.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const listItems = async (req, res, next) => {
  try {
    const folderId = readUuidParam(req.query.folder_id, "folder_id")
    const cursor = decodeCursor(req.query.cursor)
    const limit = parseLimit(req.query.limit)
    const datasetId = req.dataset.id
    const crumbs = await folderModel.ancestors({ folderId, datasetId })
    if (folderId && !crumbs.length) {
      throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Folder not found")
    }
    const q = String(req.query.q ?? "")
      .trim()
      .slice(0, 255)
    const statuses = parseStatuses(req.query.status)
    const { items, nextCursor } =
      q || statuses.length
        ? await searchItems({ datasetId, folderId, q, statuses, cursor, limit })
        : await browseItems({ datasetId, folderId, cursor, limit })
    const breadcrumbs = crumbs.map(({ id, name }) => ({ id, name }))
    return res.json(
      apiResponse({ message: "OK", data: { items, next_cursor: nextCursor, breadcrumbs } }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/workspaces/:workspace_id/datasets/:dataset_id/items/move — Move folders and files.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 * @throws {HttpError} 400 for a bad body, 404 for a missing item, 409 for a duplicate name, 422 for a cycle or a depth over 20
 */
export const moveItems = async (req, res, next) => {
  try {
    const {
      folderIds,
      fileIds,
      target_folder_id: targetId,
    } = parseItemIds(req.body, {
      target_folder_id: joi.string().uuid().allow(null).required(),
    })
    const moved = await moveItemsService({
      datasetId: req.dataset.id,
      datasetName: req.dataset.name,
      workspaceId: req.workspace.id,
      userId: req.user.id,
      requestId: req.id,
      folderIds,
      fileIds,
      targetId,
    })
    return res.json(apiResponse({ message: "Items moved", data: { moved } }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/workspaces/:workspace_id/datasets/:dataset_id/items/summary — Count the items that a delete would remove.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 * @throws {HttpError} 400 for a bad body, 404 for a missing item
 */
export const summarizeItems = async (req, res, next) => {
  try {
    const { folderIds, fileIds } = parseItemIds(req.body)
    const data = await summarizeItemsService({ datasetId: req.dataset.id, folderIds, fileIds })
    return res.json(apiResponse({ message: "OK", data }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/workspaces/:workspace_id/datasets/:dataset_id/items/delete — Delete folders with their contents, and files.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 * @throws {HttpError} 400 for a bad body, 404 for a missing item
 */
export const deleteItems = async (req, res, next) => {
  try {
    const { folderIds, fileIds } = parseItemIds(req.body)
    const deleted = await deleteItemsService({
      datasetId: req.dataset.id,
      workspaceId: req.workspace.id,
      userId: req.user.id,
      requestId: req.id,
      folderIds,
      fileIds,
    })
    return res.json(apiResponse({ message: "Items deleted", data: { deleted } }))
  } catch (error) {
    return next(error)
  }
}
