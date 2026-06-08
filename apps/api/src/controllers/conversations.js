import joi from "joi"
import db from "../config/database.js"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { logAuditEvent } from "../utils/audit.js"
import { validatePaginationQuery, executePaginatedQuery } from "../utils/pagination.js"
import * as conversationModel from "../models/conversations.js"
import * as conversationDatasetModel from "../models/conversation-datasets.js"
import * as agentModel from "../models/agents.js"
import * as messageModel from "../models/conversation-messages.js"
import * as citationModel from "../models/conversation-message-citations.js"

/** Joi schema for creating a conversation. */
const createSchema = joi
  .object({
    agent_id: joi.string().uuid().optional(),
    dataset_ids: joi.array().items(joi.string().uuid()).default([]),
    title: joi.string().max(500).optional().allow(""),
  })
  .options({ stripUnknown: true })

/** Joi schema for updating a conversation. */
const updateSchema = joi
  .object({ title: joi.string().max(500).required() })
  .options({ stripUnknown: true })

/**
 * Validate that all dataset IDs exist and belong to the workspace.
 * @param {string} workspaceId - Workspace UUID.
 * @param {string[]} datasetIds - Array of dataset UUIDs to validate.
 * @returns {Promise<void>}
 * @throws {HttpError} 400 if any dataset is not found in the workspace.
 */
const validateDatasetIds = async (workspaceId, datasetIds) => {
  if (!datasetIds.length) return
  const found = await db("datasets")
    .whereIn("id", datasetIds)
    .where({ workspace_id: workspaceId })
    .whereNull("deleted_at")
    .count("* as count")
    .first()
  if (Number(found.count) !== datasetIds.length) {
    throw new HttpError(
      HTTP_STATUS_CODE.BAD_REQUEST,
      "One or more datasets not found in this workspace",
    )
  }
}

/**
 * POST /api/workspaces/:workspace_id/conversations — Create a conversation.
 *
 * Validates the request body, verifies the agent belongs to the workspace,
 * checks dataset IDs, then creates the conversation with optional dataset
 * links inside a transaction. Logs an audit event and returns 201.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
export const createConversation = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const agent = value.agent_id
      ? await agentModel.findOne({ id: value.agent_id, workspace_id: req.workspace.id })
      : await agentModel.findDefaultAgent(req.workspace.id)
    if (!agent)
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "No agent found for this workspace")

    await validateDatasetIds(req.workspace.id, value.dataset_ids)

    const conversationId = crypto.randomUUID()
    const [conversation] = await db.transaction(async (trx) => {
      const [conv] = await trx("conversations")
        .insert({
          id: conversationId,
          workspace_id: req.workspace.id,
          user_id: req.user.id,
          agent_id: agent.id,
          title: value.title || null,
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

      if (value.dataset_ids.length) {
        await trx("conversation_datasets").insert(
          value.dataset_ids.map((did) => ({
            conversation_id: conversationId,
            dataset_id: did,
            workspace_id: req.workspace.id,
          })),
        )
      }

      await logAuditEvent({
        trx,
        workspace_id: req.workspace.id,
        user_id: req.user.id,
        entity_type: "conversation",
        entity_id: conversationId,
        action: "created",
        context: { request_id: req.id },
      })

      return [conv]
    })

    return res.status(HTTP_STATUS_CODE.CREATED).json(
      apiResponse({
        message: "Created",
        data: { ...conversation, dataset_ids: value.dataset_ids },
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/workspaces/:workspace_id/conversations — List conversations with pagination.
 *
 * Returns conversations for the current user in the workspace, with aggregated
 * dataset_ids. Supports search on title and sorting by last_message_at or created_at.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
export const listConversations = async (req, res, next) => {
  try {
    const params = validatePaginationQuery(req.query, ["last_message_at", "created_at"])
    const { data, pagination } = await executePaginatedQuery(
      conversationModel.count,
      conversationModel.findManyPaginated,
      { workspace_id: req.workspace.id, user_id: req.user.id },
      params,
      ["title"],
    )
    return res.json(apiResponse({ message: "OK", data, pagination }))
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/workspaces/:workspace_id/conversations/:conversation_id — Get a conversation.
 *
 * Returns the conversation with its linked dataset IDs, visible messages,
 * and all citations across those messages.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
export const getConversation = async (req, res, next) => {
  try {
    const conversation = await conversationModel.findOne({
      id: req.params.conversation_id,
      workspace_id: req.workspace.id,
      user_id: req.user.id,
    })
    if (!conversation) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Conversation not found")

    const [datasetIds, messages] = await Promise.all([
      conversationDatasetModel.findDatasetIds(conversation.id),
      messageModel.findVisibleByConversationId(conversation.id),
    ])

    const citations = messages.length
      ? await citationModel.findByConversationId(conversation.id)
      : []

    return res.json(
      apiResponse({
        message: "OK",
        data: { ...conversation, dataset_ids: datasetIds, messages, citations },
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * PATCH /api/workspaces/:workspace_id/conversations/:conversation_id — Update a conversation.
 *
 * Updates the conversation title. Only the owner of the conversation can update it.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
export const updateConversation = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const conversation = await conversationModel.findOne({
      id: req.params.conversation_id,
      workspace_id: req.workspace.id,
      user_id: req.user.id,
    })
    if (!conversation) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Conversation not found")

    const [updated] = await conversationModel.update(conversation.id, {
      title: value.title,
      updated_at: new Date(),
    })
    return res.json(apiResponse({ message: "OK", data: updated }))
  } catch (error) {
    return next(error)
  }
}

/**
 * DELETE /api/workspaces/:workspace_id/conversations/:conversation_id — Soft-delete a conversation.
 *
 * Hard-deletes associated conversation_datasets rows, then soft-deletes the conversation
 * inside a transaction and logs an audit event. Only the owner of the conversation can delete it.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
export const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await conversationModel.findOne({
      id: req.params.conversation_id,
      workspace_id: req.workspace.id,
      user_id: req.user.id,
    })
    if (!conversation) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Conversation not found")

    await db.transaction(async (trx) => {
      await trx("conversation_datasets").where({ conversation_id: conversation.id }).delete()
      await trx("conversations").where({ id: conversation.id }).update({ deleted_at: new Date() })
      await logAuditEvent({
        trx,
        workspace_id: req.workspace.id,
        user_id: req.user.id,
        entity_type: "conversation",
        entity_id: conversation.id,
        action: "deleted",
        context: { request_id: req.id },
      })
    })

    return res.json(apiResponse({ message: "Conversation deleted", data: null }))
  } catch (error) {
    return next(error)
  }
}
