import crypto from "node:crypto"
import joi from "joi"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { logAuditEvent } from "../utils/audit.js"
import { validatePaginationQuery, executePaginatedQuery } from "../utils/pagination.js"
import * as agentModel from "../models/agents.js"
import db from "../config/database.js"

/** Joi schema for the model_config JSONB field. */
const MODEL_CONFIG_SCHEMA = joi.object({
  model: joi.string().required(),
  temperature: joi.number().min(0).max(2).default(0.7),
  top_p: joi.number().min(0).max(1).default(1),
  max_tokens: joi.number().integer().min(1).max(32768).default(4096),
})

/** Joi schema for creating an agent. */
const createSchema = joi
  .object({
    name: joi.string().min(1).max(255).required(),
    description: joi.string().max(1000).optional().allow(""),
    system_prompt: joi.string().min(1).max(10000).required(),
    model_config: MODEL_CONFIG_SCHEMA.required(),
  })
  .options({ stripUnknown: true })

/** Joi schema for updating an agent. */
const updateSchema = joi
  .object({
    name: joi.string().min(1).max(255).optional(),
    description: joi.string().max(1000).optional().allow(""),
    system_prompt: joi.string().min(1).max(10000).optional(),
    model_config: MODEL_CONFIG_SCHEMA.optional(),
    is_default: joi.boolean().valid(true).optional(),
  })
  .options({ stripUnknown: true })

/**
 * POST /api/workspaces/:workspace_id/agents — Create a custom agent.
 *
 * Validates body against createSchema, inserts a non-system agent,
 * logs an audit event, and returns 201.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
export const createAgent = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const [agent] = await agentModel.create({
      id: crypto.randomUUID(),
      workspace_id: req.workspace.id,
      name: value.name,
      description: value.description || null,
      system_prompt: value.system_prompt,
      model_config: JSON.stringify(value.model_config),
      is_system: false,
      created_by: req.user.id,
      created_at: new Date(),
      updated_at: new Date(),
    })

    await logAuditEvent({
      workspace_id: req.workspace.id,
      user_id: req.user.id,
      entity_type: "agent",
      entity_id: agent.id,
      action: "created",
      changes: { name: value.name },
      context: { request_id: req.id },
    })

    return res
      .status(HTTP_STATUS_CODE.CREATED)
      .json(apiResponse({ message: "Created", data: agent }))
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/workspaces/:workspace_id/agents — List agents with pagination.
 *
 * Returns all non-deleted agents for the workspace. System agent
 * is always sorted first. Supports search on name and description.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
export const listAgents = async (req, res, next) => {
  try {
    const params = validatePaginationQuery(req.query, ["created_at", "name"])
    const { data, pagination } = await executePaginatedQuery(
      agentModel.count,
      agentModel.findManyPaginated,
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
 * GET /api/workspaces/:workspace_id/agents/:agent_id — Get a single agent.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
export const getAgent = async (req, res, next) => {
  try {
    const agent = await agentModel.findOne({
      id: req.params.agent_id,
      workspace_id: req.workspace.id,
    })
    if (!agent) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Agent not found")
    return res.json(apiResponse({ message: "OK", data: agent }))
  } catch (error) {
    return next(error)
  }
}

/**
 * PUT /api/workspaces/:workspace_id/agents/:agent_id — Update an agent.
 *
 * System agents can have their system_prompt updated but cannot be renamed.
 * Other agents accept all fields.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
export const updateAgent = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)
    if (!Object.keys(value).length)
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "No fields to update")

    const agent = await agentModel.findOne({
      id: req.params.agent_id,
      workspace_id: req.workspace.id,
    })
    if (!agent) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Agent not found")

    if (agent.is_system && value.name) {
      throw new HttpError(HTTP_STATUS_CODE.FORBIDDEN, "Cannot rename the system agent")
    }

    const updateData = { updated_at: new Date() }
    if (value.is_default) updateData.is_default = true
    if (value.name !== undefined) updateData.name = value.name
    if (value.description !== undefined) updateData.description = value.description || null
    if (value.system_prompt !== undefined) updateData.system_prompt = value.system_prompt
    if (value.model_config !== undefined)
      updateData.model_config = JSON.stringify(value.model_config)

    let updated
    if (value.is_default) {
      const [result] = await db.transaction(async (trx) => {
        await agentModel.clearDefault(req.workspace.id, trx)
        return agentModel.update({ id: agent.id }, updateData, trx)
      })
      updated = result
    } else {
      const [result] = await agentModel.update({ id: agent.id }, updateData)
      updated = result
    }

    await logAuditEvent({
      workspace_id: req.workspace.id,
      user_id: req.user.id,
      entity_type: "agent",
      entity_id: agent.id,
      action: value.is_default ? "set_default" : "updated",
      changes: value,
      context: { request_id: req.id },
    })

    return res.json(apiResponse({ message: "OK", data: updated }))
  } catch (error) {
    return next(error)
  }
}

/**
 * DELETE /api/workspaces/:workspace_id/agents/:agent_id — Soft-delete an agent.
 *
 * System agents cannot be deleted (returns 403). Custom agents are
 * soft-deleted by setting deleted_at.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
export const deleteAgent = async (req, res, next) => {
  try {
    const agent = await agentModel.findOne({
      id: req.params.agent_id,
      workspace_id: req.workspace.id,
    })
    if (!agent) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Agent not found")
    if (agent.is_system)
      throw new HttpError(HTTP_STATUS_CODE.FORBIDDEN, "Cannot delete the system agent")

    await db.transaction(async (trx) => {
      await agentModel.softDelete(agent.id, trx)
      if (agent.is_default) {
        await agentModel.update(
          { workspace_id: req.workspace.id, is_system: true },
          { is_default: true, updated_at: new Date() },
          trx,
        )
      }

      await logAuditEvent({
        trx,
        workspace_id: req.workspace.id,
        user_id: req.user.id,
        entity_type: "agent",
        entity_id: agent.id,
        action: "deleted",
        context: { request_id: req.id },
      })
    })

    return res.json(apiResponse({ message: "Agent deleted", data: null }))
  } catch (error) {
    return next(error)
  }
}
