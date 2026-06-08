import joi from "joi"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { logAuditEvent } from "../utils/audit.js"
import { validatePaginationQuery, executePaginatedQuery } from "../utils/pagination.js"
import * as datasetModel from "../models/datasets.js"
import * as datasetFileModel from "../models/dataset-files.js"
import * as chunkModel from "../models/dataset-file-chunks.js"
import * as questionModel from "../models/dataset-file-questions.js"
import db from "../config/database.js"
import * as agentModel from "../models/agents.js"

const createSchema = joi
  .object({
    name: joi.string().min(1).max(255).required(),
    description: joi.string().max(1000).optional().allow(""),
    embedding_model: joi.string().default(process.env.DEFAULT_EMBEDDINGS_MODEL),
    chunk_size: joi.number().integer().min(256).max(8192).default(1024),
    chunk_overlap: joi.number().integer().min(0).max(2048).default(200),
  })
  .options({ stripUnknown: true })

const updateSchema = joi
  .object({
    name: joi.string().min(1).max(255).optional(),
    description: joi.string().max(1000).optional().allow(""),
  })
  .options({ stripUnknown: true })

/**
 * POST /api/workspaces/:workspace_id/datasets — Create a new dataset in the workspace.
 *
 * Validates input, creates the dataset record with embedding and chunking defaults,
 * and logs the audit event. chunk_size and chunk_overlap are immutable after creation.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const createDataset = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const [dataset] = await datasetModel.create({
      id: crypto.randomUUID(),
      workspace_id: req.workspace.id,
      ...value,
      created_at: new Date(),
      updated_at: new Date(),
    })

    await logAuditEvent({
      workspace_id: req.workspace.id,
      user_id: req.user.id,
      entity_type: "dataset",
      entity_id: dataset.id,
      action: "created",
      context: { request_id: req.id },
    })

    return res
      .status(HTTP_STATUS_CODE.CREATED)
      .json(
        apiResponse({ message: "Created", data: { ...dataset, file_count: 0, total_size_mb: 0 } }),
      )
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/workspaces/:workspace_id/datasets — Return a paginated list of datasets.
 *
 * Supports search on name and description, and sorting on created_at or name.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const listDatasets = async (req, res, next) => {
  try {
    const params = validatePaginationQuery(req.query, ["created_at", "name"])
    const { data, pagination } = await executePaginatedQuery(
      datasetModel.count,
      datasetModel.findManyPaginated,
      { workspace_id: req.workspace.id },
      params,
      ["name", "description"],
    )
    return res.json(apiResponse({ message: "OK", data, pagination }))
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/workspaces/:workspace_id/datasets/:dataset_id — Get a single dataset.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const getDataset = async (req, res, next) => {
  try {
    const dataset = await datasetModel.findOne({
      id: req.params.dataset_id,
      workspace_id: req.workspace.id,
    })
    if (!dataset) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Dataset not found")
    return res.json(apiResponse({ message: "OK", data: dataset }))
  } catch (error) {
    return next(error)
  }
}

/**
 * PUT /api/workspaces/:workspace_id/datasets/:dataset_id — Update dataset name or description.
 *
 * Only name and description are mutable. embedding_model, chunk_size, and chunk_overlap
 * are stripped from the request body to prevent mutation after creation.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const updateDataset = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)
    if (!Object.keys(value).length)
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "No fields to update")

    const dataset = await datasetModel.findOne({
      id: req.params.dataset_id,
      workspace_id: req.workspace.id,
    })
    if (!dataset) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Dataset not found")

    const [updated] = await datasetModel.update(
      { id: dataset.id },
      { ...value, updated_at: new Date() },
    )

    await logAuditEvent({
      workspace_id: req.workspace.id,
      user_id: req.user.id,
      entity_type: "dataset",
      entity_id: dataset.id,
      action: "updated",
      context: { request_id: req.id },
    })

    return res.json(
      apiResponse({
        message: "OK",
        data: { ...updated, file_count: dataset.file_count, total_size_mb: dataset.total_size_mb },
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * DELETE /api/workspaces/:workspace_id/datasets/:dataset_id — Soft-delete a dataset.
 *
 * Cascades: hard-deletes all dataset_file_questions and dataset_file_chunks for files in
 * the dataset, soft-deletes all dataset_files, then soft-deletes the dataset itself.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const deleteDataset = async (req, res, next) => {
  try {
    const dataset = await datasetModel.findOne({
      id: req.params.dataset_id,
      workspace_id: req.workspace.id,
    })
    if (!dataset) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Dataset not found")

    await db.transaction(async (trx) => {
      await questionModel.deleteByDatasetId(dataset.id, trx)
      await chunkModel.deleteByDatasetId(dataset.id, trx)
      await datasetFileModel.softDeleteByDataset(dataset.id, trx)
      await datasetModel.softDelete(dataset.id, trx)
    })

    await logAuditEvent({
      workspace_id: req.workspace.id,
      user_id: req.user.id,
      entity_type: "dataset",
      entity_id: dataset.id,
      action: "deleted",
      context: { request_id: req.id },
    })

    return res.json(apiResponse({ message: "Dataset deleted", data: null }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/workspaces/:workspace_id/datasets/:dataset_id/conversations — Create a conversation from a dataset.
 *
 * Creates a conversation linked to the dataset using the workspace's system agent.
 * The operation runs inside a transaction to ensure atomicity of the conversation,
 * dataset link, and audit log entries.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const createConversationFromDataset = async (req, res, next) => {
  try {
    const dataset = await datasetModel.findOne({
      id: req.params.dataset_id,
      workspace_id: req.workspace.id,
    })
    if (!dataset) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Dataset not found")

    const systemAgent = await agentModel.findSystemAgent(req.workspace.id)
    if (!systemAgent)
      throw new HttpError(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR, "No system agent found")

    const conversationId = crypto.randomUUID()
    const [conversation] = await db.transaction(async (trx) => {
      const [conv] = await trx("conversations")
        .insert({
          id: conversationId,
          workspace_id: req.workspace.id,
          user_id: req.user.id,
          agent_id: systemAgent.id,
          title: null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning([
          "id",
          "workspace_id",
          "user_id",
          "agent_id",
          "title",
          "last_message_at",
          "created_at",
          "updated_at",
        ])

      await trx("conversation_datasets").insert({
        conversation_id: conversationId,
        dataset_id: dataset.id,
        workspace_id: req.workspace.id,
      })

      await logAuditEvent({
        trx,
        workspace_id: req.workspace.id,
        user_id: req.user.id,
        entity_type: "conversation",
        entity_id: conversationId,
        action: "created",
        context: { request_id: req.id, source: "dataset_shortcut" },
      })

      return [conv]
    })

    return res
      .status(HTTP_STATUS_CODE.CREATED)
      .json(
        apiResponse({ message: "Created", data: { ...conversation, dataset_ids: [dataset.id] } }),
      )
  } catch (error) {
    return next(error)
  }
}
