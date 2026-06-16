import crypto from "node:crypto"
import joi from "joi"
import db from "../config/database.js"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { logAuditEvent } from "../utils/audit.js"
import * as workspaceModel from "../models/workspaces.js"
import {
  SYSTEM_AGENT_NAME,
  SYSTEM_AGENT_DESCRIPTION,
  SYSTEM_AGENT_PROMPT,
} from "../utils/system-agent.js"

/** Joi schema for workspace creation request body. */
const bodySchema = joi
  .object({
    name: joi.string().min(1).max(100).required(),
    description: joi.string().max(240).allow("").optional(),
    settings: joi.object().optional(),
  })
  .options({ stripUnknown: true })

/** Joi schema for workspace update request body. All fields are optional. */
const updateSchema = joi
  .object({
    name: joi.string().min(1).max(100).optional(),
    description: joi.string().max(240).allow("").optional(),
    settings: joi.object().optional(),
  })
  .options({ stripUnknown: true })

/**
 * Maps each system role name to its permission set configuration.
 * null means the role receives all 30 permissions (owner).
 * exclude/include arrays are matched against permission names from the DB.
 */
const ROLE_PERMISSIONS = {
  owner: null,
  admin: { exclude: ["workspace:delete", "role:delete"] },
  editor: {
    include: [
      "workspace:read",
      "role:read",
      "member:read",
      "dataset:create",
      "dataset:read",
      "dataset:update",
      "file:read",
      "file:upload",
      "file:update",
      "file:reprocess",
      "agent:create",
      "agent:read",
      "agent:update",
      "conversation:create",
      "conversation:read",
      "conversation:update",
      "conversation:chat",
    ],
  },
  viewer: {
    include: [
      "workspace:read",
      "role:read",
      "member:read",
      "dataset:read",
      "file:read",
      "agent:read",
      "conversation:read",
    ],
  },
}

/**
 * Seeds the four system roles and their permission assignments for a new workspace.
 * Runs entirely within the provided Knex transaction so it rolls back atomically.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {string} workspaceId - UUID of the workspace being created.
 * @returns {Promise<Object>} Map of role names to their generated UUIDs.
 */
const seedWorkspaceRoles = async (trx, workspaceId) => {
  const allPerms = await trx("permissions").select("id", "name")
  const permMap = Object.fromEntries(allPerms.map((p) => [p.name, p.id]))

  const roleIds = {}
  for (const roleName of ["owner", "admin", "editor", "viewer"]) {
    const roleId = crypto.randomUUID()
    roleIds[roleName] = roleId
    await trx("roles").insert({
      id: roleId,
      workspace_id: workspaceId,
      name: roleName,
      description: `System ${roleName} role`,
      is_system: true,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const cfg = ROLE_PERMISSIONS[roleName]
    let permIds
    if (!cfg) {
      permIds = allPerms.map((p) => p.id)
    } else if (cfg.include) {
      permIds = cfg.include.map((n) => permMap[n]).filter(Boolean)
    } else {
      permIds = allPerms.filter((p) => !cfg.exclude.includes(p.name)).map((p) => p.id)
    }
    if (permIds.length) {
      await trx("role_permissions").insert(
        permIds.map((pid) => ({ role_id: roleId, permission_id: pid })),
      )
    }
  }
  return roleIds
}

/**
 * POST /api/workspaces — Create a new workspace.
 *
 * Runs a transaction that: creates the workspace record (name + optional description + optional settings), seeds four system roles with
 * appropriate permission sets, adds the requesting user as an owner member, and
 * inserts a default system agent. Emits a workspace:create audit event.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const createWorkspace = async (req, res, next) => {
  try {
    const { error, value } = bodySchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const { name, description, settings } = value
    const userId = req.user.id
    const workspaceId = crypto.randomUUID()
    const now = new Date()

    const workspace = await db.transaction(async (trx) => {
      const [created] = await trx("workspaces")
        .insert({
          id: workspaceId,
          name,
          ...(description !== undefined && { description }),
          ...(settings !== undefined && { settings: JSON.stringify(settings) }),
          created_at: now,
          updated_at: now,
        })
        .returning(["id", "name", "description", "settings", "created_at", "updated_at"])

      const roleIds = await seedWorkspaceRoles(trx, workspaceId)

      await trx("workspace_members").insert({
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        user_id: userId,
        role_id: roleIds.owner,
        status: "active",
        invited_by: userId,
        joined_at: now,
        created_at: now,
        updated_at: now,
      })

      await trx("agents").insert({
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        name: SYSTEM_AGENT_NAME,
        description: SYSTEM_AGENT_DESCRIPTION,
        system_prompt: SYSTEM_AGENT_PROMPT,
        model_config: JSON.stringify({
          model: process.env.DEFAULT_CHAT_MODEL,
          temperature: 0.7,
          top_p: 1,
        }),
        is_system: true,
        is_default: true,
        created_by: userId,
        created_at: now,
        updated_at: now,
      })

      await logAuditEvent({
        trx,
        workspace_id: workspaceId,
        user_id: userId,
        entity_type: "workspace",
        entity_id: workspaceId,
        action: "created",
        changes: { name, ...(description !== undefined && { description }) },
        context: { request_id: req.id },
      })

      return created
    })

    return res
      .status(HTTP_STATUS_CODE.CREATED)
      .json(apiResponse({ message: "Workspace created", data: workspace }))
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/workspaces — List all workspaces the authenticated user belongs to.
 *
 * Returns each workspace along with the user's role in that workspace.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const getWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await workspaceModel.findManyByUserId(req.user.id)
    return res.json(apiResponse({ message: "OK", data: workspaces }))
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/workspaces/:workspace_id — Get the resolved workspace.
 *
 * The workspace is pre-loaded onto req.workspace by the resolveWorkspace middleware.
 * This handler simply returns it.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const getWorkspace = async (req, res, next) => {
  try {
    return res.json(
      apiResponse({ message: "OK", data: { ...req.workspace, permissions: req.permissions } }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * PUT /api/workspaces/:workspace_id — Update workspace name or settings.
 *
 * Requires at least one field in the request body. Emits a workspace:update audit event.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const updateWorkspace = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    if (Object.keys(value).length === 0) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "No fields provided to update")
    }

    const workspaceId = req.workspace.id
    const [updated] = await workspaceModel.update(
      { id: workspaceId },
      { ...value, updated_at: new Date() },
    )
    if (!updated) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Workspace not found")

    await logAuditEvent({
      workspace_id: workspaceId,
      user_id: req.user.id,
      entity_type: "workspace",
      entity_id: workspaceId,
      action: "updated",
      changes: value,
      context: { request_id: req.id },
    })

    return res.json(apiResponse({ message: "Workspace updated", data: updated }))
  } catch (error) {
    return next(error)
  }
}

/**
 * DELETE /api/workspaces/:workspace_id — Soft-delete a workspace.
 *
 * Marks the workspace as deleted via deleted_at. Emits a workspace:delete audit event
 * within the same transaction so the log is not written if the delete fails.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const deleteWorkspace = async (req, res, next) => {
  try {
    const workspaceId = req.workspace.id
    const userId = req.user.id

    await db.transaction(async (trx) => {
      await trx("workspaces")
        .where({ id: workspaceId })
        .whereNull("deleted_at")
        .update({ deleted_at: new Date() })

      await logAuditEvent({
        trx,
        workspace_id: workspaceId,
        user_id: userId,
        entity_type: "workspace",
        entity_id: workspaceId,
        action: "deleted",
        changes: null,
        context: { request_id: req.id },
      })
    })

    return res.json(apiResponse({ message: "Workspace deleted", data: null }))
  } catch (error) {
    return next(error)
  }
}
