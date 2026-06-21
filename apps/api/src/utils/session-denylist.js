import Redis from "ioredis"
import { parseRedisUrl } from "./redis.js"
import logger from "./logger.js"

const KEY_PREFIX = "denylist:"

// Seconds the denylist outlives the access token, so a revoked session is remembered
// at least until its token would have expired anyway (avoids a revocation-leak window).
const DENY_TTL_SKEW_SECONDS = 5
const FALLBACK_TTL_SECONDS = 15 * 60
const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 }

/**
 * Derives the denylist TTL from ACCESS_TOKEN_EXPIRES_IN (`<number><s|m|h|d>`) plus a
 * small skew, so it stays coupled to the real access-token lifetime instead of a
 * hard-coded constant. Falls back to 15 minutes if the value is missing or malformed.
 *
 * @returns {number} TTL in seconds.
 */
const getDenyTtlSeconds = () => {
  const match = String(process.env.ACCESS_TOKEN_EXPIRES_IN ?? "").match(/^(\d+)([smhd])$/)
  const base = match ? parseInt(match[1], 10) * UNIT_SECONDS[match[2]] : FALLBACK_TTL_SECONDS
  return base + DENY_TTL_SKEW_SECONDS
}

let client

/**
 * Lazily creates the shared ioredis client for the denylist.
 *
 * @returns {import('ioredis').Redis} The Redis client.
 */
const getClient = () => {
  if (!client) {
    client = new Redis(parseRedisUrl(process.env.REDIS_URL))
    client.on("error", (err) => {
      logger.warn("Session denylist Redis error", { message: err.message })
    })
  }
  return client
}

/**
 * Marks a session id as revoked for the access-token TTL window.
 * Fails soft — a Redis error is logged, not thrown (auth must not break).
 *
 * @param {string} sid - Session id to deny.
 * @returns {Promise<void>}
 */
export const denySession = async (sid) => {
  if (!sid) return
  try {
    await getClient().set(`${KEY_PREFIX}${sid}`, "1", "EX", getDenyTtlSeconds())
  } catch (err) {
    logger.warn("Failed to denylist session", { sid, message: err.message })
  }
}

/**
 * Reports whether a session id is currently denied.
 * Fails open — on a Redis error it returns false so authentication still works.
 *
 * @param {string} sid - Session id to check.
 * @returns {Promise<boolean>} True if denied.
 */
export const isSessionDenied = async (sid) => {
  if (!sid) return false
  try {
    const exists = await getClient().exists(`${KEY_PREFIX}${sid}`)
    return exists === 1
  } catch (err) {
    logger.warn("Denylist check failed; failing open", { sid, message: err.message })
    return false
  }
}
