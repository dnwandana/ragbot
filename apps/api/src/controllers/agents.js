import crypto from "node:crypto"
import joi from "joi"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { logAuditEvent } from "../utils/audit.js"
import { validatePaginationQuery, executePaginatedQuery } from "../utils/pagination.js"
import * as agentModel from "../models/agents.js"
import db from "../config/database.js"
import { ALLOWED_MODELS } from "../utils/allowed-models.js"

/**
 * Builds the Joi schema for the model_config JSONB field.
 * @param {string[]} [extraModels] - Extra model values to accept (grandfathered on update).
 * @returns {Object} Joi object schema.
 */
const modelConfigSchema = (extraModels = []) =>
  joi.object({
    model: joi
      .string()
      .valid(...ALLOWED_MODELS, ...extraModels)
      .required(),
    temperature: joi.number().min(0).max(2).default(0.7),
    top_p: joi.number().min(0).max(1).default(1),
  })

/** Joi schema for creating an agent. */
const createSchema = joi
  .object({
    name: joi.string().min(1).max(255).required(),
    description: joi.string().max(1000).optional().allow(""),
    system_prompt: joi.string().min(1).max(10000).required(),
    model_config: modelConfigSchema().required(),
    is_default: joi.boolean().valid(true).optional(),
  })
  .options({ stripUnknown: true })

/**
 * Builds the Joi schema for updating an agent. The agent's currently
 * saved model stays valid (grandfathered) until it is switched away.
 * @param {string} [currentModel] - The agent's saved model_config.model value.
 * @returns {Object} Joi object schema.
 */
const updateSchemaFor = (currentModel) =>
  joi
    .object({
      name: joi.string().min(1).max(255).optional(),
      description: joi.string().max(1000).optional().allow(""),
      system_prompt: joi.string().min(1).max(10000).optional(),
      model_config: modelConfigSchema(currentModel ? [currentModel] : []).optional(),
      is_default: joi.boolean().valid(true).optional(),
    })
    .options({ stripUnknown: true })

/**
 * Translate a default-promotion unique violation into a retryable 409 conflict.
 * Matches the idx_agents_workspace_default partial unique index by name so no
 * other unique violation can masquerade as this conflict; any other error
 * passes through unchanged.
 * @param {Error} error - Error thrown by a default-promotion code path.
 * @returns {Error} HttpError(409) for the default collision, otherwise the original error.
 */
const asDefaultConflict = (error) =>
  error.code === "23505" && error.constraint === "idx_agents_workspace_default"
    ? new HttpError(
        HTTP_STATUS_CODE.CONFLICT,
        "The default agent was changed by someone else. Please try again.",
      )
    : error

/**
 * POST /api/workspaces/:workspace_id/agents — Create a custom agent.
 *
 * Validates body against createSchema, inserts a non-system agent,
 * logs an audit event, and returns 201. When is_default is true, the
 * previous default is cleared, the new agent is promoted, and the audit
 * event is written, all in one transaction, preserving the
 * one-default-per-workspace invariant and ensuring the audit trail is
 * never missing for a promoted agent. Because promotion demotes the
 * current default, is_default additionally requires the agent:update
 * permission (the route guard only checks agent:create).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
export const createAgent = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    if (value.is_default && !req.permissions.includes("agent:update")) {
      throw new HttpError(
        HTTP_STATUS_CODE.FORBIDDEN,
        "You do not have permission to perform this action",
      )
    }

    const row = {
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
    }

    let agent
    if (value.is_default) {
      const [result] = await db.transaction(async (trx) => {
        await agentModel.clearDefault(req.workspace.id, trx)
        const created = await agentModel.create({ ...row, is_default: true }, trx)
        await logAuditEvent({
          trx,
          workspace_id: req.workspace.id,
          user_id: req.user.id,
          entity_type: "agent",
          entity_id: row.id,
          action: "created",
          changes: { name: value.name, is_default: true },
          context: { request_id: req.id },
        })
        return created
      })
      agent = result
    } else {
      const [result] = await agentModel.create(row)
      agent = result
      await logAuditEvent({
        workspace_id: req.workspace.id,
        user_id: req.user.id,
        entity_type: "agent",
        entity_id: agent.id,
        action: "created",
        changes: { name: value.name },
        context: { request_id: req.id },
      })
    }

    return res
      .status(HTTP_STATUS_CODE.CREATED)
      .json(apiResponse({ message: "Created", data: agent }))
  } catch (error) {
    return next(asDefaultConflict(error))
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
 * Other agents accept all fields. When is_default is true, the demotion,
 * promotion, and set_default audit event are written in one transaction.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
export const updateAgent = async (req, res, next) => {
  try {
    const agent = await agentModel.findOne({
      id: req.params.agent_id,
      workspace_id: req.workspace.id,
    })
    if (!agent) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Agent not found")

    const currentModel =
      typeof agent.model_config === "string"
        ? JSON.parse(agent.model_config).model
        : agent.model_config?.model

    const { error, value } = updateSchemaFor(currentModel).validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)
    if (!Object.keys(value).length)
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "No fields to update")

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

    const auditEvent = {
      workspace_id: req.workspace.id,
      user_id: req.user.id,
      entity_type: "agent",
      entity_id: agent.id,
      action: value.is_default ? "set_default" : "updated",
      changes: value,
      context: { request_id: req.id },
    }

    let updated
    if (value.is_default) {
      const [result] = await db.transaction(async (trx) => {
        await agentModel.clearDefault(req.workspace.id, trx)
        const rows = await agentModel.update({ id: agent.id }, updateData, trx)
        await logAuditEvent({ trx, ...auditEvent })
        return rows
      })
      updated = result
    } else {
      const [result] = await agentModel.update({ id: agent.id }, updateData)
      updated = result
      await logAuditEvent(auditEvent)
    }

    return res.json(apiResponse({ message: "OK", data: updated }))
  } catch (error) {
    return next(asDefaultConflict(error))
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
