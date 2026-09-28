import joi from "joi"
import HttpError from "./http-error.js"
import { HTTP_STATUS_CODE } from "./constant.js"

/** Maximum number of folder ids plus file ids in one request. */
export const MAX_ITEM_IDS = 500
const ids = joi.array().items(joi.string().uuid()).unique().default([])
const dedupe = (list) => (Array.isArray(list) ? [...new Set(list)] : list)

/**
 * Validates a folder and file selection. It removes duplicate ids before the checks.
 *
 * @param {Object} body - Request body with folder_ids and file_ids
 * @param {Object} [extra] - More Joi keys, for example target_folder_id
 * @returns {Object} { folderIds, fileIds } and the extra keys
 * @throws {HttpError} 400 when the selection is empty, too large, or not valid
 */
export const parseItemIds = (body, extra = {}) => {
  const input = { ...body, folder_ids: dedupe(body?.folder_ids), file_ids: dedupe(body?.file_ids) }
  const { error, value } = joi.object({ folder_ids: ids, file_ids: ids, ...extra }).validate(input)
  if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)
  const { folder_ids: folderIds, file_ids: fileIds, ...rest } = value
  const total = folderIds.length + fileIds.length
  if (total === 0) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Select at least one item")
  if (total > MAX_ITEM_IDS) {
    throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, `Select ${MAX_ITEM_IDS} items or fewer`)
  }
  return { folderIds, fileIds, ...rest }
}
