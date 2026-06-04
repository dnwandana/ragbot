import joi from "joi"
import crypto from "node:crypto"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE, HTTP_STATUS_MESSAGE } from "../utils/constant.js"
import * as roleModel from "../models/roles.js"
import * as permissionModel from "../models/permissions.js"
import db from "../config/database.js"

/** Standard UUID v4 format validation pattern */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Joi schema for validating role creation request bodies.
 * Requires a name and at least one permission ID.
 */
const createRoleSchema = joi
  .object({
    name: joi.string().min(1).max(50).required(),
    description: joi.string().max(5000).optional(),
    permission_ids: joi.array().items(joi.string().uuid()).min(1).required(),
  })
  .options({ stripUnknown: true })

/**
 * Joi schema for validating role update request bodies.
 * All fields are optional — only provided fields are updated.
 */
const updateRoleSchema = joi
  .object({
    name: joi.string().min(1).max(50).optional(),
    description: joi.string().max(5000).optional(),
    permission_ids: joi.array().items(joi.string().uuid()).min(1).optional(),
  })
  .options({ stripUnknown: true })

/**
 * Joi schema for validating role deletion request bodies.
 * An optional reassign target moves members off the role before it is removed.
 */
const deleteRoleSchema = joi
  .object({
    reassign_to_role_id: joi.string().uuid().optional(),
  })
  .options({ stripUnknown: true })

/**
 * Validates that a role_id route parameter is a well-formed UUID.
 * Throws HttpError if invalid.
 *
 * @param {string} roleId - The role_id value from req.params
 * @returns {string} The validated role ID
 */
const validateRoleIdParam = (roleId) => {
  if (!UUID_REGEX.test(roleId)) {
    throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid role ID format")
  }
  return roleId
}

/**
 * POST /api/workspaces/:workspace_id/roles — Create a custom role for the workspace.
 *
 * Custom roles (is_system = false) allow workspace admins to define granular permission sets.
 * All provided permission_ids are validated against the permissions table before creation.
 *
 * @param {Object} req - Express request object (req.workspace.id set by resolveWorkspace middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const createRole = async (req, res, next) => {
  try {
    const { error, value } = createRoleSchema.validate(req.body)
    if (error) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)
    }

    const { name, description, permission_ids: permissionIds } = value

    // Verify all provided permission IDs actually exist
    const existingPermissions = await permissionModel.findByIds(permissionIds)
    if (existingPermissions.length !== permissionIds.length) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "One or more permission IDs are invalid")
    }

    const roleId = crypto.randomUUID()

    // Create the role record and assign permissions atomically
    const roleData = {
      id: roleId,
      workspace_id: req.workspace.id,
      name,
      is_system: false,
      created_at: new Date(),
      updated_at: new Date(),
    }
    if (description !== undefined) roleData.description = description

    const [role] = await db.transaction(async (trx) => {
      const [created] = await trx("roles")
        .insert(roleData)
        .returning([
          "id",
          "workspace_id",
          "name",
          "description",
          "is_system",
          "created_at",
          "updated_at",
        ])

      // Assign permissions within the same transaction
      const rolePerms = permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId,
      }))
      await trx("role_permissions").insert(rolePerms)

      return [created]
    })

    // Fetch the assigned permissions for the response
    const permissions = await roleModel.findPermissionsByRoleId(roleId)

    return res.status(HTTP_STATUS_CODE.CREATED).json(
      apiResponse({
        message: HTTP_STATUS_MESSAGE.CREATED,
        data: { ...role, permissions },
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/workspaces/:workspace_id/roles — List all roles for the workspace.
 * Includes both system and custom roles, ordered by system roles first then by name.
 *
 * @param {Object} req - Express request object (req.workspace.id set by resolveWorkspace middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getRoles = async (req, res, next) => {
  try {
    const roles = await roleModel.findMany({ workspace_id: req.workspace.id })

    return res.json(
      apiResponse({
        message: HTTP_STATUS_MESSAGE.OK,
        data: roles,
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/workspaces/:workspace_id/roles/:role_id — Get a single role with its permissions.
 * Returns the role details along with all assigned permissions.
 *
 * @param {Object} req - Express request object (req.workspace.id set by resolveWorkspace middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getRole = async (req, res, next) => {
  try {
    const roleId = validateRoleIdParam(req.params.role_id)

    // Fetch the role, scoped to the current workspace
    const role = await roleModel.findOne({ id: roleId, workspace_id: req.workspace.id })
    if (!role) {
      throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Role not found")
    }

    // Fetch the permissions assigned to this role
    const permissions = await roleModel.findPermissionsByRoleId(roleId)

    return res.json(
      apiResponse({
        message: HTTP_STATUS_MESSAGE.OK,
        data: { ...role, permissions },
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * PUT /api/workspaces/:workspace_id/roles/:role_id — Update a role's name, description, or permissions.
 *
 * Guards:
 * - Cannot rename a system role (system role names are immutable)
 * - Permission IDs (if provided) are validated against the permissions table
 *
 * @param {Object} req - Express request object (req.workspace.id set by resolveWorkspace middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateRole = async (req, res, next) => {
  try {
    const roleId = validateRoleIdParam(req.params.role_id)

    const { error, value } = updateRoleSchema.validate(req.body)
    if (error) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)
    }

    // Fetch the existing role, scoped to the current workspace
    const existingRole = await roleModel.findOne({ id: roleId, workspace_id: req.workspace.id })
    if (!existingRole) {
      throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Role not found")
    }

    const { name, description, permission_ids: permissionIds } = value

    // System roles are immutable — cannot rename or change permissions
    if (existingRole.is_system && name && name !== existingRole.name) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Cannot rename a system role")
    }
    if (existingRole.is_system && permissionIds) {
      throw new HttpError(
        HTTP_STATUS_CODE.BAD_REQUEST,
        "Cannot modify permissions of a system role",
      )
    }

    // Build update data — only include fields that were provided
    const updateData = { updated_at: new Date() }
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    // If permissions are being updated, validate them first
    if (permissionIds) {
      const existingPermissions = await permissionModel.findByIds(permissionIds)
      if (existingPermissions.length !== permissionIds.length) {
        throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "One or more permission IDs are invalid")
      }
    }

    // Update role metadata and permissions atomically
    const [updatedRole] = await db.transaction(async (trx) => {
      const [updated] = await trx("roles")
        .where({ id: roleId, workspace_id: req.workspace.id })
        .update(updateData)
        .returning([
          "id",
          "workspace_id",
          "name",
          "description",
          "is_system",
          "created_at",
          "updated_at",
        ])

      if (permissionIds) {
        await roleModel.setPermissions(trx, roleId, permissionIds)
      }

      return [updated]
    })

    // Fetch current permissions for the response
    const permissions = await roleModel.findPermissionsByRoleId(roleId)

    return res.json(
      apiResponse({
        message: HTTP_STATUS_MESSAGE.OK,
        data: { ...updatedRole, permissions },
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * DELETE /api/workspaces/:workspace_id/roles/:role_id — Delete a custom role.
 *
 * Guards:
 * - Cannot delete system roles (owner, admin, editor, viewer)
 * - If the role is still referenced by ANY member — active OR removed (soft-deleted) — a
 *   `reassign_to_role_id` must be supplied. The DB foreign key
 *   (`workspace_members.role_id,workspace_id → roles(id,workspace_id) ON DELETE RESTRICT`)
 *   blocks deletion while any referencing row exists, including tombstoned ones, since member
 *   removal soft-deletes the row but keeps its `role_id`. All referencing members are reassigned
 *   to the target role and the deletion proceeds in one transaction.
 * - Reassigning members requires the `member:manage_role` permission (a member-role mutation),
 *   and the `owner` role can never be a reassign target.
 *
 * @param {Object} req - Express request object (req.workspace.id set by resolveWorkspace middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const deleteRole = async (req, res, next) => {
  try {
    const roleId = validateRoleIdParam(req.params.role_id)

    const { error, value } = deleteRoleSchema.validate(req.body ?? {})
    if (error) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)
    }
    const { reassign_to_role_id: reassignToRoleId } = value

    const role = await roleModel.findOne({ id: roleId, workspace_id: req.workspace.id })
    if (!role) {
      throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Role not found")
    }
    if (role.is_system) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Cannot delete a system role")
    }

    // Count ALL referencing members — active AND soft-deleted. Any referencing row blocks the
    // FK ON DELETE RESTRICT, so a reassign target is required whenever any row exists.
    const { count } = await db("workspace_members")
      .where({ role_id: roleId })
      .count("id as count")
      .first()
    const memberCount = Number(count)

    if (memberCount > 0) {
      // Reassigning members between roles is a member-role mutation, so it requires
      // member:manage_role in addition to role:delete. Without this, role:delete alone
      // could move members onto any role (including owner) — a privilege-escalation path.
      if (!req.permissions.includes("member:manage_role")) {
        throw new HttpError(
          HTTP_STATUS_CODE.FORBIDDEN,
          "Reassigning members to another role requires the member:manage_role permission",
        )
      }
      if (!reassignToRoleId) {
        throw new HttpError(
          HTTP_STATUS_CODE.BAD_REQUEST,
          "Reassign members to another role before deleting",
        )
      }
      if (reassignToRoleId === roleId) {
        throw new HttpError(
          HTTP_STATUS_CODE.BAD_REQUEST,
          "Cannot reassign members to the role being deleted",
        )
      }
      const targetRole = await roleModel.findOne({
        id: reassignToRoleId,
        workspace_id: req.workspace.id,
      })
      if (!targetRole) {
        throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Reassignment target role not found")
      }
      // The owner role is never a valid reassign target — it would escalate members to owner.
      if (targetRole.is_system && targetRole.name === "owner") {
        throw new HttpError(
          HTTP_STATUS_CODE.BAD_REQUEST,
          "Cannot reassign members to the owner role",
        )
      }

      await db.transaction(async (trx) => {
        // Move ALL referencing members (active AND soft-deleted) to the target role so no
        // tombstoned row is left pointing at the role and the FK delete can succeed.
        await trx("workspace_members")
          .where({ role_id: roleId })
          .update({ role_id: reassignToRoleId, updated_at: new Date() })
        await trx("roles").where({ id: roleId, workspace_id: req.workspace.id }).delete()
      })
    } else {
      await roleModel.remove({ id: roleId, workspace_id: req.workspace.id })
    }

    return res.json(
      apiResponse({
        message: HTTP_STATUS_MESSAGE.OK,
        data: null,
      }),
    )
  } catch (error) {
    return next(error)
  }
}
