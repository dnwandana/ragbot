import crypto from "node:crypto"
import db from "../config/database.js"
import { hashPassword, verifyPassword } from "../utils/argon2.js"

const TABLE = "mfa_backup_codes"
const CODE_COUNT = 10

/**
 * Generates 10 single-use backup codes in `xxxx-xxxx` hex form.
 *
 * @returns {string[]} Array of 10 plaintext codes.
 */
export const generateCodes = () =>
  Array.from({ length: CODE_COUNT }, () => {
    const hex = crypto.randomBytes(4).toString("hex")
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`
  })

/**
 * Replaces all of a user's backup codes with freshly hashed ones.
 *
 * @param {string} userId - The user UUID.
 * @param {string[]} plainCodes - Plaintext codes to hash and store.
 * @returns {Promise<void>}
 */
export const replaceForUser = async (userId, plainCodes) => {
  const rows = await Promise.all(
    plainCodes.map(async (code) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      code_hash: await hashPassword(code),
      created_at: new Date(),
    })),
  )
  await db.transaction(async (trx) => {
    await trx(TABLE).where({ user_id: userId }).delete()
    await trx(TABLE).insert(rows)
  })
}

/**
 * Counts a user's unused backup codes.
 *
 * @param {string} userId - The user UUID.
 * @returns {Promise<number>} Count of codes with used_at IS NULL.
 */
export const countActive = async (userId) => {
  const [{ count }] = await db(TABLE)
    .where({ user_id: userId })
    .whereNull("used_at")
    .count({ count: "*" })
  return Number(count)
}

/**
 * Verifies a plaintext backup code and, if valid, marks it used (single-use).
 *
 * @param {string} userId - The user UUID.
 * @param {string} plainCode - The plaintext code submitted by the user.
 * @returns {Promise<boolean>} True if a matching unused code was consumed.
 */
export const consume = async (userId, plainCode) => {
  const candidates = await db(TABLE).where({ user_id: userId }).whereNull("used_at")
  for (const row of candidates) {
    if (await verifyPassword(row.code_hash, plainCode)) {
      const updated = await db(TABLE)
        .where({ id: row.id })
        .whereNull("used_at")
        .update({ used_at: new Date() })
      return updated === 1
    }
  }
  return false
}

/**
 * Deletes all backup codes for a user (used on disable).
 *
 * @param {string} userId - The user UUID.
 * @returns {Promise<number>} Number of deleted rows.
 */
export const deleteForUser = (userId) => db(TABLE).where({ user_id: userId }).delete()
