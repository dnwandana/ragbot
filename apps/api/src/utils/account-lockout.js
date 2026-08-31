import HttpError from "./http-error.js"
import { HTTP_STATUS_CODE } from "./constant.js"
import * as userModel from "../models/users.js"

/** Failed sign-in attempts before an account is locked. */
export const MAX_FAILED_ATTEMPTS = 5

/** How long an account stays locked after too many failed attempts (ms). */
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000

/**
 * Throws 401 if the user's account is currently locked. No-op for a null user.
 *
 * @param {Object|null|undefined} user - User row with a `locked_until` field.
 * @returns {void}
 * @throws {HttpError} 401 when `locked_until` is in the future.
 */
export const assertNotLocked = (user) => {
  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    throw new HttpError(HTTP_STATUS_CODE.UNAUTHORIZED, "Invalid credentials")
  }
}

/**
 * Records a failed password attempt, locking the account at the threshold.
 *
 * @param {Object} user - User row with an `id`.
 * @returns {Promise<void>}
 */
export const recordFailedAttempt = async (user) => {
  const [updated] = await userModel.incrementFailedAttempts(user.id)
  if (updated.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
    await userModel.lockAccount(user.id, new Date(Date.now() + LOCKOUT_DURATION_MS))
  }
}

/**
 * Clears lockout state after a successful password check.
 *
 * @param {string} userId - The user UUID.
 * @returns {Promise<void>}
 */
export const recordSuccess = (userId) => userModel.resetLoginState(userId)
