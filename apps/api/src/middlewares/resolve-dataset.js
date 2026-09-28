import HttpError from "../utils/http-error.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { isUuid } from "../utils/uuid.js"
import * as datasetModel from "../models/datasets.js"

/**
 * Loads the dataset of `req.params.dataset_id` in `req.workspace` and sets `req.dataset`.
 *
 * The check stops a member of one workspace from reading a dataset of a different workspace.
 * Put it after `resolveWorkspace`.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const resolveDataset = async (req, res, next) => {
  try {
    const { dataset_id } = req.params
    if (!isUuid(dataset_id)) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid dataset ID format")
    }
    const dataset = await datasetModel.findOne({ id: dataset_id, workspace_id: req.workspace.id })
    if (!dataset) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Dataset not found")
    req.dataset = dataset
    next()
  } catch (error) {
    next(error)
  }
}
