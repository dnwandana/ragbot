import joi from "joi"
import db from "../config/database.js"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { logAuditEvent } from "../utils/audit.js"
import * as conversationModel from "../models/conversations.js"
import * as agentModel from "../models/agents.js"
import * as messageModel from "../models/conversation-messages.js"
import * as citationModel from "../models/conversation-message-citations.js"
import * as shareModel from "../models/conversation-shares.js"
import {
  buildSnapshot,
  renderMarkdown,
  titleToFilename,
  MAX_SNAPSHOT_BYTES,
} from "../utils/conversation-snapshot.js"

const shareUrl = (id) => `${process.env.APP_URL}/chat/${id}`

/** Adds the public url. The share id is the public identifier. */
export const toShareResponse = (share) => ({ ...share, url: shareUrl(share.id) })

/** Loads the conversation that the caller owns, or throws 404. */
export const loadOwnedConversation = async (req) => {
  const conversation = await conversationModel.findOne({
    id: req.params.conversation_id,
    workspace_id: req.workspace.id,
    user_id: req.user.id,
  })
  if (!conversation) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Conversation not found")
  return conversation
}

/** Builds a fresh snapshot. Throws 400 with no visible message and 413 over the size cap. */
export const buildConversationSnapshot = async (conversation, workspace) => {
  const [agent, messages] = await Promise.all([
    agentModel.findOne({ id: conversation.agent_id, workspace_id: workspace.id }),
    messageModel.findThreadByConversationId(conversation.id),
  ])
  if (!messages.some((m) => m.step_type === "input" || m.step_type === "final_answer")) {
    throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Conversation has no messages to share")
  }
  const citations = await citationModel.findByConversationId(conversation.id)
  const snapshot = buildSnapshot({
    conversation,
    workspace,
    agent: agent ?? { name: "Agent" },
    messages,
    citations,
  })
  if (Buffer.byteLength(JSON.stringify(snapshot)) > MAX_SNAPSHOT_BYTES) {
    throw new HttpError(HTTP_STATUS_CODE.PAYLOAD_TOO_LARGE, "Conversation is too large to share")
  }
  return snapshot
}

/** Writes one audit row for a share mutation inside `trx`. */
export const auditShare = (req, trx, share, action) =>
  logAuditEvent({
    trx,
    workspace_id: req.workspace.id,
    user_id: req.user.id,
    entity_type: "conversation_share",
    entity_id: share.id,
    action,
    changes: { conversation_id: share.conversation_id },
    context: { request_id: req.id },
  })

/** GET /api/workspaces/:workspace_id/conversations/:conversation_id/share */
export const getShare = async (req, res, next) => {
  try {
    const conversation = await loadOwnedConversation(req)
    const share = await shareModel.findByConversationId(conversation.id)
    if (!share) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Share not found")
    return res.json(apiResponse({ message: "OK", data: toShareResponse(share) }))
  } catch (error) {
    return next(error)
  }
}

/** POST /api/workspaces/:workspace_id/conversations/:conversation_id/share */
export const createShare = async (req, res, next) => {
  try {
    const conversation = await loadOwnedConversation(req)
    const existing = await shareModel.findByConversationId(conversation.id)
    if (existing) {
      return res.status(HTTP_STATUS_CODE.CONFLICT).json(
        apiResponse({
          message: "Conversation is already shared",
          data: toShareResponse(existing),
        }),
      )
    }
    const snapshot = await buildConversationSnapshot(conversation, req.workspace)
    const share = await db.transaction(async (trx) => {
      const [row] = await shareModel.create(
        {
          conversation_id: conversation.id,
          workspace_id: req.workspace.id,
          snapshot,
          created_by: req.user.id,
        },
        trx,
      )
      await auditShare(req, trx, row, "shared")
      return row
    })
    return res
      .status(HTTP_STATUS_CODE.CREATED)
      .json(apiResponse({ message: "Share link created", data: toShareResponse(share) }))
  } catch (error) {
    return next(error)
  }
}

/** PUT /api/workspaces/:workspace_id/conversations/:conversation_id/share */
export const updateShare = async (req, res, next) => {
  try {
    const conversation = await loadOwnedConversation(req)
    const existing = await shareModel.findByConversationId(conversation.id)
    if (!existing) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Share not found")
    const snapshot = await buildConversationSnapshot(conversation, req.workspace)
    const share = await db.transaction(async (trx) => {
      const [row] = await shareModel.updateSnapshot(existing.id, snapshot, trx)
      await auditShare(req, trx, row, "updated")
      return row
    })
    return res.json(apiResponse({ message: "Share link updated", data: toShareResponse(share) }))
  } catch (error) {
    return next(error)
  }
}

/** DELETE /api/workspaces/:workspace_id/conversations/:conversation_id/share */
export const revokeShare = async (req, res, next) => {
  try {
    const conversation = await loadOwnedConversation(req)
    const existing = await shareModel.findByConversationId(conversation.id)
    if (!existing) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Share not found")
    await db.transaction(async (trx) => {
      await shareModel.remove(existing.id, trx)
      await auditShare(req, trx, existing, "unshared")
    })
    return res.json(apiResponse({ message: "Share link revoked", data: null }))
  } catch (error) {
    return next(error)
  }
}

const exportQuerySchema = joi.object({ format: joi.string().valid("markdown").required() })

/** GET /api/workspaces/:workspace_id/conversations/:conversation_id/export?format=markdown */
export const exportConversation = async (req, res, next) => {
  try {
    const { error } = exportQuerySchema.validate(req.query)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)
    const conversation = await loadOwnedConversation(req)
    const snapshot = await buildConversationSnapshot(conversation, req.workspace)
    res.setHeader("Content-Type", "text/markdown; charset=utf-8")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${titleToFilename(snapshot.title)}"`,
    )
    return res.send(renderMarkdown(snapshot))
  } catch (error) {
    return next(error)
  }
}

const shareIdSchema = joi.string().uuid()

/**
 * GET /api/share/:id — public snapshot read. No auth. The id is never logged.
 *
 * A malformed id is a miss, not a bad request: reporting 404 keeps the response
 * identical to an unknown id, so the endpoint tells a prober nothing.
 */
export const getPublicShare = async (req, res, next) => {
  try {
    if (shareIdSchema.validate(req.params.id).error) {
      throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Share link not found")
    }
    const share = await shareModel.findById(req.params.id)
    if (!share) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Share link not found")
    res.set("Cache-Control", "private, no-store")
    return res.json(apiResponse({ message: "OK", data: share }))
  } catch (error) {
    return next(error)
  }
}
