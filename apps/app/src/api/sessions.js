import { request } from "@/utils/http"

/**
 * Lists the current user's active sessions.
 * @returns {Promise<Object>} API response with `data` array of sessions.
 */
export function listSessions() {
  return request.get("/auth/sessions")
}

/**
 * Revokes a single session by id.
 * @param {string} id - Session id.
 * @returns {Promise<Object>} API response.
 */
export function revokeSession(id) {
  return request.del(`/auth/sessions/${id}`)
}

/**
 * Revokes all sessions except the current one.
 * @returns {Promise<Object>} API response with `data.revoked` count.
 */
export function revokeOtherSessions() {
  return request.del("/auth/sessions")
}
