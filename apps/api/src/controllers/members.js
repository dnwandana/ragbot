import crypto, { randomBytes } from "node:crypto"
import joi from "joi"
import db from "../config/database.js"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { logAuditEvent } from "../utils/audit.js"
import * as memberModel from "../models/workspace-members.js"
import * as emailTokenModel from "../models/email-tokens.js"
import * as emailService from "../services/email.js"
import * as userModel from "../models/users.js"
import logger from "../utils/logger.js"

/** Joi schema for workspace member invitation request body. */
const inviteSchema = joi
  .object({
    email: joi.string().email().lowercase().required(),
    role_id: joi.string().uuid().required(),
  })
  .options({ stripUnknown: true })

/** Joi schema for updating a workspace member's role. */
const roleUpdateSchema = joi
  .object({ role_id: joi.string().uuid().required() })
  .options({ stripUnknown: true })

/**
 * GET /api/workspaces/:workspace_id/members — List all active members of the workspace.
 *
 * Returns members joined with user and role details, ordered by join date.
 *
 * @param {Object} req - Express request object (req.workspace.id set by resolveWorkspace middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const listMembers = async (req, res, next) => {
  try {
    const members = await memberModel.findManyByWorkspaceId(req.workspace.id)
    return res.json(apiResponse({ message: "OK", data: members }))
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/workspaces/:workspace_id/members/:member_id — Get a single workspace member by ID.
 *
 * Returns 404 if the member does not exist or does not belong to the workspace.
 *
 * @param {Object} req - Express request object (req.workspace.id set by resolveWorkspace middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const getMember = async (req, res, next) => {
  try {
    const member = await memberModel.findOne({
      id: req.params.member_id,
      workspace_id: req.workspace.id,
    })
    if (!member) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Member not found")
    return res.json(apiResponse({ message: "OK", data: member }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/workspaces/:workspace_id/members/invite — Invite a user to the workspace.
 *
 * Validates the request body, checks that the role belongs to the workspace, verifies the
 * invitee is not already an active member, generates a compound invitation token, atomically
 * creates the pending workspace_member row and the email_token record, then sends the
 * invitation email via Brevo.
 *
 * @param {Object} req - Express request object (req.workspace.id and req.user.id set by middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const inviteMember = async (req, res, next) => {
  try {
    const { error, value } = inviteSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    // Verify the role belongs to this workspace
    const role = await db("roles")
      .where({ id: value.role_id, workspace_id: req.workspace.id })
      .first()
    if (!role) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Role not found in this workspace")

    // Check if the invitee is already an active member
    const existingUser = await userModel.findOne({ email: value.email })
    if (existingUser) {
      const activeMember = await memberModel.findOne({
        user_id: existingUser.id,
        workspace_id: req.workspace.id,
        status: "active",
      })
      if (activeMember) {
        throw new HttpError(
          HTTP_STATUS_CODE.BAD_REQUEST,
          "User is already an active member of this workspace",
        )
      }
    }

    // Generate compound token: memberId:rawToken — memberId lets us look up the pending row
    const memberId = crypto.randomUUID()
    const rawToken = randomBytes(32).toString("hex")
    const tokenHash = emailTokenModel.hashToken(rawToken)
    const compoundToken = `${memberId}:${rawToken}`

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await db.transaction(async (trx) => {
      await trx("workspace_members").insert({
        id: memberId,
        workspace_id: req.workspace.id,
        user_id: existingUser?.id ?? null,
        role_id: value.role_id,
        status: "invited",
        invited_by: req.user.id,
        invited_email: value.email,
        created_at: now,
        updated_at: now,
      })

      await trx("email_tokens").insert({
        id: crypto.randomUUID(),
        user_id: existingUser?.id ?? null,
        token_hash: tokenHash,
        type: "workspace_invitation",
        expires_at: expiresAt,
        created_at: now,
      })

      await logAuditEvent({
        trx,
        workspace_id: req.workspace.id,
        user_id: req.user.id,
        entity_type: "workspace_member",
        entity_id: memberId,
        action: "invited",
        changes: { email: value.email, role_id: value.role_id },
        context: { request_id: req.id },
      })
    })

    const inviter = await userModel.findOne({ id: req.user.id })
    const acceptUrl = `${process.env.APP_URL}/invitations/accept?token=${compoundToken}`

    try {
      await emailService.sendInvitationEmail({
        toEmail: value.email,
        inviterName: inviter.full_name,
        workspaceName: req.workspace.name,
        roleName: role.name,
        acceptUrl,
      })
    } catch (emailErr) {
      logger.warn({ requestId: req.id, err: emailErr }, "Invitation email failed to send")
      return res.status(HTTP_STATUS_CODE.CREATED).json(
        apiResponse({
          message: "Invitation created but email delivery failed",
          data: { id: memberId, email: value.email, status: "invited" },
        }),
      )
    }

    return res.status(HTTP_STATUS_CODE.CREATED).json(
      apiResponse({
        message: "Invitation sent",
        data: { id: memberId, email: value.email, status: "invited" },
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * PUT /api/workspaces/:workspace_id/members/:member_id/role — Change a member's role.
 *
 * Verifies the new role belongs to the workspace, and guards against changing the role
 * of the last remaining owner. Emits a member:update audit event with the before/after diff.
 *
 * @param {Object} req - Express request object (req.workspace.id set by resolveWorkspace middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const changeRole = async (req, res, next) => {
  try {
    const { error, value } = roleUpdateSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const member = await memberModel.findOne({
      id: req.params.member_id,
      workspace_id: req.workspace.id,
    })
    if (!member) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Member not found")

    // Verify the new role belongs to this workspace
    const newRole = await db("roles")
      .where({ id: value.role_id, workspace_id: req.workspace.id })
      .first()
    if (!newRole)
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Role not found in this workspace")

    // Guard: cannot change the last owner's role
    const currentRole = await db("roles").where({ id: member.role_id }).first()
    if (currentRole?.name === "owner") {
      const { count } = await memberModel.countActiveOwners(req.workspace.id)
      if (Number(count) <= 1) {
        throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Cannot change the last owner's role")
      }
    }

    const [updated] = await db.transaction(async (trx) => {
      const [row] = await trx("workspace_members")
        .where({ id: member.id })
        .update({ role_id: value.role_id, updated_at: new Date() })
        .returning([
          "id",
          "workspace_id",
          "user_id",
          "role_id",
          "status",
          "invited_by",
          "joined_at",
          "created_at",
        ])

      await logAuditEvent({
        trx,
        workspace_id: req.workspace.id,
        user_id: req.user.id,
        entity_type: "workspace_member",
        entity_id: member.id,
        action: "role_changed",
        changes: { old: { role_id: member.role_id }, new: { role_id: value.role_id } },
        context: { request_id: req.id },
      })

      return [row]
    })

    return res.json(apiResponse({ message: "Member role updated", data: updated }))
  } catch (error) {
    return next(error)
  }
}

/**
 * DELETE /api/workspaces/:workspace_id/members/:member_id — Remove a member from the workspace.
 *
 * Soft-deletes the membership row. Guards against removing the last active owner.
 * Emits a member:removed audit event within the same transaction.
 *
 * @param {Object} req - Express request object (req.workspace.id set by resolveWorkspace middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const removeMember = async (req, res, next) => {
  try {
    const member = await memberModel.findOne({
      id: req.params.member_id,
      workspace_id: req.workspace.id,
    })
    if (!member) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Member not found")

    // Guard: cannot remove the last owner
    const currentRole = await db("roles").where({ id: member.role_id }).first()
    if (currentRole?.name === "owner") {
      const { count } = await memberModel.countActiveOwners(req.workspace.id)
      if (Number(count) <= 1) {
        throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Cannot remove the last owner")
      }
    }

    const now = new Date()

    await db.transaction(async (trx) => {
      await trx("workspace_members")
        .where({ id: member.id })
        .update({ deleted_at: now, updated_at: now })

      await logAuditEvent({
        trx,
        workspace_id: req.workspace.id,
        user_id: req.user.id,
        entity_type: "workspace_member",
        entity_id: member.id,
        action: "deleted",
        changes: null,
        context: { request_id: req.id },
      })
    })

    return res.json(apiResponse({ message: "Member removed", data: null }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/invitations/accept — Accept a workspace invitation using a compound token.
 *
 * Parses the compound token (memberId:rawToken) from the request body, validates the
 * email token record, and atomically activates the pending workspace_member row while
 * marking the token as used. Emits a member:joined audit event.
 *
 * @param {Object} req - Express request object (req.user.id set by requireAccessToken middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const acceptInvitation = async (req, res, next) => {
  try {
    const { token } = req.body
    if (!token) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Token is required")

    // Parse compound token: memberId:rawToken
    const colonIdx = token.indexOf(":")
    if (colonIdx === -1) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid token format")
    const memberId = token.slice(0, colonIdx)
    const rawPart = token.slice(colonIdx + 1)

    const tokenHash = emailTokenModel.hashToken(rawPart)
    const record = await emailTokenModel.findActiveByHash(tokenHash, "workspace_invitation")
    if (!record) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid or expired invitation")

    const member = await memberModel.findOne({ id: memberId, status: "invited" })
    if (!member) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Invitation not found")

    if (member.user_id) {
      if (member.user_id !== req.user.id) {
        throw new HttpError(
          HTTP_STATUS_CODE.FORBIDDEN,
          "This invitation was issued to a different user",
        )
      }
    } else if (member.invited_email) {
      const acceptingUser = await userModel.findOne({ id: req.user.id })
      if (acceptingUser.email.toLowerCase() !== member.invited_email.toLowerCase()) {
        throw new HttpError(
          HTTP_STATUS_CODE.FORBIDDEN,
          "This invitation was issued to a different email",
        )
      }
    } else {
      throw new HttpError(
        HTTP_STATUS_CODE.FORBIDDEN,
        "This invitation cannot be accepted by your account",
      )
    }

    const now = new Date()

    await db.transaction(async (trx) => {
      await trx("workspace_members")
        .where({ id: memberId })
        .update({ status: "active", user_id: req.user.id, joined_at: now, updated_at: now })

      await trx("email_tokens").where({ id: record.id }).update({ used_at: now })

      await logAuditEvent({
        trx,
        workspace_id: member.workspace_id,
        user_id: req.user.id,
        entity_type: "workspace_member",
        entity_id: memberId,
        action: "joined",
        changes: null,
        context: { request_id: req.id },
      })
    })

    return res.json(
      apiResponse({ message: "Invitation accepted", data: { workspace_id: member.workspace_id } }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /invitations/:token — Return preview data for a compound invitation token.
 *
 * Allows unauthenticated callers to see which workspace they are joining before
 * accepting. Token format: `memberId:rawToken` (colon-separated).
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const previewInvitation = async (req, res, next) => {
  try {
    const colonIdx = req.params.token.indexOf(":")
    if (colonIdx === -1) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid token format")
    const memberId = req.params.token.slice(0, colonIdx)
    const rawPart = req.params.token.slice(colonIdx + 1)

    const tokenHash = emailTokenModel.hashToken(rawPart)
    const record = await emailTokenModel.findActiveByHash(tokenHash, "workspace_invitation")
    if (!record) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid or expired invitation")

    const row = await db("workspace_members as wm")
      .select("w.name as workspace_name", "r.name as role_name", "u.full_name as inviter_name")
      .join("workspaces as w", "w.id", "wm.workspace_id")
      .join("roles as r", "r.id", "wm.role_id")
      .leftJoin("users as u", "u.id", "wm.invited_by")
      .where({ "wm.id": memberId, "wm.status": "invited" })
      .first()

    if (!row) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Invitation not found")

    return res.json(
      apiResponse({
        message: "OK",
        data: {
          workspace_name: row.workspace_name,
          role: { name: row.role_name },
          invited_by: row.inviter_name ?? "A team member",
        },
      }),
    )
  } catch (error) {
    return next(error)
  }
}
