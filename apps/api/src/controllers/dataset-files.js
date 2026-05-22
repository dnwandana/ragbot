import multer from "multer"
import joi from "joi"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { logAuditEvent } from "../utils/audit.js"
import { validatePaginationQuery, executePaginatedQuery } from "../utils/pagination.js"
import * as datasetFileModel from "../models/dataset-files.js"
import * as datasetModel from "../models/datasets.js"
import * as chunkModel from "../models/document-chunks.js"
import * as storageService from "../services/storage.js"
import * as llamaindexService from "../services/llamaindex.js"
import { addProcessingJob } from "../queues/file-processing.js"

/** Multer middleware configured for in-memory storage with a 50 MB file size limit. */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
})

/** @type {import('joi').ObjectSchema} Validation schema for scrape-url requests. */
const scrapeSchema = joi
  .object({ url: joi.string().uri().required() })
  .options({ stripUnknown: true })

/** @type {import('joi').ObjectSchema} Validation schema for file update requests. */
const updateSchema = joi
  .object({ filename: joi.string().max(255).optional() })
  .options({ stripUnknown: true })

/**
 * POST /api/workspaces/:workspace_id/datasets/:dataset_id/files/upload — Upload a file to a dataset.
 *
 * Stores the uploaded file in R2, submits an async parse job to LlamaIndex, creates a
 * dataset_file record with status 'processing', and logs the upload audit event.
 * Processing is triggered later via the LlamaIndex webhook callback.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "No file uploaded")

    const dataset = await datasetModel.findOne({
      id: req.params.dataset_id,
      workspace_id: req.workspace.id,
    })
    if (!dataset) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Dataset not found")

    const fileId = crypto.randomUUID()
    const ext = req.file.originalname.split(".").pop()
    const storagePath = `workspaces/${req.workspace.id}/datasets/${dataset.id}/files/${fileId}.${ext}`

    await storageService.uploadFile(storagePath, req.file.buffer, req.file.mimetype)

    let jobId
    try {
      jobId = await llamaindexService.submitParseJob(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      )
    } catch (err) {
      await storageService.deleteFile(storagePath).catch(() => {})
      throw err
    }

    const [file] = await datasetFileModel.create({
      id: fileId,
      dataset_id: dataset.id,
      workspace_id: req.workspace.id,
      filename: req.file.originalname,
      mime_type: req.file.mimetype,
      file_size_bytes: req.file.size,
      storage_provider: "r2",
      storage_path: storagePath,
      status: "processing",
      metadata: JSON.stringify({ llamaindex_job_id: jobId }),
      created_at: new Date(),
      updated_at: new Date(),
    })

    await logAuditEvent({
      workspace_id: req.workspace.id,
      user_id: req.user.id,
      entity_type: "dataset_file",
      entity_id: file.id,
      action: "uploaded",
      context: { request_id: req.id },
    })

    return res
      .status(HTTP_STATUS_CODE.CREATED)
      .json(apiResponse({ message: "File uploaded, processing started", data: file }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/workspaces/:workspace_id/datasets/:dataset_id/files/scrape-url — Scrape a URL into a dataset.
 *
 * Creates a dataset_file record with status 'processing' and source_url in metadata,
 * logs the audit event, then enqueues a BullMQ job. The worker scrapes the URL via
 * Firecrawl, runs the processing pipeline, and updates the file status asynchronously.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const scrapeUrl = async (req, res, next) => {
  try {
    const { error, value } = scrapeSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const dataset = await datasetModel.findOne({
      id: req.params.dataset_id,
      workspace_id: req.workspace.id,
    })
    if (!dataset) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Dataset not found")

    const fileId = crypto.randomUUID()
    const hostname = new URL(value.url).hostname
    const filename = `${hostname}-${Date.now()}.md`

    const [file] = await datasetFileModel.create({
      id: fileId,
      dataset_id: dataset.id,
      workspace_id: req.workspace.id,
      filename,
      mime_type: "text/markdown",
      file_size_bytes: 0,
      storage_provider: null,
      storage_path: null,
      status: "processing",
      metadata: JSON.stringify({ source_url: value.url }),
      created_at: new Date(),
      updated_at: new Date(),
    })

    await logAuditEvent({
      workspace_id: req.workspace.id,
      user_id: req.user.id,
      entity_type: "dataset_file",
      entity_id: file.id,
      action: "uploaded",
      context: { request_id: req.id, source_url: value.url },
    })

    await addProcessingJob({ datasetFileId: file.id, datasetId: dataset.id })

    return res
      .status(HTTP_STATUS_CODE.CREATED)
      .json(apiResponse({ message: "Scrape started", data: file }))
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/workspaces/:workspace_id/datasets/:dataset_id/files — List files in a dataset.
 *
 * Returns a paginated list of dataset files. Supports search on filename and
 * sorting on created_at or filename.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const listFiles = async (req, res, next) => {
  try {
    const params = validatePaginationQuery(req.query, ["created_at", "filename"])
    const { data, pagination } = await executePaginatedQuery(
      datasetFileModel.count,
      datasetFileModel.findManyPaginated,
      { dataset_id: req.params.dataset_id },
      params,
      ["filename"],
    )
    return res.json(apiResponse({ message: "OK", data, pagination }))
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/workspaces/:workspace_id/datasets/:dataset_id/files/:file_id — Get a single dataset file.
 *
 * Returns the file record. If the file has a storage_path, a pre-signed R2 download
 * URL valid for 1 hour is generated and appended as signed_url.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const getFile = async (req, res, next) => {
  try {
    const file = await datasetFileModel.findOne({
      id: req.params.file_id,
      dataset_id: req.params.dataset_id,
      workspace_id: req.workspace.id,
    })
    if (!file) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "File not found")

    let signedUrl = null
    if (file.storage_path) {
      signedUrl = await storageService.getSignedDownloadUrl(file.storage_path)
    }

    return res.json(apiResponse({ message: "OK", data: { ...file, signed_url: signedUrl } }))
  } catch (error) {
    return next(error)
  }
}

/**
 * PUT /api/workspaces/:workspace_id/datasets/:dataset_id/files/:file_id — Update a dataset file.
 *
 * Only filename is mutable; all other fields (status, chunk_count, metadata) are
 * managed by the processing pipeline and are stripped from the request body.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const updateFile = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const file = await datasetFileModel.findOne({
      id: req.params.file_id,
      dataset_id: req.params.dataset_id,
      workspace_id: req.workspace.id,
    })
    if (!file) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "File not found")

    const [updated] = await datasetFileModel.update(file.id, { ...value, updated_at: new Date() })

    await logAuditEvent({
      workspace_id: req.workspace.id,
      user_id: req.user.id,
      entity_type: "dataset_file",
      entity_id: file.id,
      action: "updated",
      context: { request_id: req.id },
    })

    return res.json(apiResponse({ message: "OK", data: updated }))
  } catch (error) {
    return next(error)
  }
}

/**
 * DELETE /api/workspaces/:workspace_id/datasets/:dataset_id/files/:file_id — Delete a dataset file.
 *
 * Deletes all document_chunks for the file, soft-deletes the file record, removes
 * the object from R2 storage (failure is silently ignored to avoid blocking), and
 * logs the audit event.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const deleteFile = async (req, res, next) => {
  try {
    const file = await datasetFileModel.findOne({
      id: req.params.file_id,
      dataset_id: req.params.dataset_id,
      workspace_id: req.workspace.id,
    })
    if (!file) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "File not found")

    await chunkModel.deleteByFileId(file.id)
    await datasetFileModel.softDelete(file.id)

    if (file.storage_path) {
      await storageService.deleteFile(file.storage_path).catch(() => {})
    }

    await logAuditEvent({
      workspace_id: req.workspace.id,
      user_id: req.user.id,
      entity_type: "dataset_file",
      entity_id: file.id,
      action: "deleted",
      context: { request_id: req.id },
    })

    return res.json(apiResponse({ message: "File deleted", data: null }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/workspaces/:workspace_id/datasets/:dataset_id/files/:file_id/reprocess — Reprocess a file.
 *
 * Only files with status 'completed' or 'failed' may be reprocessed. Resets the
 * file status to 'processing' and clears any error message, then enqueues a BullMQ
 * job. The worker re-fetches markdown from the original source and reruns the pipeline.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const reprocessFile = async (req, res, next) => {
  try {
    const file = await datasetFileModel.findOne({
      id: req.params.file_id,
      dataset_id: req.params.dataset_id,
      workspace_id: req.workspace.id,
    })
    if (!file) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "File not found")
    if (!["completed", "failed"].includes(file.status)) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "File is not in a reprocessable state")
    }

    await datasetFileModel.update(file.id, {
      status: "processing",
      error_message: null,
      updated_at: new Date(),
    })

    await addProcessingJob({ datasetFileId: file.id, datasetId: file.dataset_id })

    return res.json(apiResponse({ message: "Reprocessing started", data: null }))
  } catch (error) {
    return next(error)
  }
}
