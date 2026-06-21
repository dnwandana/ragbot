import crypto from "node:crypto"
import db from "../config/database.js"

const TABLE_NAME = "refresh_tokens"

/**
 * Hashes a raw refresh token with SHA-256 for secure storage.
 *
 * @param {string} rawToken - The raw JWT refresh token string
 * @returns {string} Hex-encoded SHA-256 hash
 */
export const hashToken = (rawToken) => {
  return crypto.createHash("sha256").update(rawToken).digest("hex")
}

/**
 * Store a new refresh token record in the database.
 *
 * @param {Object} data - Token data to insert
 * @param {string} data.user_id - UUID of the user this token belongs to
 * @param {string} data.token_hash - SHA-256 hash of the refresh token
 * @param {Date} data.expires_at - When this refresh token expires
 * @param {string} [data.user_agent] - User-agent string from the client request
 * @param {string} [data.ip_address] - IP address of the client
 * @param {string} [data.location] - Human-readable location derived from IP
 * @param {Date} [data.last_used_at] - Last activity timestamp (defaults to now)
 * @returns {Promise<Object[]>} Array containing the newly created token record
 */
export const create = (data) => {
  return db
    .insert({
      id: crypto.randomUUID(),
      user_id: data.user_id,
      token_hash: data.token_hash,
      expires_at: data.expires_at,
      user_agent: data.user_agent ?? null,
      ip_address: data.ip_address ?? null,
      location: data.location ?? null,
      last_used_at: data.last_used_at ?? new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })
    .into(TABLE_NAME)
    .returning(["id", "user_id", "token_hash", "expires_at", "revoked_at", "created_at"])
}

/**
 * Find an active (non-revoked) refresh token by its hash.
 *
 * @param {string} tokenHash - SHA-256 hash of the refresh token
 * @returns {Promise<Object|undefined>} The matched token record or undefined
 */
export const findActiveByHash = (tokenHash) => {
  return db
    .select("*")
    .from(TABLE_NAME)
    .where({ token_hash: tokenHash })
    .whereNull("revoked_at")
    .first()
}

/**
 * Revoke a refresh token by setting its revoked_at timestamp.
 *
 * @param {string} id - UUID of the refresh token record
 * @returns {Promise<number>} Number of rows updated
 */
export const revokeById = (id) => {
  return db
    .update({ revoked_at: new Date(), updated_at: new Date() })
    .from(TABLE_NAME)
    .where({ id })
}

/**
 * Revoke all active refresh tokens for a given user.
 * Used when a user changes password or requests full logout.
 *
 * @param {string} userId - UUID of the user
 * @returns {Promise<number>} Number of tokens revoked
 */
export const revokeAllForUser = (userId) => {
  return db
    .update({ revoked_at: new Date(), updated_at: new Date() })
    .from(TABLE_NAME)
    .where({ user_id: userId })
    .whereNull("revoked_at")
}

/**
 * Permanently delete old refresh tokens that are either revoked or expired.
 *
 * @param {Date} [olderThan=new Date()] - Cutoff date — tokens older than this are purged
 * @returns {Promise<number>} Number of rows deleted
 */
export const purgeOld = (olderThan = new Date()) => {
  return db
    .del()
    .from(TABLE_NAME)
    .where(function () {
      this.whereNotNull("revoked_at").andWhere("revoked_at", "<", olderThan)
    })
    .orWhere("expires_at", "<", olderThan)
}

/**
 * Rotate a session's token in place — keeps the row id (session id) stable.
 *
 * @param {Object} params
 * @param {string} params.id - Session (refresh_tokens) id.
 * @param {string} params.token_hash - New SHA-256 token hash.
 * @param {Date} params.expires_at - New expiry.
 * @returns {Promise<number>} Rows updated.
 */
export const rotate = ({ id, token_hash, expires_at }) => {
  return db
    .update({ token_hash, expires_at, last_used_at: new Date(), updated_at: new Date() })
    .from(TABLE_NAME)
    .where({ id })
}

/**
 * List a user's active (non-revoked, non-expired) sessions, newest activity first.
 *
 * @param {string} userId - User UUID.
 * @returns {Promise<Object[]>} Session rows with display metadata.
 */
export const findManyActiveByUserId = (userId) => {
  return db
    .select("id", "user_agent", "ip_address", "location", "last_used_at", "created_at")
    .from(TABLE_NAME)
    .where({ user_id: userId })
    .whereNull("revoked_at")
    .andWhere("expires_at", ">", new Date())
    .orderBy("last_used_at", "desc")
}

/**
 * Return the ids of a user's active sessions.
 *
 * @param {string} userId - User UUID.
 * @returns {Promise<string[]>} Active session ids.
 */
export const findActiveIdsByUserId = async (userId) => {
  const rows = await db
    .select("id")
    .from(TABLE_NAME)
    .where({ user_id: userId })
    .whereNull("revoked_at")
    .andWhere("expires_at", ">", new Date())
  return rows.map((row) => row.id)
}

/**
 * Find one active session by id, scoped to its owner.
 *
 * @param {Object} params
 * @param {string} params.id - Session id.
 * @param {string} params.user_id - Owning user UUID.
 * @returns {Promise<Object|undefined>} `{ id }` or undefined.
 */
export const findActiveByIdForUser = ({ id, user_id }) => {
  return db.select("id").from(TABLE_NAME).where({ id, user_id }).whereNull("revoked_at").first()
}

/**
 * Revoke all of a user's active sessions except one (used for "log out others").
 *
 * @param {string} userId - User UUID.
 * @param {string} exceptId - Session id to keep active.
 * @returns {Promise<number>} Rows revoked.
 * @throws {Error} If exceptId is falsy — refusing to revoke all sessions without an explicit exclusion.
 */
export const revokeAllForUserExcept = (userId, exceptId) => {
  if (!exceptId) {
    throw new Error("revokeAllForUserExcept requires exceptId — refusing to revoke all sessions")
  }

  return db
    .update({ revoked_at: new Date(), updated_at: new Date() })
    .from(TABLE_NAME)
    .where({ user_id: userId })
    .whereNot({ id: exceptId })
    .whereNull("revoked_at")
}
