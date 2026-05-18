import { createHash } from "node:crypto"
import db from "../config/database.js"

const TABLE = "email_tokens"

/**
 * Hashes a raw token string using SHA-256.
 *
 * @param {string} raw - The raw token to hash.
 * @returns {string} Hex-encoded SHA-256 digest.
 */
export const hashToken = (raw) => createHash("sha256").update(raw).digest("hex")

/**
 * Creates a new email token record.
 *
 * @param {Object} token - Token data to insert (id, user_id, token_hash, type, expires_at).
 * @returns {Promise<Object[]>} Array containing the created token row.
 */
export const create = (token) => db.insert(token).into(TABLE).returning("*")

/**
 * Finds an active (unused, non-expired) token by its hash and type.
 *
 * @param {string} tokenHash - SHA-256 hash of the raw token.
 * @param {string} type - Token type ('verify_email', 'reset_password', 'workspace_invitation').
 * @returns {Promise<Object|undefined>} The matching token row, or undefined.
 */
export const findActiveByHash = (tokenHash, type) =>
  db(TABLE)
    .where({ token_hash: tokenHash, type })
    .whereNull("used_at")
    .where("expires_at", ">", new Date())
    .first()

/**
 * Marks a token as used by setting used_at to the current timestamp.
 *
 * @param {string} id - The token UUID.
 * @returns {Promise<number>} Number of affected rows.
 */
export const markUsed = (id) => db(TABLE).where({ id }).update({ used_at: new Date() })

/**
 * Deletes all expired token records.
 *
 * @returns {Promise<number>} Number of deleted rows.
 */
export const deleteExpired = () => db(TABLE).where("expires_at", "<", new Date()).delete()

/**
 * Deletes all tokens for a given user and type.
 *
 * @param {string} userId - The user UUID.
 * @param {string} type - Token type to delete.
 * @returns {Promise<number>} Number of deleted rows.
 */
export const deleteByUser = (userId, type) => db(TABLE).where({ user_id: userId, type }).delete()
