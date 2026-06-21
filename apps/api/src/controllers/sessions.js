import joi from "joi"
import { UAParser } from "ua-parser-js"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import * as refreshTokenModel from "../models/refresh-tokens.js"
import { denySession } from "../utils/session-denylist.js"

const idParamSchema = joi.string().uuid().required()

/**
 * Builds a human "Browser on OS" label from a raw User-Agent string.
 *
 * @param {string|null} userAgent - The stored User-Agent.
 * @returns {string} A display label, or "Unknown device".
 */
const parseDevice = (userAgent) => {
  if (!userAgent) return "Unknown device"
  const parser = new UAParser(userAgent)
  const browser = parser.getBrowser().name
  const os = parser.getOS().name
  if (browser && os) return `${browser} on ${os}`
  return browser || os || "Unknown device"
}

/**
 * GET /api/auth/sessions — List the caller's active sessions.
 *
 * Returns all active sessions for the authenticated user, each decorated with a parsed
 * device label and an `is_current` flag indicating the session backing the request.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export const listSessions = async (req, res, next) => {
  try {
    const sessions = await refreshTokenModel.findManyActiveByUserId(req.user.id)
    const data = sessions.map((session) => ({
      id: session.id,
      device: parseDevice(session.user_agent),
      ip_address: session.ip_address,
      location: session.location,
      last_used_at: session.last_used_at,
      created_at: session.created_at,
      is_current: session.id === req.sessionId,
    }))
    return res.json(apiResponse({ message: "OK", data }))
  } catch (error) {
    return next(error)
  }
}

/**
 * DELETE /api/auth/sessions/:id — Revoke one of the caller's sessions.
 *
 * Validates the session belongs to the authenticated user (404 otherwise), revokes it
 * in the database, and adds it to the denylist so any live access token is immediately
 * invalidated.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export const revokeSession = async (req, res, next) => {
  try {
    const { error } = idParamSchema.validate(req.params.id)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid session id")

    const session = await refreshTokenModel.findActiveByIdForUser({
      id: req.params.id,
      user_id: req.user.id,
    })
    if (!session) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Session not found")

    await refreshTokenModel.revokeById(req.params.id)
    await denySession(req.params.id)

    return res.json(apiResponse({ message: "Session revoked", data: null }))
  } catch (error) {
    return next(error)
  }
}

/**
 * DELETE /api/auth/sessions — Revoke all of the caller's sessions except the current one.
 *
 * Collects all active session IDs for the user, filters out the current session, revokes
 * them in bulk, and denylists each one so live access tokens are immediately invalidated.
 * Returns the count of revoked sessions.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export const revokeOtherSessions = async (req, res, next) => {
  try {
    if (!req.sessionId) {
      throw new HttpError(
        HTTP_STATUS_CODE.BAD_REQUEST,
        "Current session could not be identified — please sign in again",
      )
    }

    const ids = await refreshTokenModel.findActiveIdsByUserId(req.user.id)
    const others = ids.filter((id) => id !== req.sessionId)

    await refreshTokenModel.revokeAllForUserExcept(req.user.id, req.sessionId)
    await Promise.all(others.map((id) => denySession(id)))

    return res.json(
      apiResponse({ message: "Other sessions revoked", data: { revoked: others.length } }),
    )
  } catch (error) {
    return next(error)
  }
}
