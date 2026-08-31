import { getClient } from "./redis-client.js"

const TTL_SECONDS = 5 * 60
const keyFor = (userId) => `mfa:totp:laststep:${userId}`

/**
 * Records a freshly-used TOTP time-step for a user, rejecting replays.
 *
 * Returns false if the step has already been used or is older than the last
 * recorded step (within the TTL window); otherwise records it and returns true.
 *
 * @param {string} userId - The user UUID.
 * @param {number} step - The absolute TOTP time-step (from getMatchedStep).
 * @returns {Promise<boolean>} True if the step is fresh and was recorded.
 */
export const consumeStep = async (userId, step) => {
  const redis = getClient()
  const stored = Number(await redis.get(keyFor(userId)))
  if (stored && step <= stored) return false
  await redis.set(keyFor(userId), String(step), "EX", TTL_SECONDS)
  return true
}
