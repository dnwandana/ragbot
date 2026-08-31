import { getClient } from "./redis-client.js"

export const MAX_ATTEMPTS = 5
const TTL_SECONDS = 5 * 60
const keyFor = (key) => `mfa:attempts:${key}`

/**
 * Records a failed second-factor attempt and returns the running count.
 *
 * @param {string} key - A per-challenge key (e.g. the user id).
 * @returns {Promise<number>} The attempt count after incrementing.
 */
export const record = async (key) => {
  const redis = getClient()
  const count = await redis.incr(keyFor(key))
  if (count === 1) await redis.expire(keyFor(key), TTL_SECONDS)
  return count
}

/**
 * Clears the attempt counter (on success).
 *
 * @param {string} key - The per-challenge key.
 * @returns {Promise<void>}
 */
export const reset = async (key) => {
  await getClient().del(keyFor(key))
}
